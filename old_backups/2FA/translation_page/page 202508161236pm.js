'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../test_page/TestPage.module.css';

const LANG_FALLBACK_TOP5 = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'sq', label: 'Albanian' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
];

export default function TranslationPage() {
  const router = useRouter();
  const [lang, setLang] = useState('en');

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search || '');
      const v = (p.get('lang') || 'en').toLowerCase();
      if (LANG_FALLBACK_TOP5.some((l) => l.code === v)) setLang(v);
    } catch {}
  }, []);

  function handleLangChange(e) {
    const next = e.target.value;
    setLang(next);
    router.push(`/2FA/translation_page?lang=${next}`);
  }

  return (
    <div style={{ padding: '28px 24px 0' }}>
      {/* Top row: title (left) + language (right) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <h1
          style={{
            margin: 0,
            color: '#fff',
            fontWeight: 800,
            fontSize: 42,
            lineHeight: 1.15,
            letterSpacing: 0.2,
          }}
        >
          Sovereign Intelligence
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 420,
            justifyContent: 'flex-end',
          }}
        >
          <label
            htmlFor="lang-select"
            style={{ color: '#e5e7eb', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Select a language:
          </label>

          <select
            id="lang-select"
            value={lang}
            onChange={handleLangChange}
            style={{
              minWidth: 420,
              height: 46,
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.35)',
              outline: 'none',
              boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
              backdropFilter: 'blur(2px)',
            }}
          >
            {LANG_FALLBACK_TOP5.map((o) => (
              <option
                key={o.code}
                value={o.code}
                // NOTE: some browsers ignore option colors, but this helps on most.
                style={{
                  color: '#fff',
                  background: '#111',
                  fontWeight: 800,
                }}
              >
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logo card — aligned LEFT now */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 28 }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 14,
            padding: 12,
            boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
          }}
        >
          <img
            src="/images/secure.png"
            alt="Sovereign Intelligence"
            style={{
              display: 'block',
              width: 'clamp(280px, 28vw, 420px)', // left aligned; a touch larger
              height: 'auto',
            }}
          />
        </div>
      </div>
    </div>
  );
}
