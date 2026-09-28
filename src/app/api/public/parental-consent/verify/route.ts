import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { corsJson, corsPreflight, handlePublic, HttpError } from "@/server/http";
import { latestNotice } from "@/server/lib/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

/** A guardian has this long to confirm before the link stops working. */
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function loadPending(token: string | null) {
  if (!token) throw new HttpError(400, "Missing token");
  const pc = await prisma.parentalConsent.findUnique({
    where: { verificationToken: token },
  });
  if (!pc) throw new HttpError(404, "This verification link is invalid");
  const expired = !pc.verifiedAt && Date.now() - pc.createdAt.getTime() > LINK_TTL_MS;
  return { pc, expired };
}

// GET /api/public/parental-consent/verify?token=... — look up a pending request
// so the page can ask the guardian to confirm. Read-only: email security
// scanners open links automatically, so opening one must never record consent.
export function GET(req: NextRequest) {
  return handlePublic(async () => {
    const { pc, expired } = await loadPending(new URL(req.url).searchParams.get("token"));
    const site = await prisma.site.findUnique({
      where: { id: pc.siteId },
      select: { name: true },
    });
    return corsJson({
      siteName: site?.name ?? null,
      alreadyVerified: !!pc.verifiedAt,
      expired,
    });
  });
}

// POST /api/public/parental-consent/verify?token=... — the guardian confirms.
export function POST(req: NextRequest) {
  return handlePublic(async () => {
    const { pc, expired } = await loadPending(new URL(req.url).searchParams.get("token"));
    if (pc.verifiedAt) return corsJson({ ok: true, alreadyVerified: true });
    if (expired) {
      throw new HttpError(410, "This link has expired. Please ask for a new one from the website.");
    }

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
