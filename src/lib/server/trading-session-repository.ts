/**
 * Persistence boundary for completed simulation runs.
 * Same pattern as AuthRepository: interface for services/tests, Prisma
 * implementation for the API routes.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import type { TradingSessionInput } from "./session-record-validation";

export interface StoredTradingSession extends TradingSessionInput {
  id: string;
  userId: string;
  createdAt: Date;
}

/** Minimal projection needed to build the global leaderboard. */
export interface RankableSessionRow {
  userId: string;
  username: string;
  pnl: number;
  returnPercent: number;
  trades: number;
  createdAt: Date;
}

export interface TradingSessionRepository {
  insertSession(userId: string, stats: TradingSessionInput): Promise<StoredTradingSession>;
  listSessionsByUser(userId: string, limit: number): Promise<StoredTradingSession[]>;
  listRankableSessions(since: Date | null): Promise<RankableSessionRow[]>;
  /** Sessions saved (all users) since a date — run-rank window size. */
  countSessionsSince(since: Date): Promise<number>;
  /** Sessions since a date beating the given return — run-rank position. */
  countSessionsWithHigherReturnSince(since: Date, returnPercent: number): Promise<number>;
  /** One user's sessions since a date — run-reward replay cooldown guard. */
  countUserSessionsSince(userId: string, since: Date): Promise<number>;
}

// SQLite has no enum columns, so endReason round-trips as a plain string and
// must be narrowed back to the domain union on the way out.
function toStoredSession(row: Omit<StoredTradingSession, "endReason"> & { endReason: string }): StoredTradingSession {
  return { ...row, endReason: row.endReason === "liquidated" ? "liquidated" : "manual" };
}

export class PrismaTradingSessionRepository implements TradingSessionRepository {
  constructor(private readonly db: PrismaClient) {}

  async insertSession(userId: string, stats: TradingSessionInput): Promise<StoredTradingSession> {
    const row = await this.db.tradingSessionRecord.create({ data: { userId, ...stats } });
    return toStoredSession(row);
  }

  async listSessionsByUser(userId: string, limit: number): Promise<StoredTradingSession[]> {
    const rows = await this.db.tradingSessionRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toStoredSession);
  }

  async countSessionsSince(since: Date): Promise<number> {
    return this.db.tradingSessionRecord.count({ where: { createdAt: { gte: since } } });
  }

  async countSessionsWithHigherReturnSince(since: Date, returnPercent: number): Promise<number> {
    return this.db.tradingSessionRecord.count({
      where: { createdAt: { gte: since }, returnPercent: { gt: returnPercent } },
    });
  }

  async countUserSessionsSince(userId: string, since: Date): Promise<number> {
    return this.db.tradingSessionRecord.count({ where: { userId, createdAt: { gte: since } } });
  }

  async listRankableSessions(since: Date | null): Promise<RankableSessionRow[]> {
    const rows = await this.db.tradingSessionRecord.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      orderBy: { createdAt: "asc" },
      include: { user: { select: { username: true } } },
    });
    return rows.map((row) => ({
      userId: row.userId,
      username: row.user.username,
      pnl: row.pnl,
      returnPercent: row.returnPercent,
      trades: row.trades,
      createdAt: row.createdAt,
    }));
  }
}
