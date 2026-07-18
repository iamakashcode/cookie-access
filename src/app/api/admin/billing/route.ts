import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { billingConfigured, PLANS } from "@/server/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/billing — the selected domain's plan + catalog + live status.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const s = await prisma.site.findUnique({
      where: { id: site.id },
      select: { planTier: true, subscriptionStatus: true, planRenewsAt: true },
    });
    return NextResponse.json({
      configured: billingConfigured,
      currentPlan: s?.planTier ?? "free",
      subscriptionStatus: s?.subscriptionStatus ?? null,
      renewsAt: s?.planRenewsAt ?? null,
      plans: PLANS,
    });
  });
}
