import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireSuper } from "@/server/http";
import { currentPeriod, limitForTier } from "@/server/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/super/sites — every domain across the platform, with its account.
export function GET(req: NextRequest) {
  return handle(async () => {
    requireSuper(req);
    const period = currentPeriod();
    const sites = await prisma.site.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { businessName: true, contactEmail: true } },
        _count: { select: { consentRecords: true, dprRequests: true } },
        usage: { where: { period }, select: { sessions: true } },
      },
    });
    return NextResponse.json({
      sites: sites.map((s) => {
        const sessions = s.usage[0]?.sessions ?? 0;
        const limit = limitForTier(s.planTier);
        return {
          id: s.id,
          name: s.name,
          domain: s.domain,
          account: s.tenant.businessName,
          contactEmail: s.tenant.contactEmail,
          planTier: s.planTier,
          status: s.status,
          verified: s.verified,
          subscriptionStatus: s.subscriptionStatus,
          createdAt: s.createdAt,
          usage: { sessions, limit, percent: Math.round((sessions / limit) * 100) },
          counts: {
            consentRecords: s._count.consentRecords,
            dprRequests: s._count.dprRequests,
          },
        };
      }),
    });
  });
}
