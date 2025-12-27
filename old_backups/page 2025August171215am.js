'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ---------- minimal inline styles (your layout preserved) ----------
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
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
};
const sel = {
  minWidth: 220,
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
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

export default function AdminUsersPage() {
  const qs = useSearchParams();
  const lang = (qs.get('lang') || 'English').trim();

  const [t, setT] = useState({
    title: 'Users',
    email: 'Email',
    name: 'Name',
    orgRecId: 'Organization Record ID (recXXXX)',
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
    // new labels
    from: 'From',
    to: 'To',
    save: 'Save',
    cancel: 'Cancel',
    selectRole: 'Select role',
  });

  // translate labels when ?lang=... is set
  useEffect(() => {
    let cancelled = false;
    if (!lang || /^english$/i.test(lang)) return;

    (async () => {
      try {
        const prompt = `
Translate the following UI labels to ${lang}. Return ONLY a JSON object with these keys:

${JSON.stringify(
  {
    title: 'Users',
    email: 'Email',
    name: 'Name',
    orgRecId: 'Organization Record ID (recXXXX)',
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
    from: 'From',
    to: 'To',
    save: 'Save',
    cancel: 'Cancel',
    selectRole: 'Select role',
  },
  null,
  2,
)}
        `.trim();

        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const dj = await res.json().catch(() => ({}));
        const parsed = dj?.translation || {};
        if (!cancelled && parsed && typeof parsed === 'object') {
          setT((cur) => ({ ...cur, ...parsed }));
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // form + data
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [topRole, setTopRole] = useState('');

  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState('');
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

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
        setRoles([]);
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
        setRoles(Array.isArray(j.roles) ? j.roles : []);
        if (j.debug) setDebug(j.debug);
      }
    } catch {
      setErrText(t.couldntLoad);
      setRows([]);
      setRoles([]);
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
    setTopRole('');
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
        role: topRole || '',
        orgId: orgId.trim(),
        active: true,
      });
      await load();
      resetForm();
    } catch {}
  }

  // dialog state for Assign/Change role
  const [dlg, setDlg] = useState({ open: false, email: '', from: '', to: '' });
  function openRoleDialog(row) {
    setDlg({ open: true, email: row.email, from: row.role || '', to: row.role || '' });
  }
  async function saveRole() {
    if (!dlg.email || !dlg.to) return;
    try {
      await callUsers({ email: dlg.email, role: dlg.to });
      setDlg({ open: false, email: '', from: '', to: '' });
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
            color: '#fff', // header row white
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
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                {row.name}
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e5e7eb' }}>
                {row.email}
              </div>
              <div style={{ color: '#e5e7eb' }}>{row.active ? t.active : t.suspended}</div>
              <div style={{ color: '#e5e7eb' }}>{row.role || '-'}</div>
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
                <button onClick={() => openRoleDialog(row)} style={smallBtn('#ffffff', '#082b52')}>
                  {t.assignRole}
                </button>
                <button onClick={() => openRoleDialog(row)} style={smallBtn('#dbeafe', '#082b52')}>
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
    <div className="admin-users" style={wrapStyle}>
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
        {/* Top row (white text) */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="topInput"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            className="topInput"
            placeholder={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            className="topInput"
            placeholder={t.orgRecId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inp}
          />
          <select
            className="roleSelect"
            value={topRole}
            onChange={(e) => setTopRole(e.target.value)}
            style={{ ...sel, minWidth: 260 }}
          >
            <option value="">{t.selectRole}</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <button onClick={addUser} style={bigBtn}>
            {t.addUser}
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
            {JSON.stringify({ lang, roles, debug }, null, 2)}
          </pre>
        )}
      </main>

      {/* Role dialog */}
      {dlg.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setDlg({ open: false, email: '', from: '', to: '' })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              background: '#0f172a',
              color: '#fff',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 12 }}>{dlg.email}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{t.from}</div>
                <input value={dlg.from} readOnly style={{ ...inp, width: '100%' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{t.to}</div>
                <select
                  value={dlg.to}
                  onChange={(e) => setDlg((s) => ({ ...s, to: e.target.value }))}
                  style={{ ...sel, width: '100%' }}
                >
                  <option value="">{t.selectRole}</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDlg({ open: false, email: '', from: '', to: '' })}
                style={smallBtn('#334155', '#fff')}
              >
                {t.cancel}
              </button>
              <button onClick={saveRole} style={smallBtn('#22c55e', '#082b52')}>
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder color for top inputs/selects */}
      <style jsx global>{`
        .admin-users input.topInput::placeholder {
          color: #cbd5e1;
        }
        .admin-users select.roleSelect option {
          color: #111827;
        } /* dropdown items readable */
      `}</style>
    </div>
  );
}
