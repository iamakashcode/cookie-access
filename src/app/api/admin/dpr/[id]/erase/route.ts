import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { decrypt, encrypt } from "@/server/lib/crypto";
import { writeAuditLog } from "@/server/lib/audit";
import { notifyRequesterResolved } from "@/server/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

function safeDecrypt(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return "";
  }
}

/**
 * POST /api/admin/dpr/:id/erase — fulfil an erasure request in one click.
 *
 * We "crypto-erase" the person: their stored identifier (email/phone) is
 * overwritten with a redacted marker and its lookup hash is randomised, so the
 * person can never again be identified or found in the system. Their consent
 * rows remain as anonymous, aggregate records — this keeps the append-only
 * ledger intact while removing the personal data, which is the defensible way
 * to honour erasure without destroying your evidence trail.
 */
export function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);

    const request = await prisma.dPRRequest.findFirst({
      where: { id: params.id, siteId: site.id },
      include: {
        dataPrincipal: { select: { id: true, identifierEnc: true } },
      },
    });
    if (!request || !request.dataPrincipal) {
      throw new HttpError(404, "Request not found");
    }

    // Capture the contact email BEFORE erasing, so we can still notify them.
    const email = safeDecrypt(request.dataPrincipal.identifierEnc);

    // Overwrite the identity: redacted ciphertext + a random, unusable hash
    // (keeps the unique index valid while making lookup impossible).
    await prisma.dataPrincipal.update({
      where: { id: request.dataPrincipal.id },
      data: {
        identifierEnc: encrypt("[erased]"),
        identifierHash: `erased_${crypto.randomBytes(16).toString("hex")}`,
        identifierType: "anon",
      },
    });

    // Resolve the request (and any other open requests from the same person,
    // since that identity no longer exists).
    const note =
      "Your personal data has been erased from our consent records. You can no " +
      "longer be identified in the system.";
    await prisma.dPRRequest.updateMany({
      where: {
        siteId: site.id,
        dataPrincipalId: request.dataPrincipal.id,
        status: { not: "resolved" },
      },
      data: { status: "resolved", resolvedAt: new Date(), resolutionNotes: note },
    });

    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "dpr.erase",
      targetTable: "data_principals",
      targetId: request.dataPrincipal.id,
    });

    if (email.includes("@")) {
      void notifyRequesterResolved(email, site.name, {
        id: request.id,
        type: "erasure",
        resolutionNotes: note,
      });
    }

    return NextResponse.json({ ok: true });
  });
}
