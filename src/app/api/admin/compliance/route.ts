import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handle, requireAdmin, requireSite } from "@/server/http";
import { writeAuditLog } from "@/server/lib/audit";
import { latestNotice as findLiveNotice } from "@/server/lib/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  legalName: z.string().max(200).optional().nullable(),
  businessAddress: z.string().max(500).optional().nullable(),
  grievanceName: z.string().max(200).optional().nullable(),
  grievanceEmail: z.string().email().max(320).optional().or(z.literal("")).nullable(),
  grievancePhone: z.string().max(40).optional().nullable(),
  dpoName: z.string().max(200).optional().nullable(),
  dpoEmail: z.string().email().max(320).optional().or(z.literal("")).nullable(),
  autoEraseEnabled: z.boolean().optional(),
  retentionGraceDays: z.number().int().min(0).max(3650).optional(),
});

const CONTACT_FIELDS = [
  "legalName",
  "businessAddress",
  "grievanceName",
  "grievanceEmail",
  "grievancePhone",
  "dpoName",
  "dpoEmail",
] as const;

const RETENTION_FIELDS = ["autoEraseEnabled", "retentionGraceDays"] as const;

// GET /api/admin/compliance — contact settings + a DPDP readiness checklist.
export function GET(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);

    const [
      row,
      activePurposes,
      latestNotice,
      minorPurposes,
      openOverdue,
      retentionPurposes,
    ] = await Promise.all([
      prisma.site.findUnique({
        where: { id: site.id },
        select: {
          legalName: true,
          businessAddress: true,
          grievanceName: true,
          grievanceEmail: true,
          grievancePhone: true,
          dpoName: true,
          dpoEmail: true,
          autoEraseEnabled: true,
          retentionGraceDays: true,
          verified: true,
        },
      }),
      prisma.consentPurpose.count({ where: { siteId: site.id, isActive: true } }),
      findLiveNotice(site.id, "en"), // placeholder text doesn't count
      prisma.consentPurpose.count({
        where: { siteId: site.id, isActive: true, involvesMinors: true },
      }),
      // DPR requests already past their SLA deadline and unresolved.
      prisma.dPRRequest.count({
        where: {
          siteId: site.id,
          status: { not: "resolved" },
          slaDeadline: { lt: new Date() },
        },
      }),
      prisma.consentPurpose.count({
        where: { siteId: site.id, isActive: true, retentionDays: { not: null } },
      }),
    ]);

    const contact = Object.fromEntries(
      CONTACT_FIELDS.map((f) => [f, row?.[f] ?? ""]),
    );
    const retention = {
      autoEraseEnabled: row?.autoEraseEnabled ?? false,
      retentionGraceDays: row?.retentionGraceDays ?? 30,
    };

    const checklist = [
      {
        key: "purposes",
        label: "Consent purposes defined",
        done: activePurposes > 0,
        why: "People must be able to consent to each specific purpose (§6).",
        href: "/purposes",
      },
      {
        key: "notice",
        label: "Privacy notice published",
        done: !!latestNotice,
        why: "A clear notice must be shown before consent (§5).",
        href: "/notices",
      },
      {
        key: "grievance",
        label: "Grievance officer published",
        done: !!(row?.grievanceName && row?.grievanceEmail),
        why: "You must publish a contact for complaints and questions (§8(9), §13).",
        href: "/compliance",
      },
      {
        key: "legal",
        label: "Business legal identity set",
        done: !!row?.legalName,
        why: "The notice must identify the Data Fiduciary (§5).",
        href: "/compliance",
      },
      {
        key: "widget",
        label: "Consent widget live on your site",
        done: !!row?.verified,
        why: "Consent can only be collected once the widget is installed.",
        href: "/install",
      },
      {
        key: "retention",
        label: "Data-retention policy set",
        done: retentionPurposes > 0,
        why: "Data must be erased once the purpose is served (§8(7)). Set a retention period on your purposes.",
        href: "/purposes",
      },
      {
        key: "sla",
        label: "No overdue rights requests",
        done: openOverdue === 0,
        why: "Requests must be answered within the statutory time (§13).",
        href: "/requests",
      },
    ];

    const done = checklist.filter((c) => c.done).length;
    return NextResponse.json({
      contact,
      retention,
      checklist,
      score: Math.round((done / checklist.length) * 100),
      done,
      total: checklist.length,
      hasMinors: minorPurposes > 0,
    });
  });
}

// PUT /api/admin/compliance — save the contact / legal-identity settings.
export function PUT(req: NextRequest) {
  return handle(async () => {
    const admin = requireAdmin(req);
    const site = await requireSite(req, admin.tenantId);
    const body = schema.parse(await req.json());

    const data: Record<string, unknown> = Object.fromEntries(
      CONTACT_FIELDS.map((f) => [f, (body[f] ?? "") === "" ? null : body[f]]),
    );
    for (const f of RETENTION_FIELDS) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    await prisma.site.update({ where: { id: site.id }, data });
    await writeAuditLog({
      tenantId: admin.tenantId,
      siteId: site.id,
      actorId: admin.adminId,
      action: "compliance.update",
    });
    return NextResponse.json({ ok: true });
  });
}
