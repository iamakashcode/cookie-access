import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Applies database-level guards Prisma's schema can't express: append-only
 * triggers on consent_records / notice_versions. Idempotent — run after every
 * `prisma migrate deploy`. SQL is inlined so it works without file-path
 * assumptions in any environment.
 */
const STATEMENTS: string[] = [
  `CREATE OR REPLACE FUNCTION dpdp_block_mutation()
   RETURNS trigger AS $$
   BEGIN
     -- UPDATEs are never permitted (tampering with recorded consent).
     -- DELETEs are permitted only inside an explicit domain-purge transaction
     -- that opts in with set_config('dpdp.allow_purge','on',true); any stray
     -- delete outside that flow stays blocked.
     IF TG_OP = 'DELETE'
        AND current_setting('dpdp.allow_purge', true) = 'on' THEN
       RETURN OLD;
     END IF;
     RAISE EXCEPTION
       'Table % is append-only: % is not permitted (DPDP consent ledger integrity)',
       TG_TABLE_NAME, TG_OP;
   END;
   $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_consent_records_append_only ON consent_records`,
  `CREATE TRIGGER trg_consent_records_append_only
     BEFORE UPDATE OR DELETE ON consent_records
     FOR EACH ROW EXECUTE FUNCTION dpdp_block_mutation()`,

  `DROP TRIGGER IF EXISTS trg_notice_versions_append_only ON notice_versions`,
  `CREATE TRIGGER trg_notice_versions_append_only
     BEFORE UPDATE OR DELETE ON notice_versions
     FOR EACH ROW EXECUTE FUNCTION dpdp_block_mutation()`,
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const statement of STATEMENTS) {
      await prisma.$executeRawUnsafe(statement);
    }
    // eslint-disable-next-line no-console
    console.log(
      "✓ Append-only triggers installed (consent_records, notice_versions)",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to apply DB guards:", err);
  process.exit(1);
});
