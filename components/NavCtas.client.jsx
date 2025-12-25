'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEYS = {
  home: 'Home',
  assistant: 'Assistant',
  dashboard: 'Dashboard',
  reform: 'Reform Engine',
};

export default function NavCtas({ lang = 'English' }) {
  const [t, setT] = useState(KEYS);

  useEffect(() => {
    if (/^english$/i.test(lang)) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt:
              `Translate ONLY this JSON into ${lang}. Keep the same keys, JSON only.\n` +
              JSON.stringify(KEYS),
          }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        if (j?.translation && typeof j.translation === 'object') {
          setT((prev) => ({ ...prev, ...j.translation }));
        }
      } catch {}
    })();
    return () => ctrl.abort();
  }, [lang]);

  const linkStyle = {
    textDecoration: 'none',
    color: '#fff',
    fontWeight: 800,
    fontSize: 20,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <nav
      style={{
        display: 'flex',
        gap: 24,
        alignItems: 'center',
        padding: '14px 22px',
        color: '#fff',
        fontWeight: 800,
        fontSize: 20,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Link href={`/?lang=${encodeURIComponent(lang)}`} style={linkStyle}>
        <span aria-hidden>🏠</span> {t.home}
      </Link>
      <Link href={`/assistant?lang=${encodeURIComponent(lang)}`} style={linkStyle}>
        <span aria-hidden>🧠</span> {t.assistant}
      </Link>
      <Link href={`/dashboard?lang=${encodeURIComponent(lang)}`} style={linkStyle}>
        <span aria-hidden>📊</span> {t.dashboard}
      </Link>
      <Link href={`/reform?lang=${encodeURIComponent(lang)}`} style={linkStyle}>
        <span aria-hidden>⚙️</span> {t.reform}
      </Link>
    </nav>
  );
}
