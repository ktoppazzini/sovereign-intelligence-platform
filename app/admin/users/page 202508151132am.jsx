'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ---------- Version info ----------
const CLIENT_VERSION = 'users-ui v1.0.3';
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
    return { version: localStorage.getItem(VERSION_KEY), build: localStorage.getItem(BUILD_KEY) };
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
  fontWeight: 800,
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

// ---------- Helpers ----------
const REC_ID_RE = /^rec[A-Za-z0-9]{14}$/;
function pickFirst(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length) {
      const first = v[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (first && typeof first === 'object')
        return (first.name || first.label || first.value || '').toString();
    }
    if (typeof v === 'object') {
      const s = v.name || v.label || v.value;
      if (s) return String(s);
    }
  }
  return '';
}
function extractRoleFromUserRecord(rec) {
  const f = rec?.fields || rec || {};
  return (
    pickFirst(f.Role, f['Roles (from Role)'], rec.RoleName, rec.roleName, rec.Role, rec.role) || ''
  );
}
async function fetchJson(url, init) {
  const res = await fetch(url, { cache: 'no-store', ...(init || {}) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

// Build role choices from Roles table schema if available; otherwise from records (filter out rec IDs)
function choicesFromRolesResponse(payload) {
  const out = new Set();

  // 1) Direct choices array
  const direct = payload?.choices;
  if (Array.isArray(direct))
    for (const c of direct) if (c) out.add(String(c.name || c.label || c.value || c).trim());

  // 2) Schema fields -> options.choices
  const fields = payload?.schema?.fields || payload?.fields;
  if (Array.isArray(fields)) {
    const rolesField = fields.find(
      (f) => String(f?.name || '').toLowerCase() === 'roles' && f?.options?.choices,
    );
    const choices = rolesField?.options?.choices || [];
    for (const c of choices) if (c) out.add(String(c.name || c.label || c.value || c).trim());
  }

  // 3) Per-record fallbacks (records / data / roles arrays)
  const arr =
    (Array.isArray(payload?.records) && payload.records) ||
    (Array.isArray(payload?.data) && payload.data) ||
    (Array.isArray(payload?.roles) && payload.roles) ||
    [];
  for (const r of arr) {
    const f = r?.fields || r || {};
    const cands = [
      f.Roles?.name,
      f.Roles?.label,
      f.Roles,
      f.Role,
      r.Name,
      r.name,
      r.label,
      r.value,
    ];
    for (const c of cands) if (typeof c === 'string') out.add(c.trim());
  }

  // Normalize -> filter empties + rec ids + dedupe (case-insensitive), then sort
  const uniq = [];
  const seen = new Set();
  for (const raw of out) {
    const s = raw.trim();
    if (!s || REC_ID_RE.test(s)) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push({ id: k, label: s, value: s });
  }
  uniq.sort((a, b) => a.label.localeCompare(b.label));
  return uniq;
}

export default function AdminUsersPage() {
  // --- language (wired like your Admin home) ---
  const qs = useSearchParams();
  const lang = (qs.get('lang') || 'English').trim();

  // --- remember version ---
  useEffect(() => {
    rememberVersion();
    console.log('📦 Users page version:', readVersion());
  }, []);

  // ---- Translations (defaults; will be overwritten) ----
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
  });

  // ---- Wire translation using your pattern ----
  useEffect(() => {
    const labels = {
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
    const prompt = `Translate the following labels into ${lang}. Return only a raw JSON object:\n${JSON.stringify(labels)}`;
    (async () => {
      try {
        const r = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await r.json().catch(() => ({}));
        if (data?.translation && typeof data.translation === 'object') {
          setT((prev) => ({ ...prev, ...data.translation }));
        }
      } catch {
        /* soft fail */
      }
    })();
  }, [lang]);

  // ---- Form state (top row) ----
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [roleIds, setRoleIds] = useState('');

  // ---- Users state ----
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState('');
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // ---- Roles state (from Roles table field options) ----
  const [roles, setRoles] = useState([]);
  const [rolesErr, setRolesErr] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);

  const firstRole = useMemo(
    () =>
      (roleIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] || '',
    [roleIds],
  );

  // ---------- Load users ----------
  async function loadUsers() {
    setLoading(true);
    setErrText('');
    setDebug(null);
    try {
      const { ok, json } = await fetchJson('/api/admin/users?limit=100&debug=1');
      console.log('👤 /api/admin/users response:', json);
      if (!ok || !json?.ok) {
        const msg = json?.message || t.couldntLoad;
        setErrText(`${msg}${json?.status ? `. Status: ${json.status}` : ''}`);
        if (json?.debug) setDebug(json.debug);
        setRows([]);
      } else {
        const normalized = (json.records || []).map((rec) => ({
          id: rec.id,
          name: pickFirst(rec?.fields?.Name, rec.Name, rec.name) || '',
          email: pickFirst(rec?.fields?.Email, rec.Email, rec.email) || '',
          role: extractRoleFromUserRecord(rec),
          active:
            !!(rec?.fields?.Active ?? rec.Active) && !(rec?.fields?.Suspended ?? rec.Suspended),
        }));
        setRows(normalized);
        if (json.debug) setDebug(json.debug);
      }
    } catch (e) {
      console.error('❌ loadUsers error:', e);
      setErrText(t.couldntLoad);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Load roles (prefer Roles field options) ----------
  async function loadRoles() {
    setRolesLoading(true);
    setRolesErr('');
    try {
      const { ok, json } = await fetchJson('/api/admin/roles?debug=1');
      console.log('🎭 /api/admin/roles response:', json);
      if (!ok) throw new Error(json?.message || 'Failed to load roles');
      let list = choicesFromRolesResponse(json);

      if (!list.length) throw new Error('No roles returned');
      console.log('🎭 normalized roles (final):', list);
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
        role: firstRole,
        orgId: orgId.trim(),
        active: true,
      });
      await loadUsers();
      resetForm();
    } catch {}
  }

  // ---------- Role modal ----------
  const [roleModal, setRoleModal] = useState({
    open: false,
    mode: 'assign',
    email: '',
    from: '',
    to: '',
  });

  async function fetchUserRole(email) {
    try {
      const { ok, json } = await fetchJson(
        `/api/admin/users?email=${encodeURIComponent(email)}&current=1&debug=1`,
      );
      console.log('🔎 current role lookup:', json);
      if (!ok) return '';
      const rec = json?.record || (Array.isArray(json?.records) ? json.records[0] : json);
      return extractRoleFromUserRecord(rec);
    } catch {
      return '';
    }
  }

  function openAssignModal(row) {
    setRoleModal({ open: true, mode: 'assign', email: row.email, from: '', to: '' });
  }
  function openChangeModal(row) {
    const fallbackFrom = row.role || '';
    setRoleModal({
      open: true,
      mode: 'change',
      email: row.email,
      from: fallbackFrom || '-',
      to: '',
    });
    fetchUserRole(row.email).then((found) => {
      if (found) setRoleModal((p) => ({ ...p, from: found }));
    });
  }
  function closeRoleModal() {
    setRoleModal((p) => ({ ...p, open: false }));
  }
  async function saveRoleModal() {
    if (!roleModal.email) return;
    if (!roleModal.to) {
      alert(t.selectRole);
      return;
    }
    try {
      await callUsers({ email: roleModal.email, role: roleModal.to });
      await loadUsers();
      closeRoleModal();
    } catch {}
  }

  // ---------- UsersTable ----------
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
                    await callUsers({ email: row.email, active: row.active ? false : true });
                    await loadUsers();
                  } catch {}
                }}
                style={smallBtn(row.active ? '#ffcc00' : '#22c55e', '#082b52')}
              >
                {row.active ? t.suspendUser : t.activate}
              </button>
              <button onClick={() => openAssignModal(row)} style={smallBtn('#ffffff', '#082b52')}>
                {t.assignRole}
              </button>
              <button onClick={() => openChangeModal(row)} style={smallBtn('#dbeafe', '#082b52')}>
                {t.changeRole}
              </button>
              <button
                onClick={async () => {
                  if (!confirm(t.deleteUser + '?')) return;
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
        ))}
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <style jsx global>{`
        .admin-input::placeholder {
          color: #ffffff;
          opacity: 1;
          font-weight: 800;
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
                usersLoading: loading,
                usersErr: errText,
                rows,
                rolesLoading,
                rolesErr,
                rolesCount: roles.length,
                rolesSample: roles.slice(0, 8),
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

              {roleModal.mode === 'change' && (
                <>
                  <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.8 }}>{t.from}</div>
                  <input readOnly value={roleModal.from || '-'} style={{ ...inp, width: '100%' }} />
                  <div style={{ marginTop: 14, marginBottom: 10, fontSize: 12, opacity: 0.8 }}>
                    {t.to}
                  </div>
                </>
              )}
              {roleModal.mode === 'assign' && (
                <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 800 }}>
                  {t.assignARole}
                </div>
              )}

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
                    value={r.label || r.value || r.id}
                    style={{ color: '#000' }}
                  >
                    {r.label || r.value || r.id}
                  </option>
                ))}
              </select>

              {rolesLoading && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{t.loading}</div>
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
