import type { NextRequest } from "next/server";
import { prisma } from "../prisma";
import { HttpError, clientIp } from "../http";
import { blindIndex } from "./crypto";

/**
 * Fixed-window rate limiting backed by Postgres, so a limit holds across every
 * serverless instance (an in-memory counter would reset per instance). Each
 * (key, window) is one row, incremented atomically.
 *
 * Fails open: if the counter can't be written (e.g. a DB hiccup), the request
 * is allowed rather than locking every visitor out.
 */
export async function overLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const windowMs = windowSec * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const expiresAt = new Date((bucket + 1) * windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO rate_limits ("key", "count", "expiresAt")
      VALUES (${`${key}:${bucket}`}, 1, ${expiresAt})
      ON CONFLICT ("key") DO UPDATE SET "count" = rate_limits."count" + 1
      RETURNING "count"`;
    return (rows[0]?.count ?? 0) > limit;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("rate limit check failed (allowing request):", (err as Error).message);
    return false;
  }
}

/** Throw a 429 once `key` exceeds `limit` requests within `windowSec`. */
export async function enforceLimit(
  key: string,
  limit: number,
  windowSec: number,
  message = "Too many attempts. Please wait a few minutes and try again.",
): Promise<void> {
  if (await overLimit(key, limit, windowSec)) throw new HttpError(429, message);
}

/**
 * Rate-limit key part for the caller's IP. Hashed with the blind-index key so
 * raw IP addresses are never stored.
 */
export function ipKey(req: NextRequest): string {
  const ip = clientIp(req);
  return ip ? blindIndex(ip) : "unknown";
}

/** Keyed hash of an email/identifier, for per-account limits. */
export function idKey(identifier: string): string {
  return blindIndex(identifier);
}

/** Delete expired counters. Called from the daily retention cron. */
export async function sweepRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
