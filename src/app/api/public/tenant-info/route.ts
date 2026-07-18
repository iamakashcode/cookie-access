import { type NextRequest } from "next/server";
import { corsJson, corsPreflight, handlePublic, resolveSiteKey } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

// GET /api/public/tenant-info?tenantKey=... — domain name for the rights portal.
export function GET(req: NextRequest) {
  return handlePublic(async () => {
    const url = new URL(req.url);
    const site = await resolveSiteKey(url.searchParams.get("tenantKey"));
    return corsJson({ businessName: site.name });
  });
}
