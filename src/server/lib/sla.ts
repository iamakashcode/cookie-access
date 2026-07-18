import { env } from "../env";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deadline to respond to a rights request: created time + configured SLA days. */
export function slaDeadlineFrom(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + env.DPR_SLA_DAYS * DAY_MS);
}

/** Whole days left until the deadline (negative = overdue). */
export function daysUntil(deadline: Date, now: Date = new Date()): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
}
