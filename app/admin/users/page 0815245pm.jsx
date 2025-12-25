'use client';
// app/admin/users/page.jsx
// v1.0.7-roles-fallback — do NOT change routes; robust client-side role options loader with schema + records fallbacks.
// - From (Change Role): Users → "Roles (from Role)" (read-only display)
// - To (Assign/Change): Roles table → "Roles" (single-select options)
// - Conserves layout, extensive logging, and translation placeholders

import { useEffect, useMemo, useState } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
   Version info (persists to localStorage so you can verify which build is running)
   ────────────────────────────────────────────────────────────────────────── */
const CLIENT_VERSION = 'users-ui v1.0.7-roles-fallback';
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

/* ──────────────────────────────────────────────────────────────────────────
   Constants used for field names (kept on client to avoid touching routes)
   ────────────────────────────────────────────────────────────────────────── */
const USERS_ROLES_LOOKUP_FIELD = 'Roles (from Role)'; // for "From"
const ROLES_SINGLE_SELECT_LABEL = 'Roles'; // the field on the Roles table we want options from

/* ──────────────────────────────────────────────────────────────────────────
   Minimal inline styles
   ────────────────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────────────────
   Helpers for robust role option extraction (NO route changes)
   ────────────────────────────────────────────────────────────────────────── */

function uniqBy(arr, keyGetter) {
  const map = new Map();
  for (const item of arr) {
    const k = keyGetter(item);
    if (!map.has(k)) map.set(k, item);
  }
  return Array.from(map.values());
}

function looksLikeAirtableRecId(x) {
  return typeof x === 'string' && /^rec[a-zA-Z0-9]{14}$/.test(x);
}
function looksLikeEmail(x) {
  return typeof x === 'string' && x.includes('@');
}

/** Normalize "choice-like" objects into {id,label,value} */
function normChoice(raw, idx = 0) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    return {
      id: `s-${idx}-${raw}`,
      label: raw,
      value: raw,
      raw,
    };
  }
  const label = raw.label ?? raw.name ?? raw.value ?? String(raw.id ?? `idx-${idx}`);
  const value = raw.value ?? raw.name ?? raw.id ?? label;
  const id = raw.id ?? value ?? label ?? `idx-${idx}`;
  return { id, label, value, raw };
}

/**
 * Extract choices from a Roles schema payload.
 * Accepts shapes like: { schema: { fields:[{name:'Roles',type:'singleSelect',options:{choices:[...]}}]}} OR
 *                       { fields:[...] }
 */
function extractChoicesFromSchemaPayload(payload, desiredFieldLabel = ROLES_SINGLE_SELECT_LABEL) {
  const fields = payload?.schema?.fields || payload?.fields || [];
  const lowerDesired = String(desiredFieldLabel).toLowerCase();
  let target = fields.find(
    (f) =>
      String(f?.name ?? '').toLowerCase() === lowerDesired ||
      (f?.type === 'singleSelect' &&
        String(f?.name ?? '')
          .toLowerCase()
          .includes(lowerDesired)),
  );
  if (!target && fields.length) {
    // Last resort: first singleSelect field
    target = fields.find((f) => f?.type === 'singleSelect');
  }
  const choices = target?.options?.choices || [];
  return choices.map((c, i) => normChoice(c, i)).filter(Boolean);
}

/**
 * Extract choices from a Roles records payload (array of records).
 * Tries fields named exactly 'Roles' (case-insensitive); otherwise scans for a single
 * string field per record and uses that.
 */
