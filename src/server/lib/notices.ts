import { prisma } from "../prisma";

/** Latest published notice for a site in the requested language (en fallback). */
export async function latestNotice(siteId: string, language: string) {
  const notice = await prisma.noticeVersion.findFirst({
    where: { siteId, language },
    orderBy: { version: "desc" },
  });
  if (notice) return notice;
  if (language !== "en") {
    return prisma.noticeVersion.findFirst({
      where: { siteId, language: "en" },
      orderBy: { version: "desc" },
    });
  }
  return null;
}
