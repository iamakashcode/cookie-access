import { type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import {
  corsJson,
  corsPreflight,
  handlePublic,
  HttpError,
  resolveSiteKey,
} from "@/server/http";
import { findDataPrincipal } from "@/server/lib/principals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

// GET /api/public/consent-status?tenantKey=...&identifier=...
export function GET(req: NextRequest) {
  return handlePublic(async () => {
    const url = new URL(req.url);
    const site = await resolveSiteKey(url.searchParams.get("tenantKey"));
    const identifier = url.searchParams.get("identifier");
    if (!identifier) throw new HttpError(400, "Missing identifier");

    const purposes = await prisma.consentPurpose.findMany({
      where: { siteId: site.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, description: true, isEssential: true },
    });

    const principal = await findDataPrincipal(site.id, identifier);
    const stateByPurpose = new Map<string, { action: string; at: Date }>();
    if (principal) {
      const records = await prisma.consentRecord.findMany({
        where: { dataPrincipalId: principal.id },
        orderBy: { timestamp: "desc" },
        select: { purposeId: true, action: true, timestamp: true },
      });
      for (const r of records) {
        if (!stateByPurpose.has(r.purposeId)) {
          stateByPurpose.set(r.purposeId, { action: r.action, at: r.timestamp });
        }
      }
    }

    return corsJson({
      purposes: purposes.map((p) => {
        const state = stateByPurpose.get(p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          isEssential: p.isEssential,
          granted: p.isEssential ? true : state?.action === "granted",
          lastUpdated: state?.at ?? null,
        };
      }),
    });
  });
}
