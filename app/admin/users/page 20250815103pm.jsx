'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/* =====================================================================================
   Users Admin Page  —  users-ui v1.0.6  (2025-08-15)
   - Keeps your GPT translation flow (POST /api/gptTranslation) — no env changes required
   - Fixes Roles dropdown: reads Roles table "Roles" field choices from schema or records
   - Never throws when roles are missing (no Next red overlay); shows inline hint instead
   - “Assign Role” shows only the To dropdown; “Change Role” shows From + To
   - “From” label uses Users table derived label (prefers “Roles (from Role)” if present)
===================================================================================== */

/* ---------------- Version info (persists to localStorage) ---------------- */
const CLIENT_VERSION = 'users-ui v1.0.6';
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

/* ---------------- Styling (keep your layout & make inputs readable) ---------------- */
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
  color: '#fff', // typed text white
  fontWeight: 700, // bold
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

/* ---------------- Endpoints & helpers ---------------- */
const USERS_LIST_URL = '/api/admin/users?limit=100&debug=1';
const USERS_POST_URL = '/api/admin/users?debug=1';

// Roles schema/data endpoints. We’ll accept either shape.
const ROLES_SCHEMA_URL = '/api/admin/roles?schema=1';
const ROLES_DATA_URL = '/api/admin/roles?debug=1';

// Field name in the Roles table to read options from:
const ROLES_FIELD_NAME = 'Roles';

// detect Airtable record ids like "recXXXXXXXX"
const REC_ID_RE = /^rec[a-zA-Z0-9]{10,}$/;

async function fetchJson(url, init) {
  const res = await fetch(url, { cache: 'no-store', ...init });
  let json = {};
  try {
    json = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, json };
}

/* Parse roles from multiple possible payload shapes */
function choicesFromRolesResponse(payload, fieldName = ROLES_FIELD_NAME) {
  const out = new Set();
  const want = String(fieldName).toLowerCase();

  // ---- 1) Schema arrays: { schema: { fields: [{ name, options:{ choices:[{name}] } }] } }
  const arrCandidates = [];
  if (Array.isArray(payload?.schema?.fields)) arrCandidates.push(payload.schema.fields);
  if (Array.isArray(payload?.fields)) arrCandidates.push(payload.fields);

  for (const arr of arrCandidates) {
    for (const f of arr) {
      const fname = String(f?.name || '').toLowerCase();
      if (fname === want) {
        const choices = f?.options?.choices;
        if (Array.isArray(choices)) {
          for (const c of choices) {
            const label = (c?.name ?? c?.label ?? c?.value ?? '').toString().trim();
            if (label) out.add(label);
          }
        }
      }
    }
  }

  // ---- 2) Schema map: { schema: { fields: { Roles: { options:{choices:[{name}] } } } } }
  const mapCandidates = [];
  if (payload?.schema && payload.schema.fields && !Array.isArray(payload.schema.fields)) {
    mapCandidates.push(payload.schema.fields);
  }
  if (payload?.fields && !Array.isArray(payload.fields)) {
    mapCandidates.push(payload.fields);
  }

  for (const map of mapCandidates) {
    for (const [key, f] of Object.entries(map)) {
      const fname = String(f?.name || key || '').toLowerCase();
      if (fname === want) {
        const choices = f?.options?.choices || f?.choices;
        if (Array.isArray(choices)) {
          for (const c of choices) {
            const label = (c?.name ?? c?.label ?? c?.value ?? '').toString().trim();
            if (label) out.add(label);
          }
        }
      }
    }
  }

  // ---- 3) Records fallback: collect distinct string values from fields[fieldName]
  const recordArrays = [payload?.records, payload?.data].filter(Array.isArray);
  for (const arr of recordArrays) {
    for (const r of arr) {
      const f = r?.fields || {};
      const v = f[fieldName];
      if (typeof v === 'string' && v.trim() && !REC_ID_RE.test(v)) out.add(v.trim());
      // Rare case: value object with "name"
      if (v && typeof v === 'object' && typeof v.name === 'string') {
        const label = v.name.trim();
        if (label && !REC_ID_RE.test(label)) out.add(label);
      }
    }
  }

  // normalize -> [{id,label,value}]
  return Array.from(out)
    .sort((a, b) => a.localeCompare(b))
    .map((s) => ({ id: s.toLowerCase(), label: s, value: s }));
}

/* ===================================================================================== */

