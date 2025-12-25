// app/components/Header.js
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Header() {
  const pathname = usePathname() || '';
  const qs = useSearchParams();
  const lang = useMemo(() => qs?.get('lang') || 'English', [qs]);

  // Hide header on 2FA routes
  if (pathname.startsWith('/2FA')) return null;

  // Translated labels (fallbacks are English)
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

    let cancelled = false;
    (async () => {
      try {
        const prompt = `Translate the following navigation labels into ${lang}. Return only a raw JSON object with the keys and translated values:
{
  "home": "Home",
  "assistant": "Assistant",
  "dashboard": "Dashboard",
  "reform": "Reform Engine"
}`;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 15000);

        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        clearTimeout(t);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.translation && typeof data.translation === 'object') {
          setLabels((prev) => ({ ...prev, ...data.translation }));
        }
      } catch {
        /* keep fallbacks */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const withLang = (path) =>
    lang && lang.toLowerCase() !== 'english' ? `${path}?lang=${encodeURIComponent(lang)}` : path;

  return (
    <header className="w-full">
      {/* Title — never translated */}
      <div className="mx-auto max-w-7xl px-6 pt-4">
        <h1 className="text-white font-extrabold text-4xl md:text-5xl leading-tight">
          Sovereign Intelligence
        </h1>
      </div>
      {/* Big, bold, white, right-aligned nav */}
      <div className="mx-auto max-w-7xl px-6 pb-4">
        <nav className="flex items-center justify-end gap-12" aria-label="Global navigation">
          <Link
            href={withLang('/')}
            className="inline-flex items-center gap-3 font-extrabold text-white visited:text-white no-underline hover:opacity-90 transition-opacity text-3xl md:text-4xl"
            legacyBehavior>
            <span className="text-4xl md:text-5xl leading-none">🏠</span>
            <span>{labels.home}</span>
          </Link>

          <Link
            href={withLang('/assistant')}
            className="inline-flex items-center gap-3 font-extrabold text-white visited:text-white no-underline hover:opacity-90 transition-opacity text-3xl md:text-4xl"
            legacyBehavior>
            <span className="text-4xl md:text-5xl leading-none">🧠</span>
            <span>{labels.assistant}</span>
          </Link>

          <Link
            href={withLang('/dashboard')}
            className="inline-flex items-center gap-3 font-extrabold text-white visited:text-white no-underline hover:opacity-90 transition-opacity text-3xl md:text-4xl"
            legacyBehavior>
            <span className="text-4xl md:text-5xl leading-none">📊</span>
            <span>{labels.dashboard}</span>
          </Link>

          <Link
            href={withLang('/reform')}
            className="inline-flex items-center gap-3 font-extrabold text-white visited:text-white no-underline hover:opacity-90 transition-opacity text-3xl md:text-4xl"
            legacyBehavior>
            <span className="text-4xl md:text-5xl leading-none">⚙️</span>
            <span>{labels.reform}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
