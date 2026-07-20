import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { decrypt } from "@/server/lib/crypto";
import { buildConsentReport } from "@/server/lib/consentPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

function safeDecrypt(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return "(unreadable)";
  }
}

// GET /api/admin/consent/events/:id/pdf — one submission as a downloadable PDF.
export function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const gid = params.id;

    // All per-purpose rows that make up this submission (grouped by eventId, or
    // the record's own id for legacy rows without one). Scoped to this domain.
    const records = await prisma.consentRecord.findMany({
      where: {
        siteId: site.id,
        OR: [{ eventId: gid }, { id: gid }],
      },
      orderBy: { timestamp: "asc" },
      include: {
        purpose: { select: { name: true } },
        noticeVersion: { select: { version: true, language: true } },
        dataPrincipal: { select: { identifierEnc: true, identifierType: true } },
      },
    });

    if (records.length === 0) {
      throw new HttpError(404, "Consent record not found");
    }

    const siteRow = await prisma.site.findUnique({
      where: { id: site.id },
      select: { name: true, domain: true },
    });

    const first = records[0];
    const pdf = await buildConsentReport({
      businessName: siteRow?.name ?? "Consent record",
      domain: siteRow?.domain ?? null,
      eventId: gid,
      timestamp: first.timestamp,
      identifier: safeDecrypt(first.dataPrincipal.identifierEnc),
      identifierType: first.dataPrincipal.identifierType,
      method: first.method,
      ipAddress: first.ipAddress,
      noticeVersion: first.noticeVersion?.version ?? null,
      noticeLanguage: first.noticeVersion?.language ?? null,
      accepted: records.filter((r) => r.action === "granted").map((r) => r.purpose.name),
      declined: records.filter((r) => r.action === "withdrawn").map((r) => r.purpose.name),
    });

    const filename = `consent-${gid.slice(0, 12)}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
