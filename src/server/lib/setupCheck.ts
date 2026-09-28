import { prisma } from "../prisma";
import { env } from "../env";
import { isPlaceholderNotice } from "./notices";

export interface SetupItem {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
}

/**
 * Production readiness of the platform's own configuration, for the operator
 * dashboard. Reads the live environment, so it reflects what's actually set on
 * the host (e.g. Vercel), not the local .env.
 */
export async function platformSetup(): Promise<SetupItem[]> {
  const widgetUrl = process.env.NEXT_PUBLIC_WIDGET_URL || "";
  const rzpKey = env.RAZORPAY_KEY_ID || "";

  const activeSites = await prisma.site.findMany({
    where: { status: "active" },
    select: { id: true },
  });
  const latest = await prisma.noticeVersion.findMany({
    where: { language: "en", siteId: { in: activeSites.map((s) => s.id) } },
    orderBy: [{ siteId: "asc" }, { version: "desc" }],
    distinct: ["siteId"],
    select: { siteId: true, bodyText: true },
  });
  const live = new Set(
    latest.filter((n) => !isPlaceholderNotice(n.bodyText)).map((n) => n.siteId),
  );
  const noNotice = activeSites.filter((s) => !live.has(s.id)).length;

  return [
    {
      key: "email",
      label: "Email sending",
      ok: !!env.SMTP_HOST,
      hint: "Set SMTP_HOST/PORT/USER/PASS and MAIL_FROM. Without them, rights-request alerts and guardian verification emails are never sent.",
    },
    {
      key: "cron",
      label: "Cron secret",
      ok: !!env.CRON_SECRET,
      hint: "Set CRON_SECRET. Without it the daily SLA-reminder and retention jobs refuse to run.",
    },
    {
      key: "widget",
      label: "Widget on your own CDN domain",
      ok: !!widgetUrl && !widgetUrl.includes(".r2.dev"),
      hint: "Serve widget.js from a custom domain (e.g. cdn.yourdomain.com) and set NEXT_PUBLIC_WIDGET_URL. r2.dev URLs are rate-limited and not meant for production.",
    },
    {
      key: "https",
      label: "Public app URL + secure cookies",
      ok: env.APP_URL.startsWith("https://") && env.COOKIE_SECURE,
      hint: "Set APP_URL to your https:// address (used in email links) and COOKIE_SECURE=true.",
    },
    {
      key: "billing",
      label: "Live payments",
      ok: rzpKey.startsWith("rzp_live_") && !!env.RAZORPAY_WEBHOOK_SECRET,
      hint: rzpKey.startsWith("rzp_test_")
        ? "Razorpay is in test mode — no real payments are taken. Switch to live keys (and live plan ids + webhook secret) once Razorpay activates your account."
        : "Set RAZORPAY_KEY_ID/SECRET, the plan ids and RAZORPAY_WEBHOOK_SECRET.",
    },
    {
      key: "notices",
      label: "Every active domain has a privacy notice",
      ok: noNotice === 0,
      hint: `${noNotice} active domain${noNotice === 1 ? "" : "s"} ha${noNotice === 1 ? "s" : "ve"} no published English notice, so the banner is hidden there and trackers stay blocked.`,
    },
  ];
}
