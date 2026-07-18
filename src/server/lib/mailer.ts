import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";

/**
 * Email sending. Uses SMTP when configured (SMTP_HOST etc.), otherwise falls
 * back to logging the message to the console so notifications are visible in
 * development without any credentials. Never throws — a failed email must not
 * break the underlying action.
 */

let transport: Transporter | null = null;
const smtpConfigured = Boolean(env.SMTP_HOST);

if (smtpConfigured) {
  transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(mail: MailInput): Promise<void> {
  try {
    if (transport) {
      await transport.sendMail({ from: env.MAIL_FROM, ...mail });
      return;
    }
    // Console fallback (dev / unconfigured).
    // eslint-disable-next-line no-console
    console.log(
      `\n📧 [email:console] (set SMTP_HOST to send for real)\n  To:      ${mail.to}\n  Subject: ${mail.subject}\n  ${mail.text.replace(/\n/g, "\n  ")}\n`,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("sendMail failed:", err);
  }
}

export const emailIsLive = smtpConfigured;
