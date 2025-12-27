'use client';

import { useEffect, useState } from 'react';

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

const ORG_TYPES = [
  'Government',
  'Not for Profit',
  'Multinational Corporation',
  'Large Private Sector Enterprise',
  'Medium Private Sector Enterprise',
  'Small Private Sector Enterprise',
];

export default function UsersAdminPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [orgType, setOrgType] = useState(ORG_TYPES[0]);
  const [roleIds, setRoleIds] = useState('');

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
      alert('Email and Name are required.');
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
      alert('Email is required.');
      return;
    }
    if (!confirm(`Delete user ${email.trim()}?`)) return;
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
      alert('Email is required.');
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
      alert('Email is required.');
      return;
    }
    const role = firstRole();
    if (!role) {
      alert('Enter a Role in "Role Record IDs".');
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
      alert('Email is required.');
      return;
    }
    const role = firstRole();
    if (!role) {
      alert('Enter a Role in "Role Record IDs".');
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
                  {row.active ? 'Suspend' : 'Activate'}
                </button>
                <button
                  onClick={() => {
                    const v = prompt(`Assign role for ${row.email}:`, row.role || '');
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
                  Assign Role
                </button>
                <button
                  onClick={() => {
                    const v = prompt(`Change role for ${row.email}:`, row.role || '');
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
                  Change Role
                </button>
                <button
                  onClick={() => {
                    if (!confirm('Delete this user?')) return;
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
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  function InputBlock({ actionLabel, onClick }) {
    return (
      <>
        <div
          className="inputRow"
          style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            placeholder="Organization Record ID (recXXXX)"
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
            placeholder="Role Record IDs (comma-separated)"
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

      <main style={mainStyle}>
        <InputBlock actionLabel="Add User" onClick={addUser} />
        <UsersTable />

        <div style={{ marginTop: 12 }}>
          <InputBlock actionLabel="Delete User" onClick={deleteUserFromForm} />
        </div>
        <UsersTable />

        <div style={{ marginTop: 12 }}>
          <InputBlock actionLabel="Suspend User" onClick={suspendUserFromForm} />
        </div>
        <UsersTable />

        <div style={{ marginTop: 12 }}>
          <InputBlock actionLabel="Assign Role" onClick={assignRoleFromForm} />
        </div>
        <UsersTable />

        <div style={{ marginTop: 12 }}>
          <InputBlock actionLabel="Change Role" onClick={changeRoleFromForm} />
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
