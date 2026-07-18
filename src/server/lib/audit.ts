import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";

interface AuditInput {
  tenantId: string;
  siteId?: string | null;
  actorType?: "admin" | "system";
  actorId?: string | null;
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Append an audit-trail entry. Best-effort: an audit failure must never break
 * the underlying admin action, so we swallow (but log) errors.
 */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        siteId: input.siteId ?? null,
        actorType: input.actorType ?? "admin",
        actorId: input.actorId ?? null,
        action: input.action,
        targetTable: input.targetTable ?? null,
        targetId: input.targetId ?? null,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("audit log write failed", err);
  }
}
