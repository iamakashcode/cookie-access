import type {
  Decision,
  IdentifierType,
  PurposesResponse,
  StatusResponse,
} from "./types";
import type { WidgetConfig } from "./config";

const TIMEOUT_MS = 6000;

/**
 * Thin fetch wrapper with a hard timeout. Every call is designed to fail
 * *softly*: callers get `null` on any error so the host page is never broken.
 */
async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchPurposes(cfg: WidgetConfig): Promise<PurposesResponse | null> {
  const u = new URL(`${cfg.apiBase}/api/public/purposes`);
  u.searchParams.set("tenantKey", cfg.tenantKey);
  u.searchParams.set("language", cfg.language);
  return request<PurposesResponse>(u.toString());
}

export function fetchStatus(
  cfg: WidgetConfig,
  identifier: string,
): Promise<StatusResponse | null> {
  const u = new URL(`${cfg.apiBase}/api/public/consent-status`);
  u.searchParams.set("tenantKey", cfg.tenantKey);
  u.searchParams.set("identifier", identifier);
  u.searchParams.set("language", cfg.language);
  return request<StatusResponse>(u.toString());
}

export function postConsent(
  cfg: WidgetConfig,
  identifier: string,
  identifierType: IdentifierType,
  decisions: Decision[],
): Promise<{ ok: boolean; recorded: number } | null> {
  return request(`${cfg.apiBase}/api/public/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantKey: cfg.tenantKey,
      identifier,
      identifierType,
      language: cfg.language,
      decisions,
    }),
  });
}

export function postParentalConsent(
  cfg: WidgetConfig,
  minorIdentifier: string,
  guardianEmail: string,
  decisions: Decision[],
): Promise<{ ok: boolean; pendingVerification: boolean } | null> {
  return request(`${cfg.apiBase}/api/public/parental-consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantKey: cfg.tenantKey,
      minorIdentifier,
      guardianEmail,
      language: cfg.language,
      decisions,
    }),
  });
}
