/** URL/attribute-safe slug for a purpose category key, e.g. "Analytics" → "analytics". */
export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "purpose";
}
