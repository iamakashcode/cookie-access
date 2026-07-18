import { NextResponse } from "next/server";
import { SUPER_COOKIE } from "@/server/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SUPER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
