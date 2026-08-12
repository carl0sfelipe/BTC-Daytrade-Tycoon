import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { PrismaAuthRepository } from "@/lib/server/auth-repository";
import { loginUser } from "@/lib/server/auth-service";
import { loginInputSchema, validateLoginInput } from "@/lib/server/auth-validation";
import { buildAuthCookie } from "@/lib/server/session-cookie";
import { readJsonBody } from "@/lib/server/request-body";
import { rejectWhenRateLimited, resolveClientIp } from "@/lib/server/request-rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimited = rejectWhenRateLimited("authLogin", resolveClientIp(request));
  if (rateLimited) {
    return rateLimited;
  }

  const body = await readJsonBody(request);
  const validationError = validateLoginInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const repository = new PrismaAuthRepository(prisma);
  const result = await loginUser(repository, loginInputSchema.parse(body));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(buildAuthCookie(result.token));
  return response;
}
