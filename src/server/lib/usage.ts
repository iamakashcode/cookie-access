import { prisma } from "../prisma";

/**
 * Traffic metering. Plans are sold on monthly **visitor sessions**: the widget
 * pings once per browser session, so a visitor browsing 20 pages counts once.
 * That keeps metering cheap (it doesn't defeat the widget's caching) while still
 * scaling price with a customer's real traffic.
 *
 * The monthly window is **anchored per domain**, not to the calendar. A domain's
 * cycle runs from its billing day — the subscription renewal day for a paid
 * domain, or the day the domain was added for a free one — to the same day next
 * month. So a customer who subscribes on the 20th gets a full allowance every
 * 20th→19th, matching what Razorpay actually bills them for (never a partial
 * period that resets on the 1st).
 */

export type Tier = "free" | "starter" | "growth";

/** Monthly session allowance per plan. */
export const PLAN_SESSION_LIMITS: Record<Tier, number> = {
  free: 5_000,
  starter: 50_000,
  growth: 500_000,
};

/** Warn the customer once they cross this share of their allowance. */
export const WARN_AT = 0.8;

export function limitForTier(tier: string): number {
  return PLAN_SESSION_LIMITS[(tier as Tier) ?? "free"] ?? PLAN_SESSION_LIMITS.free;
}

/** The minimal domain shape metering needs. */
export interface SiteForUsage {
  id: string;
  planTier: string;
  createdAt: Date;
  planRenewsAt: Date | null;
}

/**
 * Day-of-month the cycle turns over (1–28). Uses the subscription renewal day
 * when the domain is on a paid plan, else the day it was added. Clamped to 28 so
 * every month has that day (no Feb-30 gaps).
 */
export function anchorDay(site: {
  createdAt: Date;
  planRenewsAt: Date | null;
}): number {
  const src = site.planRenewsAt ?? site.createdAt;
  return Math.min(28, Math.max(1, src.getUTCDate()));
}

/** Start of the current cycle as YYYY-MM-DD — also the storage period key. */
export function cycleStart(anchor: number, now: Date = new Date()): string {
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth();
  // Before this month's anchor day → the cycle began last month.
  if (now.getUTCDate() < anchor) {
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return new Date(Date.UTC(y, m, anchor)).toISOString().slice(0, 10);
}

/** The date the current cycle resets (exclusive end), YYYY-MM-DD. */
export function cycleReset(anchor: number, now: Date = new Date()): string {
  const start = new Date(`${cycleStart(anchor, now)}T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() + 1);
  return start.toISOString().slice(0, 10);
}

/** The period key (current cycle start) for a domain, given its anchor. */
export function periodFor(site: SiteForUsage, now: Date = new Date()): string {
  return cycleStart(anchorDay(site), now);
}

export interface UsageState {
  period: string; // cycle start (YYYY-MM-DD)
  resetsOn: string; // next cycle start (YYYY-MM-DD)
  sessions: number; // this cycle (the metered number)
  allTime?: number; // cumulative across every cycle (never resets)
  limit: number;
  percent: number; // 0..100+ (can exceed 100)
  warn: boolean; // >= 80%
  over: boolean; // >= 100%
}

function shape(
  anchor: number,
  sessions: number,
  limit: number,
  now: Date,
): UsageState {
  const percent = limit > 0 ? Math.round((sessions / limit) * 100) : 0;
  return {
    period: cycleStart(anchor, now),
    resetsOn: cycleReset(anchor, now),
    sessions,
    limit,
    percent,
    warn: sessions >= limit * WARN_AT,
    over: sessions >= limit,
  };
}

/**
 * Count one visitor session for a domain and return the resulting state.
 * Atomic upsert-increment so concurrent visitors can't lose counts.
 */
export async function recordSession(site: SiteForUsage): Promise<UsageState> {
  const now = new Date();
  const anchor = anchorDay(site);
  const period = cycleStart(anchor, now);
  const row = await prisma.siteUsage.upsert({
    where: { siteId_period: { siteId: site.id, period } },
    create: { siteId: site.id, period, sessions: 1 },
    update: { sessions: { increment: 1 } },
    select: { sessions: true },
  });
  return shape(anchor, row.sessions, limitForTier(site.planTier), now);
}

/**
 * Current-cycle session count for many domains at once (each on its own
 * anchored cycle). Used by the super-admin platform views. One query: it looks
 * up all the distinct cycle-start keys in play, then matches each domain to its
 * own row.
 */
export async function currentSessionsBySite(
  sites: SiteForUsage[],
): Promise<Map<string, number>> {
  const wanted = new Map<string, string>();
  const periods = new Set<string>();
  for (const s of sites) {
    const p = periodFor(s);
    wanted.set(s.id, p);
    periods.add(p);
  }
  const out = new Map<string, number>();
  if (periods.size === 0) return out;
  const rows = await prisma.siteUsage.findMany({
    where: { period: { in: [...periods] } },
    select: { siteId: true, period: true, sessions: true },
  });
  const byKey = new Map(rows.map((r) => [`${r.siteId}:${r.period}`, r.sessions]));
  for (const s of sites) {
    out.set(s.id, byKey.get(`${s.id}:${wanted.get(s.id)}`) ?? 0);
  }
  return out;
}

/** Read-only current-cycle usage (no increment) — for the dashboard. */
export async function getUsage(site: SiteForUsage): Promise<UsageState> {
  const now = new Date();
  const anchor = anchorDay(site);
  const period = cycleStart(anchor, now);
  const [row, agg] = await Promise.all([
    prisma.siteUsage.findUnique({
      where: { siteId_period: { siteId: site.id, period } },
      select: { sessions: true },
    }),
    // Cumulative visitors across every cycle — never resets.
    prisma.siteUsage.aggregate({
      where: { siteId: site.id },
      _sum: { sessions: true },
    }),
  ]);
  return {
    ...shape(anchor, row?.sessions ?? 0, limitForTier(site.planTier), now),
    allTime: agg._sum.sessions ?? 0,
  };
}
