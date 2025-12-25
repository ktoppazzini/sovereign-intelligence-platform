'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/* ---- minimal inline styles (white inputs) ---- */
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
const inputStyle = {
  flex: '1 1 240px',
  minWidth: 220,
  padding: '14px 16px',
  borderRadius: 8,
  border: '1px solid #222',
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
  cursor: 'pointer',
};
const smallBtn = (bg, fg) => ({
  background: bg,
  color: fg,
  fontWeight: 800,
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 6px 12px rgba(0,0,0,0.25)',
});

export default function Page() {
  const qs = useSearchParams();
  const lang = (qs.get('lang') || 'English').trim();

  const [t, setT] = useState({
    title: 'Users',
    email: 'Email',
    name: 'Name',
    orgRecId: 'Organization Record ID (recXXXX)',
    selectRole: 'Select role',
    addUser: 'Add User',
    status: 'Status',
    role: 'Role',
    actions: 'Actions',
    couldntLoad: 'Failed to fetch users from Airtable.',
    deleteUser: 'Delete User',
    suspendUser: 'Suspend User',
    assignRole: 'Assign Role',
    changeRole: 'Change Role',
    from: 'From',
    to: 'To',
    save: 'Save',
    cancel: 'Cancel',
    noUsers: 'No users found',
    showDebug: 'Show Debug',
    hideDebug: 'Hide Debug',
    active: 'Active',
    suspended: 'Suspended',
  });

  useEffect(() => {
    let cancel = false;
    if (!lang || /^english$/i.test(lang)) return;
    (async () => {
      try {
        const prompt = `
Translate the following UI labels to ${lang}. Return a JSON object with EXACTLY these keys:
{"title":"Users","email":"Email","name":"Name","orgRecId":"Organization Record ID (recXXXX)","selectRole":"Select role","addUser":"Add User","status":"Status","role":"Role","actions":"Actions","couldntLoad":"Failed to fetch users from Airtable.","deleteUser":"Delete User","suspendUser":"Suspend User","assignRole":"Assign Role","changeRole":"Change Role","from":"From","to":"To","save":"Save","cancel":"Cancel","noUsers":"No users found","showDebug":"Show Debug","hideDebug":"Hide Debug","active":"Active","suspended":"Suspended"}`.trim();
        const r = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const j = await r.json().catch(() => ({}));
        const parsed = j?.translation || {};
        if (!cancel && parsed && typeof parsed === 'object') setT((cur) => ({ ...cur, ...parsed }));
      } catch {}
    })();
    return () => {
      cancel = true;
    };
  }, [lang]);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [roleId, setRoleId] = useState('');

  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState('');
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const [modalUser, setModalUser] = useState(null);
  const [modalToRole, setModalToRole] = useState('');

  async function loadUsers() {
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
            roleId: rec.RoleId || '',
            roleName: rec.RoleName || '',
            active: !!rec.Active,
          })),
        );
        if (j.debug) setDebug(j.debug);
      }
    } finally {
      setLoading(false);
    }
  }
  async function loadRoles() {
    try {
      const r = await fetch('/api/admin/users?roles=1', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      setRoles((j.roles || []).filter((x) => x.name).sort((a, b) => a.name.localeCompare(b.name)));
    } catch {}
  }
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  async function callUsers(body) {
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) throw new Error(j?.message || 'Operation failed');
  }

  async function addUser() {
    if (!email.trim() || !name.trim()) return alert('Email and Name are required.');
    try {
      await callUsers({
        add: true,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        orgId: orgId.trim() || undefined,
        roleId: roleId || undefined,
      });
      setEmail('');
      setName('');
      setOrgId('');
      setRoleId('');
      await loadUsers();
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
              <div>{row.roleName || '-'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    try {
                      await callUsers({ email: row.email, active: row.active ? false : true });
                      await loadUsers();
                    } catch {}
                  }}
                  style={smallBtn(row.active ? '#ffcc00' : '#22c55e', '#082b52')}
                >
                  {row.active ? t.suspendUser : 'Activate'}
                </button>
                <button
                  onClick={() => {
                    setModalUser(row);
                    setModalToRole('');
                  }}
                  style={smallBtn('#ffffff', '#082b52')}
                >
                  {t.assignRole}
                </button>
                <button
                  onClick={() => {
                    setModalUser(row);
                    setModalToRole('');
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
                      await loadUsers();
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

  function ChangeRoleModal() {
    if (!modalUser) return null;
    const close = () => {
      setModalUser(null);
      setModalToRole('');
    };
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        <div
          style={{
            width: 520,
            maxWidth: '92vw',
            background: '#0b1220',
            color: '#fff',
            borderRadius: 14,
            padding: 20,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 12 }}>{modalUser.email}</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{t.from}</div>
            <input
              style={{ ...inputStyle, width: '100%', cursor: 'not-allowed', opacity: 0.7 }}
              value={modalUser.roleName || '-'}
              disabled
              readOnly
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{t.to}</div>
            <select
              value={modalToRole}
              onChange={(e) => setModalToRole(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            >
              <option key="__sel" value="">
                {t.selectRole}
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={close} style={smallBtn('#1f2937', '#fff')}>
              {t.cancel}
            </button>
            <button
              onClick={async () => {
                if (!modalToRole) return;
                try {
                  await callUsers({ email: modalUser.email, roleId: modalToRole });
                  close();
                  await loadUsers();
                } catch {}
              }}
              style={smallBtn('#0b5cff', '#fff')}
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <aside style={leftColStyle}>
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
          <button
            onClick={() => {
              loadUsers();
              loadRoles();
            }}
            style={smallBtn('#0b5cff', '#fff')}
          >
            Refresh
          </button>
        </div>
      </aside>

      <main style={mainStyle}>
        {/* Top row Add User */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder={t.orgRecId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inputStyle}
          />
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            style={{ ...inputStyle, minWidth: 240 }}
          >
            <option key="__sel" value="">
              {t.selectRole}
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
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
            {JSON.stringify({ lang, rolesCount: roles.length, debug }, null, 2)}
          </pre>
        )}
      </main>

      <ChangeRoleModal />
    </div>
  );
}
