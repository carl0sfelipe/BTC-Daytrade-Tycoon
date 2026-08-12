/**
 * httpOnly cookie carrying the opaque auth session token.
 * Builders return plain objects accepted by NextResponse.cookies.set().
 */
import { AUTH_SESSION_TTL_MS } from "./auth-service";

export const AUTH_COOKIE_NAME = "ctp_session";

export interface AuthCookieDescriptor {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
}

/**
 * Builds the session cookie set on signup/login.
 *
 * @example response.cookies.set(buildAuthCookie(result.token));
 */
export function buildAuthCookie(token: string): AuthCookieDescriptor {
  return {
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(AUTH_SESSION_TTL_MS / 1000),
  };
}

/**
 * Builds an immediately-expiring cookie used to clear the session on logout.
 *
 * @example response.cookies.set(buildExpiredAuthCookie());
 */
export function buildExpiredAuthCookie(): AuthCookieDescriptor {
  return { ...buildAuthCookie(""), maxAge: 0 };
}
