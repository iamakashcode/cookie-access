import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, HttpError } from "@/server/http";
import { verifyPassword } from "@/server/lib/password";
import { SESSION_COOKIE, signSession } from "@/server/lib/jwt";
import { sessionCookieOptions } from "@/server/lib/cookies";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function POST(req: NextRequest) {
  return handle(async () => {
    const { email, password } = schema.parse(await req.json());

    const admin = await prisma.adminUser.findFirst({
      where: { email: email.toLowerCase() },
    });
    const ok = admin ? await verifyPassword(password, admin.passwordHash) : false;
    if (!admin || !ok) throw new HttpError(401, "Incorrect email or password");

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
