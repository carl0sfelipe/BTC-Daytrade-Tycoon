import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getRequestUser } from "@/lib/server/request-auth";
import { PrismaCallRepository } from "@/lib/server/call-repository";
import { resolveTradeCall } from "@/lib/server/call-service";
import { resolveCallInputSchema, validateResolveCallInput } from "@/lib/server/call-validation";
import { readJsonBody } from "@/lib/server/request-body";
import { rejectWhenRateLimited, resolveClientIp } from "@/lib/server/request-rate-limit";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

  // Shares the callMutations budget with POST /api/calls on purpose.
  const rateLimited = rejectWhenRateLimited("callMutations", user.id);
  if (rateLimited) {
    return rateLimited;
  }

  const body = await readJsonBody(request);
  const validationError = validateResolveCallInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const repository = new PrismaCallRepository(prisma);
  const { outcome } = resolveCallInputSchema.parse(body);
  const result = await resolveTradeCall(repository, user.id, params.id, outcome);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ result: result.result });
}