export default function AdminUsersPage() {
  // Store version in localStorage once
  useEffect(() => {
    rememberVersion();
    console.log('📦 Users page version:', readVersion());
  }, []);

  /* ---------------- Translations ---------------- */
  const search = useSearchParams();
  const langParam = (search?.get('lang') || '').trim();

  const defaultT = useMemo(
    () => ({
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
    }),
    [],
  );

  const [t, setT] = useState(defaultT);

  useEffect(() => {
    let stopped = false;

    async function loadT() {
      if (!langParam) return; // default English
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang: langParam, keys: defaultT }),
        });
        const j = await res.json().catch(() => ({}));
        if (!stopped && j && typeof j === 'object') {
          // Merge, keep defaults when missing
          setT((prev) => ({ ...prev, ...j }));
        }
      } catch {
        /* soft fail; keep English */
      }
    }
    loadT();
    return () => {
      stopped = true;
    };
  }, [langParam, defaultT]);

  /* ---------------- Add User form state ---------------- */
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [roleIds, setRoleIds] = useState('');

  /* ---------------- Users state ---------------- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState('');
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  /* ---------------- Roles state & diagnostics ---------------- */
  const [roles, setRoles] = useState([]);
  const [rolesErr, setRolesErr] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);

  /* first role id from top-row entry (optional) */
  const firstRole = useMemo(() => {
    return (
      (roleIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] || ''
    );
  }, [roleIds]);

  /* ---------------- Load users ---------------- */
  async function loadUsers() {
    setLoading(true);
    setErrText('');
    setDebug(null);
    try {
      const { ok, json, status } = await fetchJson(USERS_LIST_URL);

      console.log('👤 /api/admin/users response:', json);

      if (!ok || !json?.ok) {
        const msg = json?.message || t.couldntLoad;
        setErrText(`${msg}${json?.status ? `. Status: ${json.status}` : ''}`);
        if (json?.debug) setDebug(json.debug);
        setRows([]);
      } else {
        const normalized = (json.records || []).map((rec) => {
          // Try to show a human role label:
          const roleLabelCandidate =
            rec['Roles (from Role)'] ||
            rec.RoleName ||
            rec.roleName ||
            rec.role_label ||
            (Array.isArray(rec.Role) && rec.Role.length === 1 ? rec.Role[0] : rec.Role) ||
            rec.Role ||
            rec.role ||
            '';

          const roleLabel = Array.isArray(roleLabelCandidate)
            ? roleLabelCandidate.join(', ')
            : roleLabelCandidate;

          return {
            id: rec.id,
            name: rec.Name || rec.name || '',
            email: rec.Email || rec.email || '',
            role: roleLabel || '',
            active: !!rec.Active && !rec.Suspended,
          };
        });
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

  /* ---------------- Load roles (accept schema or records, never throw) ---------------- */
  async function loadRoles() {
    setRolesLoading(true);
    setRolesErr('');
    try {
      // 1) Try schema endpoint
      const schemaRes = await fetchJson(ROLES_SCHEMA_URL);
      console.log('🎭 roles schema:', schemaRes.json);
      let list = choicesFromRolesResponse(schemaRes.json);

      // 2) Fallback to raw data endpoint
      if (!list.length) {
        const dataRes = await fetchJson(ROLES_DATA_URL);
        console.log('🎭 roles data (fallback):', dataRes.json);
        list = choicesFromRolesResponse(dataRes.json);
      }

      // 3) Last chance: if your users endpoint also exposes roles
      if (!list.length) {
        const altRes = await fetchJson('/api/admin/users?roles=1&debug=1');
        console.log('🎭 roles alt (users?roles=1):', altRes.json);
        list = choicesFromRolesResponse(altRes.json);
      }

      if (!list.length) {
        const msg = `No options found for Roles — “${ROLES_FIELD_NAME}”`;
        console.warn(msg);
        setRolesErr(msg);
        setRoles([]);
        return;
      }

      console.log('🎭 normalized role options:', list);
      setRoles(list);
    } catch (e) {
      console.warn('❕ loadRoles soft-failed:', e);
      setRolesErr(String(e?.message || e));
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEmail('');
    setName('');
    setOrgId('');
    setRoleIds('');
  }

  async function callUsers(body) {
    console.log('➡️ POST /api/admin/users body:', body);
    const { ok, json, status } = await fetchJson(USERS_POST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('⬅️ POST /api/admin/users response:', json);

    if (!ok || !json?.ok) {
      const msg = json?.message || 'Operation failed.';
      setErrText(`${msg}${json?.status ? `. Status: ${json.status}` : ''}`);
      if (json?.debug) setDebug(json.debug);
      throw new Error(msg);
    } else {
      if (json.debug) setDebug(json.debug);
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

  /* ---------------- Role modal state ---------------- */
  const [roleModal, setRoleModal] = useState({
    open: false,
    mode: 'assign', // 'assign' | 'change'
    email: '',
    from: '',
    to: '',
  });

  function openRoleModal(row, mode = 'assign') {
    setRoleModal({
      open: true,
      mode,
      email: row.email,
      from: mode === 'change' ? row.role || '-' : '',
      to: '',
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

  /* ---------------- Users table (clean single-branch returns) ---------------- */
  function UsersTable() {
    if (errText) {
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
    }
    if (loading) {
      return (
        <div style={{ marginTop: 20, color: '#fff', opacity: 0.8, padding: 16 }}>{t.loading}</div>
      );
    }
    if (rows.length === 0) {
      return (
        <div style={{ marginTop: 20, color: '#fff', opacity: 0.8, padding: 16 }}>{t.noUsers}</div>
      );
    }

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

              <button
                onClick={() => openRoleModal(row, 'assign')}
                style={smallBtn('#ffffff', '#082b52')}
              >
                {t.assignRole}
              </button>

              <button
                onClick={() => openRoleModal(row, 'change')}
                style={smallBtn('#dbeafe', '#082b52')}
              >
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

  /* ---------------- Render ---------------- */
  return (
    <div style={wrapStyle}>
      {/* global placeholder color & bold for better legibility */}
      <style jsx global>{`
        .admin-input::placeholder {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 700;
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

              {/* Show "From" only for change mode */}
              {roleModal.mode === 'change' && (
                <>
                  <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.8 }}>{t.from}</div>
                  <input readOnly value={roleModal.from || '-'} style={{ ...inp, width: '100%' }} />
                </>
              )}

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