function extractChoicesFromRecordsPayload(payload) {
  const recs = payload?.records || [];
  const out = [];
  for (let i = 0; i < recs.length; i++) {
    const rec = recs[i] || {};
    const entries = Object.entries(rec);
    // Prefer an exact Roles field (case-insensitive)
    let val =
      rec['Roles'] ??
      rec['roles'] ??
      rec['Role'] ??
      rec['role'] ??
      // Sometimes fields are nested under "fields"
      rec?.fields?.['Roles'] ??
      rec?.fields?.['Role'];

    if (!val) {
      // Try to sniff a suitable string field
      for (const [k, v] of entries) {
        if (k === 'id' || k === 'recordId' || k === 'fields') continue;
        if (typeof v === 'string' && !looksLikeAirtableRecId(v) && !looksLikeEmail(v)) {
          val = v;
          break;
        }
        if (Array.isArray(v) && v.length === 1 && typeof v[0] === 'string') {
          val = v[0];
          break;
        }
      }
    }

    if (val && typeof val === 'string' && !looksLikeAirtableRecId(val) && !looksLikeEmail(val)) {
      out.push(normChoice(val, i));
    }
  }
  return uniqBy(out, (x) => x.value);
}

/**
 * Extract unique role labels from users payload (fallback of last resort).
 * Looks at "Roles (from Role)" or other label-like fields to build a set of strings.
 */
function extractRoleLabelsFromUsersPayload(payload) {
  const recs = payload?.records || [];
  const out = new Set();
  for (const rec of recs) {
    const v =
      rec[USERS_ROLES_LOOKUP_FIELD] ??
      rec['role_label'] ??
      rec['RoleName'] ??
      rec['roleName'] ??
      rec['Role'] ??
      rec['role'];
    const s = Array.isArray(v) ? v[0] : v;
    if (typeof s === 'string' && s && !looksLikeAirtableRecId(s) && !looksLikeEmail(s)) {
      out.add(s);
    }
  }
  return Array.from(out)
    .map((s, i) => normChoice(s, i))
    .filter(Boolean);
}

/* ──────────────────────────────────────────────────────────────────────────
   The Page
   ────────────────────────────────────────────────────────────────────────── */

