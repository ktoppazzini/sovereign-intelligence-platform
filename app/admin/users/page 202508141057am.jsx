'use client';

import { useEffect, useState } from 'react';

// Minimal inline helpers (no global styling changes)
const leftColStyle = {
  width: 240,
  minWidth: 240,
  marginRight: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};
const leftTitleStyle = {
  color: '#fff',
  fontWeight: 800,
  fontSize: 22,
  margin: '0 0 10px 0',
};
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
const wrapStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 0,
};
const mainStyle = { flex: 1, minWidth: 0 };

export default function UsersAdminPage() {
  // form state (keep your four inputs)
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState(''); // preserved, not used by API
  const [roleIds, setRoleIds] = useState(''); // we map first entry to single Role

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch users
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
    } catch (e) {
      console.error('load users failed:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addUser() {
    if (!email.trim() || !name.trim()) {
      alert('Email and Name are required.');
      return;
    }
    const roleFromInput =
      roleIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] || ''; // take first as role
    try {
      const body = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: roleFromInput,
        locale: 'en',
        active: true,
      };
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`POST /api/admin/users -> ${r.status}`);
      await load();
      setEmail('');
      setName('');
      setOrgId('');
      setRoleIds('');
    } catch (e) {
      console.error('add user failed:', e);
      alert('Failed to add user.');
    }
  }

  // ----- Actions you asked for -----

  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
      const r = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`DELETE /api/admin/users -> ${r.status}`);
      await load();
    } catch (e) {
      console.error('delete failed:', e);
      alert('Failed to delete.');
    }
  }

  async function setActiveByEmail(email, active) {
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, active }),
      });
      if (!r.ok) throw new Error(`POST /api/admin/users -> ${r.status}`);
      await load();
    } catch (e) {
      console.error('suspend/activate failed:', e);
      alert('Failed to update status.');
    }
  }

  async function setRoleByEmail(email, role) {
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!r.ok) throw new Error(`POST /api/admin/users -> ${r.status}`);
      await load();
    } catch (e) {
      console.error('set role failed:', e);
      alert('Failed to set role.');
    }
  }

  function onAssignRole(row) {
    const val = prompt(`Assign role for ${row.email}:`, row.role || '');
    if (val == null) return;
    const role = String(val).trim();
    if (!role) {
      alert('Role cannot be empty.');
      return;
    }
    setRoleByEmail(row.email, role);
  }

  function onChangeRole(row) {
    const val = prompt(`Change role for ${row.email}:`, row.role || '');
    if (val == null) return;
    const role = String(val).trim();
    if (!role) {
      alert('Role cannot be empty.');
      return;
    }
    setRoleByEmail(row.email, role);
  }

  function onSuspend(row) {
    setActiveByEmail(row.email, false);
  }
  function onActivate(row) {
    setActiveByEmail(row.email, true);
  }

  // ----- UI (your structure preserved) -----

  return (
    <div style={wrapStyle}>
      {/* LEFT: Title on top, logo below, with space */}
      <aside style={leftColStyle} aria-label="Users sidebar">
        <div style={leftTitleStyle}>Users</div>
        <img
          src="/images/secure.png"
          alt="Sovereign Intelligence"
          width={200}
          height={200}
          style={leftLogoStyle}
          decoding="async"
        />
      </aside>

      {/* RIGHT: your original content */}
      <main style={mainStyle}>
        {/* Top input row */}
        <div
          className="inputRow"
          style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className=""
            style={{
              flex: '1 1 240px',
              minWidth: 220,
              padding: '14px 16px',
              borderRadius: 8,
              border: '1px solid #222',
            }}
          />
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className=""
            style={{
              flex: '1 1 240px',
              minWidth: 220,
              padding: '14px 16px',
              borderRadius: 8,
              border: '1px solid #222',
            }}
          />
          <input
            placeholder="Organization Record ID"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className=""
            style={{
              flex: '1 1 240px',
              minWidth: 220,
              padding: '14px 16px',
              borderRadius: 8,
              border: '1px solid #222',
            }}
          />
          <input
            placeholder="Role Record IDs (comma-separated)"
            value={roleIds}
            onChange={(e) => setRoleIds(e.target.value)}
            className=""
            style={{
              flex: '1 1 260px',
              minWidth: 240,
              padding: '14px 16px',
              borderRadius: 8,
              border: '1px solid #222',
            }}
          />

          <button
            onClick={addUser}
            className=""
            style={{
              background: '#0b5cff',
              color: '#fff',
              fontWeight: 800,
              padding: '12px 18px',
              borderRadius: 10,
              border: 'none',
              boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
            }}
          >
            Add User
          </button>
        </div>

        {/* Users table */}
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
            <div>Name</div>
            <div>Email</div>
            <div>Status</div>
            <div>Role</div>
            <div>Actions</div>
          </div>

          {loading ? (
            <div style={{ padding: 16, opacity: 0.8 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 16, opacity: 0.8 }}>No users found</div>
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
                <div>{row.active ? 'Active' : 'Suspended'}</div>
                <div>{row.role || '-'}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {row.active ? (
                    <button onClick={() => onSuspend(row)} style={smallBtn('#ffcc00', '#082b52')}>
                      Suspend
                    </button>
                  ) : (
                    <button onClick={() => onActivate(row)} style={smallBtn('#22c55e', '#082b52')}>
                      Activate
                    </button>
                  )}
                  <button onClick={() => onAssignRole(row)} style={smallBtn('#ffffff', '#082b52')}>
                    Assign Role
                  </button>
                  <button onClick={() => onChangeRole(row)} style={smallBtn('#dbeafe', '#082b52')}>
                    Change Role
                  </button>
                  <button onClick={() => deleteUser(row.id)} style={smallBtn('#ef4444', '#ffffff')}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// tiny style helper to keep buttons consistent and non-intrusive
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
