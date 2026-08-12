/**
 * Bridges Next.js requests to the auth service: reads the session cookie and
 * resolves the authenticated user against the real database.
 */
import type { NextRequest } from "next/server";
import { prisma } from "./db";
import { PrismaAuthRepository } from "./auth-repository";
import { getSessionUser, type PublicUser } from "./auth-service";
import { AUTH_COOKIE_NAME } from "./session-cookie";

/**
 * Resolves the logged-in user from the request's session cookie, or null.
 *
 * @example const user = await getRequestUser(request); if (!user) return 401;
 */
export function getRequestUser(request: NextRequest): Promise<PublicUser | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return getSessionUser(new PrismaAuthRepository(prisma), token);
}
