'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ✅ keep this exact import (your shared layout/gradient lives here)
import styles from '../../test_page/TestPage.module.css';

const TOP5 = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
];

export default function TranslationPage() {
  const router = useRouter();

  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('SI_LANG') || 'en';
    }
    return 'en';
  });

  // Set RTL for Arabic
  useEffect(() => {
    try {
      document.documentElement.setAttribute('dir', /^ar$/i.test(lang) ? 'rtl' : 'ltr');
    } catch {}
  }, [lang]);

  function onChange(e) {
    const v = e.target.value;
    setLang(v);
    try {
      localStorage.setItem('SI_LANG', v);
    } catch {}
    // Navigate to login (we’ll style that page later)
    router.push(`/2FA/login?lang=${encodeURIComponent(v)}`);
  }

  return (
    <div
      // keep your gradient; this wrapper doesn't fight your module CSS
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116 0%, #2d333a 100%)',
        padding: '24px 20px',
      }}
    >
      {/* HEADER: left title, right language selector */}
      <header
        className={styles?.tpHeader}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          width: '100%',
        }}
      >
        {/* LEFT: title (logo section is below) */}
        <h1
          className={styles?.tpTitle}
          style={{
            margin: 0,
            marginRight: 12,
            fontSize: 44,
            fontWeight: 900,
            color: '#fff',
            flex: '0 0 auto',
          }}
        >
          Sovereign Intelligence
        </h1>

        {/* RIGHT: label + select pushed all the way right; stays right on wrap */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            flex: '1 1 420px',
            minWidth: 320,
          }}
        >
          <span
            style={{
              color: '#fff',
              fontWeight: 900,
              fontSize: 20,
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}
          >
            Select a language:
          </span>

          <select
            id="lang-select"
            value={lang}
            onChange={onChange}
            aria-label="Select a language"
            style={{
              width: 'clamp(280px, 34vw, 420px)',
              height: 50,
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              background: '#262b31', // darker grey
              border: '3px solid rgba(255,255,255,0.95)', // thicker white border
              outline: 'none',
              boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
            }}
          >
            {TOP5.map((o) => (
              <option
                key={o.code}
                value={o.code}
                style={{
                  color: '#fff',
                  background: '#1f2329',
                  fontWeight: 800,
                }}
              >
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* BODY: logo aligned left */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-start' }}>
        <div
          style={{
            background: '#f3f4f6',
            borderRadius: 16,
            padding: 18,
            boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
          }}
        >
          <img
            src="/images/secure.png"
            alt="Sovereign Intelligence"
            style={{ width: 420, maxWidth: '28vw', height: 'auto', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
