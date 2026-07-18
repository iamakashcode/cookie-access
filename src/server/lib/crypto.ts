import crypto from "node:crypto";
import { env } from "../env";

/**
 * PII-at-rest helpers.
 *
 * Personal data (DataPrincipal identifiers, DPRRequest details) is stored
 * encrypted with AES-256-GCM. Because we still need to look a principal up by
 * their identifier (e.g. "show me this email's consent state"), we also store
 * a deterministic HMAC "blind index" of the identifier and query on that —
 * so lookups never require a table scan + decrypt, and the plaintext never
 * touches an index.
 */

const ALGO = "aes-256-gcm";

function loadKey(raw: string, label: string): Buffer {
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `${label} must decode to exactly 32 bytes (got ${key.length}). ` +
        `Generate one with: openssl rand -base64 32`,
    );
  }
  return key;
}

const encryptionKey = loadKey(env.ENCRYPTION_KEY, "ENCRYPTION_KEY");
const blindIndexKey = Buffer.from(env.BLIND_INDEX_KEY, "base64");

/**
 * Encrypt a UTF-8 string. Output format: base64(iv):base64(authTag):base64(ct)
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** Reverse of {@link encrypt}. Throws if the ciphertext was tampered with. */
export function decrypt(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Malformed ciphertext payload");
  }
  const decipher = crypto.createDecipheriv(
    ALGO,
    encryptionKey,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * Deterministic keyed hash of an identifier, used for equality lookups on
 * encrypted columns. Identifiers are normalised (trim + lowercase) so
 * "User@Example.com" and "user@example.com " resolve to the same principal.
 */
export function blindIndex(identifier: string): string {
  const normalised = identifier.trim().toLowerCase();
  return crypto
    .createHmac("sha256", blindIndexKey)
    .update(normalised)
    .digest("hex");
}

/**
 * Generate a tenant's public widget API key. It's an identifier, not a secret
 * (it ships in a <script> tag), so a random URL-safe token is all we need.
 */
export function generateApiKey(): string {
  return `dpdp_pk_${crypto.randomBytes(24).toString("base64url")}`;
}
