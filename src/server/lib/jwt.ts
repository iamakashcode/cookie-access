import jwt from "jsonwebtoken";
import { env } from "../env";

export interface SessionClaims {
  adminId: string;
  tenantId: string;
  role: "owner" | "staff";
  email: string;
}

/** Name of the httpOnly cookie carrying the admin session JWT. */
export const SESSION_COOKIE = "dpdp_session";

export function signSession(claims: SessionClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  });
}

export function verifySession(token: string): SessionClaims {
  return jwt.verify(token, env.JWT_SECRET) as SessionClaims;
}

// --- Super-admin (platform operator) session --------------------------------

export interface SuperClaims {
  superId: string;
  email: string;
  scope: "super";
}

/** Separate cookie so a super-admin session never collides with a tenant one. */
export const SUPER_COOKIE = "dpdp_super";

export function signSuper(claims: Omit<SuperClaims, "scope">): string {
  return jwt.sign({ ...claims, scope: "super" }, env.JWT_SECRET, {
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  });
}

export function verifySuper(token: string): SuperClaims {
  const claims = jwt.verify(token, env.JWT_SECRET) as SuperClaims;
  if (claims.scope !== "super") throw new Error("Not a super-admin token");
  return claims;
}
