import type { IdentifierType, PurposesResponse } from "./types";

const DEVICE_KEY = "dpdp_did";
const CONSENT_KEY = "dpdp_consent_v1";
const IDENTITY_KEY = "dpdp_identity_v1";
const PURPOSES_KEY = "dpdp_purposes_v1";
const PURPOSES_TTL_MS = 5 * 60 * 1000; // 5 min — repeat page views skip the fetch

interface CachedConsent {
  updatedAt: number;
  decisions: Record<string, boolean>;
}

interface CachedPurposes {
  at: number;
  key: string; // tenantKey:language, so a different site/lang misses
  data: PurposesResponse;
}

interface CachedIdentity {
  identifier: string;
  type: IdentifierType;
}

/** Best-effort localStorage — never throw if storage is unavailable (private mode). */
function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function uuid(): string {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  // Fallback for older browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Stable anonymous device id, generated once and reused. */
export function getDeviceId(): string {
  let id = safeGet(DEVICE_KEY);
  if (!id) {
    id = uuid();
    safeSet(DEVICE_KEY, id);
  }
  return id;
}

/** Active identity for consent submissions: an explicit identify() or the device id. */
export function getActiveIdentity(): CachedIdentity {
  const raw = safeGet(IDENTITY_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as CachedIdentity;
    } catch {
      /* fall through */
    }
  }
  return { identifier: getDeviceId(), type: "anon" };
}

export function setActiveIdentity(identifier: string, type: IdentifierType): void {
  safeSet(IDENTITY_KEY, JSON.stringify({ identifier, type }));
}

export function getCachedConsent(): CachedConsent | null {
  const raw = safeGet(CONSENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedConsent;
  } catch {
    return null;
  }
}

export function setCachedConsent(decisions: Record<string, boolean>): void {
  safeSet(
    CONSENT_KEY,
    JSON.stringify({ updatedAt: Date.now(), decisions } satisfies CachedConsent),
  );
}

/** Whether the visitor has already made a choice (so we don't re-prompt). */
export function hasChosen(): boolean {
  return getCachedConsent() !== null;
}

/**
 * Short-lived cache of the purposes/notice payload, so a visitor browsing
 * several pages only fetches it once (per site+language) within the TTL. This
 * takes repeat page views off the server entirely.
 */
export function getCachedPurposes(
  tenantKey: string,
  language: string,
): PurposesResponse | null {
  const raw = safeGet(PURPOSES_KEY);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as CachedPurposes;
    if (c.key !== `${tenantKey}:${language}`) return null;
    if (Date.now() - c.at > PURPOSES_TTL_MS) return null;
    return c.data;
  } catch {
    return null;
  }
}

export function setCachedPurposes(
  tenantKey: string,
  language: string,
  data: PurposesResponse,
): void {
  safeSet(
    PURPOSES_KEY,
    JSON.stringify({
      at: Date.now(),
      key: `${tenantKey}:${language}`,
      data,
    } satisfies CachedPurposes),
  );
}
