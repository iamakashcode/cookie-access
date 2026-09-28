import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { accountSuspended, handle, HttpError } from "@/server/http";
import { verifyPassword } from "@/server/lib/password";
import { SESSION_COOKIE, signSession } from "@/server/lib/jwt";
import { sessionCookieOptions } from "@/server/lib/cookies";
import { writeAuditLog } from "@/server/lib/audit";
import { enforceLimit, idKey, ipKey } from "@/server/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function POST(req: NextRequest) {
  return handle(async () => {
    const { email, password } = schema.parse(await req.json());

    // Brute-force protection: per IP, and per account across IPs.
    await enforceLimit(`login:ip:${ipKey(req)}`, 30, 15 * 60);
    await enforceLimit(`login:email:${idKey(email)}`, 10, 15 * 60);

    const admin = await prisma.adminUser.findFirst({
      where: { email: email.toLowerCase() },
      include: { tenant: { select: { status: true } } },
    });
    const ok = admin ? await verifyPassword(password, admin.passwordHash) : false;
    if (!admin || !ok) throw new HttpError(401, "Incorrect email or password");
    if (admin.tenant.status !== "active") throw accountSuspended();

    const token = signSession({
      adminId: admin.id,
      tenantId: admin.tenantId,
      role: admin.role,
      email: admin.email,
    });

    await writeAuditLog({
      tenantId: admin.tenantId,
      actorId: admin.id,
      action: "admin.login",
    });

    const res = NextResponse.json({
      admin: { id: admin.id, email: admin.email, role: admin.role },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  });
}
