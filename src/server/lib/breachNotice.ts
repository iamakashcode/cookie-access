import { prisma } from "../prisma";

/**
 * DPDP breach-notification generators (§8(6) + Rules 2025). On a personal data
 * breach, the Data Fiduciary must notify (a) each affected Data Principal and
 * (b) the Data Protection Board. These build ready-to-send drafts from the
 * logged incident + the business's published identity/contacts.
 */

interface BreachData {
  description: string;
  affectedCount: number | null;
  dataCategories: string | null;
  consequences: string | null;
  remediation: string | null;
  discoveredAt: Date;
  reportedToBoardAt: Date | null;
  affectedUsersNotifiedAt: Date | null;
  site: {
    name: string;
    legalName: string | null;
    grievanceName: string | null;
    grievanceEmail: string | null;
    grievancePhone: string | null;
  };
}

export async function loadBreach(
  siteId: string,
  breachId: string,
): Promise<BreachData | null> {
  const b = await prisma.breachIncident.findFirst({
    where: { id: breachId, siteId },
    include: {
      site: {
        select: {
          name: true,
          legalName: true,
          grievanceName: true,
          grievanceEmail: true,
          grievancePhone: true,
        },
      },
    },
  });
  return b;
}

const fmt = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" });

function contactBlock(b: BreachData): string {
  const c: string[] = [];
  if (b.site.grievanceName) c.push(b.site.grievanceName);
  if (b.site.grievanceEmail) c.push(b.site.grievanceEmail);
  if (b.site.grievancePhone) c.push(b.site.grievancePhone);
  return c.length ? c.join(", ") : "[add your grievance officer on the DPDP compliance page]";
}

/** Notice to each affected data principal. */
export function affectedUserNotice(b: BreachData): string {
  const who = b.site.legalName || b.site.name;
  return [
    `Subject: Important notice about your personal data — ${who}`,
    ``,
    `Dear customer,`,
    ``,
    `We are writing to inform you of a personal data breach that may affect you, as required under the Digital Personal Data Protection Act, 2023.`,
    ``,
    `What happened: ${b.description}`,
    b.dataCategories ? `Data involved: ${b.dataCategories}` : `Data involved: [describe the types of data]`,
    `When we discovered it: ${fmt(b.discoveredAt)}`,
    ``,
    `Likely consequences: ${b.consequences || "[describe the likely impact on you]"}`,
    ``,
    `What we are doing: ${b.remediation || "[describe the measures taken to contain and remedy the breach]"}`,
    ``,
    `What you can do: Stay alert to unusual activity. If you used the same password elsewhere, change it. Contact us with any concerns.`,
    ``,
    `Contact / Grievance Officer: ${contactBlock(b)}`,
    ``,
    `If you are not satisfied with our response, you may complain to the Data Protection Board of India.`,
    ``,
    `— ${who}`,
  ].join("\n");
}

/** Report to the Data Protection Board of India. */
export function boardReport(b: BreachData): string {
  const who = b.site.legalName || b.site.name;
  return [
    `PERSONAL DATA BREACH REPORT — Data Protection Board of India`,
    `Under the Digital Personal Data Protection Act, 2023 (§8(6))`,
    ``,
    `1. Data Fiduciary: ${who}`,
    `2. Nature of the breach: ${b.description}`,
    `3. Categories of personal data affected: ${b.dataCategories || "[specify]"}`,
    `4. Approximate number of data principals affected: ${b.affectedCount ?? "[specify]"}`,
    `5. Date/time the breach was discovered: ${fmt(b.discoveredAt)}`,
    `6. Likely consequences: ${b.consequences || "[specify]"}`,
    `7. Measures taken to mitigate / remedy: ${b.remediation || "[specify]"}`,
    `8. Affected principals notified: ${b.affectedUsersNotifiedAt ? fmt(b.affectedUsersNotifiedAt) : "pending"}`,
    `9. Contact / Grievance Officer: ${contactBlock(b)}`,
    ``,
    `This is an initial intimation; a detailed report follows within 72 hours of becoming aware of the breach, as required.`,
  ].join("\n");
}

/** Hours remaining until the 72-hour Board-reporting deadline (negative = overdue). */
export function boardDeadlineHours(discoveredAt: Date): number {
  const deadline = discoveredAt.getTime() + 72 * 3600_000;
  return Math.round((deadline - Date.now()) / 3600_000);
}
