import { NextResponse, type NextRequest } from "next/server";
import { cronUnauthorized } from "@/server/http";
import { sweepDprSla } from "@/server/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SLA reminder sweep. Runs daily from Vercel Cron (see vercel.json), or any
 * scheduler:  curl -H "x-cron-secret: $CRON_SECRET" .../api/cron/sla
 *
 * Auth: Vercel Cron's `Authorization: Bearer <CRON_SECRET>` header, or
 * `x-cron-secret`. Refuses every call in production if CRON_SECRET is unset.
 */
async function run(req: NextRequest) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const notified = await sweepDprSla();
  return NextResponse.json({ ok: true, accountsNotified: notified });
}

export const POST = run;
export const GET = run;
