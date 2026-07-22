import { prisma } from "../prisma";

/**
 * Traffic metering. Plans are sold on monthly **visitor sessions**: the widget
 * pings once per browser session, so a visitor browsing 20 pages counts once.
 * That keeps metering cheap (it doesn't defeat the widget's caching) while still
 * scaling price with a customer's real traffic.
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

export function currentPeriod(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function limitForTier(tier: string): number {
  return PLAN_SESSION_LIMITS[(tier as Tier) ?? "free"] ?? PLAN_SESSION_LIMITS.free;
}

export interface UsageState {
  period: string;
  sessions: number;
  limit: number;
  percent: number; // 0..100+ (can exceed 100)
  warn: boolean; // >= 80%
  over: boolean; // >= 100%
}

function shape(period: string, sessions: number, limit: number): UsageState {
  const percent = limit > 0 ? Math.round((sessions / limit) * 100) : 0;
  return {
    period,
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
export async function recordSession(
  siteId: string,
  tier: string,
): Promise<UsageState> {
  const period = currentPeriod();
  const row = await prisma.siteUsage.upsert({
    where: { siteId_period: { siteId, period } },
    create: { siteId, period, sessions: 1 },
    update: { sessions: { increment: 1 } },
    select: { sessions: true },
  });
  return shape(period, row.sessions, limitForTier(tier));
}

/** Read-only current usage (no increment) — for the dashboard. */
export async function getUsage(
  siteId: string,
  tier: string,
): Promise<UsageState> {
  const period = currentPeriod();
  const row = await prisma.siteUsage.findUnique({
    where: { siteId_period: { siteId, period } },
    select: { sessions: true },
  });
  return shape(period, row?.sessions ?? 0, limitForTier(tier));
}
