import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "./prisma";
import {
  SESSION_COOKIE,
  SUPER_COOKIE,
  verifySession,
  verifySuper,
  type SessionClaims,
  type SuperClaims,
} from "./lib/jwt";

/** Error carrying an HTTP status; thrown by handlers for expected failures. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Wrap a handler body: turns HttpError/ZodError into clean JSON responses. */
export async function handle(
  fn: () => Promise<NextResponse | Response>,
): Promise<NextResponse | Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      const message =
        err.issues.map((i) => i.message).join("; ") || "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error("Unhandled route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// --- CORS (public widget API is called cross-origin from customer sites) -----

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-tenant-key",
  "Access-Control-Max-Age": "86400",
};

/** JSON response with permissive CORS headers, for public endpoints. */
export function corsJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

/** Preflight handler; export as `OPTIONS` on public routes. */
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Public handler wrapper: errors also get CORS headers so the browser can read them. */
export async function handlePublic(
  fn: () => Promise<NextResponse | Response>,
): Promise<NextResponse | Response> {
  const res = await handle(fn);
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

// --- Auth / scoping context --------------------------------------------------

export function requireAdmin(req: NextRequest): SessionClaims {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new HttpError(401, "Not authenticated");
  try {
    return verifySession(token);
  } catch {
    throw new HttpError(401, "Session expired or invalid");
  }
}

export function requireSuper(req: NextRequest): SuperClaims {
  const token = req.cookies.get(SUPER_COOKIE)?.value;
  if (!token) throw new HttpError(401, "Not authenticated");
  try {
    return verifySuper(token);
  } catch {
    throw new HttpError(401, "Session expired or invalid");
  }
}

export interface SiteContext {
  id: string;
  tenantId: string;
  apiKey: string;
  name: string;
  verified: boolean;
}

/** Admin site scoping: the selected domain from the `x-site-id` header. */
export async function requireSite(
  req: NextRequest,
  tenantId: string,
): Promise<SiteContext> {
  const siteId =
    req.headers.get("x-site-id") ||
    new URL(req.url).searchParams.get("siteId");
  if (!siteId) throw new HttpError(400, "No domain selected");
  const site = await prisma.site.findFirst({
    where: { id: siteId, tenantId },
    select: {
      id: true,
      tenantId: true,
      apiKey: true,
      name: true,
      verified: true,
      tenant: { select: { status: true } },
    },
  });
  if (!site) throw new HttpError(404, "Domain not found");
  if (site.tenant.status !== "active") throw accountSuspended();
  const { tenant: _tenant, ...ctx } = site;
  return ctx;
}

export function accountSuspended(): HttpError {
  return new HttpError(403, "This account is suspended. Please contact support.");
}

/** Reject requests from an account the platform operator has suspended. */
export async function requireActiveTenant(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });
  if (!tenant || tenant.status !== "active") throw accountSuspended();
}

/** Public site resolution from a widget key (query / body / header). */
export async function resolveSiteKey(
  key: string | null | undefined,
): Promise<SiteContext> {
  if (!key) throw new HttpError(400, "Missing site key");
  const site = await prisma.site.findUnique({
    where: { apiKey: key },
    select: {
      id: true,
      tenantId: true,
      apiKey: true,
      name: true,
      verified: true,
      status: true,
    },
  });
  if (!site || site.status !== "active") {
    throw new HttpError(403, "Invalid or inactive site key");
  }
  return {
    id: site.id,
    tenantId: site.tenantId,
    apiKey: site.apiKey,
    name: site.name,
    verified: site.verified,
  };
}

/**
 * Real client IP behind a proxy. `x-real-ip` comes first: Vercel and the nginx
 * config both set it from the actual connection, whereas the first
 * `x-forwarded-for` entry can be supplied by the client.
 */
export function clientIp(req: NextRequest): string | null {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || null;
}

/**
 * Cron endpoint auth. Accepts Vercel Cron's `Authorization: Bearer <secret>`
 * or an `x-cron-secret` header. Fails closed in production: without
 * CRON_SECRET configured, nobody can trigger the sweep. In development it's
 * open so the sweep can be run by hand.
 */
export function cronUnauthorized(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return null;
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-cron-secret") ||
    "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * The website origin a widget request came from — its Origin header, or the
 * origin of its Referer. Used to auto-verify domain ownership when the script
 * loads on a real site.
 */
export function detectOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      /* malformed */
    }
  }
  return null;
}
