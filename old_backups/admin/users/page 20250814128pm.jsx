'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Minimal inline helpers (no global styling changes)
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
const wrapStyle = { display: 'flex', alignItems: 'flex-start', gap: 0 };
const mainStyle = { flex: 1, minWidth: 0 };

// locked org types
const ORG_TYPES = [
  'Government',
  'Not for Profit',
  'Multinational Corporation',
  'Large Private Sector Enterprise',
  'Medium Private Sector Enterprise',
  'Small Private Sector Enterprise',
];

export default function UsersAdminPage() {
  const qs = useSearchParams();
  // Accept both ?lang= and ?translate= (case-insensitive values)
  const rawLang = (qs.get('lang') || qs.get('translate') || 'English').trim();
  const lang = rawLang.charAt(0).toUpperCase() + rawLang.slice(1);
  const i18nOn = qs.get('i18n') === '1'; // <-- COST GUARD: only translate when &i18n=1

  // ---------- i18n (OPT-IN + localStorage cache) ----------
  const [t, setT] = useState({
    titleUsers: 'Users',
    phEmail: 'Email',
    phName: 'Name',
    phOrgId: 'Organization Record ID (recXXXX)',
    phRoleIds: 'Role Record IDs (comma-separated)',
    tableName: 'Name',
    tableEmail: 'Email',
    tableStatus: 'Status',
    tableRole: 'Role',
    tableActions: 'Actions',
    statusActive: 'Active',
    statusSuspended: 'Suspended',
    btnAdd: 'Add User',
    btnDelete: 'Delete User',
    btnSuspend: 'Suspend User',
    btnActivate: 'Activate',
    btnAssignRole: 'Assign Role',
    btnChangeRole: 'Change Role',
    loading: 'Loading…',
    empty: 'No users found',
  });

  useEffect(() => {
    // If not explicitly enabled or language is English, skip GPT entirely.
    if (!i18nOn || /^english$/i.test(lang)) return;

    const cacheKey = `i18n_users_${lang}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const obj = JSON.parse(cached);
        if (obj && typeof obj === 'object') setT((prev) => ({ ...prev, ...obj }));
        return;
      }
    } catch {}

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    (async () => {
      try {
        const prompt = `Translate the following UI labels into ${lang}. Return ONLY a JSON object with the same keys.\n${JSON.stringify(t)}`;
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const js = await res.json();
        if (js && typeof js === 'object') {
          setT((prev) => ({ ...prev, ...js }));
          try {
            localStorage.setItem(cacheKey, JSON.stringify(js));
          } catch {}
        }
      } catch {
        /* keep fallback */
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18nOn, lang]);

  // ---------- shared form state ----------
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState(''); // Airtable linked Organization record ID (recXXXX)
  const [orgType, setOrgType] = useState(ORG_TYPES[0]); // organization type
  const [roleIds, setRoleIds] = useState(''); // we map first entry to single Role

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/users?limit=100', { cache: 'no-store' });
      if (!r.ok) throw new Error(`GET /api/admin/users -> ${r.status}`);
      const j = await r.json();
      const list = (j.records || []).map((f) => ({
        id: f.id,
        name: f.Name || '',
        email: f.Email || '',
        role: f.Role || '',
        locale: f.Locale || '',
        active: !!f.Active,
      }));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const firstRole = () =>
    roleIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)[0] || '';

  async function addUser() {
    if (!email.trim() || !name.trim()) {
      alert(`${t.phEmail} & ${t.phName} required.`);
      return;
    }
    try {
      const body = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: firstRole(),
        locale: 'en',
        active: true,
        orgId: orgId.trim(),
        orgType,
      };
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw 0;
      await load();
      setEmail('');
      setName('');
      setOrgId('');
      setRoleIds('');
      setOrgType(ORG_TYPES[0]);
    } catch {
      alert('Failed to add user.');
    }
  }

  async function deleteUserFromForm() {
    if (!email.trim()) {
      alert(`${t.phEmail} required.`);
      return;
    }
    if (!confirm(`${t.btnDelete} ${email.trim()}?`)) return;
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), delete: true }),
      });
      if (!r.ok) throw 0;
      await load();
    } catch {
      alert('Failed to delete user.');
    }
  }

  async function suspendUserFromForm() {
    if (!email.trim()) {
      alert(`${t.phEmail} required.`);
      return;
    }
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), active: false }),
      });
      if (!r.ok) throw 0;
      await load();
    } catch {
      alert('Failed to suspend user.');
    }
  }

  async function assignRoleFromForm() {
    if (!email.trim()) {
      alert(`${t.phEmail} required.`);
      return;
    }
    const role = firstRole();
    if (!role) {
      alert(`Enter a role in "${t.phRoleIds}".`);
      return;
    }
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!r.ok) throw 0;
      await load();
    } catch {
      alert('Failed to assign role.');
    }
  }

  async function changeRoleFromForm() {
    if (!email.trim()) {
      alert(`${t.phEmail} required.`);
      return;
    }
    const role = firstRole();
    if (!role) {
      alert(`Enter a role in "${t.phRoleIds}".`);
      return;
    }
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!r.ok) throw 0;
      await load();
    } catch {
      alert('Failed to change role.');
    }
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
          <div>{t.tableName}</div>
          <div>{t.tableEmail}</div>
          <div>{t.tableStatus}</div>
          <div>{t.tableRole}</div>
          <div>{t.tableActions}</div>
        </div>
        {loading ? (
          <div style={{ padding: 16, opacity: 0.8 }}>{t.loading}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 16, opacity: 0.8 }}>{t.empty}</div>
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
              <div>{row.active ? t.statusActive : t.statusSuspended}</div>
              <div>{row.role || '-'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() =>
                    fetch('/api/admin/users', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: row.email, active: row.active ? false : true }),
                    })
                      .then((res) => {
                        if (!res.ok) throw 0;
                      })
                      .then(load)
                  }
                  style={smallBtn(row.active ? '#ffcc00' : '#22c55e', '#082b52')}
                >
                  {row.active ? t.btnSuspend : t.btnActivate}
                </button>
                <button
                  onClick={() => {
                    const v = prompt(`${t.btnAssignRole} (${row.email})`, row.role || '');
                    if (v != null && String(v).trim()) {
                      fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: row.email, role: String(v).trim() }),
                      })
                        .then((res) => {
                          if (!res.ok) throw 0;
                        })
                        .then(load);
                    }
                  }}
                  style={smallBtn('#ffffff', '#082b52')}
                >
                  {t.btnAssignRole}
                </button>
                <button
                  onClick={() => {
                    const v = prompt(`${t.btnChangeRole} (${row.email})`, row.role || '');
                    if (v != null && String(v).trim()) {
                      fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: row.email, role: String(v).trim() }),
                      })
                        .then((res) => {
                          if (!res.ok) throw 0;
                        })
                        .then(load);
                    }
                  }}
                  style={smallBtn('#dbeafe', '#082b52')}
                >
                  {t.btnChangeRole}
                </button>
                <button
                  onClick={() => {
                    if (!confirm(`${t.btnDelete}?`)) return;
                    fetch('/api/admin/users', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: row.email, delete: true }),
                    })
                      .then((res) => {
                        if (!res.ok) throw 0;
                      })
                      .then(load);
                  }}
                  style={smallBtn('#ef4444', '#ffffff')}
                >
                  {t.btnDelete}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // Two-line input block (restores “top row” look)
  function InputBlock({ actionLabel, onClick }) {
    return (
      <>
        <div
          className="inputRow"
          style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <input
            placeholder={t.phEmail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.phName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            placeholder={t.phOrgId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inp}
          />
          <select value={orgType} onChange={(e) => setOrgType(e.target.value)} style={inp}>
            {ORG_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div
          className="inputRow"
          style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}
        >
          <input
            placeholder={t.phRoleIds}
            value={roleIds}
            onChange={(e) => setRoleIds(e.target.value)}
            style={{ ...inp, minWidth: 320, flex: '2 1 320px' }}
          />
          <button onClick={onClick} style={bigBtn}>
            {actionLabel}
          </button>
        </div>
      </>
    );
  }

  return (
    <div style={wrapStyle}>
      <aside style={leftColStyle} aria-label="Users sidebar">
        <div style={leftTitleStyle}>{t.titleUsers}</div>
        <img
          src="/images/secure.png"
          alt="Sovereign Intelligence"
          width={200}
          height={200}
          style={leftLogoStyle}
          decoding="async"
        />
      </aside>

      <main style={mainStyle}>
        <InputBlock actionLabel={t.btnAdd} onClick={addUser} />
        <UsersTable />

        <div style={{ marginTop: 12 }}>
          <InputBlock actionLabel={t.btnDelete} onClick={deleteUserFromForm} />
        </div>
        <UsersTable />

        <div style={{ marginTop: 12 }}>
          <InputBlock actionLabel={t.btnSuspend} onClick={suspendUserFromForm} />
        </div>
        <UsersTable />

        <div style={{ marginTop: 12 }}>
          <InputBlock actionLabel={t.btnAssignRole} onClick={assignRoleFromForm} />
        </div>
        <UsersTable />

        <div style={{ marginTop: 12 }}>
          <InputBlock actionLabel={t.btnChangeRole} onClick={changeRoleFromForm} />
        </div>
        <UsersTable />
      </main>
    </div>
  );
}

const inp = {
  flex: '1 1 240px',
  minWidth: 220,
  padding: '14px 16px',
  borderRadius: 8,
  border: '1px solid #222',
  background: '#0b0f1a',
  color: '#e6e6e6',
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
