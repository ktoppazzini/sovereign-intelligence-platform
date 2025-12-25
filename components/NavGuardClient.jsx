// components/NavGuardClient.jsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function NavGuardClient() {
  const search = useSearchParams();

  useEffect(() => {
    const fromUrl = search?.get('unlock'); // dev convenience: ?unlock=1
    const devUnlock = process.env.NEXT_PUBLIC_DEV_UNLOCK_NAV === '1';

    const verified =
      typeof window !== 'undefined' && localStorage.getItem('auth_isVerified') === 'true';

    const unlocked = verified || devUnlock || fromUrl === '1';

    try {
      localStorage.setItem('nav_unlocked', unlocked ? 'true' : 'false');
      document.documentElement.dataset.navUnlocked = unlocked ? '1' : '0';
    } catch {}
  }, [search]);

  return null;
}
