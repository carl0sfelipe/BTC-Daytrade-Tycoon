/**
 * Persistence boundary for users + auth sessions.
 * Services depend on the AuthRepository interface; API routes inject the
 * Prisma implementation, tests inject a named in-memory fake.
 */
import type { PrismaClient } from "@/generated/prisma/client";

export interface AuthUserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  diamonds: number;
}

export interface NewUserData {
  username: string;
  email: string;
  passwordHash: string;
  /** Initial balance — guest migration already clamped by the auth service. */
  diamonds: number;
}

export interface NewAuthSessionData {
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthSessionWithUser {
  user: AuthUserRecord;
  expiresAt: Date;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserByUsername(username: string): Promise<AuthUserRecord | null>;
  createUser(data: NewUserData): Promise<AuthUserRecord>;
  createAuthSession(data: NewAuthSessionData): Promise<void>;
  findAuthSession(token: string): Promise<AuthSessionWithUser | null>;
  deleteAuthSession(token: string): Promise<void>;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  findUserByUsername(username: string): Promise<AuthUserRecord | null> {
    return this.db.user.findUnique({ where: { username } });
  }

  createUser(data: NewUserData): Promise<AuthUserRecord> {
    return this.db.user.create({ data });
  }

  async createAuthSession(data: NewAuthSessionData): Promise<void> {
    await this.db.authSession.create({ data });
  }

  async findAuthSession(token: string): Promise<AuthSessionWithUser | null> {
    const session = await this.db.authSession.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session) return null;
    return { user: session.user, expiresAt: session.expiresAt };
  }

  async deleteAuthSession(token: string): Promise<void> {
    await this.db.authSession.deleteMany({ where: { token } });
  }
}
