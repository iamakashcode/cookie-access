import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { decrypt } from "@/server/lib/crypto";
import { writeAuditLog } from "@/server/lib/audit";
import { notifyRequesterResolved } from "@/server/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

function safeDecrypt(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return "(unreadable)";
  }
}

const schema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
  resolutionNotes: z.string().max(5000).optional(),
});

// PATCH /api/admin/dpr/:id — advance status / resolve (notifies requester).
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const body = schema.parse(await req.json());

    const existing = await prisma.dPRRequest.findFirst({
      where: { id: params.id, siteId: site.id },
      include: { dataPrincipal: { select: { identifierEnc: true } } },
    });
    if (!existing) throw new HttpError(404, "Request not found");

    const becomingResolved =
      body.status === "resolved" && existing.status !== "resolved";

    const updated = await prisma.dPRRequest.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        resolutionNotes: body.resolutionNotes ?? existing.resolutionNotes,
        resolvedAt: becomingResolved ? new Date() : existing.resolvedAt,
      },
    });

    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: `dpr.${body.status}`,
      targetTable: "dpr_requests",
      targetId: updated.id,
    });

    if (becomingResolved && existing.dataPrincipal) {
      const email = safeDecrypt(existing.dataPrincipal.identifierEnc);
      if (email.includes("@")) {
        void notifyRequesterResolved(email, site.name, {
          id: updated.id,
          type: updated.type,
          resolutionNotes: updated.resolutionNotes,
        });
      }
    }

    return NextResponse.json({ ok: true });
  });
}
