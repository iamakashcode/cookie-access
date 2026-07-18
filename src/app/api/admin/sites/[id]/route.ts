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
    select: { id: true, name: true, domain: true },
  });
  if (!s) throw new HttpError(404, "Domain not found");
  return s;
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

// DELETE /api/admin/sites/:id        → archive (reversible; records kept)
// DELETE /api/admin/sites/:id?purge=1 → permanently erase the domain + all its
//                                       data, including its consent ledger.
export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const target = await ownSite(admin.tenantId, params.id);
    const count = await prisma.site.count({ where: { tenantId: admin.tenantId } });
    if (count <= 1) throw new HttpError(400, "You can't remove your only domain.");

    const purge = new URL(req.url).searchParams.get("purge") === "1";

    if (!purge) {
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
    }

    // Permanent purge: cascade removes every child row (purposes, notices,
    // principals, DPR requests, and the consent ledger). The append-only
    // trigger blocks ledger deletes unless we opt in for this transaction only.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SELECT set_config('dpdp.allow_purge', 'on', true)",
      );
      await tx.site.delete({ where: { id: params.id } });
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: null, // the site no longer exists; record its identity below
      actorId: admin.adminId,
      action: "site.delete",
      targetTable: "sites",
      targetId: params.id,
      metadata: { name: target.name, domain: target.domain },
    });
    return NextResponse.json({ ok: true, purged: true });
  });
}
