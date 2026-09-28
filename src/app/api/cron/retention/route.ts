import { NextResponse, type NextRequest } from "next/server";
import { cronUnauthorized } from "@/server/http";
import { sweepRetention } from "@/server/lib/retention";
import { sweepRateLimits } from "@/server/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Data-retention sweep (§8(7)). Runs daily from Vercel Cron (see vercel.json),
 * or from any scheduler:
 *   curl -H "x-cron-secret: $CRON_SECRET" .../api/cron/retention
 *
 * Auth: Vercel Cron's `Authorization: Bearer <CRON_SECRET>` header, or
 * `x-cron-secret`. Refuses every call in production if CRON_SECRET is unset.
 * Also clears expired rate-limit counters.
 */
async function run(req: NextRequest) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const result = await sweepRetention();
  const rateLimitsCleared = await sweepRateLimits();
  return NextResponse.json({ ok: true, ...result, rateLimitsCleared });
}

export const POST = run;
export const GET = run;
