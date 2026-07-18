import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireSuper } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const schema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  planTier: z.enum(["free", "starter", "growth"]).optional(),
});

// PATCH /api/super/sites/:id — suspend/activate a domain or change its plan.
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const superAdmin = requireSuper(req);
    const body = schema.parse(await req.json());
    const existing = await prisma.site.findUnique({
      where: { id: params.id },
      select: { id: true, tenantId: true },
    });
    if (!existing) throw new HttpError(404, "Domain not found");

    const site = await prisma.site.update({
      where: { id: existing.id },
      data: { status: body.status, planTier: body.planTier },
      select: { id: true, status: true, planTier: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: existing.tenantId,
        siteId: site.id,
        actorType: "system",
        actorId: superAdmin.superId,
        action: "super.site.update",
        metadata: body,
      },
    });

    return NextResponse.json({ site });
  });
}
