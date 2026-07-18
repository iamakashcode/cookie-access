import { type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import {
  corsJson,
  corsPreflight,
  detectOrigin,
  handlePublic,
  resolveSiteKey,
} from "@/server/http";
import { latestNotice } from "@/server/lib/notices";
import { markSiteVerified } from "@/server/lib/verification";
import { slugify } from "@/server/lib/slug";
import { resolveTheme } from "@/server/lib/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = corsPreflight;

// GET /api/public/purposes?tenantKey=...&language=en
export function GET(req: NextRequest) {
  return handlePublic(async () => {
    const url = new URL(req.url);
    const site = await resolveSiteKey(url.searchParams.get("tenantKey"));
    const language = url.searchParams.get("language") || "en";

    // Domain verification: the script is live on a real website. Fire-and-forget.
    if (!site.verified) {
      const origin = detectOrigin(req);
      if (origin) void markSiteVerified(site.id, origin);
    }

    // Edge caching: this response changes rarely, so let the CDN serve it and
    // keep the DB/function out of the per-pageview path. Only cache verified
    // domains — unverified ones must keep hitting the function so verification
    // fires reliably on their first real load. Cache key = full URL (per key +
    // language). `s-maxage` caches at the edge; browser still revalidates.
    const cacheControl = site.verified
      ? "public, s-maxage=60, stale-while-revalidate=300"
      : "no-store";

    const [purposes, notice, siteRow] = await Promise.all([
      prisma.consentPurpose.findMany({
        where: { siteId: site.id, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          isEssential: true,
          involvesMinors: true,
          categoryKey: true,
        },
      }),
      latestNotice(site.id, language),
      prisma.site.findUnique({
        where: { id: site.id },
        select: { bannerTheme: true },
      }),
    ]);

    const res = corsJson({
      businessName: site.name,
      theme: resolveTheme(siteRow?.bannerTheme),
      purposes: purposes.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        isEssential: p.isEssential,
        involvesMinors: p.involvesMinors,
        // Stable key the host page uses to gate scripts (data-dpdp="…").
        key: p.categoryKey || slugify(p.name),
      })),
      notice: notice
        ? {
            id: notice.id,
            language: notice.language,
            version: notice.version,
            bodyText: notice.bodyText,
            publishedAt: notice.publishedAt,
          }
        : null,
    });
    res.headers.set("Cache-Control", cacheControl);
    // Vercel's edge honours this explicitly, independent of the framework.
    res.headers.set("CDN-Cache-Control", cacheControl);
    return res;
  });
}
