import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin } from "@/server/http";
import { writeAuditLog } from "@/server/lib/audit";
import { shapeSite } from "@/server/lib/siteShape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function ownSite(tenantId: string, id: string) {
  const s = await prisma.site.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!s) throw new HttpError(404, "Domain not found");
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  domain: z.string().max(255).nullable().optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

// PATCH /api/admin/sites/:id — rename / set hostname / archive-reactivate.
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    await ownSite(admin.tenantId, params.id);
    const body = updateSchema.parse(await req.json());
    const site = await prisma.site.update({ where: { id: params.id }, data: body });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "site.update",
      targetTable: "sites",
      targetId: site.id,
    });
    return NextResponse.json({ site: shapeSite(site) });
  });
}

// DELETE /api/admin/sites/:id — archive (append-only ledger must survive).
export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    await ownSite(admin.tenantId, params.id);
    const count = await prisma.site.count({ where: { tenantId: admin.tenantId } });
    if (count <= 1) throw new HttpError(400, "You can't remove your only domain.");
    await prisma.site.update({
      where: { id: params.id },
      data: { status: "suspended" },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: params.id,
      actorId: admin.adminId,
      action: "site.archive",
      targetTable: "sites",
      targetId: params.id,
    });
    return NextResponse.json({ ok: true });
  });
}
