import { env } from "../env";

/**
 * Session cookie options for Next.js responses (`res.cookies.set`). Note: Next
 * cookie maxAge is in SECONDS. SameSite=None requires Secure (browser rule).
 */
export function sessionCookieOptions() {
  const sameSite = env.COOKIE_SAMESITE;
  const secure = sameSite === "none" ? true : env.COOKIE_SECURE;
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60,
  };
}
