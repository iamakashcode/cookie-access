-- Append-only enforcement for the consent ledger (and notice history).
--
-- The DPDP consent ledger must be defensible as evidence: rows are only ever
-- inserted, never modified or removed. Application code already respects this,
-- but a database trigger makes it a hard guarantee even against a stray query
-- or a compromised app credential.
--
-- Idempotent: safe to run after every migration.

CREATE OR REPLACE FUNCTION dpdp_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'Table % is append-only: % is not permitted (DPDP consent ledger integrity)',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

-- consent_records: no UPDATE, no DELETE.
DROP TRIGGER IF EXISTS trg_consent_records_append_only ON consent_records;
CREATE TRIGGER trg_consent_records_append_only
  BEFORE UPDATE OR DELETE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION dpdp_block_mutation();

-- notice_versions: also append-only (a published notice a user agreed to must
-- never change; edits create a new version instead).
DROP TRIGGER IF EXISTS trg_notice_versions_append_only ON notice_versions;
CREATE TRIGGER trg_notice_versions_append_only
  BEFORE UPDATE OR DELETE ON notice_versions
  FOR EACH ROW EXECUTE FUNCTION dpdp_block_mutation();
