import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = ['http://localhost:3002', 'http://localhost:3001', 'http://localhost:3000'];
  
  // Allow requests with no origin (same-origin requests from browser) or from allowed origins
  const isAllowedOrigin = !origin || allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin?.startsWith(allowed));

  if (!isAllowedOrigin) {
    console.log('[Middleware] CORS blocked:', origin);
    return NextResponse.json(
      { error: 'CORS request did not succeed. Reason: The Same Origin Policy disallows reading the remote resource at ' + request.url },
      { status: 403 }
    );
  }

  // Allow requests with no origin (like server-side requests)
  const response = NextResponse.next();
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', origin || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  // Add cache control headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');

  return response;
}

export const config = {
  matcher: ['/api/:path*'], // Allow all API routes
};
