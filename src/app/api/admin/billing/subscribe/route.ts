import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import {
  billingConfigured,
  cancelSubscription,
  createSubscription,
  razorpayKeyId,
} from "@/server/lib/billing";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ tier: z.enum(["starter", "growth"]) });

// POST /api/admin/billing/subscribe — start a Razorpay subscription for the domain.
export function POST(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);

    if (!billingConfigured) {
      return NextResponse.json(
        {
          error:
            "Billing isn't connected yet. Add your Razorpay keys to enable paid plans.",
        },
        { status: 501 },
      );
    }

    const { tier } = schema.parse(await req.json());

    const before = await prisma.site.findUnique({
      where: { id: site.id },
      select: { razorpaySubscriptionId: true, pendingSubscriptionId: true, planTier: true },
    });
    const currentSubId = before?.razorpaySubscriptionId ?? null;
    const pendingSubId = before?.pendingSubscriptionId ?? null;
    const onPaidPlan = !!currentSubId && before?.planTier !== "free";

    const { subscriptionId, shortUrl } = await createSubscription(tier);

    // DB first, cancellations after: a cancelled subscription fires a webhook,
    // and by then its id no longer points at this domain, so it can't downgrade it.
    let cancelled: string[];
    if (onPaidPlan) {
      // Plan change: the paid subscription keeps running until the new one is
      // paid for (the webhook then switches over and cancels the old one). An
      // abandoned checkout leaves the current plan exactly as it was.
      await prisma.site.update({
        where: { id: site.id },
        data: { pendingSubscriptionId: subscriptionId },
      });
      cancelled = pendingSubId ? [pendingSubId] : []; // an earlier unfinished change
    } else {
      // Nothing paid to protect: this becomes the domain's subscription.
      await prisma.site.update({
        where: { id: site.id },
        data: {
          razorpaySubscriptionId: subscriptionId,
          pendingSubscriptionId: null,
          subscriptionStatus: "created",
        },
      });
      cancelled = [currentSubId, pendingSubId].filter((id): id is string => !!id);
    }
    for (const id of cancelled) {
      if (id !== subscriptionId) await cancelSubscription(id);
    }

    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "billing.subscribe",
      metadata: { tier, subscriptionId, planChange: onPaidPlan, cancelled },
    });

    // keyId + subscriptionId drive the embedded Razorpay Checkout (popup over
    // our own page). shortUrl is kept as a fallback hosted-page link.
    return NextResponse.json({
      subscriptionId,
      keyId: razorpayKeyId,
      businessName: site.name,
      checkoutUrl: shortUrl,
    });
  });
}
