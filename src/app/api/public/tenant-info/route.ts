import { type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { corsJson, corsPreflight, handlePublic, resolveSiteKey } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

// GET /api/public/tenant-info?tenantKey=... — business name + published grievance
// contact, so the rights portal can show people who to contact and how to escalate.
export function GET(req: NextRequest) {
  return handlePublic(async () => {
    const url = new URL(req.url);
    const site = await resolveSiteKey(url.searchParams.get("tenantKey"));
    const row = await prisma.site.findUnique({
      where: { id: site.id },
      select: {
        legalName: true,
        grievanceName: true,
        grievanceEmail: true,
        grievancePhone: true,
      },
    });
    return corsJson({
      businessName: site.name,
      legalName: row?.legalName ?? null,
      grievance:
        row?.grievanceEmail || row?.grievanceName
          ? {
              name: row?.grievanceName ?? null,
              email: row?.grievanceEmail ?? null,
              phone: row?.grievancePhone ?? null,
            }
          : null,
    });
  });
}
