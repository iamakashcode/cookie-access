import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { sweepRetention } from "@/server/lib/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Data-retention sweep (§8(7)). Runs daily from Vercel Cron (see vercel.json),
 * or from any scheduler:
 *   curl -H "x-cron-secret: $CRON_SECRET" .../api/cron/retention
 *
 * Auth (when CRON_SECRET is set): Vercel Cron's `Authorization: Bearer <secret>`,
 * or `x-cron-secret`, or `?secret=`.
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
  const result = await sweepRetention();
  return NextResponse.json({ ok: true, ...result });
}

export const POST = run;
export const GET = run;
