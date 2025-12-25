// components/HomeShell.client.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const KEYS = {
  submit: 'Submit Service Request',
  admin: 'Admin',
};

function getCookie(name) {
  try {
    const m = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&') + '=([^;]*)'),
    );
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function extractRoleString(fields = {}) {
  const candidates = [fields['Roles (from Role)'], fields.RoleNames, fields.Role, fields.role];
  for (const v of candidates) {
    if (!v) continue;
    if (Array.isArray(v) && v.length) return String(v[0]).trim();
    return String(v).trim();
  }
  return '';
}

function isAdminish(role) {
  return /^(admin|super\s*admin)$/i.test(String(role || '').trim());
}

export default function HomeShell({ lang = 'English', role: roleFromServer = 'User' }) {
  const [t, setT] = useState(KEYS);
  const [dbg, setDbg] = useState(false);
  const [roleResolved, setRoleResolved] = useState(String(roleFromServer || '').trim());
  const [checkedFallback, setCheckedFallback] = useState(false);

  // Optional on-screen debug via ?dbg=1
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      setDbg(q.has('dbg') || q.has('debug'));
    } catch {}
  }, []);

  // Translate the two button labels only
  useEffect(() => {
    if (/^english$/i.test(lang)) return;
    const prompt = `Translate ONLY the following labels into ${lang}. Return just a JSON object with the same keys:\n${JSON.stringify(
      KEYS,
    )}`;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        if (j?.translation && typeof j.translation === 'object') {
          setT((prev) => ({ ...prev, ...j.translation }));
        }
      } catch {}
    })();
    return () => ctrl.abort();
  }, [lang]);

  // Resolve role (cookie → fallback API) without touching verify route
  useEffect(() => {
    let resolved = String(roleFromServer || '').trim();

    // 1) role from server prop
    if (isAdminish(resolved)) {
      setRoleResolved(resolved);
      return;
    }

    // 2) try cookie directly on client
    const cookieRole = getCookie('user_role');
    if (isAdminish(cookieRole)) {
      setRoleResolved(cookieRole);
      return;
    }

    // 3) fallback: fetch users list and find me by cookie email
    (async () => {
      try {
        const myEmail = getCookie('user_email');
        if (!myEmail) return setCheckedFallback(true);

        const res = await fetch('/api/admin/users?limit=100&debug=1', { cache: 'no-store' });
        if (!res.ok) return setCheckedFallback(true);

        const data = await res.json().catch(() => null);
        const rows = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];

        const me = rows.find((r) => {
          const f = r?.fields || {};
          const emailField = f.Email || f.email || f['User Email'] || f['Login Email'] || '';
          return String(emailField).trim().toLowerCase() === String(myEmail).trim().toLowerCase();
        });

        if (me) {
          const foundRole = extractRoleString(me.fields);
          if (foundRole) {
            setRoleResolved(foundRole);
          }
        }
      } catch {
        // ignore
      } finally {
        setCheckedFallback(true);
      }
    })();
  }, [roleFromServer]);

  const canSeeAdmin = useMemo(() => isAdminish(roleResolved), [roleResolved]);

  // Console debug
  useEffect(() => {
    console.log(
      '[HomeShell] lang=%s, roleFromServer="%s", roleResolved="%s", canSeeAdmin=%s, fallbackChecked=%s',
      lang,
      roleFromServer,
      roleResolved,
      canSeeAdmin,
      checkedFallback,
    );
  }, [lang, roleFromServer, roleResolved, canSeeAdmin, checkedFallback]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116,#2d333a)',
      }}
      data-role={roleResolved}
      data-can-see-admin={String(canSeeAdmin)}
    >
      <main style={{ padding: '24px 32px', color: '#fff' }}>
        {/* Title + right-side buttons only (no extra nav) */}
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
            <div>roleFromServer: “{roleFromServer}”</div>
            <div>roleResolved: “{roleResolved}”</div>
            <div>canSeeAdmin: {String(canSeeAdmin)}</div>
            <div>fallbackChecked: {String(checkedFallback)}</div>
            <div>user_email cookie: “{getCookie('user_email') ?? '(none)'}”</div>
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
