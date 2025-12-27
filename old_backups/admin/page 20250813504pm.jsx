'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// NOTE: If your Header lives at app/components/Header.js, this is correct:
import Header from '../components/Header';
// NOTE: If your Footer lives at /components/Footer.js (project root), this is correct:
import Footer from '../../components/Footer';

export default function AdminHome() {
  const qs = useSearchParams();
  const lang = (qs.get('lang') || 'English').trim();
  const langSuffix = lang.toLowerCase() === 'english' ? '' : `?lang=${encodeURIComponent(lang)}`;

  // Text labels (translated at runtime, with safe defaults)
  const [t, setT] = useState({
    heroTitle: 'Sovereign Intelligence',
    welcomeTitle: 'Admin',
    welcomeSubtitle: 'Manage content, users and datasets.',
    reforms: 'Reform Requests',
    languages: 'Languages',
    users: 'Users',
    logs: 'Logs',
  });

  useEffect(() => {
    const prompt = `Translate the following labels into ${lang}. Return only a raw JSON object:
{"heroTitle":"Sovereign Intelligence","welcomeTitle":"Admin","welcomeSubtitle":"Manage content, users and datasets.","reforms":"Reform Requests","languages":"Languages","users":"Users","logs":"Logs"}`;
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
        }
      } catch {
        /* soft fail */
      }
    })();
  }, [lang]);

  // Admin links (keeps ?lang in URLs)
  const links = [
    { href: `/admin/reforms${langSuffix}`, labelKey: 'reforms', fallback: 'Reform Requests' },
    { href: `/admin/languages${langSuffix}`, labelKey: 'languages', fallback: 'Languages' },
    { href: `/admin/users${langSuffix}`, labelKey: 'users', fallback: 'Users' },
    { href: `/admin/logs${langSuffix}`, labelKey: 'logs', fallback: 'Logs' },
  ];

  // Reusable inline styles (page-only, no global CSS touched)
  const blue = '#082b52'; // your login/button blue
  const shell = { maxWidth: 1200, margin: '0 auto', padding: '24px 16px' };
  const grid = {
    display: 'grid',
    gridTemplateColumns: 'minmax(260px, 360px) 60px minmax(380px, 560px)', // left / spacer / right
    alignItems: 'start',
    gap: 24,
  };
  const title = {
    fontSize: 36,
    fontWeight: 800,
    lineHeight: 1.1,
    margin: '0 0 16px',
  };
  const subTitle = { fontSize: 22, fontWeight: 800, margin: '0 0 4px' };
  const subCopy = { opacity: 0.9, margin: '0 0 20px' };
  const btnCol = { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 };
  const btn = {
    display: 'block',
    background: blue,
    color: '#fff',
    textDecoration: 'none',
    padding: '14px 18px',
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 18,
    boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
  };

  return (
    <>
      <Header />

      <section className="max-w-[1200px] mx-auto px-4 py-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          {/* 1) Left column: logo */}
          <div style={{ flex: '0 0 260px' }}>
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={260}
              height={260}
              style={{ width: 260, height: 260, objectFit: 'contain', display: 'block' }}
            />
          </div>

          {/* 2) Spacer A (new) */}
          <div style={{ flex: '0 0 500px' }} />

          {/* 3) Spacer B (new) */}
          <div style={{ flex: '0 0 500px' }} />

          {/* 4) Middle spacer (existing, keep it but narrower/wider as needed) */}
          <div style={{ flex: '0 0 500px' }} />

          {/* 5) Right column: Admin title + buttons */}
          <div style={{ flex: '1 0 360px', maxWidth: 480 }}>
            <p className="text-2xl font-bold mb-1">
              Admin <span className="opacity-70">(English)</span>
            </p>
            <p className="opacity-90 mb-6">Manage content, users and datasets.</p>

            {/* Buttons (same styling as your login theme) */}
            <a
              href="/admin/reforms"
              className="no-underline"
              style={{
                display: 'block',
                background: '#0b2e54',
                color: '#fff',
                fontWeight: 800,
                padding: '14px 18px',
                borderRadius: 12,
                boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
                marginBottom: 16,
              }}
            >
              Reform Requests
            </a>

            <a
              href="/admin/languages"
              className="no-underline"
              style={{
                display: 'block',
                background: '#0b2e54',
                color: '#fff',
                fontWeight: 800,
                padding: '14px 18px',
                borderRadius: 12,
                boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
                marginBottom: 16,
              }}
            >
              Languages
            </a>

            <a
              href="/admin/users"
              className="no-underline"
              style={{
                display: 'block',
                background: '#0b2e54',
                color: '#fff',
                fontWeight: 800,
                padding: '14px 18px',
                borderRadius: 12,
                boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
                marginBottom: 16,
              }}
            >
              Users
            </a>

            <a
              href="/admin/logs"
              className="no-underline"
              style={{
                display: 'block',
                background: '#0b2e54',
                color: '#fff',
                fontWeight: 800,
                padding: '14px 18px',
                borderRadius: 12,
                boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
              }}
            >
              Logs
            </a>
          </div>
        </div>
      </section>

      <Footer lang={lang} />
    </>
  );
}
