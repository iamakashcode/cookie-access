import { NextResponse, type NextRequest } from "next/server";
import { handle, requireSuper } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handle(async () => {
    const s = requireSuper(req);
    return NextResponse.json({ superAdmin: { id: s.superId, email: s.email } });
  });
}
