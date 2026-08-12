/**
 * Auth use-cases (signup / login / session resolution / logout), decoupled
 * from HTTP and from Prisma via the AuthRepository interface.
 */
import { randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "./password-hash";
import type { AuthRepository, AuthUserRecord } from "./auth-repository";
import type { LoginInput, SignupInput } from "./auth-validation";

export interface PublicUser {
  id: string;
  username: string;
  email: string;
}

export type AuthResult =
  | { ok: true; user: PublicUser; token: string }
  | { ok: false; error: string; status: number };

export const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Same message for unknown email and wrong password — no account enumeration.
const INVALID_CREDENTIALS: AuthResult = {
  ok: false,
  error: "Invalid email or password",
  status: 401,
};

function toPublicUser(user: AuthUserRecord): PublicUser {
  return { id: user.id, username: user.username, email: user.email };
}

async function openAuthSession(repo: AuthRepository, user: AuthUserRecord): Promise<AuthResult> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS);
  await repo.createAuthSession({ token, userId: user.id, expiresAt });
  return { ok: true, user: toPublicUser(user), token };
}

/**
 * Creates a user and opens a session. Fails with 409 when the email or
 * username is already registered.
 *
 * @example const result = await signupUser(repo, { username, email, password });
 */
export async function signupUser(repo: AuthRepository, input: SignupInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();
  if (await repo.findUserByEmail(email)) {
    return { ok: false, error: `Email "${email}" is already registered`, status: 409 };
  }
  if (await repo.findUserByUsername(input.username)) {
    return { ok: false, error: `Username "${input.username}" is already taken`, status: 409 };
  }
  const passwordHash = await hashPassword(input.password);
  const user = await repo.createUser({ username: input.username, email, passwordHash });
  return openAuthSession(repo, user);
}

/**
 * Verifies credentials and opens a session.
 *
 * @example const result = await loginUser(repo, { email, password });
 */
export async function loginUser(repo: AuthRepository, input: LoginInput): Promise<AuthResult> {
  const user = await repo.findUserByEmail(input.email.toLowerCase());
  if (!user) return INVALID_CREDENTIALS;
  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) return INVALID_CREDENTIALS;
  return openAuthSession(repo, user);
}

/**
 * Resolves the user behind a session token. Returns null (and deletes the
 * session) when the token is missing, unknown or expired.
 *
 * @example const user = await getSessionUser(repo, cookieToken);
 */
export async function getSessionUser(
  repo: AuthRepository,
  token: string | undefined
): Promise<PublicUser | null> {
  if (!token) return null;
  const session = await repo.findAuthSession(token);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await repo.deleteAuthSession(token);
    return null;
  }
  return toPublicUser(session.user);
}

/**
 * Revokes a session token (logout). No-op when the token is missing.
 *
 * @example await logoutUser(repo, cookieToken);
 */
export async function logoutUser(repo: AuthRepository, token: string | undefined): Promise<void> {
  if (!token) return;
  await repo.deleteAuthSession(token);
}
