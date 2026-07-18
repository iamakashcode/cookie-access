import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { verifyWebhook } from "@/server/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tierForPlan(planId?: string): "starter" | "growth" | null {
  if (planId && planId === process.env.RAZORPAY_PLAN_STARTER) return "starter";
  if (planId && planId === process.env.RAZORPAY_PLAN_GROWTH) return "growth";
  return null;
}

// POST /api/webhooks/razorpay — keeps a domain's plan in sync with its subscription.
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
    where: { razorpaySubscriptionId: sub.id },
    select: { id: true, tenantId: true },
  });
  if (!site) return NextResponse.json({ ok: true });

  const tier = tierForPlan(sub.plan_id);
  const renewsAt = sub.current_end ? new Date(sub.current_end * 1000) : undefined;

  const data: Record<string, unknown> = {};
  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged":
      data.subscriptionStatus = "active";
      if (tier) data.planTier = tier;
      if (renewsAt) data.planRenewsAt = renewsAt;
      break;
    case "subscription.halted":
      data.subscriptionStatus = "halted";
      break;
    case "subscription.cancelled":
      data.subscriptionStatus = "cancelled";
      data.planTier = "free";
      break;
    default:
      return NextResponse.json({ ok: true });
  }

  await prisma.site.update({ where: { id: site.id }, data });
  await prisma.auditLog.create({
    data: {
      tenantId: site.tenantId,
      siteId: site.id,
      actorType: "system",
      action: `billing.webhook.${event.event}`,
    },
  });

  return NextResponse.json({ ok: true });
}
