// Injected at build time by esbuild (see build.mjs `define`). This is the API
// origin the widget calls. Because the widget is served from a CDN — a
// different origin than the API — the URL can't be derived from the script's
// own location, so it's baked in.
declare const __API_BASE__: string;

export interface WidgetConfig {
  tenantKey: string;
  apiBase: string; // e.g. https://api.example.com  (no trailing slash)
  language: string;
}

/**
 * Read configuration off our own <script> tag. Because the bundle is loaded
 * async, `document.currentScript` is unreliable, so we locate the tag by its
 * `data-tenant-key` attribute.
 *
 * The API base is, in order of preference:
 *   1. an explicit `data-api-base` attribute (per-site override)
 *   2. the value baked in at build time (__API_BASE__)
 *   3. the origin the script was served from (last-resort fallback)
 */
export function readConfig(): WidgetConfig | null {
  const script =
    (document.currentScript as HTMLScriptElement | null) ||
    document.querySelector<HTMLScriptElement>("script[data-tenant-key]");

  if (!script) return null;

  const tenantKey = script.getAttribute("data-tenant-key");
  if (!tenantKey) return null;

  let apiBase = script.getAttribute("data-api-base") || __API_BASE__ || "";
  if (!apiBase) {
    try {
      apiBase = new URL(script.src).origin;
    } catch {
      apiBase = window.location.origin;
    }
  }
  apiBase = apiBase.replace(/\/+$/, "");

  const language =
    script.getAttribute("data-language") ||
    (document.documentElement.lang || "en").slice(0, 2);

  return { tenantKey, apiBase, language };
}
