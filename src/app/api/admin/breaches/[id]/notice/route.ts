import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import {
  affectedUserNotice,
  boardReport,
  loadBreach,
} from "@/server/lib/breachNotice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/breaches/:id/notice?type=board|users — a ready-to-send breach
// notification draft (§8(6)).
export function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const params = await ctx.params;
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const type = z
      .enum(["board", "users"])
      .catch("board")
      .parse(new URL(req.url).searchParams.get("type"));

    const breach = await loadBreach(site.id, params.id);
    if (!breach) throw new HttpError(404, "Incident not found");

    const text = type === "users" ? affectedUserNotice(breach) : boardReport(breach);
    return NextResponse.json({ text });
  });
}
