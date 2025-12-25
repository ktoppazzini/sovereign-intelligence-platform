'use client';

import { useEffect, useState } from 'react';
import NavCtas from '@/components/NavCtas.client';
import ServiceRequestForm from '@/components/ServiceRequestForm.client';

// tiny helpers reused across pages
function normalizeLang(raw) {
  if (!raw) return 'English';
  const lower = String(raw).toLowerCase();
  const map = {
    ar: 'Arabic',
    arabic: 'Arabic',
    he: 'Hebrew',
    hebrew: 'Hebrew',
    fa: 'Persian',
    farsi: 'Persian',
    ur: 'Urdu',
    urdu: 'Urdu',
    ps: 'Pashto',
    pashto: 'Pashto',
    fr: 'French',
    français: 'French',
    french: 'French',
    es: 'Spanish',
    spanish: 'Spanish',
    zh: 'Chinese',
    chinese: 'Chinese',
    en: 'English',
    english: 'English',
    albanian: 'Albanian',
    sq: 'Albanian',
  };
  return map[lower] || raw;
}
function isRTL(lang) {
  return /arabic|hebrew|urdu|persian|farsi|pashto/i.test(lang || '');
}

export default function RequestShell({ lang: langProp = 'English' }) {
  const lang = normalizeLang(langProp);

  // keep LTR/RTL consistent with your other pages
  useEffect(() => {
    try {
      document.documentElement.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
    } catch {}
  }, [lang]);

  // i18n for the title only (form fields are handled inside the form)
  const [t, setT] = useState({ title: 'Service Request' });
  useEffect(() => {
    if (/^english$/i.test(lang)) return;
    const prompt = `Translate the following UI label into ${lang}. Return ONLY JSON with same key:
${JSON.stringify({ title: 'Service Request' })}`;
    (async () => {
      try {
        const r = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await r.json().catch(() => ({}));
        if (data?.translation && typeof data.translation === 'object') {
          setT((prev) => ({ ...prev, ...data.translation }));
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
          setT((prev) => ({ ...prev, ...data })); // some runs return the object directly
        }
      } catch {}
    })();
  }, [lang]);

  // --- layout styles match your Users page (left logo / right content)
  const wrapStyle = { display: 'flex', alignItems: 'flex-start' };
  const mainStyle = { flex: 1, minWidth: 0 };
  const leftColStyle = {
    width: 240,
    minWidth: 240,
    marginRight: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  };
  const leftTitleStyle = {
    color: '#fff',
    fontWeight: 900,
    fontSize: 36,
    lineHeight: 1.05,
    margin: '0 0 10px 0',
  };
  const leftLogoFrame = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
  };
  const leftLogoStyle = {
    width: 200,
    height: 200,
    objectFit: 'contain',
    display: 'block',
    borderRadius: 12,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116,#2d333a)',
        color: '#fff',
      }}
    >
      {/* Top nav (right-aligned) – same component you use elsewhere */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px' }}>
        <NavCtas lang={lang} />
      </div>

      <div style={{ padding: '0 24px 32px' }}>
        <div style={wrapStyle}>
          {/* LEFT */}
          <aside style={leftColStyle} aria-label="Sovereign Intelligence">
            <div style={leftTitleStyle}>
              Sovereign
              <br />
              Intelligence
            </div>
            <div style={leftLogoFrame}>
              <img
                src="/images/secure.png"
                alt="Sovereign Intelligence"
                width={200}
                height={200}
                style={leftLogoStyle}
              />
            </div>
          </aside>

          {/* RIGHT */}
          <main style={mainStyle}>
            <h1 style={{ fontWeight: 900, fontSize: 32, margin: '0 0 14px 0' }}>{t.title}</h1>

            <div
              style={{
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: 18,
              }}
            >
              <ServiceRequestForm lang={lang} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
