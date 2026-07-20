import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { decrypt } from "@/server/lib/crypto";
import { buildAccessReport } from "@/server/lib/consentPdf";
import { writeAuditLog } from "@/server/lib/audit";

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

// GET /api/admin/dpr/:id/export?format=pdf|json
// The "access my data" package: everything this platform holds about the person
// who made the request — their identifier, full consent history, and requests.
export function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "pdf";

    const request = await prisma.dPRRequest.findFirst({
      where: { id: params.id, siteId: site.id },
      include: {
        dataPrincipal: {
          select: { id: true, identifierEnc: true, identifierType: true },
        },
      },
    });
    if (!request || !request.dataPrincipal) {
      throw new HttpError(404, "Request not found");
    }

    const principalId = request.dataPrincipal.id;
    const identifier = safeDecrypt(request.dataPrincipal.identifierEnc);
    const identifierType = request.dataPrincipal.identifierType;

    // Everything this person did on this domain.
    const [records, requests, siteRow] = await Promise.all([
      prisma.consentRecord.findMany({
        where: { siteId: site.id, dataPrincipalId: principalId },
        orderBy: { timestamp: "desc" },
        include: {
          purpose: { select: { name: true } },
          noticeVersion: { select: { version: true } },
        },
      }),
      prisma.dPRRequest.findMany({
        where: { siteId: site.id, dataPrincipalId: principalId },
        orderBy: { createdAt: "desc" },
        select: { type: true, status: true, createdAt: true },
      }),
      prisma.site.findUnique({
        where: { id: site.id },
        select: { name: true, domain: true },
      }),
    ]);

    const consent = records.map((r) => ({
      purpose: r.purpose.name,
      action: r.action as "granted" | "withdrawn",
      timestamp: r.timestamp,
      noticeVersion: r.noticeVersion?.version ?? null,
      method: r.method,
      ipAddress: r.ipAddress,
    }));

    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "dpr.access.export",
      targetTable: "dpr_requests",
      targetId: request.id,
      metadata: { format, records: records.length },
    });

    const base = `data-${identifier.replace(/[^a-z0-9]+/gi, "-").slice(0, 30)}`;

    if (format === "json") {
      const payload = {
        generatedAt: new Date().toISOString(),
        business: siteRow?.name ?? null,
        domain: siteRow?.domain ?? null,
        dataPrincipal: { identifier, identifierType },
        note: "Personal data held by the consent-management platform. Data in other business systems is provided separately.",
        consentRecords: consent.map((c) => ({
          ...c,
          timestamp: c.timestamp.toISOString(),
        })),
        rightsRequests: requests.map((r) => ({
          type: r.type,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      };
      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${base}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdf = await buildAccessReport({
      businessName: siteRow?.name ?? "Access report",
      domain: siteRow?.domain ?? null,
      identifier,
      identifierType,
      consent,
      requests: requests.map((r) => ({
        type: r.type,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
