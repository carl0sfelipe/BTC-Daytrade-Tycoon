import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { PrismaAuthRepository } from "@/lib/server/auth-repository";
import { logoutUser } from "@/lib/server/auth-service";
import { AUTH_COOKIE_NAME, buildExpiredAuthCookie } from "@/lib/server/session-cookie";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  await logoutUser(new PrismaAuthRepository(prisma), token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(buildExpiredAuthCookie());
  return response;
}
