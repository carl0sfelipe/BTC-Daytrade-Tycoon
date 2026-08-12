import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getRequestUser } from "@/lib/server/request-auth";
import { PrismaTradingSessionRepository } from "@/lib/server/trading-session-repository";
import { PrismaCallRepository } from "@/lib/server/call-repository";
import { awardRunRankReward, type RunRankAward } from "@/lib/server/run-rank-service";
import {
  tradingSessionInputSchema,
  validateTradingSessionInput,
} from "@/lib/server/session-record-validation";
import { readJsonBody } from "@/lib/server/request-body";
import { rejectWhenRateLimited, resolveClientIp } from "@/lib/server/request-rate-limit";

export const runtime = "nodejs";

const MAX_LISTED_SESSIONS = 50;

// The session insert already succeeded when the award runs — a reward failure
// must degrade to runRank: null, never turn the 201 into a 500.
async function computeRunRankOrNull(
  repository: PrismaTradingSessionRepository,
  userId: string,
  returnPercent: number
): Promise<RunRankAward | null> {
  try {
    return await awardRunRankReward(repository, new PrismaCallRepository(prisma), userId, returnPercent);
  } catch (error) {
    console.error({ event: "run_rank_award_failed", userId, returnPercent, error: String(error) });
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Coarse IP pre-filter before auth: unauthenticated spam must not reach
  // the session lookup (each getRequestUser call is a DB query).
  const burstLimited = rejectWhenRateLimited("mutationBurst", resolveClientIp(request));
  if (burstLimited) {
    return burstLimited;
  }

  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const rateLimited = rejectWhenRateLimited("sessionSave", user.id);
  if (rateLimited) {
    return rateLimited;
  }

  const body = await readJsonBody(request);
  const validationError = validateTradingSessionInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const repository = new PrismaTradingSessionRepository(prisma);
  const session = await repository.insertSession(user.id, tradingSessionInputSchema.parse(body));
  // Rank must be computed after the insert so the run counts itself.
  const runRank = await computeRunRankOrNull(repository, user.id, session.returnPercent);
  return NextResponse.json({ session, runRank }, { status: 201 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const repository = new PrismaTradingSessionRepository(prisma);
  const sessions = await repository.listSessionsByUser(user.id, MAX_LISTED_SESSIONS);
  return NextResponse.json({ sessions });
}
