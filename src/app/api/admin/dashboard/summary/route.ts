import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/dashboard/summary — headline numbers for the selected domain.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const siteId = site.id;

    const [
      totalGrants,
      totalWithdrawals,
      trackedPeople,
      activePurposes,
      openDprCount,
      byPurposeRaw,
      recent,
    ] = await Promise.all([
      prisma.consentRecord.count({ where: { siteId, action: "granted" } }),
      prisma.consentRecord.count({ where: { siteId, action: "withdrawn" } }),
      prisma.dataPrincipal.count({ where: { siteId } }),
      prisma.consentPurpose.count({ where: { siteId, isActive: true } }),
      prisma.dPRRequest.count({
        where: { siteId, status: { in: ["open", "in_progress"] } },
      }),
      prisma.consentRecord.groupBy({
        by: ["purposeId", "action"],
        where: { siteId },
        _count: { _all: true },
      }),
      prisma.consentRecord.findMany({
        where: { siteId },
        orderBy: { timestamp: "desc" },
        take: 10,
        include: { purpose: { select: { name: true } } },
      }),
    ]);

    // Daily activity for the last 30 days (for the trend chart). Grouped in SQL
    // so we never pull the whole ledger into memory.
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);
    const dailyRaw = await prisma.$queryRaw<
      { day: Date; action: string; count: bigint }[]
    >`
      SELECT date_trunc('day', "timestamp") AS day, "action", COUNT(*) AS count
      FROM consent_records
      WHERE "siteId" = ${siteId} AND "timestamp" >= ${since}
      GROUP BY 1, 2
      ORDER BY 1
    `;

    // Fill every day in the window so the line has no gaps.
    const byDay = new Map<string, { granted: number; withdrawn: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      byDay.set(d.toISOString().slice(0, 10), { granted: 0, withdrawn: 0 });
    }
    for (const r of dailyRaw) {
      const key = new Date(r.day).toISOString().slice(0, 10);
      const slot = byDay.get(key);
      if (slot) {
        if (r.action === "granted") slot.granted = Number(r.count);
        else slot.withdrawn = Number(r.count);
      }
    }
    const daily = [...byDay.entries()].map(([date, v]) => ({ date, ...v }));

    const purposeIds = [...new Set(byPurposeRaw.map((r) => r.purposeId))];
    const purposes = await prisma.consentPurpose.findMany({
      where: { id: { in: purposeIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(purposes.map((p) => [p.id, p.name]));
    const byPurpose = purposeIds.map((id) => {
      const granted =
        byPurposeRaw.find((r) => r.purposeId === id && r.action === "granted")
          ?._count._all ?? 0;
      const withdrawn =
        byPurposeRaw.find((r) => r.purposeId === id && r.action === "withdrawn")
          ?._count._all ?? 0;
      return { purpose: nameById.get(id) ?? "(removed)", granted, withdrawn };
    });

    return NextResponse.json({
      totals: {
        grants: totalGrants,
        withdrawals: totalWithdrawals,
        trackedPeople,
        activePurposes,
        openDprRequests: openDprCount,
      },
      byPurpose,
      daily,
      recentActivity: recent.map((r) => ({
        id: r.id,
        purpose: r.purpose.name,
        action: r.action,
        method: r.method,
        timestamp: r.timestamp,
      })),
    });
  });
}
