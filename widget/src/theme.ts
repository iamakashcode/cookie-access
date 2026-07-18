export interface BannerTheme {
  preset: string;
  layout: "bar" | "box-left" | "box-right" | "modal";
  primaryColor: string;
  bgColor: string;
  textColor: string;
  radius: number;
}

export const DEFAULT_THEME: BannerTheme = {
  preset: "light",
  layout: "bar",
  primaryColor: "#4338ca",
  bgColor: "#ffffff",
  textColor: "#1a1a2e",
  radius: 14,
};

export function resolveTheme(t?: Partial<BannerTheme> | null): BannerTheme {
  return { ...DEFAULT_THEME, ...(t || {}) };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 26, g: 26, b: 46 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Pick black/white text for readable contrast on a colour (WCAG-ish luminance). */
function contrast(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111111" : "#ffffff";
}

/** Derived CSS custom properties applied to the widget's shadow host. */
export function themeVars(t: BannerTheme): Record<string, string> {
  const text = hexToRgb(t.textColor);
  const rgba = (a: number) => `rgba(${text.r},${text.g},${text.b},${a})`;
  return {
    "--dpdp-primary": t.primaryColor,
    "--dpdp-on-primary": contrast(t.primaryColor),
    "--dpdp-bg": t.bgColor,
    "--dpdp-text": t.textColor,
    "--dpdp-muted": rgba(0.62),
    "--dpdp-secondary-bg": rgba(0.08),
    "--dpdp-secondary-bg-hover": rgba(0.15),
    "--dpdp-border": rgba(0.14),
    "--dpdp-radius": `${t.radius}px`,
  };
}
