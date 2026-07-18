import { prisma } from "../prisma";
import { env } from "../env";
import { sendMail } from "./mailer";

/**
 * Notification emails. All best-effort (sendMail never throws). In dev without
 * SMTP these print to the server console. Admins are account-level; a domain's
 * events notify all of the account's admins.
 */

async function accountAdminEmails(tenantId: string): Promise<string[]> {
  const admins = await prisma.adminUser.findMany({
    where: { tenantId },
    select: { email: true },
  });
  return admins.map((a) => a.email);
}

const DPR_LABEL: Record<string, string> = {
  access: "Access their data",
  correction: "Correct their data",
  erasure: "Erase their data",
  grievance: "Grievance",
  nomination: "Nomination",
};

export async function notifyAdminsNewDpr(
  tenantId: string,
  siteName: string,
  dpr: { id: string; type: string; slaDeadline: Date },
): Promise<void> {
  const emails = await accountAdminEmails(tenantId);
  const due = dpr.slaDeadline.toDateString();
  const link = `${env.APP_URL}/requests`;
  await Promise.all(
    emails.map((to) =>
      sendMail({
        to,
        subject: `New data-rights request on ${siteName} (${DPR_LABEL[dpr.type] ?? dpr.type})`,
        text: `A visitor to ${siteName} has submitted a "${
          DPR_LABEL[dpr.type] ?? dpr.type
        }" request.\n\nPlease respond by ${due}.\n\nReview it in your dashboard: ${link}\n\nReference: ${dpr.id}`,
      }),
    ),
  );
}

export async function notifyRequesterResolved(
  to: string,
  siteName: string,
  dpr: { id: string; type: string; resolutionNotes?: string | null },
): Promise<void> {
  await sendMail({
    to,
    subject: `Your data-rights request to ${siteName} has been resolved`,
    text: `Hello,\n\n${siteName} has resolved your "${
      DPR_LABEL[dpr.type] ?? dpr.type
    }" request.\n${dpr.resolutionNotes ? `\nNote from ${siteName}: ${dpr.resolutionNotes}\n` : ""}\nReference: ${dpr.id}\n\nIf you have further questions, please contact ${siteName} directly.`,
  });
}

export async function sendGuardianVerification(
  to: string,
  siteName: string,
  verifyUrl: string,
): Promise<void> {
  await sendMail({
    to,
    subject: `Please confirm consent for a child on ${siteName}`,
    text: `Hello,\n\nSomeone has indicated you are the parent/guardian and asked for your consent for a child to use ${siteName}.\n\nIf you approve, please confirm by opening this link:\n${verifyUrl}\n\nIf you did not expect this email, you can ignore it — no consent will be recorded.`,
  });
}
