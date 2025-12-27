// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Toggle guard with env if you want (default ON)
const GUARD_ON = (process.env.ADMIN_GUARD ?? 'on').toLowerCase() !== 'off';

export function middleware(req: NextRequest) {
  if (!GUARD_ON) return NextResponse.next();

  // Protect only /admin paths
  const { pathname, search } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // Simple cookie check (replace with your real auth later)
  const role = req.cookies.get('si_role')?.value ?? '';
  if (role !== 'admin') {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/2FA/login';
    loginUrl.search = search; // keep ?lang=
    loginUrl.searchParams.set('redirect', pathname + (search || ''));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
