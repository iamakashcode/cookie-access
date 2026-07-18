import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { bannerThemeSchema, resolveTheme } from "@/server/lib/theme";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/appearance — the selected domain's banner theme (with defaults).
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const row = await prisma.site.findUnique({
      where: { id: site.id },
      select: { bannerTheme: true },
    });
    return NextResponse.json({ theme: resolveTheme(row?.bannerTheme) });
  });
}

// PUT /api/admin/appearance — save the banner theme for the selected domain.
export function PUT(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const theme = bannerThemeSchema.parse(await req.json());

    await prisma.site.update({
      where: { id: site.id },
      data: { bannerTheme: theme },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "appearance.update",
      targetTable: "sites",
      targetId: site.id,
    });
    return NextResponse.json({ theme });
  });
}
