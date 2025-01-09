// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Where do you want to protect?
// For example, protect anything under /dashboard:
export const config = {
  matcher: ['/dashboard/:path*'],
};

export async function middleware(request: NextRequest) {
  // 1) Grab the session token from cookies
  console.log('MIDDLEWARE CHECK');
  const sessionToken = request.cookies.get('authjs.session-token')?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2) Check if the token is valid in your DB
  //Cannot do this yet as nodejs not supported in middleware
  // const sessionAndUser = await myAdapter?.getSessionAndUser?.(sessionToken);
  // if (!sessionAndUser) {
  //   // Not a valid session in the DB
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  // If we reach here, user is authenticated
  return NextResponse.next();
}
