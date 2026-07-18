import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, HttpError, requireAdmin, requireSite } from "@/server/http";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const schema = z.object({
  reportedToBoardAt: z.string().nullable().optional(),
  affectedUsersNotifiedAt: z.string().nullable().optional(),
  status: z.enum(["open", "reported", "closed"]).optional(),
});

export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const existing = await prisma.breachIncident.findFirst({
      where: { id: params.id, siteId: site.id },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Incident not found");

    const body = schema.parse(await req.json());
    const breach = await prisma.breachIncident.update({
      where: { id: existing.id },
      data: {
        reportedToBoardAt:
          body.reportedToBoardAt === undefined
            ? undefined
            : body.reportedToBoardAt
              ? new Date(body.reportedToBoardAt)
              : null,
        affectedUsersNotifiedAt:
          body.affectedUsersNotifiedAt === undefined
            ? undefined
            : body.affectedUsersNotifiedAt
              ? new Date(body.affectedUsersNotifiedAt)
              : null,
        status: body.status,
      },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "breach.update",
      targetTable: "breach_incidents",
      targetId: breach.id,
    });
    return NextResponse.json({ breach });
  });
}
