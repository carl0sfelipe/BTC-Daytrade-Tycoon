import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { PrismaCallRepository } from "@/lib/server/call-repository";
import { computeCalledShotStats } from "@/lib/server/call-stats";

export const runtime = "nodejs";

// Aggregate, anonymous calibration data — public like the leaderboard.
const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 365;
const MAX_SAMPLED_CALLS = 5000;

function resolveWindowDays(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_WINDOW_DAYS;
  return Math.min(Math.floor(parsed), MAX_WINDOW_DAYS);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const days = resolveWindowDays(request.nextUrl.searchParams.get("days"));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const repository = new PrismaCallRepository(prisma);
  const calls = await repository.listResolvedCallsSince(since, MAX_SAMPLED_CALLS);
  return NextResponse.json({ windowDays: days, stats: computeCalledShotStats(calls) });
}
