/**
 * Persistence boundary for daily missions: progress counters derived from
 * data the player already generates (runs, called shots) plus the claim
 * ledger. The service depends on the MissionRepository interface; API routes
 * inject the Prisma implementation, tests inject an in-memory fake.
 */
import { Prisma, type PrismaClient } from "@/generated/prisma/client";

export interface NewMissionClaim {
  userId: string;
  missionId: string;
  day: string;
  reward: number;
}

export interface MissionRepository {
  /** Runs the user saved since a date — "daily-run" progress. */
  countRunsSince(userId: string, since: Date): Promise<number>;
  /** Runs with returnPercent > 0 since a date — "daily-profit" progress. */
  countProfitableRunsSince(userId: string, since: Date): Promise<number>;
  /** Called shots resolved as "hit" since a date — "daily-called-shots" progress. */
  countCallHitsSince(userId: string, since: Date): Promise<number>;
  /** Mission ids the user already claimed on the given UTC day key. */
  listClaimedMissionIds(userId: string, day: string): Promise<string[]>;
  /** Inserts a claim; false when (userId, missionId, day) already exists. */
  createMissionClaim(claim: NewMissionClaim): Promise<boolean>;
  /** Removes a claim — compensation when the diamond credit fails after insert. */
  deleteMissionClaim(userId: string, missionId: string, day: string): Promise<void>;
}

export class PrismaMissionRepository implements MissionRepository {
  constructor(private readonly db: PrismaClient) {}

  async countRunsSince(userId: string, since: Date): Promise<number> {
    return this.db.tradingSessionRecord.count({
      where: { userId, createdAt: { gte: since } },
    });
  }

  async countProfitableRunsSince(userId: string, since: Date): Promise<number> {
    return this.db.tradingSessionRecord.count({
      where: { userId, createdAt: { gte: since }, returnPercent: { gt: 0 } },
    });
  }

  async countCallHitsSince(userId: string, since: Date): Promise<number> {
    return this.db.tradeCall.count({
      where: { userId, status: "hit", resolvedAt: { gte: since } },
    });
  }

  async listClaimedMissionIds(userId: string, day: string): Promise<string[]> {
    const rows = await this.db.missionClaim.findMany({
      where: { userId, day },
      select: { missionId: true },
    });
    return rows.map((row) => row.missionId);
  }

  async createMissionClaim(claim: NewMissionClaim): Promise<boolean> {
    try {
      await this.db.missionClaim.create({ data: claim });
      return true;
    } catch (error) {
      // P2002 = unique violation: a concurrent claim won the race. Report
      // "not created" so the service answers 409 instead of a 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }
      throw error;
    }
  }

  async deleteMissionClaim(userId: string, missionId: string, day: string): Promise<void> {
    // deleteMany instead of delete: idempotent when the row is already gone
    // (the unique triple guarantees at most one match).
    await this.db.missionClaim.deleteMany({ where: { userId, missionId, day } });
  }
}
