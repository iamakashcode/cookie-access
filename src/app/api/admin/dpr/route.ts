import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { decrypt } from "@/server/lib/crypto";
import { daysUntil } from "@/server/lib/sla";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecrypt(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return "(unreadable)";
  }
}

// GET /api/admin/dpr?status=&type= — the rights-request queue for the domain.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;

    const where: Prisma.DPRRequestWhereInput = { siteId: site.id };
    if (status) where.status = status as Prisma.DPRRequestWhereInput["status"];
    if (type) where.type = type as Prisma.DPRRequestWhereInput["type"];

    const rows = await prisma.dPRRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { slaDeadline: "asc" }],
      include: { dataPrincipal: { select: { identifierEnc: true } } },
    });

    return NextResponse.json({
      requests: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        requester: r.dataPrincipal
          ? safeDecrypt(r.dataPrincipal.identifierEnc)
          : "(unknown)",
        details: safeDecrypt(r.detailsEnc),
        resolutionNotes: r.resolutionNotes,
        createdAt: r.createdAt,
        slaDeadline: r.slaDeadline,
        daysLeft: r.status === "resolved" ? null : daysUntil(r.slaDeadline),
        resolvedAt: r.resolvedAt,
      })),
    });
  });
}
