import { describe, it, expect, beforeEach } from "vitest";
import { getSessionUser, loginUser, logoutUser, signupUser } from "./auth-service";
import type {
  AuthRepository,
  AuthSessionWithUser,
  AuthUserRecord,
  NewAuthSessionData,
  NewUserData,
} from "./auth-repository";

/** In-memory AuthRepository for service tests — no database involved. */
class FakeAuthRepository implements AuthRepository {
  private users: AuthUserRecord[] = [];
  private sessions: NewAuthSessionData[] = [];
  private nextId = 1;

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findUserByUsername(username: string): Promise<AuthUserRecord | null> {
    return this.users.find((u) => u.username === username) ?? null;
  }

  async createUser(data: NewUserData): Promise<AuthUserRecord> {
    const user: AuthUserRecord = { id: `user-${this.nextId++}`, ...data };
    this.users.push(user);
    return user;
  }

  async createAuthSession(data: NewAuthSessionData): Promise<void> {
    this.sessions.push({ ...data });
  }

  async findAuthSession(token: string): Promise<AuthSessionWithUser | null> {
    const session = this.sessions.find((s) => s.token === token);
    if (!session) return null;
    const user = this.users.find((u) => u.id === session.userId);
    if (!user) return null;
    return { user, expiresAt: session.expiresAt };
  }

  async deleteAuthSession(token: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.token !== token);
  }

  sessionCount(): number {
    return this.sessions.length;
  }

  expireSession(token: string): void {
    const session = this.sessions.find((s) => s.token === token);
    if (session) session.expiresAt = new Date(Date.now() - 1000);
  }

  storedPasswordHash(email: string): string | undefined {
    return this.users.find((u) => u.email === email)?.passwordHash;
  }
}

const signupInput = {
  username: "satoshi_21",
  email: "satoshi@example.com",
  password: "hunter22!",
};

describe("signupUser", () => {
  let repo: FakeAuthRepository;

  beforeEach(() => {
    repo = new FakeAuthRepository();
  });

  it("creates the user, opens a session and returns a public user", async () => {
    const result = await signupUser(repo, signupInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user).toEqual({
      id: expect.any(String),
      username: "satoshi_21",
      email: "satoshi@example.com",
    });
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    expect(repo.sessionCount()).toBe(1);
  });

  it("stores the password hashed, never in plaintext", async () => {
    await signupUser(repo, signupInput);
    const stored = repo.storedPasswordHash("satoshi@example.com");
    expect(stored).toBeDefined();
    expect(stored).not.toContain("hunter22!");
    expect(stored).toMatch(/^scrypt:/);
  });

  it("normalizes the email to lowercase", async () => {
    const result = await signupUser(repo, { ...signupInput, email: "SATOSHI@Example.COM" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.email).toBe("satoshi@example.com");
  });

  it("rejects a duplicate email with 409", async () => {
    await signupUser(repo, signupInput);
    const result = await signupUser(repo, { ...signupInput, username: "other_name" });
    expect(result).toMatchObject({ ok: false, status: 409 });
  });

  it("rejects a duplicate username with 409", async () => {
    await signupUser(repo, signupInput);
    const result = await signupUser(repo, { ...signupInput, email: "other@example.com" });
    expect(result).toMatchObject({ ok: false, status: 409 });
  });
});

describe("loginUser", () => {
  let repo: FakeAuthRepository;

  beforeEach(async () => {
    repo = new FakeAuthRepository();
    await signupUser(repo, signupInput);
  });

  it("opens a session for valid credentials", async () => {
    const result = await loginUser(repo, { email: "satoshi@example.com", password: "hunter22!" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.username).toBe("satoshi_21");
  });

  it("accepts the email case-insensitively", async () => {
    const result = await loginUser(repo, { email: "Satoshi@EXAMPLE.com", password: "hunter22!" });
    expect(result.ok).toBe(true);
  });

  it("rejects a wrong password with 401", async () => {
    const result = await loginUser(repo, { email: "satoshi@example.com", password: "wrong" });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("uses the same error for unknown email (no account enumeration)", async () => {
    const wrongPassword = await loginUser(repo, {
      email: "satoshi@example.com",
      password: "wrong",
    });
    const unknownEmail = await loginUser(repo, { email: "ghost@example.com", password: "wrong" });
    expect(unknownEmail).toEqual(wrongPassword);
  });
});

describe("getSessionUser", () => {
  let repo: FakeAuthRepository;
  let token: string;

  beforeEach(async () => {
    repo = new FakeAuthRepository();
    const result = await signupUser(repo, signupInput);
    token = result.ok ? result.token : "";
  });

  it("resolves the user for a valid token", async () => {
    const user = await getSessionUser(repo, token);
    expect(user?.username).toBe("satoshi_21");
  });

  it("returns null without a token", async () => {
    await expect(getSessionUser(repo, undefined)).resolves.toBeNull();
  });

  it("returns null for an unknown token", async () => {
    await expect(getSessionUser(repo, "f".repeat(64))).resolves.toBeNull();
  });

  it("returns null and deletes the session when expired", async () => {
    repo.expireSession(token);
    await expect(getSessionUser(repo, token)).resolves.toBeNull();
    expect(repo.sessionCount()).toBe(0);
  });
});

describe("logoutUser", () => {
  it("revokes the session so the token stops resolving", async () => {
    const repo = new FakeAuthRepository();
    const result = await signupUser(repo, signupInput);
    const token = result.ok ? result.token : "";

    await logoutUser(repo, token);

    expect(repo.sessionCount()).toBe(0);
    await expect(getSessionUser(repo, token)).resolves.toBeNull();
  });

  it("is a no-op without a token", async () => {
    const repo = new FakeAuthRepository();
    await expect(logoutUser(repo, undefined)).resolves.toBeUndefined();
  });
});
