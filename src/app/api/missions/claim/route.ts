import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getRequestUser } from "@/lib/server/request-auth";
import { PrismaMissionRepository } from "@/lib/server/mission-repository";
import { PrismaCallRepository } from "@/lib/server/call-repository";
import { claimDailyMission } from "@/lib/server/mission-service";
import {
  missionClaimInputSchema,
  validateMissionClaimInput,
} from "@/lib/server/mission-validation";
import { readJsonBody } from "@/lib/server/request-body";
import { rejectWhenRateLimited, resolveClientIp } from "@/lib/server/request-rate-limit";

export const runtime = "nodejs";

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

  const rateLimited = rejectWhenRateLimited("missionClaim", user.id);
  if (rateLimited) {
    return rateLimited;
  }

  const body = await readJsonBody(request);
  const validationError = validateMissionClaimInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { missionId } = missionClaimInputSchema.parse(body);
  const result = await claimDailyMission(
    new PrismaMissionRepository(prisma),
    new PrismaCallRepository(prisma),
    user.id,
    missionId,
    new Date()
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ reward: result.reward, diamonds: result.diamonds });
}
