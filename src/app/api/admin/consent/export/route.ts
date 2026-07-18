import { type NextRequest } from "next/server";
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
});

function safeDecrypt(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return "(unreadable)";
  }
}
function csv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// GET /api/admin/consent/export — full filtered CSV export.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const f = filterSchema.parse(Object.fromEntries(new URL(req.url).searchParams));

    const where: Prisma.ConsentRecordWhereInput = { siteId: site.id };
    if (f.purposeId) where.purposeId = f.purposeId;
    if (f.action) where.action = f.action;
    if (f.from || f.to) {
      where.timestamp = {};
      if (f.from) where.timestamp.gte = new Date(f.from);
      if (f.to) where.timestamp.lte = new Date(f.to);
    }

    // Stream rows in batches so a large ledger doesn't buffer fully in memory.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            "record_id,timestamp,identifier,identifier_type,purpose,action,method,ip_address,notice_version\n",
          ),
        );
        const batchSize = 500;
        let cursor: string | undefined;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const batch = await prisma.consentRecord.findMany({
            where,
            orderBy: { timestamp: "desc" },
            take: batchSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            include: {
              purpose: { select: { name: true } },
              noticeVersion: { select: { version: true, language: true } },
              dataPrincipal: {
                select: { identifierEnc: true, identifierType: true },
              },
            },
          });
          if (batch.length === 0) break;
          for (const r of batch) {
            controller.enqueue(
              encoder.encode(
                [
                  r.id,
                  r.timestamp.toISOString(),
                  csv(safeDecrypt(r.dataPrincipal.identifierEnc)),
                  r.dataPrincipal.identifierType,
                  csv(r.purpose.name),
                  r.action,
                  r.method,
                  r.ipAddress ?? "",
                  `${r.noticeVersion.language} v${r.noticeVersion.version}`,
                ].join(",") + "\n",
              ),
            );
          }
          cursor = batch[batch.length - 1].id;
          if (batch.length < batchSize) break;
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="consent-ledger-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  });
}
