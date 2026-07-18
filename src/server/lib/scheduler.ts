import { prisma } from "../prisma";
import { daysUntil } from "./sla";
import { sendMail } from "./mailer";
import { env } from "../env";

/**
 * SLA reminder sweep — emails account admins about rights requests nearing or
 * past their deadline. Triggered by the /api/cron/sla endpoint (system cron or
 * a scheduled service), instead of a persistent in-process timer.
 * Returns the number of accounts notified.
 */
export async function sweepDprSla(): Promise<number> {
  const open = await prisma.dPRRequest.findMany({
    where: { status: { in: ["open", "in_progress"] } },
    select: {
      id: true,
      type: true,
      slaDeadline: true,
      site: { select: { tenantId: true, name: true } },
    },
  });

  // Only ping for requests due within 3 days or overdue.
  const dueSoon = open.filter((r) => daysUntil(r.slaDeadline) <= 3);
  if (dueSoon.length === 0) return 0;

  // Group by account (tenant) → one digest email per account's admins.
  const byTenant = new Map<string, typeof dueSoon>();
  for (const r of dueSoon) {
    const list = byTenant.get(r.site.tenantId) ?? [];
    list.push(r);
    byTenant.set(r.site.tenantId, list);
  }

  for (const [tenantId, requests] of byTenant) {
    const admins = await prisma.adminUser.findMany({
      where: { tenantId },
      select: { email: true },
    });
    const lines = requests
      .map((r) => {
        const d = daysUntil(r.slaDeadline);
        const when = d < 0 ? `${-d} day(s) OVERDUE` : `due in ${d} day(s)`;
        return `  • [${r.site.name}] ${r.type} — ${when} (ref ${r.id})`;
      })
      .join("\n");
    const text = `You have ${requests.length} data-rights request(s) needing attention:\n\n${lines}\n\nOpen your queue: ${env.APP_URL}/requests`;
    await Promise.all(
      admins.map((a) =>
        sendMail({
          to: a.email,
          subject: `Action needed: ${requests.length} data-rights request(s) due soon`,
          text,
        }),
      ),
    );
  }
  return byTenant.size;
}
