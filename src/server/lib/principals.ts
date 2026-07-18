import type { IdentifierType } from "@prisma/client";
import { prisma } from "../prisma";
import { blindIndex, encrypt } from "./crypto";

/**
 * Find-or-create a DataPrincipal for a SITE by their (encrypted) identifier,
 * keyed on the blind index so the same identifier maps to one row per site.
 *
 * Uses upsert on the (siteId, identifierHash) unique constraint to avoid a race
 * between two concurrent consent submissions for a new visitor.
 */
export async function upsertDataPrincipal(
  siteId: string,
  identifier: string,
  identifierType: IdentifierType,
): Promise<{ id: string }> {
  const identifierHash = blindIndex(identifier);
  return prisma.dataPrincipal.upsert({
    where: { siteId_identifierHash: { siteId, identifierHash } },
    update: {}, // identifier already stored; nothing to change on re-visit
    create: {
      siteId,
      identifierType,
      identifierEnc: encrypt(identifier),
      identifierHash,
    },
    select: { id: true },
  });
}

/** Look up an existing principal by identifier without creating one. */
export function findDataPrincipal(siteId: string, identifier: string) {
  return prisma.dataPrincipal.findUnique({
    where: {
      siteId_identifierHash: { siteId, identifierHash: blindIndex(identifier) },
    },
    select: { id: true },
  });
}
