import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { cancelSubscription, verifyWebhook } from "@/server/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tierForPlan(planId?: string): "starter" | "growth" | null {
  if (planId && planId === process.env.RAZORPAY_PLAN_STARTER) return "starter";
  if (planId && planId === process.env.RAZORPAY_PLAN_GROWTH) return "growth";
  return null;
}

// POST /api/webhooks/razorpay — keeps a domain's plan in sync with its subscription.
//
// A domain has its current subscription (razorpaySubscriptionId) and, during a
// plan change, a pending one (pendingSubscriptionId). The pending one only
// takes over once it's paid for; then the old one is cancelled. Events for a
// pending subscription that fails or is abandoned never touch the current plan.
export async function POST(req: NextRequest) {
  const raw = await req.text(); // exact bytes Razorpay signed
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!verifyWebhook(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      subscription?: {
        entity?: { id?: string; plan_id?: string; current_end?: number };
      };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const sub = event.payload?.subscription?.entity;
  if (!sub?.id) return NextResponse.json({ ok: true });

  const site = await prisma.site.findFirst({
    where: {
      OR: [{ razorpaySubscriptionId: sub.id }, { pendingSubscriptionId: sub.id }],
    },
    select: {
      id: true,
      tenantId: true,
      razorpaySubscriptionId: true,
      pendingSubscriptionId: true,
    },
  });
  if (!site) return NextResponse.json({ ok: true });

  const isPending =
    site.pendingSubscriptionId === sub.id && site.razorpaySubscriptionId !== sub.id;
  const tier = tierForPlan(sub.plan_id);
  const renewsAt = sub.current_end ? new Date(sub.current_end * 1000) : undefined;

  const data: Record<string, unknown> = {};
  let supersededId: string | null = null; // old subscription to stop charging
  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.resumed":
      data.subscriptionStatus = "active";
      if (tier) data.planTier = tier;
      if (renewsAt) data.planRenewsAt = renewsAt;
      if (isPending) {
        // The plan change is paid for: switch over, then cancel the old one.
        data.razorpaySubscriptionId = sub.id;
        data.pendingSubscriptionId = null;
        supersededId = site.razorpaySubscriptionId;
      }
      break;
    case "subscription.pending": // a renewal payment failed; Razorpay is retrying
      if (isPending) return NextResponse.json({ ok: true });
      data.subscriptionStatus = "pending";
      break;
    case "subscription.halted": // retries exhausted
    case "subscription.cancelled":
    case "subscription.completed": // every billing cycle has been used
    case "subscription.paused":
      if (isPending) {
        // An abandoned or failed plan change — the current plan is unaffected.
        data.pendingSubscriptionId = null;
        break;
      }
      data.subscriptionStatus = event.event.replace("subscription.", "");
      data.planTier = "free";
      break;
    default:
      return NextResponse.json({ ok: true });
  }

  await prisma.site.update({ where: { id: site.id }, data });
  // After the update, so the old subscription's own `cancelled` event no longer
  // matches this domain and can't downgrade it.
  if (supersededId && supersededId !== sub.id) await cancelSubscription(supersededId);

  await prisma.auditLog.create({
    data: {
      tenantId: site.tenantId,
      siteId: site.id,
      actorType: "system",
      action: `billing.webhook.${event.event}`,
      metadata: { subscriptionId: sub.id, pendingChange: isPending },
    },
  });

  return NextResponse.json({ ok: true });
}
