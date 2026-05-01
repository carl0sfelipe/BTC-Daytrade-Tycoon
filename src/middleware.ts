import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow larger payloads for import endpoints
  if (request.nextUrl.pathname.startsWith('/api/import')) {
    const response = NextResponse.next();
    response.headers.set('x-body-size-limit', '50mb');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
