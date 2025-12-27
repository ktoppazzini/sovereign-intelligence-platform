// middleware.js
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/2FA/translation_page', '/2FA/login'];

const PUBLIC_PATTERNS = [
  /^\/api\/(gptTranslation|getLanguages|send2FACode|verify2FA).*$/,
  /^\/_next\//,
  /^\/images\//,
  /^\/favicon\.ico$/,
];

function isPublic(pathname) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATTERNS.some((re) => re.test(pathname));
}

export function middleware(req) {
  // If you haven't enabled blocking, do nothing.
  if (process.env.NAV_REQUIRE_SESSION !== '1') return NextResponse.next();

  const url = new URL(req.url);
  const { pathname, search } = url;

  // Allow 2FA and public assets/APIs
  if (isPublic(pathname)) return NextResponse.next();

  // Require session cookie for everything else
  const session = req.cookies.get('si_session')?.value;
  if (!session) {
    const to = new URL('/2FA/login', req.url);
    const lang = url.searchParams.get('lang');
    if (lang) to.searchParams.set('lang', lang);
    to.searchParams.set('returnTo', pathname + (search || ''));
    return NextResponse.redirect(to);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
