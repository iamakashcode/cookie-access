import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireSuper } from "@/server/http";
import { PLANS } from "@/server/lib/billing";
import { currentPeriod, limitForTier } from "@/server/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const priceOf = (tier: string) =>
  PLANS.find((p) => p.tier === tier)?.priceInr ?? 0;

// GET /api/super/stats — platform-wide analytics for the operator dashboard.
export function GET(req: NextRequest) {
  return handle(async () => {
    requireSuper(req);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);
    const period = currentPeriod();

    const [
      accounts,
      sites,
      activeSites,
      consentTotal,
      dprOpen,
      breaches,
      principals,
      planGroups,
      subGroups,
      signupsRaw,
      consentDailyRaw,
      usageRows,
      recentAccounts,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.site.count(),
      prisma.site.count({ where: { status: "active" } }),
      prisma.consentRecord.count(),
      prisma.dPRRequest.count({ where: { status: { in: ["open", "in_progress"] } } }),
      prisma.breachIncident.count(),
      prisma.dataPrincipal.count(),
      prisma.site.groupBy({ by: ["planTier"], _count: { _all: true } }),
      prisma.site.groupBy({ by: ["subscriptionStatus"], _count: { _all: true } }),
      prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM tenants WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<{ day: Date; action: string; count: bigint }[]>`
        SELECT date_trunc('day', "timestamp") AS day, "action", COUNT(*) AS count
        FROM consent_records WHERE "timestamp" >= ${since} GROUP BY 1,2 ORDER BY 1
      `,
      prisma.siteUsage.findMany({
        where: { period },
        select: { sessions: true, site: { select: { planTier: true } } },
      }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          businessName: true,
          contactEmail: true,
          createdAt: true,
          _count: { select: { sites: true } },
        },
      }),
    ]);

    const planMix = planGroups.map((g) => ({
      tier: g.planTier as string,
      count: g._count._all,
    }));

    // MRR counts only subscriptions that are actually live — a domain sitting on
    // a paid tier with an unpaid ("created") or cancelled subscription is not
    // recurring revenue. This keeps the number identical to the Orders page.
    const billable = await prisma.site.findMany({
      where: { subscriptionStatus: "active", planTier: { not: "free" } },
      select: { planTier: true },
    });
    const mrr = billable.reduce((sum, s) => sum + priceOf(s.planTier), 0);
    const paidSites = billable.length;

    // Traffic this month + how much of the sold allowance is being used.
    const sessionsThisMonth = usageRows.reduce((s, r) => s + r.sessions, 0);
    const allowance = usageRows.reduce(
      (s, r) => s + limitForTier(r.site.planTier),
      0,
    );

    // Fill both 30-day series so the charts have no gaps.
    const days: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    const signupMap = new Map(
      signupsRaw.map((r) => [
        new Date(r.day).toISOString().slice(0, 10),
        Number(r.count),
      ]),
    );
    const consentMap = new Map<string, { granted: number; withdrawn: number }>();
    for (const r of consentDailyRaw) {
      const k = new Date(r.day).toISOString().slice(0, 10);
      const slot = consentMap.get(k) ?? { granted: 0, withdrawn: 0 };
      if (r.action === "granted") slot.granted = Number(r.count);
      else slot.withdrawn = Number(r.count);
      consentMap.set(k, slot);
    }

    return NextResponse.json({
      totals: {
        accounts,
        sites,
        activeSites,
        consentRecords: consentTotal,
        openRequests: dprOpen,
        breaches,
        people: principals,
        mrr,
        paidSites,
        sessionsThisMonth,
        allowance,
      },
      planMix,
      subscriptions: subGroups.map((g) => ({
        status: g.subscriptionStatus ?? "none",
        count: g._count._all,
      })),
      signups: days.map((d) => ({ date: d, count: signupMap.get(d) ?? 0 })),
      consentDaily: days.map((d) => ({
        date: d,
        granted: consentMap.get(d)?.granted ?? 0,
        withdrawn: consentMap.get(d)?.withdrawn ?? 0,
      })),
      recentAccounts: recentAccounts.map((t) => ({
        id: t.id,
        businessName: t.businessName,
        contactEmail: t.contactEmail,
        createdAt: t.createdAt,
        sites: t._count.sites,
      })),
    });
  });
}
