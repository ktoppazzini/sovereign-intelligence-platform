// middleware.js (JS version)
import { NextResponse } from 'next/server';

// Toggle guard with env if you want (default ON)
const GUARD_ON = (process.env.ADMIN_GUARD ?? 'on').toLowerCase() !== 'off';

export function middleware(req) {
  if (!GUARD_ON) return NextResponse.next();

  const url = new URL(req.url);
  const pathname = url.pathname;

  // let /2FA/* and /api/* through
  if (pathname.startsWith('/2FA') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Protect /admin routes: require redirect + lang param present in query
  if (pathname.startsWith('/admin')) {
    const lang = url.searchParams.get('lang') || '';
    const fromLogin = url.searchParams.has('redirect');

    if (!lang || !fromLogin) {
      // send them to 2FA login with a redirect back to /admin?lang=...
      const redirect = `/2FA/login?lang=${encodeURIComponent(
        lang || 'English',
      )}&redirect=${encodeURIComponent(`${pathname}${url.search}`)}`;
      return NextResponse.redirect(new URL(redirect, req.url));
    }
  }

  return NextResponse.next();
}

// Only run on pages (exclude static/_next by default)
export const config = {
  matcher: ['/((?!_next|favicon.ico|images|public).*)'],
};
