/**
 * Mask an IP address for storage — data minimisation. We keep enough to be a
 * useful audit signal (rough network/region) without retaining a full, directly
 * identifying address.
 *   IPv4  → zero the last octet:      203.0.113.45  → 203.0.113.0
 *   IPv6  → keep the first 3 groups:  2001:db8:abcd:1234::1 → 2001:db8:abcd::
 */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const a = ip.trim();

  // IPv4-mapped IPv6 (e.g. ::ffff:203.0.113.45) → treat as IPv4.
  const mapped = a.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  const v4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(a)
    ? a
    : mapped
      ? mapped[1]
      : null;
  if (v4) return v4.replace(/\.\d{1,3}$/, ".0");

  if (a.includes(":")) {
    const head: string[] = [];
    for (const group of a.split(":")) {
      if (head.length >= 3) break;
      if (group !== "") head.push(group);
    }
    return `${head.join(":") || "0"}::`;
  }

  return null; // unrecognised format → store nothing
}
