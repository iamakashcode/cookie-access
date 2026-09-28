import { type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { corsJson, corsPreflight, handlePublic, HttpError } from "@/server/http";
import { getUsage, recordSession } from "@/server/lib/usage";
import { ipKey, overLimit } from "@/server/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

/**
 * GET /api/public/hit?tenantKey=… — counts one visitor session for a domain.
 *
 * The widget calls this once per browser session (not per page view), so this is
 * the metering point for traffic-based plans. Never cached — the count and the
 * over-limit answer must both be live.
 *
 * Returns `{ over }`: when true the domain has used up its monthly session
 * allowance and the widget stops showing the consent banner (it keeps blocking
 * trackers, so the site never tracks without consent).
 *
 * The site key is public, so anyone could call this in a loop to exhaust a
 * domain's allowance and hide its banner. Past a daily cap per IP, further
 * pings are answered but not counted.
 */
export function GET(req: NextRequest) {
  return handlePublic(async () => {
    const key = new URL(req.url).searchParams.get("tenantKey");
    if (!key) throw new HttpError(400, "Missing site key");

    const site = await prisma.site.findUnique({
      where: { apiKey: key },
      select: {
        id: true,
        planTier: true,
        status: true,
        createdAt: true,
        planRenewsAt: true,
      },
    });
    if (!site || site.status !== "active") {
      throw new HttpError(403, "Invalid or inactive site key");
    }

    const flooding = await overLimit(`hit:${site.id}:${ipKey(req)}`, 20, 24 * 60 * 60);
    const usage = flooding ? await getUsage(site) : await recordSession(site);
    const res = corsJson({ over: usage.over });
    res.headers.set("Cache-Control", "no-store");
    return res;
  });
}
