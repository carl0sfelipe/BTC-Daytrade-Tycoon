/**
 * Persistence boundary for called shots and the user's diamond balance.
 * The service depends on the CallRepository interface; API routes inject the
 * Prisma implementation, tests inject an in-memory fake.
 */
import type { PrismaClient } from "@/generated/prisma/client";

export type TradeCallStatus = "pending" | "hit" | "missed" | "voided";

export interface TradeCallRecord {
  id: string;
  userId: string;
  runId: string;
  side: string;
  entryPrice: number;
  targetPrice: number;
  targetPercent: number;
  leverage: number;
  status: TradeCallStatus;
  reward: number;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface NewTradeCallData {
  userId: string;
  runId: string;
  side: "long" | "short";
  entryPrice: number;
  targetPrice: number;
  targetPercent: number;
  leverage: number;
}

export interface CallRepository {
  createCall(data: NewTradeCallData): Promise<TradeCallRecord>;
  findCallById(id: string): Promise<TradeCallRecord | null>;
  resolveCall(id: string, status: TradeCallStatus, reward: number, resolvedAt: Date): Promise<void>;
  /** Resolved calls, newest first — used to derive the hit streak. */
  listResolvedCalls(userId: string, limit: number): Promise<TradeCallRecord[]>;
  /** Diamonds already paid out inside one run (per-run cap guard). */
  sumRunRewards(userId: string, runId: string): Promise<number>;
  /** Most recent call that actually paid diamonds (cooldown guard). */
  findLastRewardedCall(userId: string): Promise<TradeCallRecord | null>;
  /** Credits diamonds and returns the new balance. */
  addDiamonds(userId: string, amount: number): Promise<number>;
  getDiamonds(userId: string): Promise<number>;
}

// SQLite has no enum columns; narrow status back to the domain union.
function toRecord(row: Omit<TradeCallRecord, "status"> & { status: string }): TradeCallRecord {
  const status: TradeCallStatus =
    row.status === "hit" || row.status === "missed" || row.status === "voided"
      ? row.status
      : "pending";
  return { ...row, status };
}

export class PrismaCallRepository implements CallRepository {
  constructor(private readonly db: PrismaClient) {}

  async createCall(data: NewTradeCallData): Promise<TradeCallRecord> {
    const row = await this.db.tradeCall.create({ data });
    return toRecord(row);
  }

  async findCallById(id: string): Promise<TradeCallRecord | null> {
    const row = await this.db.tradeCall.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async resolveCall(id: string, status: TradeCallStatus, reward: number, resolvedAt: Date): Promise<void> {
    await this.db.tradeCall.update({ where: { id }, data: { status, reward, resolvedAt } });
  }

  async listResolvedCalls(userId: string, limit: number): Promise<TradeCallRecord[]> {
    const rows = await this.db.tradeCall.findMany({
      where: { userId, status: { not: "pending" } },
      orderBy: { resolvedAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async sumRunRewards(userId: string, runId: string): Promise<number> {
    const agg = await this.db.tradeCall.aggregate({
      where: { userId, runId },
      _sum: { reward: true },
    });
    return agg._sum.reward ?? 0;
  }

  async findLastRewardedCall(userId: string): Promise<TradeCallRecord | null> {
    const row = await this.db.tradeCall.findFirst({
      where: { userId, reward: { gt: 0 } },
      orderBy: { resolvedAt: "desc" },
    });
    return row ? toRecord(row) : null;
  }

  async addDiamonds(userId: string, amount: number): Promise<number> {
    const user = await this.db.user.update({
      where: { id: userId },
      data: { diamonds: { increment: amount } },
    });
    return user.diamonds;
  }

  async getDiamonds(userId: string): Promise<number> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    return user?.diamonds ?? 0;
  }
}
