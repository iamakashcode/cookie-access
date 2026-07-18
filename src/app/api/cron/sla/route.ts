import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { sweepDprSla } from "@/server/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SLA reminder sweep. Trigger daily from system cron / a scheduler:
 *   curl -X POST -H "x-cron-secret: $CRON_SECRET" https://app.example.com/api/cron/sla
 * Protected by CRON_SECRET when set.
 */
async function run(req: NextRequest) {
  if (env.CRON_SECRET) {
    const provided =
      req.headers.get("x-cron-secret") ||
      new URL(req.url).searchParams.get("secret");
    if (provided !== env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const notified = await sweepDprSla();
  return NextResponse.json({ ok: true, accountsNotified: notified });
}

export const POST = run;
export const GET = run;
