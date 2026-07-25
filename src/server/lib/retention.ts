import { prisma } from "../prisma";
import { erasePrincipal } from "./erase";
import { writeAuditLog } from "./audit";

/**
 * Data-retention sweep (§8(7)). For every domain that has opted in, erase the
 * personal data of people who no longer have a live basis to be kept:
 *
 *   • they withdrew all their consents, or
 *   • every purpose they granted is older than that purpose's retention period,
 *
 * and a grace period has since passed. A "live grant" is a purpose whose latest
 * action is "granted" and (has no retention set, or is within it). Only
 * *identified* people (email/phone) are considered — anonymous device records
 * hold no personal data to erase.
 */
export async function sweepRetention(): Promise<{
  erased: number;
  sitesProcessed: number;
}> {
  const sites = await prisma.site.findMany({
    where: { autoEraseEnabled: true },
    select: { id: true, tenantId: true, retentionGraceDays: true },
  });

  let erased = 0;
  for (const site of sites) {
    erased += await sweepSite(site.id, site.tenantId, site.retentionGraceDays);
  }
  return { erased, sitesProcessed: sites.length };
}

async function sweepSite(
  siteId: string,
  tenantId: string,
  graceDays: number,
): Promise<number> {
  const now = Date.now();
  const graceMs = graceDays * 86_400_000;

  // Retention period per purpose (null = keep until withdrawn).
  const purposes = await prisma.consentPurpose.findMany({
    where: { siteId },
    select: { id: true, retentionDays: true },
  });
  const retentionOf = new Map(purposes.map((p) => [p.id, p.retentionDays]));

  // Identified people who haven't already been erased.
  const principals = await prisma.dataPrincipal.findMany({
    where: {
      siteId,
      identifierType: { in: ["email", "phone"] },
      NOT: { identifierHash: { startsWith: "erased_" } },
    },
    select: { id: true },
  });
  if (principals.length === 0) return 0;
  const ids = new Set(principals.map((p) => p.id));

  // Latest action + time per (person, purpose).
  const latest = await prisma.$queryRaw<
    { dataPrincipalId: string; purposeId: string; action: string; timestamp: Date }[]
  >`
    SELECT DISTINCT ON ("dataPrincipalId", "purposeId")
      "dataPrincipalId", "purposeId", "action", "timestamp"
    FROM consent_records
    WHERE "siteId" = ${siteId}
    ORDER BY "dataPrincipalId", "purposeId", "timestamp" DESC
  `;

  // Fold into per-person state.
  type State = { liveGrant: boolean; lastActivity: number };
  const state = new Map<string, State>();
  for (const row of latest) {
    if (!ids.has(row.dataPrincipalId)) continue;
    const s = state.get(row.dataPrincipalId) ?? { liveGrant: false, lastActivity: 0 };
    const ts = new Date(row.timestamp).getTime();
    if (ts > s.lastActivity) s.lastActivity = ts;
    if (row.action === "granted") {
      const days = retentionOf.get(row.purposeId);
      const withinRetention = days == null || now - ts <= days * 86_400_000;
      if (withinRetention) s.liveGrant = true;
    }
    state.set(row.dataPrincipalId, s);
  }

  // Erase people with no live grant, once the grace window has passed.
  let count = 0;
  for (const [principalId, s] of state) {
    if (s.liveGrant) continue;
    if (now - s.lastActivity < graceMs) continue;
    await erasePrincipal(siteId, principalId, {
      note:
        "Your personal data was erased under our retention policy (consent " +
        "withdrawn or the purpose is no longer active).",
    });
    await writeAuditLog({
      tenantId,
      siteId,
      actorType: "system",
      action: "retention.erase",
      targetTable: "data_principals",
      targetId: principalId,
    });
    count++;
  }
  return count;
}
