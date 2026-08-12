import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { PrismaAuthRepository } from "@/lib/server/auth-repository";
import { signupUser } from "@/lib/server/auth-service";
import { signupInputSchema, validateSignupInput } from "@/lib/server/auth-validation";
import { buildAuthCookie } from "@/lib/server/session-cookie";
import { readJsonBody } from "@/lib/server/request-body";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await readJsonBody(request);
  const validationError = validateSignupInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const repository = new PrismaAuthRepository(prisma);
  const result = await signupUser(repository, signupInputSchema.parse(body));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ user: result.user }, { status: 201 });
  response.cookies.set(buildAuthCookie(result.token));
  return response;
}
