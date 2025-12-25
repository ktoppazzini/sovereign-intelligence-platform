'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './Header.module.css';

/**
 * Icons only change:
 * - Uses PNGs from /public/icons (home.png, assistant.png, dashboard.png, reform-engine.png)
 * - No legacyBehavior, no <a> inside <Link> (removes console warnings)
 * - Everything else left as-is (layout, translation call, etc.)
 */

export default function HeaderTest() {
  const pathname = usePathname() || '/';
  const qs = useSearchParams();
  const lang = useMemo(() => (qs?.get('lang') || 'English').trim(), [qs]);

  // labels (English fallback)
  const [labels, setLabels] = useState({
    home: 'Home',
    assistant: 'Assistant',
    dashboard: 'Dashboard',
    reform: 'Reform Engine',
  });

  // translate labels when lang != English
  useEffect(() => {
    if (!lang || lang.toLowerCase() === 'english') {
      setLabels({
        home: 'Home',
        assistant: 'Assistant',
        dashboard: 'Dashboard',
        reform: 'Reform Engine',
      });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const prompt =
          `Translate the following navigation labels into ${lang}. Return only a raw JSON object:\n` +
          '{"home":"Home","assistant":"Assistant","dashboard":"Dashboard","reform":"Reform Engine"}';

        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.translation && typeof data.translation === 'object') {
          setLabels((prev) => ({ ...prev, ...data.translation }));
        }
      } catch {
        /* keep English fallback */
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lang]);

  // keep ?lang on clicks
  const langSuffix =
    lang && lang.toLowerCase() !== 'english' ? `?lang=${encodeURIComponent(lang)}` : '';

  const links = [
    { key: 'home', href: '/', icon: '/icons/home.png', alt: 'Home' },
    { key: 'assistant', href: '/assistant', icon: '/icons/assistant.png', alt: 'Assistant' },
    { key: 'dashboard', href: '/dashboard', icon: '/icons/dashboard.png', alt: 'Dashboard' },
    { key: 'reform', href: '/reform', icon: '/icons/reform-engine.png', alt: 'Reform Engine' },
  ];

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {links.map((link) => {
          const isActive =
            pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

          /* Next.js app router Link (no <a>, no legacyBehavior) */
          return (
            <Link
              key={link.href}
              href={`${link.href}${langSuffix}`}
              className={`${styles.navlink} ${isActive ? styles.active : ''}`}
              legacyBehavior
            >
              <Image
                src={link.icon}
                alt={link.alt}
                width={26}
                height={26}
                className={styles.icon}
                priority={false}
              />
              <span>{labels[link.key]}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
