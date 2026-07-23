import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireSuper } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const schema = z.object({ status: z.enum(["active", "suspended"]) });

/**
 * PATCH /api/super/accounts/:id — suspend or reactivate a whole account.
 * Suspending cascades to the account's domains so their widgets stop serving.
 */
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    requireSuper(req);
    const { status } = schema.parse(await req.json());

    const tenant = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!tenant) throw new HttpError(404, "Account not found");

    await prisma.$transaction([
      prisma.tenant.update({ where: { id: params.id }, data: { status } }),
      prisma.site.updateMany({ where: { tenantId: params.id }, data: { status } }),
    ]);

    await prisma.auditLog.create({
      data: {
        tenantId: params.id,
        actorType: "system",
        action: `super.account.${status}`,
        targetTable: "tenants",
        targetId: params.id,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
