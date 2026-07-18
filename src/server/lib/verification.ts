import { prisma } from "../prisma";

/**
 * Mark a domain verified the first time its widget script loads on a real
 * website. Idempotent + race-safe: the `verified: false` filter means only the
 * first successful load writes (and records that origin); later loads no-op.
 */
export async function markSiteVerified(
  siteId: string,
  origin: string,
): Promise<void> {
  try {
    await prisma.site.updateMany({
      where: { id: siteId, verified: false },
      data: { verified: true, verifiedAt: new Date(), verifiedOrigin: origin },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("domain verification write failed", err);
  }
}
