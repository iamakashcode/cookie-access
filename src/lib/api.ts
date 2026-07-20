// Browser-side client for the app's own /api routes (same origin). Sends the
// httpOnly session cookie via credentials:"include". On a 401 the caller is
// expected to redirect to /login.

// Empty base = same-origin relative requests (the API lives in this Next app).
const BASE = process.env.NEXT_PUBLIC_API_URL || "";

// The currently-selected domain (site). Persisted so site-scoped admin requests
// carry an x-site-id header. Managed by DomainContext.
const SITE_KEY = "dpdp_site";

export function getSelectedSiteId(): string | null {
  try {
    return localStorage.getItem(SITE_KEY);
  } catch {
    return null;
  }
}

export function setSelectedSiteId(id: string): void {
  try {
    localStorage.setItem(SITE_KEY, id);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const siteId = getSelectedSiteId();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(siteId ? { "x-site-id": siteId } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  base: BASE,
  get: <T>(path: string) => req<T>(path),
  post: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => req<T>(path, { method: "DELETE" }),
};

/**
 * Direct link to the CSV export (browser navigates with the cookie). Since an
 * <a> navigation can't send the x-site-id header, the selected domain is passed
 * as a `siteId` query param instead.
 */
export function consentCsvUrl(params: Record<string, string>): string {
  const origin =
    BASE || (typeof window !== "undefined" ? window.location.origin : "");
  const u = new URL(`${origin}/api/admin/consent/export`);
  const siteId = getSelectedSiteId();
  if (siteId) u.searchParams.set("siteId", siteId);
  Object.entries(params).forEach(([k, v]) => v && u.searchParams.set(k, v));
  return u.toString();
}

/** Direct link to a single consent submission's PDF report (browser download). */
export function consentEventPdfUrl(eventId: string): string {
  const origin =
    BASE || (typeof window !== "undefined" ? window.location.origin : "");
  const u = new URL(
    `${origin}/api/admin/consent/events/${encodeURIComponent(eventId)}/pdf`,
  );
  const siteId = getSelectedSiteId();
  if (siteId) u.searchParams.set("siteId", siteId);
  return u.toString();
}
