import { prisma } from "../prisma";

/**
 * Domains created before notices had to be written by the owner were given an
 * auto-published starter template. That text says it's a placeholder, so it
 * must never be shown to visitors or used as the basis of consent. It's
 * recognised by this sentence (the ledger is append-only, so the old rows
 * can't be flagged in place).
 */
const PLACEHOLDER_MARKER = "This is a starter template — please review and edit it";

export function isPlaceholderNotice(bodyText: string): boolean {
  return bodyText.includes(PLACEHOLDER_MARKER);
}

async function latestFor(siteId: string, language: string) {
  const notice = await prisma.noticeVersion.findFirst({
    where: { siteId, language },
    orderBy: { version: "desc" },
  });
  return notice && !isPlaceholderNotice(notice.bodyText) ? notice : null;
}

/**
 * Latest published notice for a site in the requested language (en fallback).
 * Null until the owner has published a real notice — the widget then shows no
 * banner and keeps trackers blocked.
 */
export async function latestNotice(siteId: string, language: string) {
  const notice = await latestFor(siteId, language);
  if (notice) return notice;
  if (language !== "en") return latestFor(siteId, "en");
  return null;
}
