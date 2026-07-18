import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, HttpError } from "@/server/http";
import { verifyPassword } from "@/server/lib/password";
import { SUPER_COOKIE, signSuper } from "@/server/lib/jwt";
import { sessionCookieOptions } from "@/server/lib/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function POST(req: NextRequest) {
  return handle(async () => {
    const { email, password } = schema.parse(await req.json());
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email: email.toLowerCase() },
    });
    const ok = superAdmin
      ? await verifyPassword(password, superAdmin.passwordHash)
      : false;
    if (!superAdmin || !ok) throw new HttpError(401, "Incorrect email or password");

    const token = signSuper({ superId: superAdmin.id, email: superAdmin.email });
    const res = NextResponse.json({
      superAdmin: { id: superAdmin.id, email: superAdmin.email },
    });
    res.cookies.set(SUPER_COOKIE, token, sessionCookieOptions());
    return res;
  });
}
