import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { billingConfigured, createSubscription } from "@/server/lib/billing";
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
    const { subscriptionId, shortUrl } = await createSubscription(tier);

    await prisma.site.update({
      where: { id: site.id },
      data: { razorpaySubscriptionId: subscriptionId, subscriptionStatus: "created" },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "billing.subscribe",
      metadata: { tier, subscriptionId },
    });

    return NextResponse.json({ subscriptionId, checkoutUrl: shortUrl });
  });
}
