import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { corsJson, corsPreflight, handlePublic, HttpError } from "@/server/http";
import { latestNotice } from "@/server/lib/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

// GET /api/public/parental-consent/verify?token=... — guardian confirms.
export function GET(req: NextRequest) {
  return handlePublic(async () => {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) throw new HttpError(400, "Missing token");

    const pc = await prisma.parentalConsent.findUnique({
      where: { verificationToken: token },
    });
    if (!pc) throw new HttpError(404, "This verification link is invalid");
    if (pc.verifiedAt) return corsJson({ ok: true, alreadyVerified: true });

    const notice = await latestNotice(pc.siteId, pc.language);
    if (!notice) throw new HttpError(409, "No notice published");

    const decisions =
      (pc.pendingPurposes as Array<{ purposeId: string; granted: boolean }>) ?? [];
    const purposes = await prisma.consentPurpose.findMany({
      where: { siteId: pc.siteId, id: { in: decisions.map((d) => d.purposeId) } },
      select: { id: true, isEssential: true },
    });
    const byId = new Map(purposes.map((p) => [p.id, p]));
    const eventId = crypto.randomUUID(); // one id for this verification batch

    await prisma.$transaction(async (tx) => {
      for (const d of decisions) {
        const purpose = byId.get(d.purposeId);
        if (!purpose) continue;
        const action = purpose.isEssential || d.granted ? "granted" : "withdrawn";
        await tx.consentRecord.create({
          data: {
            siteId: pc.siteId,
            dataPrincipalId: pc.dataPrincipalId,
            purposeId: d.purposeId,
            noticeVersionId: notice.id,
            action,
            method: "api",
            eventId,
          },
        });
      }
      await tx.parentalConsent.update({
        where: { id: pc.id },
        data: { verifiedAt: new Date(), method: "email-link" },
      });
    });

    return corsJson({ ok: true, verified: true });
  });
}
