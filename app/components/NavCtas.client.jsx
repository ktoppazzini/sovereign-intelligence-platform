'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const TEXT = { submit: 'Submit Service Request', admin: 'Admin' };

function isAdminish(v) {
  return /^(admin|super\s*admin)$/i.test(String(v || '').trim());
}

export default function NavCtas({ lang: langProp }) {
  const [lang, setLang] = useState(langProp || 'English');
  const [t, setT] = useState(TEXT);
  const [role, setRole] = useState('');

  // Resolve lang from URL if not passed
  useEffect(() => {
    if (langProp) return;
    try {
      const qs = new URLSearchParams(window.location.search);
      setLang(qs.get('lang') || 'English');
    } catch {}
  }, [langProp]);

  // Translate labels
  useEffect(() => {
    if (/^english$/i.test(lang)) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Translate ONLY into ${lang} the following JSON keys and return the same object:\n${JSON.stringify(TEXT)}`,
          }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        const obj = j?.translation && typeof j.translation === 'object' ? j.translation : j;
        if (obj && typeof obj === 'object') setT((prev) => ({ ...prev, ...obj }));
      } catch {}
    })();
    return () => ctrl.abort();
  }, [lang]);

  // Ensure we know the role (without changing verify route)
  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch('/api/me/role', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (j?.role) setRole(j.role);
      } catch {}
    };
    run();
  }, []);

  const showAdmin = useMemo(() => isAdminish(role), [role]);

  const baseBtn = {
    textDecoration: 'none',
    fontWeight: 900,
    borderRadius: 12,
    padding: '12px 18px',
  };

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Link
        href={`/forms/request?lang=${encodeURIComponent(lang)}`}
        style={{
          ...baseBtn,
          background: '#0c2f57',
          border: '3px solid rgba(255,255,255,0.95)',
          color: '#fff',
        }}
      >
        {t.submit}
      </Link>

      {showAdmin && (
        <Link
          href={`/admin?lang=${encodeURIComponent(lang)}`}
          style={{
            ...baseBtn,
            background: 'transparent',
            border: '2px solid rgba(255,255,255,0.7)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 10,
          }}
        >
          {t.admin}
        </Link>
      )}
    </div>
  );
}
