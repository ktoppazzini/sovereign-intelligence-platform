'use client';

// app/admin/users/page.jsx
// v1.0.9-roles-strict — strictly use Roles table single‑select options for "To" picker,
// filter out record IDs (recXXXXXXXXXXXXX) and any non-label junk, add louder debug logs,
// keep layout & behavior; do NOT touch server routes.

import { useEffect, useMemo, useRef, useState } from 'react';

/***********************************
 * Version banner (persists locally)
 ***********************************/
const CLIENT_VERSION = 'users-ui v1.0.9-roles-strict';
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

/***********************************
 * Minimal inline styles (unchanged)
 ***********************************/
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

/***********************************
 * Logging helpers (LOUD but controlled)
 ***********************************/
const L = {
  on: true,
  group(label, obj) {
    if (!this.on) return;
    try {
      // Use collapsed groups so it doesn't spam the console unless opened
      console.groupCollapsed(label);
      if (obj !== undefined) console.log(obj);
    } catch {}
  },
  end() {
    if (!this.on) return;
    try {
      console.groupEnd();
    } catch {}
  },
  log(...args) {
    if (!this.on) return;
    try {
      console.log(...args);
    } catch {}
  },
  warn(...args) {
    if (!this.on) return;
    try {
      console.warn(...args);
    } catch {}
  },
  error(...args) {
    if (!this.on) return;
    try {
      console.error(...args);
    } catch {}
  },
};

/***********************************
 * Role option utils (STRICT)
 ***********************************/
const REC_ID_RE = /^rec[a-zA-Z0-9]{14}$/; // Airtable record id pattern

function isString(x) {
  return typeof x === 'string' || x instanceof String;
}

function pickLabel(obj) {
  if (obj == null) return '';
  // Prefer explicit label/name/value text (trimmed)
  const cand =
    [obj.label, obj.name, obj.value, obj.title]
      .filter(isString)
      .map((s) => String(s).trim())
      .find((s) => s.length > 0) || '';
  return cand;
}

function isLikelyRoleLabel(s) {
  if (!isString(s)) return false;
  const v = String(s).trim();
  if (!v) return false;
  // Exclude record IDs and anything that looks like comma-separated ids
  if (REC_ID_RE.test(v)) return false;
  if (/^rec[a-z0-9]/i.test(v)) return false; // any rec* prefix
  if (v.includes(',')) return false;
  // Keep within sane length
  if (v.length > 120) return false;
  return true;
}

