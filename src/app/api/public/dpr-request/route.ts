import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { corsJson, corsPreflight, handlePublic, resolveSiteKey } from "@/server/http";
import { upsertDataPrincipal } from "@/server/lib/principals";
import { encrypt } from "@/server/lib/crypto";
import { slaDeadlineFrom } from "@/server/lib/sla";
import { notifyAdminsNewDpr } from "@/server/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

const schema = z.object({
  tenantKey: z.string().optional(),
  type: z.enum(["access", "correction", "erasure", "grievance", "nomination"]),
  email: z.string().email("A contact email is required so we can respond"),
  details: z.string().min(1).max(5000),
});

// POST /api/public/dpr-request
export function POST(req: NextRequest) {
  return handlePublic(async () => {
    const body = schema.parse(await req.json());
    const site = await resolveSiteKey(body.tenantKey);

    const principal = await upsertDataPrincipal(site.id, body.email, "email");
    const dpr = await prisma.dPRRequest.create({
      data: {
        siteId: site.id,
        dataPrincipalId: principal.id,
        type: body.type,
        detailsEnc: encrypt(body.details),
        status: "open",
        slaDeadline: slaDeadlineFrom(),
      },
      select: { id: true, type: true, slaDeadline: true },
    });

    void notifyAdminsNewDpr(site.tenantId, site.name, dpr);
    return corsJson({ ok: true, referenceId: dpr.id, dueBy: dpr.slaDeadline }, 201);
  });
}
