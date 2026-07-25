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
    const processors = await prisma.processor.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ processors });
  });
}

const schema = z.object({
  name: z.string().min(1).max(200),
  purpose: z.string().min(1).max(500),
  dataShared: z.string().max(500).optional().nullable(),
});

export function POST(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const body = schema.parse(await req.json());
    const processor = await prisma.processor.create({
      data: {
        siteId: site.id,
        name: body.name,
        purpose: body.purpose,
        dataShared: body.dataShared || null,
      },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "processor.create",
      targetTable: "processors",
      targetId: processor.id,
    });
    return NextResponse.json({ processor }, { status: 201 });
  });
}
