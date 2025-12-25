'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

/** Background: light on /2FA/*, dark gradient elsewhere. */
export default function AppShell({ children }) {
  const pathname = usePathname() || '/';
  const isAuth = useMemo(() => pathname.startsWith('/2FA'), [pathname]);

  const shellClass = isAuth
    ? 'min-h-screen bg-gray-50 text-gray-900'
    : 'min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800 text-white';

  return <div className={shellClass}>{children}</div>;
}
