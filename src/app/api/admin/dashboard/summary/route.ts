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
