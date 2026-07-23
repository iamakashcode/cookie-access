import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireSuper } from "@/server/http";
import { PLANS } from "@/server/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const priceOf = (tier: string) =>
  PLANS.find((p) => p.tier === tier)?.priceInr ?? 0;

/**
 * GET /api/super/orders — every subscription on the platform.
 *
 * A domain becomes an "order" the moment it starts a Razorpay subscription, so
 * this covers pending checkouts as well as live, halted and cancelled plans.
 */
export function GET(req: NextRequest) {
  return handle(async () => {
    requireSuper(req);
    const status = new URL(req.url).searchParams.get("status") || "";

    const sites = await prisma.site.findMany({
      where: {
        OR: [
          { razorpaySubscriptionId: { not: null } },
          { planTier: { not: "free" } },
        ],
        ...(status ? { subscriptionStatus: status } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { businessName: true, contactEmail: true } } },
    });

    const orders = sites.map((s) => ({
      id: s.id,
      domain: s.name,
      host: s.domain,
      account: s.tenant.businessName,
      contactEmail: s.tenant.contactEmail,
      planTier: s.planTier,
      amountInr: priceOf(s.planTier),
      subscriptionStatus: s.subscriptionStatus,
      subscriptionId: s.razorpaySubscriptionId,
      renewsAt: s.planRenewsAt,
      createdAt: s.createdAt,
    }));

    const active = orders.filter((o) => o.subscriptionStatus === "active");
    return NextResponse.json({
      orders,
      summary: {
        total: orders.length,
        active: active.length,
        pending: orders.filter((o) => o.subscriptionStatus === "created").length,
        cancelled: orders.filter((o) => o.subscriptionStatus === "cancelled").length,
        halted: orders.filter((o) => o.subscriptionStatus === "halted").length,
        mrr: active.reduce((s, o) => s + o.amountInr, 0),
      },
    });
  });
}
