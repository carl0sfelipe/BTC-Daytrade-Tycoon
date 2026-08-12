/**
 * Browser-side client for the real auth API (/api/auth/*).
 * Replaces the old localStorage-only fake-auth module.
 */

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  /** Server-authoritative called-shot balance. */
  diamonds: number;
}

export interface AuthRequestResult {
  user: SessionUser | null;
  error: string | null;
}

async function postAuthJson(path: string, payload: Record<string, string>): Promise<AuthRequestResult> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { user?: SessionUser; error?: string };
    if (!response.ok) {
      return { user: null, error: data.error ?? `Request to ${path} failed (${response.status})` };
    }
    return { user: data.user ?? null, error: null };
  } catch {
    return { user: null, error: "Network error — please try again" };
  }
}

/**
 * Creates an account and opens a session (httpOnly cookie).
 *
 * @example const { user, error } = await signupRequest({ username, email, password });
 */
export function signupRequest(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthRequestResult> {
  return postAuthJson("/api/auth/signup", input);
}

/**
 * Logs in with email + password.
 *
 * @example const { user, error } = await loginRequest({ email, password });
 */
export function loginRequest(input: { email: string; password: string }): Promise<AuthRequestResult> {
  return postAuthJson("/api/auth/login", input);
}

/**
 * Revokes the current session. Never throws.
 *
 * @example await logoutRequest();
 */
export async function logoutRequest(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
}

/**
 * Returns the logged-in user, or null when logged out / offline.
 *
 * @example const user = await fetchCurrentUser();
 */
export async function fetchCurrentUser(): Promise<SessionUser | null> {
  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) return null;
    const data = (await response.json()) as { user: SessionUser | null };
    return data.user;
  } catch {
    return null;
  }
}
