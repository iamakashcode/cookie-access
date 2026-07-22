import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { getUsage } from "@/server/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/usage — this domain's traffic for the current month vs its plan.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);

    const row = await prisma.site.findUnique({
      where: { id: site.id },
      select: { planTier: true },
    });
    const usage = await getUsage(site.id, row?.planTier ?? "free");

    return NextResponse.json({ ...usage, planTier: row?.planTier ?? "free" });
  });
}
