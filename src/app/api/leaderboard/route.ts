import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getRequestUser } from "@/lib/server/request-auth";
import { PrismaTradingSessionRepository } from "@/lib/server/trading-session-repository";
import {
  computeLeaderboard,
  findLeaderboardEntry,
  parseLeaderboardPeriod,
  resolvePeriodStart,
} from "@/lib/server/leaderboard-service";

export const runtime = "nodejs";

const MAX_ENTRIES = 20;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const period = parseLeaderboardPeriod(request.nextUrl.searchParams.get("period"));
  const since = resolvePeriodStart(period);

  const repository = new PrismaTradingSessionRepository(prisma);
  const rows = await repository.listRankableSessions(since);
  const entries = computeLeaderboard(rows);

  const user = await getRequestUser(request);
  const me = user ? findLeaderboardEntry(entries, user.id) : null;

  return NextResponse.json({ period, entries: entries.slice(0, MAX_ENTRIES), me });
}
