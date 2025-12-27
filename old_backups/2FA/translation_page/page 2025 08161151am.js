'use client';

import { useEffect, useState } from 'react';
import styles from '../../test_page/TestPage.module.css';

// Keep the list restricted here for now.
// When you’re ready to “unblock”, replace this with your API call.
const LANG_FALLBACK_TOP5 = [
  { code: 'English', label: 'English' },
  { code: 'Arabic', label: 'العربية (Arabic)' },
  { code: 'French', label: 'Français (French)' },
  { code: 'Spanish', label: 'Español (Spanish)' },
  { code: 'Albanian', label: 'Shqip (Albanian)' },
];

function normalizeLang(raw) {
  if (!raw) return 'English';
  const m = {
    ar: 'Arabic',
    arabic: 'Arabic',
    fr: 'French',
    français: 'French',
    french: 'French',
    es: 'Spanish',
    spanish: 'Spanish',
    sq: 'Albanian',
    albanian: 'Albanian',
    en: 'English',
    english: 'English',
  };
  const k = String(raw).toLowerCase();
  return m[k] || raw;
}

function isRTL(lang) {
  return /arabic|hebrew|urdu|persian|farsi|pashto/i.test(lang || '');
}

export default function TranslationPage() {
  const [lang, setLang] = useState('English');

  // On mount: use stored language and set dir
  useEffect(() => {
    try {
      const stored = localStorage.getItem('SI_USERS_LANG');
      const effective = stored || 'English';
      setLang(effective);
      document.documentElement.setAttribute('dir', isRTL(effective) ? 'rtl' : 'ltr');
    } catch {}
  }, []);

  function onChange(e) {
    const v = normalizeLang(e.target.value);
    setLang(v);
    try {
      localStorage.setItem('SI_USERS_LANG', v);
    } catch {}
    document.documentElement.setAttribute('dir', isRTL(v) ? 'rtl' : 'ltr');
  }

  return (
    // We still render inside whatever your shared TestPage layout applies:
    <main className={styles?.page || undefined}>
      {/* Local, page-only wrapper that adds the top space you want */}
      <div className="tp-wrap">
        <h1 className="tp-title">Sovereign Intelligence</h1>

        <div className="tp-row">
          <label className="tp-label" htmlFor="langSel">
            Select a language:
          </label>
          <select id="langSel" value={lang} onChange={onChange} className="tp-select">
            <option value="">-- Choose a language --</option>
            {LANG_FALLBACK_TOP5.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="tp-logo">
          <img src="/images/secure.png" alt="Sovereign Intelligence" width={420} height={420} />
        </div>
      </div>

      {/* Scoped styles: affects ONLY this component */}
      <style jsx>{`
        .tp-wrap {
          padding-top: 56px; /* << top space fix */
          padding-bottom: 48px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .tp-title {
          margin: 0 0 12px 0;
          font-size: 44px;
          font-weight: 800;
          color: #fff;
          text-align: center;
          letter-spacing: 0.2px;
        }
        .tp-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 6px 0 16px;
          color: #fff;
          font-weight: 600;
        }
        .tp-label {
          opacity: 0.92;
        }
        .tp-select {
          min-width: 260px;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          outline: none;
        }
        .tp-select:focus {
          border-color: rgba(255, 255, 255, 0.35);
        }
        .tp-select option {
          color: #000;
        }

        .tp-logo {
          width: 540px;
          max-width: 92vw;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 18px 32px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tp-logo img {
          display: block;
          width: 100%;
          height: auto;
        }
      `}</style>
    </main>
  );
}
