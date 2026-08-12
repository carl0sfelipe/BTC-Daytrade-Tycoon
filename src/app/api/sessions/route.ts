import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getRequestUser } from "@/lib/server/request-auth";
import { PrismaTradingSessionRepository } from "@/lib/server/trading-session-repository";
import {
  tradingSessionInputSchema,
  validateTradingSessionInput,
} from "@/lib/server/session-record-validation";
import { readJsonBody } from "@/lib/server/request-body";

export const runtime = "nodejs";

const MAX_LISTED_SESSIONS = 50;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const validationError = validateTradingSessionInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const repository = new PrismaTradingSessionRepository(prisma);
  const session = await repository.insertSession(user.id, tradingSessionInputSchema.parse(body));
  return NextResponse.json({ session }, { status: 201 });
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
