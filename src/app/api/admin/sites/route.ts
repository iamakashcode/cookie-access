import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin } from "@/server/http";
import { provisionSite } from "@/server/lib/onboarding";
import { writeAuditLog } from "@/server/lib/audit";
import { shapeSite } from "@/server/lib/siteShape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/sites — every domain under this account.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const sites = await prisma.site.findMany({
      where: { tenantId: admin.tenantId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { consentRecords: true, dprRequests: true } } },
    });
    return NextResponse.json({ sites: sites.map(shapeSite) });
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  domain: z.string().max(255).optional(),
});

// POST /api/admin/sites — add a new domain (with starter purposes + notice).
export function POST(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const body = createSchema.parse(await req.json());
    const site = await prisma.$transaction((tx) =>
      provisionSite(tx, admin.tenantId, body.name, body.domain),
    );
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "site.create",
      targetTable: "sites",
      targetId: site.id,
    });
    return NextResponse.json({ site: shapeSite(site) }, { status: 201 });
  });
}
