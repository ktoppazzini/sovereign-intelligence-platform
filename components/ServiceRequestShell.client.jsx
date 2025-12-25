'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/* ===== labels to translate via /api/gptTranslation ===== */
const KEYS = {
  home: 'Home',
  assistant: 'Assistant',
  dashboard: 'Dashboard',
  reform: 'Reform Engine',
};

const NAV_SIZES = {
  icon: 33,
  label: 22,
  weight: 900,
};

/* ===== language helpers ===== */
function isEnglishLang(v = '') {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  return s === 'en' || s === 'english' || s === 'eng' || /^en([-_][a-z0-9]{2,8})?$/.test(s);
}
const RTL_BASES = new Set([
  'ar',
  'fa',
  'he',
  'iw',
  'ur',
  'ps',
  'ku',
  'sd',
  'ug',
  'yi',
  'dv',
  'syr',
]);
function isRtl(v = '') {
  const base = String(v).toLowerCase().split(/[-_]/)[0];
  return RTL_BASES.has(base);
}

export default function ServiceRequestShell({
  lang = 'English',
  maxWidth = 1260, // <- keeps the table from being too wide
  paddingX = 28,
  children,
}) {
  const [t, setT] = useState(KEYS);

  // announce shell ready (optional hook)
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('si:ready:serviceshell'));
    } catch {}
  }, []);

  // Resolve lang once (URL ?lang= > prop > localStorage)
  const langTarget = useMemo(() => {
    if (typeof window === 'undefined') return lang;
    const url = new URL(window.location.href);
    const resolved =
      url.searchParams.get('lang') || lang || localStorage.getItem('ui_lang') || 'en';
    const cleaned = String(resolved).trim();
    try {
      localStorage.setItem('ui_lang', cleaned);
    } catch {}
    return cleaned;
  }, [lang]);

  // Translate nav labels dynamically
  useEffect(() => {
    if (isEnglishLang(langTarget)) {
      setT(KEYS);
      return;
    }
    const controller = new AbortController();
    const prompt =
      `Translate ONLY the following labels into the language specified by "${langTarget}". ` +
      `Return ONLY a JSON object with the SAME KEYS (no prose):\n` +
      JSON.stringify(KEYS);

    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
        const j = await res.json().catch(() => ({}));
        if (j?.translation && typeof j.translation === 'object') {
          setT((prev) => ({ ...prev, ...j.translation }));
        }
      } catch {
        /* ignore for resilience */
      }
    })();

    return () => controller.abort();
  }, [langTarget]);

  return (
    <div
      className="si-scope"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0F1116, #2D333A)',
        color: '#fff',
      }}
      dir={isRtl(langTarget) ? 'rtl' : 'ltr'}
    >
      {/* Header (nav only — no logo, no page title, no buttons) */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: `18px ${paddingX}px`,
        }}
      >
        <nav
          aria-label="Primary"
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            columnGap: 28,
            rowGap: 10,
            lineHeight: 1,
            fontWeight: NAV_SIZES.weight,
          }}
        >
          <Link
            href="/"
            style={{
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              role="img"
              aria-label="home"
              className="si-icon"
              style={{ fontSize: NAV_SIZES.icon, fontWeight: NAV_SIZES.weight }}
            >
              🏠
            </span>
            <h1
              className="si-label"
              style={{ margin: 0, fontSize: NAV_SIZES.label, fontWeight: NAV_SIZES.weight }}
            >
              {t.home}
            </h1>
          </Link>

          <Link
            href="/assistant"
            style={{
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              role="img"
              aria-label="assistant"
              className="si-icon"
              style={{ fontSize: NAV_SIZES.icon, fontWeight: NAV_SIZES.weight }}
            >
              🧠
            </span>
            <h1
              className="si-label"
              style={{ margin: 0, fontSize: NAV_SIZES.label, fontWeight: NAV_SIZES.weight }}
            >
              {t.assistant}
            </h1>
          </Link>

          <Link
            href="/dashboard"
            style={{
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              role="img"
              aria-label="dashboard"
              className="si-icon"
              style={{ fontSize: NAV_SIZES.icon, fontWeight: NAV_SIZES.weight }}
            >
              📊
            </span>
            <h1
              className="si-label"
              style={{ margin: 0, fontSize: NAV_SIZES.label, fontWeight: NAV_SIZES.weight }}
            >
              {t.dashboard}
            </h1>
          </Link>

          <Link
            href="/reform"
            style={{
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              role="img"
              aria-label="reform engine"
              className="si-icon"
              style={{ fontSize: NAV_SIZES.icon, fontWeight: NAV_SIZES.weight }}
            >
              ⚙️
            </span>
            <h1
              className="si-label"
              style={{ margin: 0, fontSize: NAV_SIZES.label, fontWeight: NAV_SIZES.weight }}
            >
              {t.reform}
            </h1>
          </Link>
        </nav>
      </header>

      {/* Content (centered, width-capped; tables get responsive overflow) */}
      <main
        className="si-main"
        style={{
          padding: `8px ${paddingX}px 40px`,
        }}
      >
        <section
          className="si-content"
          style={{
            maxWidth,
            width: '100%',
            margin: '0 auto',
            overflowX: 'auto',
          }}
        >
          {children}
        </section>
      </main>

      {/* Scoped styles */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .si-scope :global(.si-label) {
            font-size: 18px !important;
          }
        }
        @media (max-width: 560px) {
          .si-scope :global(nav[aria-label='Primary']) {
            column-gap: 18px !important;
          }
        }

        /* Make any tables inside the page responsive and tidy */
        .si-content :global(table) {
          width: 100%;
          border-collapse: collapse;
        }
        .si-content :global(th),
        .si-content :global(td) {
          padding: 8px 10px;
          vertical-align: top;
          white-space: nowrap;
        }
        .si-content :global(td:nth-child(4)) {
          /* email col often long */
          max-width: 320px;
          white-space: normal;
          word-break: break-word;
        }
        .si-content :global(th:last-child),
        .si-content :global(td:last-child) {
          width: 1%;
        }

        /* link styles (match HomeShell look) */
        .si-scope :global(header nav[aria-label='Primary'] a:link),
        .si-scope :global(header nav[aria-label='Primary'] a:visited),
        .si-scope :global(header nav[aria-label='Primary'] a:hover),
        .si-scope :global(header nav[aria-label='Primary'] a:active),
        .si-scope :global(header nav[aria-label='Primary'] a:focus) {
          color: #ffffff !important;
          font-weight: 800 !important;
          text-decoration: none !important;
        }
        .si-scope :global(header nav[aria-label='Primary'] a) {
          display: inline-flex !important;
          align-items: center !important;
          gap: 10px !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }
        .si-scope :global(header nav[aria-label='Primary'] a > *:first-child) {
          display: inline-block !important;
          width: 1.7em !important;
          line-height: 1 !important;
          transform: translateY(1px);
        }
        .si-scope :global(header nav[aria-label='Primary'] a > *:last-child) {
          line-height: 1 !important;
          margin: 0 !important;
          font-weight: 800 !important;
        }

        [dir='rtl'] .si-main {
          direction: rtl;
        }
      `}</style>
    </div>
  );
}
