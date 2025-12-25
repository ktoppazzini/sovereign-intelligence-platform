'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ---------- minimal inline styles (keep your layout) ----------
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
const leftTitleStyle = { color: '#fff', fontWeight: 800, fontSize: 22, margin: '0 0 10px 0' };
const leftLogoStyle = {
  width: 200,
  height: 200,
  objectFit: 'contain',
  display: 'block',
  borderRadius: 12,
  boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
  background: 'rgba(255,255,255,0.04)',
  padding: 8,
};
const inp = {
  flex: '1 1 240px',
  minWidth: 220,
  padding: '14px 16px',
  borderRadius: 8,
  border: '1px solid #222',
};
const bigBtn = {
  background: '#0b5cff',
  color: '#fff',
  fontWeight: 800,
  padding: '12px 18px',
  borderRadius: 10,
  border: 'none',
  boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
};
function smallBtn(bg, fg) {
  return {
    background: bg,
    color: fg,
    fontWeight: 800,
    padding: '8px 12px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 6px 12px rgba(0,0,0,0.25)',
  };
}

// ---------- page ----------
export default function AdminUsersPage() {
  const qs = useSearchParams();
  const lang = (qs.get('lang') || 'English').trim(); // <-- no { searchParams } prop anymore

  // same keys used in Admin page translation
  const [t, setT] = useState({
    title: 'Users',
    email: 'Email',
    name: 'Name',
    orgRecId: 'Organization Record ID (recXXXX)',
    roleRecIds: 'Role Record IDs (comma-separated)',
    addUser: 'Add User',
    status: 'Status',
    role: 'Role',
    actions: 'Actions',
    couldntLoad: 'Failed to fetch users from Airtable.',
    deleteUser: 'Delete User',
    suspendUser: 'Suspend User',
    assignRole: 'Assign Role',
    changeRole: 'Change Role',
    noUsers: 'No users found',
    showDebug: 'Show Debug',
    hideDebug: 'Hide Debug',
    active: 'Active',
    suspended: 'Suspended',
  });

  // Auto-translate whenever lang is not English (no i18n flag required)
  useEffect(() => {
    let cancelled = false;
    if (!lang || /^english$/i.test(lang)) return;

    (async () => {
      try {
        const prompt = `
Translate the following UI labels to ${lang}. Return a JSON object with EXACTLY these keys:

{
  "title": "Users",
  "email": "Email",
  "name": "Name",
  "orgRecId": "Organization Record ID (recXXXX)",
  "roleRecIds": "Role Record IDs (comma-separated)",
  "addUser": "Add User",
  "status": "Status",
  "role": "Role",
  "actions": "Actions",
  "couldntLoad": "Failed to fetch users from Airtable.",
  "deleteUser": "Delete User",
  "suspendUser": "Suspend User",
  "assignRole": "Assign Role",
  "changeRole": "Change Role",
  "noUsers": "No users found",
  "showDebug": "Show Debug",
  "hideDebug": "Hide Debug",
  "active": "Active",
  "suspended": "Suspended"
}
        `.trim();

        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) return;
        const dj = await res.json();
        if (cancelled || !dj?.ok || !dj.text) return;
        try {
          const parsed = JSON.parse(dj.text);
          setT((cur) => ({ ...cur, ...parsed }));
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // shared form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [roleIds, setRoleIds] = useState('');

  // users + debugging
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState('');
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const firstRole = useMemo(() => {
    return (
      (roleIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] || ''
    );
  }, [roleIds]);

  async function load() {
    setLoading(true);
    setErrText('');
    setDebug(null);
    try {
      const r = await fetch('/api/admin/users?limit=100&debug=1', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        const msg = j?.message || t.couldntLoad;
        setErrText(`${msg}${j?.status ? `. Status: ${j.status}` : ''}`);
        if (j?.debug) setDebug(j.debug);
        setRows([]);
      } else {
        setRows(
          (j.records || []).map((rec) => ({
            id: rec.id,
            name: rec.Name || '',
            email: rec.Email || '',
            role: rec.Role || '',
            active: !!rec.Active && !rec.Suspended,
          })),
        );
        if (j.debug) setDebug(j.debug);
      }
    } catch {
      setErrText(t.couldntLoad);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEmail('');
    setName('');
    setOrgId('');
    setRoleIds('');
  }

  async function callUsers(body) {
    const r = await fetch('/api/admin/users?debug=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      const msg = j?.message || 'Operation failed.';
      setErrText(`${msg}${j?.status ? `. Status: ${j.status}` : ''}`);
      if (j?.debug) setDebug(j.debug);
      throw new Error(msg);
    } else {
      if (j.debug) setDebug(j.debug);
    }
  }

  async function addUser() {
    if (!email.trim() || !name.trim()) {
      alert('Email and Name are required.');
      return;
    }
    try {
      await callUsers({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: firstRole,
        orgId: orgId.trim(),
        active: true,
      });
      await load();
      resetForm();
    } catch {}
  }
  async function deleteUserFromForm() {
    if (!email.trim()) {
      alert('Email is required.');
      return;
    }
    if (!confirm(`Delete user ${email.trim()}?`)) return;
    try {
      await callUsers({ email: email.trim().toLowerCase(), delete: true });
      await load();
    } catch {}
  }
  async function suspendUserFromForm() {
    if (!email.trim()) {
      alert('Email is required.');
      return;
    }
    try {
      await callUsers({ email: email.trim().toLowerCase(), active: false });
      await load();
    } catch {}
  }
  async function assignRoleFromForm() {
    if (!email.trim()) {
      alert('Email is required.');
      return;
    }
    if (!firstRole) {
      alert('Enter a Role in "Role Record IDs".');
      return;
    }
    try {
      await callUsers({ email: email.trim().toLowerCase(), role: firstRole });
      await load();
    } catch {}
  }
  async function changeRoleFromForm() {
    if (!email.trim()) {
      alert('Email is required.');
      return;
    }
    if (!firstRole) {
      alert('Enter a Role in "Role Record IDs".');
      return;
    }
    try {
      await callUsers({ email: email.trim().toLowerCase(), role: firstRole });
      await load();
    } catch {}
  }

  function UsersTable() {
    return (
      <div
        style={{
          marginTop: 20,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 1fr 2fr',
            gap: 12,
            padding: '12px 16px',
            fontWeight: 800,
            color: '#fff',
          }}
        >
          <div>{t.name}</div>
          <div>{t.email}</div>
          <div>{t.status}</div>
          <div>{t.role}</div>
          <div>{t.actions}</div>
        </div>

        {errText ? (
          <div style={{ padding: 16, color: '#fca5a5' }}>{errText}</div>
        ) : loading ? (
          <div style={{ padding: 16, opacity: 0.8 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 16, opacity: 0.8 }}>{t.noUsers}</div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 2fr',
                gap: 12,
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                alignItems: 'center',
              }}
            >
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.email}</div>
              <div>{row.active ? t.active : t.suspended}</div>
              <div>{row.role || '-'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    try {
                      await callUsers({ email: row.email, active: row.active ? false : true });
                      await load();
                    } catch {}
                  }}
                  style={smallBtn(row.active ? '#ffcc00' : '#22c55e', '#082b52')}
                >
                  {row.active ? t.suspendUser : 'Activate'}
                </button>
                <button
                  onClick={async () => {
                    const v = prompt(`Assign role for ${row.email}:`, row.role || '');
                    if (v != null && String(v).trim()) {
                      try {
                        await callUsers({ email: row.email, role: String(v).trim() });
                        await load();
                      } catch {}
                    }
                  }}
                  style={smallBtn('#ffffff', '#082b52')}
                >
                  {t.assignRole}
                </button>
                <button
                  onClick={async () => {
                    const v = prompt(`Change role for ${row.email}:`, row.role || '');
                    if (v != null && String(v).trim()) {
                      try {
                        await callUsers({ email: row.email, role: String(v).trim() });
                        await load();
                      } catch {}
                    }
                  }}
                  style={smallBtn('#dbeafe', '#082b52')}
                >
                  {t.changeRole}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this user?')) return;
                    try {
                      await callUsers({ email: row.email, delete: true });
                      await load();
                    } catch {}
                  }}
                  style={smallBtn('#ef4444', '#ffffff')}
                >
                  {t.deleteUser}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      {/* LEFT */}
      <aside style={leftColStyle} aria-label="Users sidebar">
        <div style={leftTitleStyle}>{t.title}</div>
        <img
          src="/images/secure.png"
          alt="Sovereign Intelligence"
          width={200}
          height={200}
          style={leftLogoStyle}
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => setShowDebug((v) => !v)} style={smallBtn('#111827', '#fff')}>
            {showDebug ? t.hideDebug : t.showDebug}
          </button>
          <button onClick={load} style={smallBtn('#0b5cff', '#fff')}>
            Refresh
          </button>
        </div>
      </aside>

      {/* RIGHT */}
      <main style={mainStyle}>
        {/* 1) Add User (TOP ROW restored) */}
        <div
          className="inputRow"
          style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <input
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.orgRecId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.roleRecIds}
            value={roleIds}
            onChange={(e) => setRoleIds(e.target.value)}
            style={{ ...inp, minWidth: 240 }}
          />
          <button onClick={addUser} style={bigBtn}>
            {t.addUser}
          </button>
        </div>

        <UsersTable />

        {/* 2) Delete User */}
        <div
          className="inputRow"
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 12,
          }}
        >
          <input
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.orgRecId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.roleRecIds}
            value={roleIds}
            onChange={(e) => setRoleIds(e.target.value)}
            style={{ ...inp, minWidth: 240 }}
          />
          <button onClick={deleteUserFromForm} style={bigBtn}>
            {t.deleteUser}
          </button>
        </div>

        <UsersTable />

        {/* 3) Suspend User */}
        <div
          className="inputRow"
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 12,
          }}
        >
          <input
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.orgRecId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.roleRecIds}
            value={roleIds}
            onChange={(e) => setRoleIds(e.target.value)}
            style={{ ...inp, minWidth: 240 }}
          />
          <button onClick={suspendUserFromForm} style={bigBtn}>
            {t.suspendUser}
          </button>
        </div>

        <UsersTable />

        {/* 4) Assign Role */}
        <div
          className="inputRow"
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 12,
          }}
        >
          <input
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.orgRecId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.roleRecIds}
            value={roleIds}
            onChange={(e) => setRoleIds(e.target.value)}
            style={{ ...inp, minWidth: 240 }}
          />
          <button onClick={assignRoleFromForm} style={bigBtn}>
            {t.assignRole}
          </button>
        </div>

        <UsersTable />

        {/* 5) Change Role */}
        <div
          className="inputRow"
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 12,
          }}
        >
          <input
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.orgRecId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.roleRecIds}
            value={roleIds}
            onChange={(e) => setRoleIds(e.target.value)}
            style={{ ...inp, minWidth: 240 }}
          />
          <button onClick={changeRoleFromForm} style={bigBtn}>
            {t.changeRole}
          </button>
        </div>

        <UsersTable />

        {showDebug && (
          <pre
            style={{
              marginTop: 20,
              background: '#0b1220',
              color: '#93c5fd',
              padding: 12,
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
            }}
          >
            {JSON.stringify({ lang, debug }, null, 2)}
          </pre>
        )}
      </main>
    </div>
  );
}
