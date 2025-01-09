// import NextAuth from 'next-auth';
// import { authConfig } from './auth.config';

// export default NextAuth(authConfig).auth;

// export const config = {
//   // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
//   matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
// };

//THIS WILL WORK ONCE EDGE RUNTIME ALLOWS NODE JS
// middleware.ts
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { myAdapter } from './myAdapter';

// // Where do you want to protect?
// // For example, protect anything under /dashboard:
// export const config = {
//   matcher: ['/dashboard/:path*'],
// };

// export async function middleware(request: NextRequest) {
//   // 1) Grab the session token from cookies
//   const sessionToken =
//     request.cookies.get('next-auth.session-token')?.value ||
//     request.cookies.get('__Secure-next-auth.session-token')?.value;

//   if (!sessionToken) {
//     return NextResponse.redirect(new URL('/login', request.url));
//   }

//   // 2) Check if the token is valid in your DB
//   const sessionAndUser = await myAdapter?.getSessionAndUser?.(sessionToken);
//   if (!sessionAndUser) {
//     // Not a valid session in the DB
//     return NextResponse.redirect(new URL('/login', request.url));
//   }

//   // If we reach here, user is authenticated
//   return NextResponse.next();
// }
