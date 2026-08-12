import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getRequestUser } from "@/lib/server/request-auth";
import { PrismaMissionRepository } from "@/lib/server/mission-repository";
import { getDailyMissionBoard } from "@/lib/server/mission-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const repository = new PrismaMissionRepository(prisma);
  const board = await getDailyMissionBoard(repository, user.id, new Date());
  return NextResponse.json(board);
}
