import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const tenant = await prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { id: true, businessName: true },
    });
    return NextResponse.json({
      admin: { id: admin.adminId, email: admin.email, role: admin.role },
      tenant,
    });
  });
}
