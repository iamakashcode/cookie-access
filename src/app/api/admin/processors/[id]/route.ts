import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const params = await ctx.params;
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const found = await prisma.processor.findFirst({
      where: { id: params.id, siteId: site.id },
      select: { id: true },
    });
    if (!found) throw new HttpError(404, "Processor not found");
    await prisma.processor.delete({ where: { id: params.id } });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "processor.delete",
      targetTable: "processors",
      targetId: params.id,
    });
    return NextResponse.json({ ok: true });
  });
}
