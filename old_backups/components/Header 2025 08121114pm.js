'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function Header() {
  const pathname = usePathname() || '/';
  const qs = useSearchParams();
  const selectedLanguage = useMemo(() => (qs?.get('lang') || 'English').trim(), [qs]);

  // labels with English fallback (keeps translations working)
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
        const prompt = `Translate the following navigation labels into ${lang}. Return only a raw JSON object:
{"home":"Home","assistant":"Assistant","dashboard":"Dashboard","reform":"Reform Engine"}`;
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
            <Link key={link.href} href={`${link.href}${langSuffix}`} legacyBehavior passHref>
              <a className={`navlink ${isActive ? 'active' : ''}`}>
                <span className="icon">{link.icon}</span>
                {labels[link.key]}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Scoped styles (responsive, right-aligned, white, bold, clickable).
          Also kills any ::before/::after separator dots that a global stylesheet might add. */}
      <style jsx>{`
        .global-header {
          background: transparent; /* match page bg */
          padding: 1rem 2rem;
          display: flex;
          justify-content: flex-end; /* nav to the right */
        }
        .nav {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 28px;
          list-style: none;
        }
        .navlink {
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          font-size: 1.40625rem; /* tuned size (bold white) */
          line-height: 1.1;
          display: inline-flex;
          align-items: center;
        }
        .navlink:hover,
        .navlink.active {
          text-decoration: underline;
        }
        .icon {
          font-size: 1.7578125rem;
          line-height: 1;
          margin-right: 0.5rem;
        }

        /* Remove any bullet/separator dots that could be injected by global CSS */
        :global(.global-header .nav a::before),
        :global(.global-header .nav a::after) {
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
            font-size: 1.45rem;
          }
        }
      `}</style>
    </header>
  );
}
