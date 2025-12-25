// components/NavCtas.client.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEYS = {
  home: 'Home',
  assistant: 'Assistant',
  dashboard: 'Dashboard',
  reform: 'Reform Engine',
};

export default function NavCtas({ lang = 'English', role = 'User' }) {
  const [t, setT] = useState(KEYS);

  // Translate the top-nav labels (same approach as elsewhere)
  useEffect(() => {
    if (/^english$/i.test(lang)) return;
    const prompt =
      `Translate ONLY the following labels into ${lang}. ` +
      `Return just a JSON object with the same keys:\n` +
      JSON.stringify(KEYS);

    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        if (j?.translation && typeof j.translation === 'object') {
          setT((prev) => ({ ...prev, ...j.translation }));
        }
      } catch {
        /* ignore translation errors; stick to English */
      }
    })();

    return () => ctrl.abort();
  }, [lang]);

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
      }}
    >
      <Link
        href={`/?lang=${encodeURIComponent(lang)}`}
        style={{ textDecoration: 'none', color: '#fff' }}
      >
        🏠 {t.home}
      </Link>

      <Link
        href={`/assistant?lang=${encodeURIComponent(lang)}`}
        style={{ textDecoration: 'none', color: '#fff' }}
      >
        🧠 {t.assistant}
      </Link>

      <Link
        href={`/dashboard?lang=${encodeURIComponent(lang)}`}
        style={{ textDecoration: 'none', color: '#fff' }}
      >
        📊 {t.dashboard}
      </Link>

      <Link
        href={`/reform?lang=${encodeURIComponent(lang)}`}
        style={{ textDecoration: 'none', color: '#fff' }}
      >
        ⚙️ {t.reform}
      </Link>
    </nav>
  );
}
