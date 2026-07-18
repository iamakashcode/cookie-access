import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { writeAuditLog } from "@/server/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/notices?language=en — version history (append-only).
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const language = new URL(req.url).searchParams.get("language") || undefined;
    const notices = await prisma.noticeVersion.findMany({
      where: { siteId: site.id, ...(language ? { language } : {}) },
      orderBy: [{ language: "asc" }, { version: "desc" }],
    });
    return NextResponse.json({ notices });
  });
}

const schema = z.object({
  language: z.string().min(2).max(10).default("en"),
  bodyText: z.string().min(1),
});

// POST /api/admin/notices — publish a NEW version (never overwrites).
export function POST(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const { language, bodyText } = schema.parse(await req.json());

    const last = await prisma.noticeVersion.findFirst({
      where: { siteId: site.id, language },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;

    const notice = await prisma.noticeVersion.create({
      data: { siteId: site.id, language, bodyText, version },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "notice.publish",
      targetTable: "notice_versions",
      targetId: notice.id,
      metadata: { language, version },
    });
    return NextResponse.json({ notice }, { status: 201 });
  });
}
