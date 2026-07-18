import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireSuper } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/super/sites — every domain across the platform, with its account.
export function GET(req: NextRequest) {
  return handle(async () => {
    requireSuper(req);
    const sites = await prisma.site.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { businessName: true, contactEmail: true } },
        _count: { select: { consentRecords: true, dprRequests: true } },
      },
    });
    return NextResponse.json({
      sites: sites.map((s) => ({
        id: s.id,
        name: s.name,
        domain: s.domain,
        account: s.tenant.businessName,
        contactEmail: s.tenant.contactEmail,
        planTier: s.planTier,
        status: s.status,
        subscriptionStatus: s.subscriptionStatus,
        createdAt: s.createdAt,
        counts: {
          consentRecords: s._count.consentRecords,
          dprRequests: s._count.dprRequests,
        },
      })),
    });
  });
}
