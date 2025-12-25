'use client';

import { useEffect, useMemo, useState } from 'react';

const VERSION = 'users-ui v1.0.14-roles-linked-ids';
const BUILD = new Date().toISOString().slice(0, 10); // show build date in UI

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [usersErr, setUsersErr] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  const [roles, setRoles] = useState([]); // [{id,label,value,raw}]
  const [rolesErr, setRolesErr] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);

  const [showDebug, setShowDebug] = useState(false);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('assign'); // 'assign' | 'change'
  const [modalUser, setModalUser] = useState(null); // {id,name,email,role,currentRoles,raw}
  const [fromRole, setFromRole] = useState(''); // name string (for display)
  const [toRole, setToRole] = useState(''); // name string chosen

  // ---------- helpers ----------
  const findRoleByLabel = (label) => roles.find((r) => (r?.label ?? r?.value) === label);

  const currentRoleNameFromRow = (row) => {
    // row.role is the display role (string) if available; otherwise try raw.RoleNames
    if (row?.role && typeof row.role === 'string') return row.role;
    const arr = row?.raw?.RoleNames;
    if (Array.isArray(arr) && arr.length) return arr[0];
    return '';
  };

  // ---------- data fetch ----------
  async function fetchRoles() {
    try {
      setRolesLoading(true);
      setRolesErr('');
      const url = '/api/admin/roles?options=1&debug=1';
      console.log('🎭 GET', url, 'payload:', {});
      const res = await fetch(url, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      console.log('🎭 roles response:', j);
      if (!res.ok) throw new Error(j?.error || 'Failed to load roles');
      const opts = Array.isArray(j?.options) ? j.options : [];
      setRoles(opts);
    } catch (e) {
      console.error('❌ roles load error:', e);
      setRolesErr(String(e?.message || e));
    } finally {
      setRolesLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      setUsersLoading(true);
      setUsersErr('');
      const url = '/api/admin/users?limit=100&debug=1';
      const res = await fetch(url, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      console.log('👤 /api/admin/users response:', j);
      if (!res.ok) throw new Error(j?.error || `Invalid request. Status: ${res.status}`);
      const rows = Array.isArray(j?.rows) ? j.rows : [];
      setUsers(rows);
    } catch (e) {
      console.error('❌ users load error:', e);
      setUsersErr(String(e?.message || e));
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    console.log('📦 Users page version:', { version: VERSION, build: BUILD });
    localStorage.setItem('SI_USERS_PAGE_VERSION', VERSION);
    localStorage.setItem('SI_USERS_PAGE_BUILD', BUILD);
    fetchRoles();
    fetchUsers();
  }, []);

  // ---------- actions ----------
  function openAssign(user) {
    const currentName = currentRoleNameFromRow(user);
    setModalMode('assign');
    setModalUser(user);
    setFromRole(currentName || '-');
    setToRole(''); // none preselected
    setModalOpen(true);
  }

  function openChange(user) {
    const currentName = currentRoleNameFromRow(user);
    setModalMode('change');
    setModalUser(user);
    setFromRole(currentName || '-');
    setToRole(''); // choose new
    setModalOpen(true);
  }

  async function saveRoleModal() {
    if (!modalUser?.email) {
      alert('Missing user email.');
      return;
    }
    if (!toRole) {
      alert('Please select a target role.');
      return;
    }
    const roleOpt = findRoleByLabel(toRole);
    if (!roleOpt?.id) {
      alert(`Could not find role id for "${toRole}". Refresh and try again.`);
      return;
    }

    // Build a VERY flexible payload: include name and all id keys the route might accept
    const payload = {
      email: modalUser.email,
      mode: modalMode, // 'assign' | 'change'
      from: fromRole || undefined, // string; for display/debug
      role: toRole, // role name
      roleName: toRole,
      role_label: toRole,

      // linked record IDs (all flavors)
      roleId: roleOpt.id,
      roleRecId: roleOpt.id,
      role_record_id: roleOpt.id,
      role_ids: [roleOpt.id],
      roleIdList: [roleOpt.id],

      _client: VERSION,
    };

    console.log('➡️ POST /api/admin/users body:', payload);
    const res = await fetch('/api/admin/users?debug=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let j = {};
    try {
      j = await res.json();
    } catch {
      /* ignore */
    }
    console.log('⬅️ POST /api/admin/users response:', { ok: res.ok, status: res.status, body: j });

    if (!res.ok) {
      const msg = j?.error || j?.message || 'Invalid request';
      throw new Error(msg);
    }

    setModalOpen(false);
    await fetchUsers();
  }

  // ---------- UI ----------
  const roleOptions = useMemo(() => {
    return roles.map((r) => r?.label ?? r?.value).filter(Boolean);
  }, [roles]);

  return (
    <div className="p-4 text-sm text-white">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-semibold">Users</h1>
        <div className="text-xs opacity-70">
          {VERSION} • {BUILD}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600"
          onClick={() => setShowDebug((v) => !v)}
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
        <button
          className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
          onClick={() => {
            fetchRoles();
            fetchUsers();
          }}
        >
          Refresh
        </button>
      </div>

      {usersErr && (
        <div className="mb-3 rounded bg-red-800/40 text-red-200 px-3 py-2">{usersErr}</div>
      )}

      <div className="rounded border border-white/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/10">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              <tr>
                <td className="px-3 py-3" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-3 py-3" colSpan={5}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((row) => {
                const roleName = currentRoleNameFromRow(row);
                return (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.email}</td>
                    <td className="px-3 py-2">{row.active ? 'Active' : 'Suspended'}</td>
                    <td className="px-3 py-2">{roleName || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500"
                          onClick={() => openAssign(row)}
                        >
                          Assign a Role
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500"
                          onClick={() => openChange(row)}
                        >
                          Change Role
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-[680px] max-w-[95vw] rounded-xl bg-slate-900 shadow-xl border border-white/10 p-4">
            <h2 className="text-base font-semibold mb-1">{modalUser?.email}</h2>
            <div className="text-xs opacity-70 mb-3">
              {modalMode === 'assign' ? 'Assign a Role' : 'Change Role'}
            </div>

            {/* FROM: readonly select (for consistency with UI) */}
            <label className="text-xs opacity-80">From</label>
            <div className="mt-1 mb-3">
              <select
                className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2"
                value={fromRole || '-'}
                disabled
                onChange={() => {}}
              >
                <option value="-">-</option>
                {fromRole && <option value={fromRole}>{fromRole}</option>}
              </select>
            </div>

            {/* TO: selectable from roles table options */}
            <label className="text-xs opacity-80">To</label>
            <div className="mt-1 mb-4">
              <select
                className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2"
                value={toRole}
                onChange={(e) => setToRole(e.target.value)}
              >
                <option value="">Select role</option>
                {roleOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
                onClick={async () => {
                  try {
                    await saveRoleModal();
                  } catch (e) {
                    console.error('❌ saveRoleModal error:', e);
                    alert(e?.message || String(e));
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEBUG */}
      {showDebug && (
        <pre className="mt-4 text-[11px] leading-5 whitespace-pre-wrap bg-black/40 rounded p-3 overflow-auto max-h-[40vh]">
          {JSON.stringify(
            {
              version: { version: VERSION, build: BUILD },
              usersLoading,
              usersErr,
              rows: users.map((r) => ({
                id: r.id,
                name: r.name,
                email: r.email,
                role: currentRoleNameFromRow(r),
                currentRoles: r?.raw?.RoleNames,
                active: r.active,
                raw: r.raw,
              })),
              rolesLoading,
              rolesErr,
              rolesCount: roles.length,
              rolesSample: roles.slice(0, 10),
            },
            // Safe replacer to avoid circular references
            (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return '[Circular]';
                seen.add(value);
              }
              return value;
            },
            2,
          )}
        </pre>
      )}
    </div>
  );
}
