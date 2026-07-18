import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { writeAuditLog } from "@/server/lib/audit";
import { slugify } from "@/server/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  isEssential: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  involvesMinors: z.boolean(),
  categoryKey: z.string().max(40),
});

async function ownPurpose(siteId: string, id: string) {
  const p = await prisma.consentPurpose.findFirst({
    where: { id, siteId },
    select: { id: true },
  });
  if (!p) throw new HttpError(404, "Purpose not found");
}

export function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    await ownPurpose(site.id, params.id);
    const data = schema.partial().parse(await req.json());
    if (data.categoryKey !== undefined) {
      data.categoryKey = slugify(data.categoryKey);
    }
    const purpose = await prisma.consentPurpose.update({
      where: { id: params.id },
      data,
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "purpose.update",
      targetTable: "consent_purposes",
      targetId: purpose.id,
    });
    return NextResponse.json({ purpose });
  });
}

// Soft-delete: deactivate so historical consent records keep a real purpose row.
export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    await ownPurpose(site.id, params.id);
    await prisma.consentPurpose.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "purpose.deactivate",
      targetTable: "consent_purposes",
      targetId: params.id,
    });
    return NextResponse.json({ ok: true });
  });
}
