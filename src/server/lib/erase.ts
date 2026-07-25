import crypto from "node:crypto";
import { prisma } from "../prisma";
import { decrypt, encrypt } from "./crypto";

function safeDecrypt(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return "";
  }
}

const DEFAULT_NOTE =
  "Your personal data has been erased from our consent records. You can no " +
  "longer be identified in the system.";

/**
 * Crypto-erase one person from a domain: overwrite their identifier so they can
 * never be identified or looked up again, and redact the free text + device id
 * on all their rights requests. Their consent rows survive as anonymous,
 * aggregate records — this honours erasure (§8(7)/§12) without breaking the
 * append-only ledger. Returns the contact email (captured before erasing) so
 * the caller can notify them, or null if there was nothing to erase.
 */
export async function erasePrincipal(
  siteId: string,
  principalId: string,
  opts?: { note?: string },
): Promise<{ email: string | null }> {
  const principal = await prisma.dataPrincipal.findFirst({
    where: { id: principalId, siteId },
    select: { id: true, identifierEnc: true },
  });
  if (!principal) return { email: null };

  const email = safeDecrypt(principal.identifierEnc);

  await prisma.dataPrincipal.update({
    where: { id: principal.id },
    data: {
      identifierEnc: encrypt("[erased]"),
      identifierHash: `erased_${crypto.randomBytes(16).toString("hex")}`,
      identifierType: "anon",
    },
  });

  const note = opts?.note ?? DEFAULT_NOTE;
  const requests = await prisma.dPRRequest.findMany({
    where: { siteId, dataPrincipalId: principal.id },
    select: { id: true, status: true },
  });
  const erasedDetails = encrypt("[erased]");
  if (requests.length > 0) {
    await prisma.$transaction(
      requests.map((r) =>
        prisma.dPRRequest.update({
          where: { id: r.id },
          data: {
            detailsEnc: erasedDetails,
            subjectRef: null,
            ...(r.status !== "resolved"
              ? { status: "resolved", resolvedAt: new Date(), resolutionNotes: note }
              : {}),
          },
        }),
      ),
    );
  }

  return { email: email.includes("@") ? email : null };
}
