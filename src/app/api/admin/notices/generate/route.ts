import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { generateNotice } from "@/server/lib/noticeGen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/notices/generate?language=en — an itemized DPDP notice built
// from the domain's purposes + published compliance settings (§5). Returned as
// draft text for the owner to review before publishing.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const language = z
      .enum(["en", "hi"])
      .catch("en")
      .parse(new URL(req.url).searchParams.get("language"));
    const bodyText = await generateNotice(site.id, language);
    return NextResponse.json({ bodyText });
  });
}
