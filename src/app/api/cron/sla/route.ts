import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { sweepDprSla } from "@/server/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SLA reminder sweep. Runs daily from Vercel Cron (see vercel.json), or any
 * scheduler:  curl -H "x-cron-secret: $CRON_SECRET" .../api/cron/sla
 *
 * Auth (when CRON_SECRET is set): accepts Vercel Cron's `Authorization: Bearer
 * <CRON_SECRET>` header, or `x-cron-secret`, or `?secret=`.
 */
async function run(req: NextRequest) {
  if (env.CRON_SECRET) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const provided =
      bearer ||
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