function normalizeOptions(raw) {
  const labels = [];
  const push = (s, source) => {
    if (!isLikelyRoleLabel(s)) return;
    labels.push({ label: s, value: s, _source: source || 'unknown' });
  };

  if (Array.isArray(raw)) {
    raw.forEach((it) => {
      if (isString(it)) return push(it, 'string');
      if (typeof it === 'object' && it) return push(pickLabel(it), 'object');
    });
  } else if (typeof raw === 'object' && raw) {
    // Could be { choices: [{name: 'Admin'}] }
    if (Array.isArray(raw.choices)) {
      raw.choices.forEach((c) => push(pickLabel(c), 'choices'));
    }
  }

  // De-dupe (case-insensitive), sort by label
  const seen = new Set();
  const deduped = labels.filter(({ label }) => {
    const key = label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  deduped.sort((a, b) => a.label.localeCompare(b.label));
  return deduped;
}

/***********************************
 * Page component
 ***********************************/
export default function AdminUsersPage() {
  // Remember version
  useEffect(() => {
    rememberVersion();
    L.group('📦 Users page version', readVersion());
    L.end();
  }, []);

  // Translations placeholder (your /api/gptTranslation may update these elsewhere)
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

  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [roleIds, setRoleIds] = useState('');

  // Users
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState('');
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // Roles
  const [roles, setRoles] = useState([]); // [{label, value, _source}]
  const [rolesErr, setRolesErr] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);
  const rolesMetaRef = useRef({});

  const firstRole = useMemo(() => {
    return (
      (roleIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] || ''
    );
  }, [roleIds]);

  /**********************
   * Network helpers
   **********************/
  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function loadUsers() {
    setLoading(true);
    setErrText('');
    setDebug(null);
    try {
      const res = await fetch('/api/admin/users?limit=100&debug=1', { cache: 'no-store' });
      const j = await safeJson(res);
      L.group('👤 /api/admin/users response', j);
      L.end();

      if (!res.ok || !j?.ok) {
        const msg = j?.message || t.couldntLoad;
        setErrText(`${msg}${j?.status ? `. Status: ${j.status}` : ''}`);
        if (j?.debug) setDebug(j.debug);
        setRows([]);
      } else {
        const normalized = (j.records || []).map((rec) => {
          const theName =
            rec.Name ?? rec['A Name'] ?? rec.FullName ?? rec.full_name ?? rec.name ?? '';
          const theEmail = rec.Email ?? rec.email ?? '';
          const roleLabel =
            rec['Roles (from Role)'] ??
            rec.RoleName ??
            rec.roleName ??
            rec.role_label ??
            (Array.isArray(rec.Role) && rec.Role.length === 1 ? rec.Role[0] : rec.Role) ??
            rec.Role ??
            rec.role ??
            '';
          return {
            id: rec.id,
            name: theName,
            email: theEmail,
            role: Array.isArray(roleLabel) ? (roleLabel[0] ?? '') : roleLabel,
            active: !!rec.Active && !rec.Suspended,
          };
        });
        setRows(normalized);
        if (j.debug) setDebug(j.debug);
      }
    } catch (e) {
      L.error('❌ loadUsers error:', e);
      setErrText(t.couldntLoad);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // Extract strictly from the Roles table single-select. Never merge with Users values.
  async function loadRolesStrict() {
    setRolesLoading(true);
    setRolesErr('');
    const meta = { tried: [], counts: {}, samples: {} };
    const collect = (key, arr, sampleTag) => {
      meta.counts[key] = (arr || []).length;
      if (arr && arr.length) meta.samples[key] = arr.slice(0, 5);
    };

    try {
      // 1) Primary source: options=1 endpoint (must be implemented server-side already)
      meta.tried.push('GET /api/admin/roles?options=1&debug=1');
      let res = await fetch('/api/admin/roles?options=1&debug=1', { cache: 'no-store' });
      let j = await safeJson(res);
      L.group('🎭 roles options (options=1) payload', j);
      L.end();

      let strict = [];
      if (res.ok && j) {
        // Accept arrays at j.roles or j.options or j.fieldOptions
        const candidates = [];
        if (Array.isArray(j.roles)) candidates.push(...j.roles);
        if (Array.isArray(j.options)) candidates.push(...j.options);
        if (j.fieldOptions && Array.isArray(j.fieldOptions.choices))
          candidates.push(...j.fieldOptions.choices);
        strict = normalizeOptions(candidates);
        collect('options_1_candidates', candidates);
      }

      // 2) Fallback: schema endpoint, read Roles field choices
      if (strict.length === 0) {
        meta.tried.push('GET /api/admin/roles?schema=1&debug=1');
        const res2 = await fetch('/api/admin/roles?schema=1&debug=1', { cache: 'no-store' });
        const j2 = await safeJson(res2);
        L.group('🎭 roles schema (schema=1) payload', j2);
        L.end();
        // server may return { ok, field, fieldOptions: { choices: [...] } }
        const schemaChoices = j2?.fieldOptions?.choices || j2?.choices || [];
        collect('schema_choices', schemaChoices);
        strict = normalizeOptions(schemaChoices);
      }

      // Final strict filter: remove any item that looks like a record id
      strict = strict.filter((x) => !REC_ID_RE.test(x.value));

      if (strict.length === 0) {
        setRolesErr('No options found for Roles — strictly from Roles table single-select.');
        setRoles([]);
        rolesMetaRef.current = meta;
        return;
      }

      setRoles(strict);
      rolesMetaRef.current = meta;
    } catch (e) {
      L.error('❌ loadRolesStrict error:', e);
      setRolesErr(String(e?.message || e));
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    loadRolesStrict();
  }, []);

  function resetForm() {
    setEmail('');
    setName('');
    setOrgId('');
    setRoleIds('');
  }

  async function callUsers(body) {
    L.group('➡️ POST /api/admin/users body', body);
    L.end();
    const r = await fetch('/api/admin/users?debug=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await safeJson(r);
    L.group('⬅️ POST /api/admin/users response', j);
    L.end();

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
        role: firstRole, // optional on create
        orgId: orgId.trim(),
        active: true,
      });
      await loadUsers();
      resetForm();
    } catch {}
  }

  /**********************
   * Role modal
   **********************/
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
    setRoleModal({ open: true, email: row.email, from: row.role || '-', to: '', mode: 'change' });
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
    try {
      await callUsers({ email: roleModal.email, role: roleModal.to });
      await loadUsers();
      closeRoleModal();
    } catch {}
  }

  /**********************
   * Users table
   **********************/
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
                {t.assignARole}
              </button>
              <button onClick={() => openChangeModal(row)} style={smallBtn('#dbeafe', '#082b52')}>
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
        ))}
      </div>
    );
  }

  /**********************
   * Render
   **********************/
  return (
    <div style={wrapStyle}>
      {/* Global placeholder color */}
      <style jsx global>{`
        .admin-input::placeholder {
          color: rgba(255, 255, 255, 0.85);
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
                rolesSample: roles.slice(0, 12),
                rolesMeta: rolesMetaRef.current,
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
                  <option key={r.value + ':' + idx} value={r.value} style={{ color: '#000' }}>
                    {r.label}
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
