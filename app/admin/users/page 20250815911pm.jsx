'use client';
import { navDashboard } from '@/app/test_translation/components/translation_Header';
// app/admin/users/page.jsx
// v1.0.15-roles-linkedid-i18n — keeps working role mapping (IDs + names) and
// restores translation via /api/gptTranslation with safe fallback.

import { useEffect, useMemo, useState } from 'react';

// ---------- Version info (persists to localStorage) ----------
const CLIENT_VERSION = 'users-ui v1.0.15-roles-linkedid-i18n';
const CLIENT_BUILD_DATE = '2025-08-15';
const VERSION_KEY = 'SI_USERS_PAGE_VERSION';
const BUILD_KEY = 'SI_USERS_PAGE_BUILD';

function rememberVersion() {
  try {
    localStorage.setItem(VERSION_KEY, CLIENT_VERSION);
    localStorage.setItem(BUILD_KEY, CLIENT_BUILD_DATE);
  } catch {}
}
function readVersion() {
  try {
    return {
      version: localStorage.getItem(VERSION_KEY),
      build: localStorage.getItem(BUILD_KEY),
    };
  } catch {
    return {};
  }
}

// ---------- Styles ----------
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

// ---------- Default English strings (also the "shape" of translations) ----------
const DEFAULT_T = {
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
  active: 'Active',
  suspended: 'Suspended',
  from: 'From',
  to: 'To',
  save: 'Save',
  cancel: 'Cancel',
  selectRole: 'Select role',
  assignARole: 'Assign a Role',
  activate: 'Activate',
  loading: 'Loading…',
  showDebug: 'Show Debug',
  hideDebug: 'Hide Debug',
  refresh: 'Refresh',
};

