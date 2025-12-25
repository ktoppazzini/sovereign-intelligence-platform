'use client';

import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../../components/Footer';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', organizationId: '', roleIds: '' });
  const [orgs, setOrgs] = useState([]);
  const [roles, setRoles] = useState([]);

  // load users
  async function load() {
    const r = await fetch('/api/admin/users', { cache: 'no-store' });
    const j = await r.json();
    if (j.ok) setUsers(j.users || []);
  }

  async function loadOrgs() {
    const r = await fetch('/api/admin/orgs'); // optional: add this endpoint, or skip org picker
    // if you don’t have this yet, hardcode organizationId into your POST form for now
    if (r.ok) {
      const j = await r.json();
      if (j.ok) setOrgs(j.orgs || []);
    }
  }

  async function loadRoles() {
    const r = await fetch('/api/admin/roles'); // optional endpoint
    if (r.ok) {
      const j = await r.json();
      if (j.ok) setRoles(j.roles || []);
    }
  }

  useEffect(() => {
    load();
    // (optional) loadOrgs(); loadRoles();
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const roleIds = form.roleIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean); // accept comma-separated record IDs
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          organizationId: form.organizationId, // set a valid airtable record id
          roleIds,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        setForm({ email: '', name: '', organizationId: '', roleIds: '' });
        load();
      } else {
        alert(j.error || 'Create failed');
      }
    } finally {
      setCreating(false);
    }
  }

  async function suspendUser(id) {
    const r = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'suspend' }),
    });
    const j = await r.json();
    if (j.ok) load();
    else alert(j.error || 'Failed');
  }

  async function activateUser(id) {
    const r = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'activate' }),
    });
    const j = await r.json();
    if (j.ok) load();
    else alert(j.error || 'Failed');
  }

  async function deleteUser(id) {
    if (!confirm('Soft-delete this user?')) return;
    const r = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const j = await r.json();
    if (j.ok) load();
    else alert(j.error || 'Failed');
  }

  return (
    <>
      <Header />

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 30, marginBottom: 16 }}>Users</h1>

        {/* Create user (minimal) */}
        <form
          onSubmit={createUser}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          <input
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px' }}
          />
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px' }}
          />
          <input
            required
            placeholder="Organization Record ID"
            value={form.organizationId}
            onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px' }}
          />
          <input
            placeholder="Role Record IDs (comma-separated)"
            value={form.roleIds}
            onChange={(e) => setForm((f) => ({ ...f, roleIds: e.target.value }))}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px' }}
          />
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
            <button
              disabled={creating}
              style={{
                background: '#082b52',
                color: '#fff',
                fontWeight: 800,
                border: 0,
                borderRadius: 10,
                padding: '12px 16px',
              }}
            >
              {creating ? 'Creating…' : 'Add User'}
            </button>
          </div>
        </form>

        {/* Users list */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Name</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Email</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Roles</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                    {u.name || '—'}
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{u.email}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{u.status}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                    {(u.roles || []).map((r) => r.name).join(', ') || '—'}
                  </td>
                  <td
                    style={{ padding: 12, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}
                  >
                    {u.status === 'Suspended' ? (
                      <button onClick={() => activateUser(u.id)} style={btn('success')}>
                        Activate
                      </button>
                    ) : (
                      <button onClick={() => suspendUser(u.id)} style={btn('warn')}>
                        Suspend
                      </button>
                    )}
                    <button onClick={() => deleteUser(u.id)} style={btn('danger')}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan="5" style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Footer lang="English" />

      <style jsx>{`
        /* page-scoped if needed */
      `}</style>
    </>
  );
}

function btn(kind) {
  const base = {
    background: '#082b52',
    color: '#fff',
    fontWeight: 800,
    border: 0,
    borderRadius: 10,
    padding: '10px 12px',
    cursor: 'pointer',
    marginRight: 8,
  };
  if (kind === 'danger') base.background = '#b91c1c';
  if (kind === 'warn') base.background = '#0e7490';
  if (kind === 'success') base.background = '#15803d';
  return base;
}
