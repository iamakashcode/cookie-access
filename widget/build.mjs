import { build, context } from "esbuild";
import { statSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

// Where the API lives. Baked into the bundle at build time so the widget —
// which runs from a CDN on a different origin than the app — knows where to
// call. Override per environment with WIDGET_API_BASE. A tenant can still
// override per-site with a data-api-base attribute on the <script> tag.
// The API now lives in the Next app itself, so this is the app's origin.
const API_BASE = process.env.WIDGET_API_BASE || "http://localhost:3000";

// Output straight into the Next.js public/ folder. Next serves it as a static
// file in dev (http://localhost:3000/widget.js); in production you upload this
// one file to a CDN — the API server never serves it.
const outfile = resolve(__dirname, "../public/widget.js");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: [resolve(__dirname, "src/index.ts")],
  outfile,
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019"],
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
  define: {
    __API_BASE__: JSON.stringify(API_BASE),
  },
};

function reportSize() {
  try {
    const raw = statSync(outfile).size;
    const gz = gzipSync(readFileSync(outfile)).length;
    const kb = (n) => (n / 1024).toFixed(1);
    const flag = raw > 100 * 1024 ? "  ⚠ OVER 100KB BUDGET" : "";
    console.log(
      `widget.js → public/  (API base: ${API_BASE})\n  ${kb(raw)} KB raw, ${kb(gz)} KB gzipped${flag}`,
    );
  } catch {
    /* not built yet */
  }
}

if (watch) {
  const ctx = await context({
    ...options,
    plugins: [{ name: "size", setup: (b) => b.onEnd(() => reportSize()) }],
  });
  await ctx.watch();
  console.log("Watching widget for changes… (Ctrl+C to stop)");
} else {
  await build(options);
  reportSize();
}
