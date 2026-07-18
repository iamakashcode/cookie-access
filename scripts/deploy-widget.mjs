import { AwsClient } from "aws4fetch";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Build widget.js (with the production API URL baked in) and upload it to
 * Cloudflare R2, so it's served from the edge — customer-site traffic never
 * touches our server.
 *
 * Reads config from the environment (put secrets in client/.env.local):
 *   R2_ACCOUNT_ID          Cloudflare account id
 *   R2_ACCESS_KEY_ID       R2 S3 API token — access key id
 *   R2_SECRET_ACCESS_KEY   R2 S3 API token — secret
 *   R2_BUCKET              bucket name (default: cookie-access)
 *   R2_PUBLIC_URL          public r2.dev / custom-domain base (for the printout)
 *   WIDGET_API_BASE        public API origin baked into the bundle
 *
 * Run:  npm run deploy:widget   (from the client folder)
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET = "cookie-access",
  R2_PUBLIC_URL = "",
  WIDGET_API_BASE = "http://localhost:4000",
} = process.env;

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!R2_ACCOUNT_ID) fail("R2_ACCOUNT_ID is not set (see client/.env.local).");
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
  fail("R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not set (see client/.env.local).");

if (/localhost|127\.0\.0\.1/.test(WIDGET_API_BASE)) {
  console.warn(
    `\n⚠ WIDGET_API_BASE is "${WIDGET_API_BASE}". A widget baked with a localhost\n` +
      `  API can't work on real customer sites. Set WIDGET_API_BASE to your public\n` +
      `  API URL before deploying for production.\n`,
  );
}

// 1. Build the widget with the production API base baked in.
console.log(`Building widget (API base: ${WIDGET_API_BASE}) …`);
const build = spawnSync("node", ["widget/build.mjs"], {
  cwd: clientDir,
  stdio: "inherit",
  env: { ...process.env, WIDGET_API_BASE },
});
if (build.status !== 0) fail("Widget build failed.");

// 2. Read the built bundle.
const filePath = resolve(clientDir, "public/widget.js");
const body = readFileSync(filePath);
const sizeKb = (statSync(filePath).size / 1024).toFixed(1);

// 3. Upload to R2 via its S3-compatible API.
const aws = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

const objectUrl = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/widget.js`;

console.log(`Uploading widget.js (${sizeKb} KB) to r2://${R2_BUCKET}/widget.js …`);
const res = await aws.fetch(objectUrl, {
  method: "PUT",
  body,
  headers: {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  },
});

if (!res.ok) {
  const text = await res.text().catch(() => "");
  fail(`Upload failed: HTTP ${res.status}\n${text}`);
}

const publicUrl = R2_PUBLIC_URL
  ? `${R2_PUBLIC_URL.replace(/\/+$/, "")}/widget.js`
  : "(set R2_PUBLIC_URL to see the public link)";

console.log(`\n✓ Deployed. Public widget URL:\n  ${publicUrl}\n`);
