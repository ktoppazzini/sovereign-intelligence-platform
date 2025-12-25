'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Header from '../app/components/Header';
//import Header from './Header'; // or './ConditionalHeader.jsx' if you prefer that one

function ClientShellContent({ children }) {
  const pathname = usePathname();
  const search = useSearchParams();

  const lang = (search?.get('lang') || 'English').trim();
  const isHome = pathname === '/' || pathname === '' || pathname === undefined;

  // Single gradient background for all pages (login + home)
  const shellClass =
    'min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800 text-white bg-fixed';

  // Nav unlock (no console hacks)
  const [isUnlocked, setUnlocked] = useState(false);
  useEffect(() => {
    try {
      const verified = localStorage.getItem('auth_isVerified') === 'true';
      const manual = localStorage.getItem('nav_unlocked') === 'true';
      setUnlocked(verified || manual);
    } catch {}
  }, [pathname]);

  return (
    <div className={shellClass} data-nav-unlocked={isUnlocked ? 'true' : 'false'}>
      {/* Show the header only on Home, per your preference */}
      {isHome && <Header lang={lang} isUnlocked={isUnlocked} />}

      <div className="max-w-[1200px] mx-auto px-4 py-6">{children}</div>
    </div>
  );
}

// Loading component for Suspense boundary
function ClientShellLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800 text-white bg-fixed">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <div>Loading...</div>
      </div>
    </div>
  );
}

export default function ClientShell({ children }) {
  return (
    <Suspense fallback={<ClientShellLoading />}>
      <ClientShellContent>{children}</ClientShellContent>
    </Suspense>
  );
}
