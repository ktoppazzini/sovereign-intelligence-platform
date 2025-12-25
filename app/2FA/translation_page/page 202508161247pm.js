'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../test_page/TestPage.module.css';

const CODE_TO_NAME = {
  en: 'English',
  ar: 'Arabic',
  sq: 'Albanian',
  fr: 'French',
  es: 'Spanish',
};

const TOP5 = Object.entries(CODE_TO_NAME).map(([code, label]) => ({ code, label }));

const RTL_SET = new Set(['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Farsi', 'Pashto']);
const isRTL = (name) => RTL_SET.has(name);

export default function TranslationPage() {
  const router = useRouter();
  const [langCode, setLangCode] = useState('en');

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search || '');
      const code = (sp.get('lang') || 'en').toLowerCase();
      if (CODE_TO_NAME[code]) setLangCode(code);
    } catch {}
  }, []);

  function persistLang(langName) {
    try {
      // New generic key + back-compat with the Users page key
      localStorage.setItem('SI_LANG', langName);
      localStorage.setItem('SI_USERS_LANG', langName);
    } catch {}
    try {
      document.documentElement.setAttribute('dir', isRTL(langName) ? 'rtl' : 'ltr');
    } catch {}
  }

  function handleLangChange(e) {
    const nextCode = e.target.value;
    const nextName = CODE_TO_NAME[nextCode] || 'English';
    setLangCode(nextCode);
    persistLang(nextName);

    // Preserve ?redirect=… if present, else default to /admin/users
    let redirectTarget = '/admin/users';
    try {
      const sp = new URLSearchParams(window.location.search || '');
      redirectTarget = sp.get('redirect') || redirectTarget;
    } catch {}

    router.push(
      `/2FA/login?lang=${encodeURIComponent(nextName)}&redirect=${encodeURIComponent(
        redirectTarget,
      )}`,
    );
  }

  return (
    <div style={{ padding: '28px 24px 0' }}>
      {/* Top row: title left, language right */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        <h1 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 42, lineHeight: 1.15 }}>
          Sovereign Intelligence
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            minWidth: 520,
            justifyContent: 'flex-end',
          }}
        >
          <label
            htmlFor="lang-select"
            style={{ color: '#fff', fontWeight: 900, fontSize: 20, whiteSpace: 'nowrap' }}
          >
            Select a language:
          </label>

          <select
            id="lang-select"
            value={langCode}
            onChange={handleLangChange}
            style={{
              minWidth: 520,
              height: 50,
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              background: '#3b3f46',
              border: '1px solid rgba(255,255,255,0.25)',
              outline: 'none',
              boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
            }}
          >
            {TOP5.map((o) => (
              <option
                key={o.code}
                value={o.code}
                style={{ color: '#fff', background: '#2c2f34', fontWeight: 800 }}
              >
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logo card — aligned LEFT */}
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
            style={{ display: 'block', width: 'clamp(280px, 28vw, 420px)', height: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
}
