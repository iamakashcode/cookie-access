import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const breaches = await prisma.breachIncident.findMany({
      where: { siteId: site.id },
      orderBy: { discoveredAt: "desc" },
    });
    return NextResponse.json({ breaches });
  });
}

const schema = z.object({
  description: z.string().min(1).max(5000),
  discoveredAt: z.string(),
});

export function POST(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const body = schema.parse(await req.json());
    const breach = await prisma.breachIncident.create({
      data: {
        siteId: site.id,
        description: body.description,
        discoveredAt: new Date(body.discoveredAt),
      },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "breach.create",
      targetTable: "breach_incidents",
      targetId: breach.id,
    });
    return NextResponse.json({ breach }, { status: 201 });
  });
}
