import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { billingConfigured, cancelSubscription } from "@/server/lib/billing";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/billing/cancel — cancel the domain's subscription and return
// it to the free plan. Cancels the Razorpay mandate so no further charges occur.
export function POST(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);

    if (!billingConfigured) {
      return NextResponse.json(
        { error: "Billing isn't connected." },
        { status: 501 },
      );
    }

    const current = await prisma.site.findUnique({
      where: { id: site.id },
      select: { razorpaySubscriptionId: true, planTier: true },
    });
    if (!current?.razorpaySubscriptionId || current.planTier === "free") {
      throw new HttpError(400, "This domain has no active subscription to cancel.");
    }

    await cancelSubscription(current.razorpaySubscriptionId);

    // Drop to free and clear the subscription. Clearing the id first means the
    // subsequent `subscription.cancelled` webhook finds no domain and is a no-op
    // (this update is the source of truth for the cancellation).
    await prisma.site.update({
      where: { id: site.id },
      data: {
        planTier: "free",
        subscriptionStatus: "cancelled",
        razorpaySubscriptionId: null,
        planRenewsAt: null,
      },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "billing.cancel",
      metadata: {
        subscriptionId: current.razorpaySubscriptionId,
        from: current.planTier,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
