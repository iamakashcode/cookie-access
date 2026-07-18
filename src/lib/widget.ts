// Builds the install snippet shown to customers. The widget URL is the R2/CDN
// URL when NEXT_PUBLIC_WIDGET_URL is set, otherwise this site's own /widget.js.

export function widgetUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WIDGET_URL;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (configured) {
    return configured.endsWith(".js")
      ? configured
      : `${configured.replace(/\/+$/, "")}/widget.js`;
  }
  return `${origin}/widget.js`;
}

// Block-first: the widget must load in <head>, before trackers — so no `async`.
export function widgetSnippet(apiKey: string): string {
  return `<script\n  src="${widgetUrl()}"\n  data-tenant-key="${apiKey}"\n></script>`;
}
