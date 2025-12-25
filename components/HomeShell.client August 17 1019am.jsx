// components/HomeShell.client.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEYS = {
  home: 'Home',
  assistant: 'Assistant',
  dashboard: 'Dashboard',
  reform: 'Reform Engine',
  submit: 'Submit Service Request',
  admin: 'Admin',
};

export default function HomeShell({ lang = 'English', role = 'User' }) {
  const [t, setT] = useState(KEYS);

  useEffect(() => {
    if (/^english$/i.test(lang)) return;
    const prompt = `Translate ONLY the following labels into ${lang}. Return just a JSON object with the same keys:\n${JSON.stringify(
      KEYS,
    )}`;
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
      } catch {}
    })();
    return () => ctrl.abort();
  }, [lang]);

  const canSeeAdmin = /^(admin|super admin)$/i.test(role || '');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0f1116,#2d333a)' }}>
      {/* top nav */}
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

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <Link
            href={`/forms/request?lang=${encodeURIComponent(lang)}`}
            style={{
              background: '#0c2f57',
              border: '3px solid rgba(255,255,255,0.95)',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: 12,
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            {t.submit}
          </Link>

          {canSeeAdmin && (
            <Link
              href={`/admin?lang=${encodeURIComponent(lang)}`}
              style={{
                background: 'transparent',
                border: '2px solid rgba(255,255,255,0.7)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 10,
                fontWeight: 900,
                textDecoration: 'none',
                opacity: 0.9,
              }}
            >
              {t.admin}
            </Link>
          )}
        </div>
      </nav>

      <main style={{ padding: '24px 32px', color: '#fff' }}>
        <h1 style={{ fontWeight: 900, fontSize: 44, margin: '6px 0 18px' }}>
          Sovereign Intelligence
        </h1>
        <div
          style={{
            background: '#f3f4f6',
            borderRadius: 16,
            padding: 18,
            width: 420,
            boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
          }}
        >
          <img
            src="/images/secure.png"
            alt="Sovereign Intelligence"
            width={420}
            height={420}
            style={{ maxWidth: '28vw', height: 'auto', display: 'block' }}
          />
        </div>
      </main>
    </div>
  );
}
