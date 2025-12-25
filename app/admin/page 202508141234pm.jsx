'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// NOTE: paths exactly as you requested
import Header from '../components/Header';
import Footer from '../../components/Footer';

export default function AdminHome() {
  const qs = useSearchParams();
  const lang = (qs.get('lang') || 'English').trim();
  const langSuffix = lang.toLowerCase() === 'english' ? '' : `?lang=${encodeURIComponent(lang)}`;

  // Translated text (safe fallbacks)
  const [t, setT] = useState({
    heroTitle: 'Sovereign Intelligence',
    welcomeTitle: 'Admin',
    welcomeSubtitle: 'Manage content, users and datasets.',
    reforms: 'Reform Requests',
    languages: 'Languages',
    users: 'Users',
    logs: 'Logs',
    incidentTickets: 'Incident Tickets', // NEW
  });

  useEffect(() => {
    const prompt = `Translate the following labels into ${lang}. Return only a raw JSON object:
{"heroTitle":"Sovereign Intelligence","welcomeTitle":"Admin","welcomeSubtitle":"Manage content, users and datasets.","reforms":"Reform Requests","languages":"Languages","users":"Users","logs":"Logs","incidentTickets":"Incident Tickets"}`;
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

  // Button URLs (keep ?lang)
  const btns = [
    { href: `/admin/reforms${langSuffix}`, label: t.reforms || 'Reform Requests' },
    { href: `/admin/languages${langSuffix}`, label: t.languages || 'Languages' },
    { href: `/admin/users${langSuffix}`, label: t.users || 'Users' }, // existing and correct
    { href: `/admin/incidents${langSuffix}`, label: t.incidentTickets || 'Incident Tickets' }, // NEW
    { href: `/admin/logs${langSuffix}`, label: t.logs || 'Logs' },
  ];

  const blue = '#fff';

  return (
    <>
      <Header />

      {/* Title on top (same positioning as Home) */}
      <section className="shell">
        <h1 className="pageTitle">{t.heroTitle}</h1>

        {/* 5-column grid:
            [logo] [spacer1] [spacer2] [spacer3] [content] */}
        <div className="adminGrid">
          {/* 1) Logo (left) */}
          <div className="logoCol">
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={260}
              height={260}
              style={{ width: 260, height: 260, objectFit: 'contain', display: 'block' }}
              decoding="async"
            />
          </div>

          {/* 2–4) Spacers to push content to the right */}
          <div aria-hidden="true" />
          <div aria-hidden="true" />
          <div aria-hidden="true" />

          {/* 5) Content (title aligned with page title baseline) */}
          <div className="contentCol">
            <p className="welcomeTitle">
              {t.welcomeTitle} <span className="muted">({lang})</span>
            </p>
            <p className="welcomeCopy">{t.welcomeSubtitle}</p>

            {/* Vertical buttons (same blue as login) */}
            <nav aria-label="Admin navigation" className="btnStack">
              {btns.map((b) => (
                // Use <a> to keep button look & avoid Link warnings you’re deferring
                <a key={b.href} href={b.href} className="adminBtn">
                  {b.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <Footer lang={lang} />

      {/* Page-scoped CSS only */}
      <style jsx>{`
        .shell {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px;
        }

        .pageTitle {
          font-size: 36px;
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 16px;
          color: #fff;
        }

        /* Grid with three spacers to push content far right */
        .adminGrid {
          display: grid;
          grid-template-columns: 260px 1fr 1fr 1fr minmax(360px, 520px);
          align-items: start;
          gap: 24px;
        }

        .logoCol {
          grid-column: 1 / 2;
        }

        .contentCol {
          grid-column: 5 / 6;
          max-width: 520px;
        }

        .welcomeTitle {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 6px;
          color: #fff;
        }

        .muted {
          opacity: 0.7;
        }

        .welcomeCopy {
          margin: 0 0 18px;
          opacity: 0.9;
        }

        .btnStack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .adminBtn {
          display: block;
          text-decoration: none;
          background: ${blue};
          color: #082b52;
          font-weight: 800;
          font-size: 24px;
          padding: 14px 18px;
          border-radius: 12px;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.3);
        }

        /* Responsive: collapse spacers on small screens */
        @media (max-width: 980px) {
          .adminGrid {
            grid-template-columns: 1fr;
          }
          .logoCol,
          .contentCol {
            grid-column: auto;
          }
          .contentCol {
            max-width: none;
          }
        }
      `}</style>
    </>
  );
}