export default function AdminUsersPage() {
  useEffect(() => {
    rememberVersion();
    console.log('📦 Users page version:', readVersion());
  }, []);

  // Translations (UI uses these literals; your /api/gptTranslation may override text via URL param/middleware)
  const [t] = useState({
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

  // Top-row form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [roleIds, setRoleIds] = useState('');

  // Users state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState('');
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // Roles (To list)
  const [roles, setRoles] = useState([]);
  const [rolesErr, setRolesErr] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesSource, setRolesSource] = useState(''); // for debugging visibility

  const firstRole = useMemo(() => {
    return (
      (roleIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] || ''
    );
  }, [roleIds]);

  /* ──────────────────────────────────────────────────────────────────────
     Load users
     ────────────────────────────────────────────────────────────────────── */
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
        const normalized = (j.records || []).map((rec) => {
          // Name mapping (avoid mixing with Role strings)
          const theName =
            rec.Name ?? rec['A Name'] ?? rec.FullName ?? rec.full_name ?? rec.name ?? '';

          // Email
          const theEmail = rec.Email ?? rec.email ?? '';

          // Human readable role label from Users lookup first
          const roleLabel =
            rec[USERS_ROLES_LOOKUP_FIELD] ??
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
      console.error('❌ loadUsers error:', e);
      setErrText(t.couldntLoad);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     Load Roles (for "To") with multiple fallbacks — NO route changes required
     Order:
       1) /api/admin/roles?options=1&debug=1         → expects ready-made choices
       2) /api/admin/roles?schema=1&debug=1          → parse singleSelect "Roles" choices
       3) /api/admin/roles?debug=1                   → scan records for a suitable Roles field
       4) /api/admin/users?roles=1&debug=1           → derive choices (if endpoint provides) or
          extract labels from users payload as the absolute last resort
     ────────────────────────────────────────────────────────────────────── */
  async function loadRoles() {
    setRolesLoading(true);
    setRolesErr('');
    setRolesSource('');
    const debugBundle = { attempts: [] };

    const attempt = async (label, url, extractor, onEmptyMsg) => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        console.log(`🎭 ${label} → ${url}`, { ok: res.ok, payload: j });
        debugBundle.attempts.push({ label, url, ok: res.ok, keys: Object.keys(j || {}) });
        if (!res.ok) return [];

        const list = extractor(j);
        if (Array.isArray(list) && list.length) {
          setRolesSource(`${label} (${url})`);
          return list;
        } else {
          console.warn(onEmptyMsg || `No roles extracted from ${label}`);
          return [];
        }
      } catch (e) {
        console.error(`❌ ${label} failed`, e);
        debugBundle.attempts.push({ label, url, error: String(e?.message || e) });
        return [];
      }
    };

    // 1) options=1 (ideal)
    let list =
      (await attempt(
        'roles-options',
        '/api/admin/roles?options=1&debug=1',
        (j) => {
          // Accept either j.roles = array of choice-like or j.options.choices
          const direct = Array.isArray(j?.roles) ? j.roles : [];
          const choices = j?.options?.choices || j?.field?.options?.choices || [];
          const merged = [...direct, ...choices].map((c, i) => normChoice(c, i)).filter(Boolean);
          // filter out recIds/emails just in case
          return uniqBy(
            merged.filter(
              (c) => c?.label && !looksLikeAirtableRecId(c.label) && !looksLikeEmail(c.label),
            ),
            (x) => x.value,
          );
        },
        'No options returned from options endpoint.',
      )) || [];

    // 2) schema=1 (singleSelect field)
    if (!list.length) {
      const fromSchema = await attempt(
        'roles-schema',
        '/api/admin/roles?schema=1&debug=1',
        (j) => extractChoicesFromSchemaPayload(j, ROLES_SINGLE_SELECT_LABEL),
        'No single-select choices found in roles schema.',
      );
      if (fromSchema.length) list = fromSchema;
    }

    // 3) raw records from Roles table
    if (!list.length) {
      const fromRecords = await attempt(
        'roles-records',
        '/api/admin/roles?debug=1',
        (j) => extractChoicesFromRecordsPayload(j),
        'No role-like strings found in roles records.',
      );
      if (fromRecords.length) list = fromRecords;
    }

    // 4) last resort: try users?roles=1 or extract from users payload
    if (!list.length) {
      const fromUsersEndpoint = await attempt(
        'users-roles',
        '/api/admin/users?roles=1&debug=1',
        (j) => {
          const direct = Array.isArray(j?.roles) ? j.roles : [];
          let choices = direct.map((c, i) => normChoice(c, i)).filter(Boolean);
          if (!choices.length) {
            choices = extractRoleLabelsFromUsersPayload(j);
          }
          return uniqBy(
            choices.filter(
              (c) => c?.label && !looksLikeAirtableRecId(c.label) && !looksLikeEmail(c.label),
            ),
            (x) => x.value,
          );
        },
        'No roles in users endpoint.',
      );
      if (fromUsersEndpoint.length) list = fromUsersEndpoint;
    }

    // Still nothing? As a last-ditch, derive unique roles from any loaded users currently in state.
    if (!list.length && rows.length) {
      const derived = Array.from(new Set(rows.map((r) => r.role).filter(Boolean))).map((s, i) =>
        normChoice(s, i),
      );
      if (derived.length) {
        list = derived;
        setRolesSource('derived-from-current-users');
        console.warn('⚠️ Falling back to roles derived from current users in memory.');
      }
    }

    // finalize
    setRoles(list);
    setRolesLoading(false);
    if (!list.length) {
      setRolesErr(`No options found for Roles — “${ROLES_SINGLE_SELECT_LABEL}”`);
    }
    setDebug((prev) => ({ ...(prev || {}), rolesLoad: debugBundle, rolesSource }));
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

  // Role modal
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

  /* ──────────────────────────────────────────────────────────────────────
     Users table
     ────────────────────────────────────────────────────────────────────── */
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

  /* ──────────────────────────────────────────────────────────────────────
     Render
     ────────────────────────────────────────────────────────────────────── */
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
                rolesSource,
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
