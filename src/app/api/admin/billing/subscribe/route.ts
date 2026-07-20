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

    // Any subscription this domain already had — we cancel it below so the
    // customer is never billed for two plans at once (one active sub per domain).
    const before = await prisma.site.findUnique({
      where: { id: site.id },
      select: { razorpaySubscriptionId: true },
    });
    const previousSubId = before?.razorpaySubscriptionId ?? null;

    const { subscriptionId, shortUrl } = await createSubscription(tier);

    // Point the domain at the NEW subscription first. This must happen before
    // cancelling the old one: cancelling fires a `subscription.cancelled`
    // webhook for the old id, and the handler looks the domain up by
    // razorpaySubscriptionId — now the new id — so the old cancellation can't
    // downgrade the domain we just upgraded.
    await prisma.site.update({
      where: { id: site.id },
      data: { razorpaySubscriptionId: subscriptionId, subscriptionStatus: "created" },
    });

    if (previousSubId && previousSubId !== subscriptionId) {
      await cancelSubscription(previousSubId);
    }

    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "billing.subscribe",
      metadata: { tier, subscriptionId, cancelledPrevious: previousSubId },
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
