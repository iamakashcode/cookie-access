import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { decrypt } from "@/server/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filterSchema = z.object({
  purposeId: z.string().optional(),
  action: z.enum(["granted", "withdrawn"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

function safeDecrypt(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return "(unreadable)";
  }
}

// GET /api/admin/consent — paginated, filterable ledger view.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const f = filterSchema.parse(
      Object.fromEntries(new URL(req.url).searchParams),
    );

    const where: Prisma.ConsentRecordWhereInput = { siteId: site.id };
    if (f.purposeId) where.purposeId = f.purposeId;
    if (f.action) where.action = f.action;
    if (f.from || f.to) {
      where.timestamp = {};
      if (f.from) where.timestamp.gte = new Date(f.from);
      if (f.to) where.timestamp.lte = new Date(f.to);
    }

    const [total, rows] = await Promise.all([
      prisma.consentRecord.count({ where }),
      prisma.consentRecord.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
        include: {
          purpose: { select: { name: true } },
          dataPrincipal: { select: { identifierEnc: true, identifierType: true } },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page: f.page,
      pageSize: f.pageSize,
      records: rows.map((r) => ({
        id: r.id,
        purpose: r.purpose.name,
        action: r.action,
        identifier: safeDecrypt(r.dataPrincipal.identifierEnc),
        identifierType: r.dataPrincipal.identifierType,
        method: r.method,
        ipAddress: r.ipAddress,
        timestamp: r.timestamp,
      })),
    });
  });
}
