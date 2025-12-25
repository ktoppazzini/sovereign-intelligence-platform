'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function Header() {
  const pathname = usePathname() || '/';
  const qs = useSearchParams();
  const selectedLanguage = useMemo(() => (qs?.get('lang') || 'English').trim(), [qs]);

  // Labels with English fallback
  const [labels, setLabels] = useState({
    home: 'Home',
    assistant: 'Assistant',
    dashboard: 'Dashboard',
    reform: 'Reform Engine',
  });

  useEffect(() => {
    const lang = selectedLanguage;
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
          `{"home":"Home","assistant":"Assistant","dashboard":"Dashboard","reform":"Reform Engine"}`;
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
      } catch {}
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedLanguage]);

  // keep ?lang on clicks
  const langSuffix =
    selectedLanguage && selectedLanguage.toLowerCase() !== 'english'
      ? `?lang=${encodeURIComponent(selectedLanguage)}`
      : '';

  const links = [
    { key: 'home', href: '/', icon: '🏠' },
    { key: 'assistant', href: '/assistant', icon: '🧠' },
    { key: 'dashboard', href: '/dashboard', icon: '📊' },
    { key: 'reform', href: '/reform', icon: '⚙️' },
  ];

  return (
    <header className="global-header">
      <nav className="nav">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={`${link.href}${langSuffix}`}
              className={`navlink ${isActive ? 'active' : ''}`}
              prefetch={false}
              legacyBehavior>
              <span className="icon">{link.icon}</span>
              <span className="label">{labels[link.key]}</span>
            </Link>
          );
        })}
      </nav>
      {/* Scoped, hard overrides to kill any pseudo-element separators and align right */}
      <style jsx>{`
        .global-header {
          background: transparent; /* match page gradient */
          padding: 1rem 2rem;
          display: flex;
          justify-content: flex-end; /* nav to the right */
        }
        .nav {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 28px;
        }
        .navlink {
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          font-size: 1.40625rem; /* tuned size */
          line-height: 1.1;
          display: inline-flex;
          align-items: baseline;
          gap: 0.5rem; /* icon -> label spacing */
        }
        .navlink:hover,
        .navlink.active {
          text-decoration: underline;
        }
        .icon {
          font-size: 1.45rem;
          line-height: 1;
        }

        /* 🔥 Kill ANY dots/separators injected by global CSS */
        :global(.global-header .nav *::before),
        :global(.global-header .nav *::after) {
          content: none !important;
        }

        /* Responsive: center nav on small screens */
        @media (max-width: 640px) {
          .global-header {
            justify-content: center;
            padding: 0.75rem 1rem;
          }
          .nav {
            gap: 18px;
          }
          .navlink {
            font-size: 1.15rem;
          }
          .icon {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </header>
  );
}