export default function AdminUsersPage() {
  // version banner
  useEffect(() => {
    rememberVersion();
    console.log('📦 Users page version:', readVersion());
  }, []);

  // ---- i18n: read lang from URL and load translations via /api/gptTranslation ----
  const [lang, setLang] = useState('English');
  const [t, setT] = useState(DEFAULT_T);

  useEffect(() => {
    try {
      const usp = new URLSearchParams(window.location.search);
      const L = usp.get('lang') || 'English';
      setLang(L);
    } catch {}
  }, []);

  useEffect(() => {
    async function loadI18n(L) {
      // English or absent => use defaults
      if (!L || /^english$/i.test(L)) {
        setT(DEFAULT_T);
        return;
      }
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'users',
            lang: L,
            template: DEFAULT_T, // send keys+defaults so server can translate exact fields
          }),
        });
        const raw = await res.json().catch(() => ({}));
        console.log('🧠 i18n raw:', raw);

        // Be lenient: accept {result:{...}} or direct object with keys
        const maybe = raw?.result || raw?.data || raw;
        const next = { ...DEFAULT_T };
        if (maybe && typeof maybe === 'object') {
          Object.keys(DEFAULT_T).forEach((k) => {
            const v = maybe[k];
            if (typeof v === 'string' && v.trim()) next[k] = v;
          });
        }
        setT(next);
      } catch (e) {
        console.warn('⚠️ i18n failed, falling back to English:', e?.message || e);
        setT(DEFAULT_T);
      }
    }
    loadI18n(lang);
  }, [lang]);

  // ---- Form (top row) ----
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [roleIds, setRoleIds] = useState('');

  // ---- Users data ----
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState('');
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // ---- Roles options (for “To”) ----
  const [roles, setRoles] = useState([]);
  const [rolesErr, setRolesErr] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);

  const firstRole = useMemo(() => {
    return (
      (roleIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] || ''
    );
  }, [roleIds]);

  // ---------- Load users ----------
  async function loadUsers() {
    setLoading(true);
    setErrText('');
    setDebug(null);
    try {
      const res = await fetch('/api/admin/users?limit=100&debug=1', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      console.log('👤 /api/admin/users response:', j);

      if (!res.ok || !j?.ok) {
        const msg = j?.message || t.couldntLoad;
        setErrText(`${msg}${j?.status ? `. Status: ${j.status}` : ''}`);
        if (j?.debug) setDebug(j.debug);
        setRows([]);
      } else {
        // Normalize rows so “From” can always show the current role
        const normalized = (j.records || []).map((rec) => {
          const theName =
            rec.Name ?? rec['A Name'] ?? rec.FullName ?? rec.full_name ?? rec.name ?? '';
          const theEmail = rec.Email ?? rec.email ?? '';

          const roleNames = Array.isArray(rec.RoleNames) ? rec.RoleNames : undefined;
          const rawRole = rec.RawRole ?? rec.Role ?? '';

          const currentRoles = roleNames && roleNames.length ? roleNames : rawRole ? [rawRole] : [];
          const roleForDisplay =
            currentRoles[0] ?? rec['Roles (from Role)'] ?? rec['Roles (from Role Old)'] ?? '';

          return {
            id: rec.id,
            name: theName,
            email: theEmail,
            role: Array.isArray(roleForDisplay) ? (roleForDisplay[0] ?? '') : roleForDisplay,
            currentRoles,
            active: !!rec.Active && !rec.Suspended,
            raw: rec,
          };
        });

        setRows(normalized);
        if (j.debug) setDebug(j.debug);
      }
    } catch (e) {
      console.error('❌ loadUsers error:', e);
      setErrText(t.couldntLoad);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Load roles options (for “To”) ----------
  async function loadRoles() {
    setRolesLoading(true);
    setRolesErr('');
    try {
      const res = await fetch('/api/admin/roles?options=1&debug=1', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      console.log('🎭 /api/admin/roles?options=1 payload:', j);
      if (j?.debug) console.log('🎭 roles debug:', j.debug);

      if (!res.ok || !j?.ok) {
        const msg = j?.message || 'Failed to load roles';
        setRolesErr(msg);
        setRoles([]);
        return;
      }

      const list = (j.roles || []).map((r, i) => {
        const id = r.id || r.value || r.label || `idx-${i}`;
        const label = r.label || r.name || r.value || String(id);
        const value = r.value || r.name || id;
        return { id, label, value, raw: r };
      });

      if (!list.length) {
        setRolesErr(`No options found for Roles — “${j.field || 'Roles'}”`);
      }
      setRoles(list);
    } catch (e) {
      console.error('❌ loadRoles error:', e);
      setRolesErr(String(e?.message || e));
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  function resetForm() {
    setEmail('');
    setName('');
    setOrgId('');
    setRoleIds('');
  }

  // ---------- POST wrapper (with debug surfacing) ----------
  async function callUsers(body) {
    console.log('➡️ POST /api/admin/users body:', body);
    const r = await fetch('/api/admin/users?debug=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    console.log('⬅️ POST /api/admin/users response:', j);

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
        role: firstRole, // optional; server maps name -> rec id when provided
        orgId: orgId.trim(),
        active: true,
        _client: CLIENT_VERSION,
      });
      await loadUsers();
      resetForm();
    } catch {}
  }

  // ---------- Role modal ----------
  const [roleModal, setRoleModal] = useState({
    open: false,
    email: '',
    from: '',
    to: '',
    mode: 'assign', // 'assign' | 'change'
  });

  function openAssignModal(row) {
    setRoleModal({ open: true, email: row.email, from: '', to: '', mode: 'assign' });
  }
  function openChangeModal(row) {
    const from = (row.currentRoles && row.currentRoles[0]) || row.role || '';
    setRoleModal({ open: true, email: row.email, from, to: '', mode: 'change' });
  }
  function closeRoleModal() {
    setRoleModal((p) => ({ ...p, open: false }));
  }

  async function saveRoleModal() {
    if (!roleModal.email) return;
    if (!roleModal.to) {
      alert('Select a role.');
      return;
    }
    // map "to" to an id (and send several id aliases so API can accept any form)
    const pick = roles.find(
      (r) => r.value === roleModal.to || r.label === roleModal.to || r.id === roleModal.to,
    ) || { id: roleModal.to, value: roleModal.to, label: roleModal.to };

    const body = {
      email: roleModal.email,
      role: pick.label || pick.value || pick.id, // human-readable
      roleId: pick.id,
      roleRecId: pick.id,
      role_record_id: pick.id,
      role_ids: [pick.id],
      from: roleModal.from,
      mode: roleModal.mode,
      _client: CLIENT_VERSION,
    };

    try {
      await callUsers(body);
      await loadUsers();
      closeRoleModal();
    } catch (e) {
      console.error('❌ saveRoleModal error:', e);
    }
  }

  // ---------- Users table ----------
  function UsersTable() {
    if (errText)
      return (
        <div
          style={{
            marginTop: 20,
            color: '#fca5a5',
            padding: 16,
            background: 'rgba(255,0,0,0.05)',
            borderRadius: 8,
          }}
        >
          {errText}
        </div>
      );
    if (loading)
      return (
        <div style={{ marginTop: 20, color: '#fff', opacity: 0.8, padding: 16 }}>{t.loading}</div>
      );
    if (rows.length === 0)
      return (
        <div style={{ marginTop: 20, color: '#fff', opacity: 0.8, padding: 16 }}>{t.noUsers}</div>
      );

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

        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 1fr 1fr 2fr',
              gap: 12,
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              alignItems: 'center',
              color: '#fff',
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
                    await callUsers({
                      email: row.email,
                      active: row.active ? false : true,
                      _client: CLIENT_VERSION,
                    });
                    await loadUsers();
                  } catch {}
                }}
                style={smallBtn(row.active ? '#ffcc00' : '#22c55e', '#082b52')}
              >
                {row.active ? t.suspendUser : t.activate}
              </button>
              <button onClick={() => openAssignModal(row)} style={smallBtn('#ffffff', '#082b52')}>
                {t.assignARole}
              </button>
              <button onClick={() => openChangeModal(row)} style={smallBtn('#dbeafe', '#082b52')}>
                {t.changeRole}
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Delete this user?')) return;
                  try {
                    await callUsers({ email: row.email, delete: true, _client: CLIENT_VERSION });
                    await loadUsers();
                  } catch {}
                }}
                style={smallBtn('#ef4444', '#ffffff')}
              >
                {t.deleteUser}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      {/* Global placeholder color */}
      <style jsx global>{`
        .admin-input::placeholder {
          color: rgba(255, 255, 255, 0.85);
          font-weight: 800;
        }
        select:disabled {
          opacity: 0.8;
        }
      `}</style>

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
        <div style={{ marginTop: 6, color: '#9ca3af', fontSize: 12 }}>
          {CLIENT_VERSION} • {CLIENT_BUILD_DATE}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => setShowDebug((v) => !v)} style={smallBtn('#111827', '#fff')}>
            {showDebug ? t.hideDebug : t.showDebug}
          </button>
          <button onClick={loadUsers} style={smallBtn('#0b5cff', '#fff')}>
            {t.refresh}
          </button>
        </div>
      </aside>

      {/* RIGHT */}
      <main style={mainStyle}>
        {/* Add User (TOP ROW) */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="admin-input"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            className="admin-input"
            placeholder={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            className="admin-input"
            placeholder={t.orgRecId}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={inp}
          />
          <input
            className="admin-input"
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

        {/* Debug panel */}
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
            {JSON.stringify(
              {
                version: readVersion(),
                lang,
                usersLoading: loading,
                usersErr: errText,
                rows,
                rolesLoading,
                rolesErr,
                rolesCount: roles.length,
                rolesSample: roles.slice(0, 10),
                debug,
              },
              null,
              2,
            )}
          </pre>
        )}

        {/* Role modal */}
        {roleModal.open && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
            onClick={closeRoleModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 520,
                maxWidth: '90vw',
                background: '#0b1220',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 12 }}>{roleModal.email}</div>

              {/* FROM (disabled dropdown for consistency) */}
              <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.8 }}>{t.from}</div>
              <select disabled value={roleModal.from || ''} style={{ ...inp, width: '100%' }}>
                <option value="">{roleModal.from || '-'}</option>
              </select>

              {/* TO */}
              <div style={{ marginTop: 14, marginBottom: 10, fontSize: 12, opacity: 0.8 }}>
                {roleModal.mode === 'assign' ? t.assignARole : t.to}
              </div>
              <select
                value={roleModal.to}
                onChange={(e) => setRoleModal((p) => ({ ...p, to: e.target.value }))}
                style={{ ...inp, width: '100%', color: '#fff' }}
              >
                <option key="__sel__" value="">
                  {t.selectRole}
                </option>
                {roles.map((r, idx) => (
                  <option
                    key={r.id || r.value || idx}
                    value={r.value || r.id || r.label}
                    style={{ color: '#000' }}
                  >
                    {r.label || r.value || r.id}
                  </option>
                ))}
              </select>

              {rolesLoading && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Loading roles…</div>
              )}
              {rolesErr && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#fca5a5' }}>{rolesErr}</div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={closeRoleModal} style={smallBtn('#334155', '#fff')}>
                  {t.cancel}
                </button>
                <button onClick={saveRoleModal} style={smallBtn('#22c55e', '#082b52')}>
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
