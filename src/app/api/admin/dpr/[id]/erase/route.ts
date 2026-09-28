import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { erasePrincipal } from "@/server/lib/erase";
import { writeAuditLog } from "@/server/lib/audit";
import { notifyRequesterResolved } from "@/server/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/dpr/:id/erase — fulfil an erasure request in one click.
 * Crypto-erases the person (see erasePrincipal) so they can never be identified
 * again, while their anonymous consent rows remain as the evidence trail.
 */
export function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const params = await ctx.params;
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);

    const request = await prisma.dPRRequest.findFirst({
      where: { id: params.id, siteId: site.id },
      select: { id: true, dataPrincipalId: true },
    });
    if (!request?.dataPrincipalId) {
      throw new HttpError(404, "Request not found");
    }

    const { email } = await erasePrincipal(site.id, request.dataPrincipalId);

    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "dpr.erase",
      targetTable: "data_principals",
      targetId: request.dataPrincipalId,
    });

    if (email) {
      void notifyRequesterResolved(email, site.name, {
        id: request.id,
        type: "erasure",
        resolutionNotes:
          "Your personal data has been erased from our consent records.",
      });
    }

    return NextResponse.json({ ok: true });
  });
}
