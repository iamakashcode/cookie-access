import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import {
  clientIp,
  corsJson,
  corsPreflight,
  handlePublic,
  HttpError,
  resolveSiteKey,
} from "@/server/http";
import { latestNotice } from "@/server/lib/notices";
import { upsertDataPrincipal } from "@/server/lib/principals";
import { maskIp } from "@/server/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

const schema = z.object({
  tenantKey: z.string().optional(),
  identifier: z.string().min(1).max(320),
  identifierType: z.enum(["email", "phone", "anon"]).default("anon"),
  language: z.string().default("en"),
  decisions: z
    .array(z.object({ purposeId: z.string().min(1), granted: z.boolean() }))
    .min(1),
});

// POST /api/public/consent — append-only grant/withdrawal recording.
export function POST(req: NextRequest) {
  return handlePublic(async () => {
    const body = schema.parse(await req.json());
    const site = await resolveSiteKey(body.tenantKey);

    const notice = await latestNotice(site.id, body.language);
    if (!notice) {
      throw new HttpError(409, "This site has not published a privacy notice yet");
    }

    const principal = await upsertDataPrincipal(
      site.id,
      body.identifier,
      body.identifierType,
    );

    const purposes = await prisma.consentPurpose.findMany({
      where: {
        siteId: site.id,
        isActive: true,
        id: { in: body.decisions.map((d) => d.purposeId) },
      },
      select: { id: true, isEssential: true },
    });
    const purposeById = new Map(purposes.map((p) => [p.id, p]));
    const ip = maskIp(clientIp(req)); // stored masked for data minimisation
    const eventId = crypto.randomUUID(); // one id for this whole submission

    let recorded = 0;
    for (const decision of body.decisions) {
      const purpose = purposeById.get(decision.purposeId);
      if (!purpose) continue;
      const action =
        purpose.isEssential || decision.granted ? "granted" : "withdrawn";

      const latest = await prisma.consentRecord.findFirst({
        where: { dataPrincipalId: principal.id, purposeId: purpose.id },
        orderBy: { timestamp: "desc" },
        select: { action: true },
      });
      if (latest?.action === action) continue;

      await prisma.consentRecord.create({
        data: {
          siteId: site.id,
          dataPrincipalId: principal.id,
          purposeId: purpose.id,
          noticeVersionId: notice.id,
          action,
          method: "widget",
          ipAddress: ip,
          eventId,
        },
      });
      recorded++;
    }

    return corsJson({ ok: true, recorded });
  });
}
