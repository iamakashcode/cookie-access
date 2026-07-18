import { z } from "zod";

/** Banner appearance the business can customise per domain. */
export const bannerThemeSchema = z.object({
  preset: z.string().max(40).default("light"),
  layout: z.enum(["bar", "box-left", "box-right", "modal"]).default("bar"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4338ca"),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1a1a2e"),
  radius: z.coerce.number().int().min(0).max(28).default(14),
});

export type BannerTheme = z.infer<typeof bannerThemeSchema>;

export const DEFAULT_THEME: BannerTheme = bannerThemeSchema.parse({});

/** Merge a stored (possibly partial/legacy) theme JSON with defaults. */
export function resolveTheme(stored: unknown): BannerTheme {
  const parsed = bannerThemeSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : DEFAULT_THEME;
}
