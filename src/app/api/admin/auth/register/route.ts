import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handle } from "@/server/http";
import { registerTenant } from "@/server/lib/onboarding";
import { SESSION_COOKIE, signSession } from "@/server/lib/jwt";
import { sessionCookieOptions } from "@/server/lib/cookies";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  businessName: z.string().min(1, "Business name is required").max(120),
  email: z.string().email(),
  password: z.string().min(8, "Use at least 8 characters"),
});

// POST /api/admin/auth/register — self-serve signup: account + first domain.
export function POST(req: NextRequest) {
  return handle(async () => {
    const input = schema.parse(await req.json());
    const email = input.email.toLowerCase();

    const { tenant, admin, site } = await registerTenant({
      businessName: input.businessName.trim(),
      contactEmail: email,
      email,
      password: input.password,
    });

    const token = signSession({
      adminId: admin.id,
      tenantId: tenant.id,
      role: admin.role,
      email: admin.email,
    });

    await writeAuditLog({
      tenantId: tenant.id,
      siteId: site.id,
      actorId: admin.id,
      action: "tenant.register",
      targetTable: "tenants",
      targetId: tenant.id,
    });

    const res = NextResponse.json(
      {
        admin: { id: admin.id, email: admin.email, role: admin.role },
        tenant: { id: tenant.id, businessName: tenant.businessName },
        site: { id: site.id, name: site.name, apiKey: site.apiKey },
      },
      { status: 201 },
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  });
}
