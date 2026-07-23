import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireSuper } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/super/accounts — every business account on the platform.
export function GET(req: NextRequest) {
  return handle(async () => {
    requireSuper(req);
    const q = new URL(req.url).searchParams.get("q")?.trim();

    const tenants = await prisma.tenant.findMany({
      where: q
        ? {
            OR: [
              { businessName: { contains: q, mode: "insensitive" } },
              { contactEmail: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        admins: { select: { email: true, role: true, createdAt: true } },
        sites: {
          select: {
            id: true,
            name: true,
            domain: true,
            planTier: true,
            status: true,
            verified: true,
          },
        },
      },
    });

    return NextResponse.json({
      accounts: tenants.map((t) => ({
        id: t.id,
        businessName: t.businessName,
        contactEmail: t.contactEmail,
        status: t.status,
        createdAt: t.createdAt,
        admins: t.admins,
        sites: t.sites,
        siteCount: t.sites.length,
        paidSites: t.sites.filter((s) => s.planTier !== "free").length,
        verifiedSites: t.sites.filter((s) => s.verified).length,
      })),
    });
  });
}
