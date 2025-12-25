'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './Header.module.css';

export default function HeaderTest() {
  const pathname = usePathname() || '/';
  const qs = useSearchParams();
  const lang = useMemo(() => (qs?.get('lang') || 'English').trim(), [qs]);

  // lock until login (unchanged behavior)
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const read = () =>
      setAuthed(typeof window !== 'undefined' && localStorage.getItem('si_authed') === '1');
    read();
    const onStorage = (e) => {
      if (e.key === 'si_authed') read();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // labels with English fallback; translate when ?lang= is present
  const [labels, setLabels] = useState({
    home: 'Home',
    assistant: 'Assistant',
    dashboard: 'Dashboard',
    reform: 'Reform Engine',
  });

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

    const controller = new AbortController();
    (async () => {
      try {
        const prompt = `Translate the following navigation labels into ${lang}. Return only a raw JSON object:
{"home":"Home","assistant":"Assistant","dashboard":"Dashboard","reform":"Reform Engine"}`;
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (data?.translation && typeof data.translation === 'object') {
          setLabels((prev) => ({ ...prev, ...data.translation }));
        }
      } catch {
        /* keep fallback */
      }
    })();

    return () => controller.abort();
  }, [lang]);

  // keep ?lang on link clicks
  const langSuffix =
    lang && lang.toLowerCase() !== 'english' ? `?lang=${encodeURIComponent(lang)}` : '';

  // Use your PNGs from /public/icons
  const links = [
    { key: 'home', href: '/', icon: '/icons/home.png' },
    { key: 'assistant', href: '/assistant', icon: '/icons/assistant.png' },
    { key: 'dashboard', href: '/dashboard', icon: '/icons/dashboard.png' },
    { key: 'reform', href: '/reform', icon: '/icons/reform-engine.png' }, // note hyphen
  ];

  return (
    <header className={styles.navbar}>
      {links.map((link) => {
        const isActive = pathname === link.href;
        const classNames = [
          styles.navLink,
          isActive ? styles.active : '',
          authed ? '' : styles.disabled,
        ]
          .join(' ')
          .trim();

        return (
          <Link
            key={link.href}
            href={`${link.href}${langSuffix}`}
            // no <a>, no legacyBehavior
            className={classNames}
            aria-disabled={authed ? undefined : true}
            tabIndex={authed ? 0 : -1}
            title={authed ? undefined : 'Locked until login'}
            legacyBehavior
          >
            <Image
              src={link.icon}
              alt={labels[link.key]}
              width={28}
              height={28}
              className={styles.icon}
              priority={link.key === 'home'}
            />
            <span>{labels[link.key]}</span>
          </Link>
        );
      })}
    </header>
  );
}
