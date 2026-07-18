import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { decrypt } from "@/server/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

function safeDecrypt(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return "(unreadable)";
  }
}

// GET /api/admin/consent/events — the ledger grouped by submission (one row per
// "save"), showing what was accepted vs declined. Same underlying per-purpose
// records; this is just a friendlier read.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const f = filterSchema.parse(
      Object.fromEntries(new URL(req.url).searchParams),
    );

    // Group key: the submission's eventId, or the record's own id for legacy
    // rows without one.
    const where = Prisma.sql`"siteId" = ${site.id}
      ${f.from ? Prisma.sql`AND "timestamp" >= ${new Date(f.from)}` : Prisma.empty}
      ${f.to ? Prisma.sql`AND "timestamp" <= ${new Date(f.to)}` : Prisma.empty}`;

    const [gidRows, totalRows] = await Promise.all([
      prisma.$queryRaw<{ gid: string; ts: Date }[]>(Prisma.sql`
        SELECT COALESCE("eventId", "id") AS gid, MIN("timestamp") AS ts
        FROM consent_records
        WHERE ${where}
        GROUP BY gid
        ORDER BY ts DESC
        LIMIT ${f.pageSize} OFFSET ${(f.page - 1) * f.pageSize}
      `),
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count FROM (
          SELECT COALESCE("eventId", "id") FROM consent_records WHERE ${where} GROUP BY 1
        ) t
      `),
    ]);

    const gids = gidRows.map((r) => r.gid);
    const records = gids.length
      ? await prisma.consentRecord.findMany({
          where: {
            siteId: site.id,
            OR: [{ eventId: { in: gids } }, { id: { in: gids } }],
          },
          orderBy: { timestamp: "asc" },
          include: {
            purpose: { select: { name: true } },
            dataPrincipal: {
              select: { identifierEnc: true, identifierType: true },
            },
          },
        })
      : [];

    type Rec = (typeof records)[number];
    const byGid = new Map<string, Rec[]>();
    for (const r of records) {
      const gid = r.eventId ?? r.id;
      const arr = byGid.get(gid) ?? [];
      arr.push(r);
      byGid.set(gid, arr);
    }

    const events = gidRows.map((row) => {
      const recs = byGid.get(row.gid) ?? [];
      const first = recs[0];
      return {
        id: row.gid,
        timestamp: row.ts,
        identifier: first ? safeDecrypt(first.dataPrincipal.identifierEnc) : "(unknown)",
        identifierType: first?.dataPrincipal.identifierType ?? "anon",
        method: first?.method ?? "widget",
        ipAddress: first?.ipAddress ?? null,
        accepted: recs.filter((r) => r.action === "granted").map((r) => r.purpose.name),
        declined: recs
          .filter((r) => r.action === "withdrawn")
          .map((r) => r.purpose.name),
      };
    });

    return NextResponse.json({
      total: totalRows[0]?.count ?? 0,
      page: f.page,
      pageSize: f.pageSize,
      events,
    });
  });
}
