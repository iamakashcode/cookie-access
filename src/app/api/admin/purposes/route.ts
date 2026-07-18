import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { writeAuditLog } from "@/server/lib/audit";
import { slugify } from "@/server/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const purposes = await prisma.consentPurpose.findMany({
      where: { siteId: site.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ purposes });
  });
}

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  isEssential: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  involvesMinors: z.boolean().default(false),
  categoryKey: z.string().max(40).optional(),
});

export function POST(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const data = schema.parse(await req.json());
    const categoryKey = data.categoryKey
      ? slugify(data.categoryKey)
      : data.isEssential
        ? "essential"
        : slugify(data.name);
    const purpose = await prisma.consentPurpose.create({
      data: { ...data, categoryKey, siteId: site.id },
    });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "purpose.create",
      targetTable: "consent_purposes",
      targetId: purpose.id,
    });
    return NextResponse.json({ purpose }, { status: 201 });
  });
}
