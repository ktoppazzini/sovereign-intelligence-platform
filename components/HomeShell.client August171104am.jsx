// components/HomeShell.client.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const KEYS = { submit: 'Submit Service Request', admin: 'Admin' };

function getCookie(name) {
  try {
    const parts = document.cookie ? document.cookie.split('; ') : [];
    for (const p of parts) {
      const [k, ...rest] = p.split('=');
      if (k === name) return decodeURIComponent(rest.join('='));
    }
    return null;
  } catch {
    return null;
  }
}

function isAdminish(role) {
  return /^(admin|super\s*admin)$/i.test(String(role || '').trim());
}

export default function HomeShell({ lang = 'English', role: roleFromServer = 'User' }) {
  const [t, setT] = useState(KEYS);
  const [dbg, setDbg] = useState(false);
  const [roleResolved, setRoleResolved] = useState(String(roleFromServer || '').trim());
  const [checkedRole, setCheckedRole] = useState(false);

  // Optional on-screen debug via ?dbg=1 or ?debug=1
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      setDbg(q.has('dbg') || q.has('debug'));
    } catch {}
  }, []);

  // Translate just the two button labels
  useEffect(() => {
    if (/^english$/i.test(lang)) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt:
              'Translate ONLY the following labels into ' +
              lang +
              '. Return just a JSON object with the same keys:\n' +
              JSON.stringify(KEYS),
          }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        const obj =
          (j && j.translation && typeof j.translation === 'object' && j.translation) ||
          (typeof j === 'object' ? j : null);
        if (obj) setT((prev) => ({ ...prev, ...obj }));
      } catch {}
    })();
    return () => ctrl.abort();
  }, [lang]);

  // Resolve role without touching /api/verify2FA
  useEffect(() => {
    (async () => {
      try {
        // 1) server-provided prop
        const initial = String(roleFromServer || '').trim();
        if (isAdminish(initial)) {
          setRoleResolved(initial);
          return;
        }
        // 2) cookie
        const cookieRole = getCookie('user_role');
        if (isAdminish(cookieRole)) {
          setRoleResolved(cookieRole);
          return;
        }
        // 3) small endpoint that reads Airtable and sets cookie
        const r = await fetch('/api/me/role', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (j && j.role) setRoleResolved(String(j.role));
      } catch {
        // ignore
      } finally {
        setCheckedRole(true);
      }
    })();
  }, [roleFromServer]);

  const canSeeAdmin = useMemo(() => isAdminish(roleResolved), [roleResolved]);

  // Console debug
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      '[HomeShell] lang=%s roleFromServer="%s" roleResolved="%s" canSeeAdmin=%s checkedRole=%s',
      lang,
      roleFromServer,
      roleResolved,
      canSeeAdmin,
      checkedRole,
    );
  }, [lang, roleFromServer, roleResolved, canSeeAdmin, checkedRole]);

  return (
    <div
      style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0f1116,#2d333a)' }}
      data-role={roleResolved}
      data-can-see-admin={String(canSeeAdmin)}
    >
      <main style={{ padding: '24px 32px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <h1 style={{ fontWeight: 900, fontSize: 44, margin: 0 }}>Sovereign Intelligence</h1>

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
                whiteSpace: 'nowrap',
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
                  whiteSpace: 'nowrap',
                }}
              >
                {t.admin}
              </Link>
            )}
          </div>
        </div>

        {dbg && (
          <div
            style={{
              margin: '8px 0 18px',
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
            }}
          >
            <div>
              <b>Debug</b>
            </div>
            <div>lang: {lang}</div>
            <div>roleFromServer: "{roleFromServer}"</div>
            <div>roleResolved: "{roleResolved}"</div>
            <div>canSeeAdmin: {String(canSeeAdmin)}</div>
            <div>checkedRole: {String(checkedRole)}</div>
            <div>user_email cookie: "{getCookie('user_email') ?? '(none)'}"</div>
            <div>user_role cookie: "{getCookie('user_role') ?? '(none)'}"</div>
          </div>
        )}

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
