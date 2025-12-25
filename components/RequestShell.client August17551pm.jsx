// components/RequestShell.client.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import ServiceRequestForm from '@/components/ServiceRequestForm.client';

// ─── helpers (same logic you use on Home) ─────────────────────────────────────
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
  const candidates = [
    fields['Roles (from Role)'],
    fields['Role Names'],
    fields.RoleNames,
    fields['Role Name'],
    fields.Role,
    fields.role,
  ];
  for (const v of candidates) {
    if (!v) continue;

    if (Array.isArray(v) && v.length) {
      const first = v[0];
      if (typeof first === 'string') return first.trim();
      if (first && typeof first === 'object') {
        const byCommonKeys = first.name || first.label || first.title || first.value || '';
        if (byCommonKeys) return String(byCommonKeys).trim();
      }
      return String(first ?? '').trim();
    }

    if (typeof v === 'string' || typeof v === 'number') {
      return String(v).trim();
    }
  }
  return '';
}

function isAdminish(role) {
  return /^(admin|super\s*admin)$/i.test(String(role || '').trim());
}
// ───────────────────────────────────────────────────────────────────────────────

export default function RequestShell({ lang = 'English', role: roleFromServer = 'User' }) {
  const [dbg, setDbg] = useState(false);
  const [roleResolved, setRoleResolved] = useState(String(roleFromServer || '').trim());
  const [checkedFallback, setCheckedFallback] = useState(false);

  // allow ?dbg=1 in URL
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      setDbg(q.has('dbg') || q.has('debug'));
    } catch {}
  }, []);

  // resolve role (cookie → fallback API)
  useEffect(() => {
    let resolved = String(roleFromServer || '').trim();
    if (isAdminish(resolved)) {
      setRoleResolved(resolved);
      return;
    }

    const cookieRole = getCookie('user_role');
    if (isAdminish(cookieRole)) {
      setRoleResolved(cookieRole);
      return;
    }

    (async () => {
      try {
        const myEmail = getCookie('user_email');
        if (!myEmail) return setCheckedFallback(true);

        const res = await fetch('/api/admin/users?limit=100&debug=1', {
          cache: 'no-store',
        });
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
          if (foundRole) setRoleResolved(foundRole);
        }
      } catch {
        // ignore
      } finally {
        setCheckedFallback(true);
      }
    })();
  }, [roleFromServer]);

  const canSeeAdmin = useMemo(() => isAdminish(roleResolved), [roleResolved]);

  useEffect(() => {
    console.log(
      '[RequestShell] lang=%s roleFromServer="%s" roleResolved="%s" canSeeAdmin=%s fallbackChecked=%s',
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
        {/* Title row (matches HomeShell; buttons removed) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <h1 style={{ fontWeight: 900, fontSize: 44, margin: 0 }}>Sovereign Intelligence</h1>
          <div style={{ marginLeft: 'auto' }} />
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

        {/* Two-column layout: logo left, form right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: 28,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: '#f3f4f6',
              borderRadius: 16,
              padding: 18,
              width: 380,
              boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
            }}
          >
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={380}
              height={380}
              style={{ maxWidth: '26vw', height: 'auto', display: 'block' }}
            />
          </div>

          {/* Your working, translated form */}
          <ServiceRequestForm lang={lang} />
        </div>
      </main>
    </div>
  );
}
