import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Protect /admin (except /admin/login) and authenticated /api routes.
// Public: /, /dashboard/[token], /api/auth, /api/dashboard, /admin/login.
export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/admin/login',
    },
  }
);

export const config = {
  matcher: [
    // All /admin routes except /admin/login
    '/admin/((?!login).*)',
    '/admin',
    '/api/clients/:path*',
    '/api/import/:path*',
  ],
};
