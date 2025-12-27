/**
 * Admin Users API
 * - GET    /api/admin/users?limit=100&debug=1
 * - POST   /api/admin/users        { email, name, orgRecId?, roleRecIds?[] }
 * - DELETE /api/admin/users        { id? , email? }
 * - PATCH  /api/admin/users        { action: "toggleSuspend" | "assignRole" | "changeRole", recordId, roleId? }
 *
 * Notes:
 * - Works with either table NAMEs or table ID (tbl...) in env.
 * - Will also return all roles so the UI can populate dropdowns.
 */

export const dynamic = 'force-dynamic';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

// Tables (name or id)
const USERS_TABLE =
  process.env.AIRTABLE_USERS_TABLE || process.env.AIRTABLE_USERS_TABLE_ID || 'Users';

const ROLES_TABLE =
  process.env.AIRTABLE_ROLES_TABLE || process.env.AIRTABLE_ROLES_TABLE_ID || 'Roles';

// Field names in Users table
const F_EMAIL = process.env.AIRTABLE_USERS_EMAIL_FIELD || 'Email';
const F_NAME = process.env.AIRTABLE_USERS_NAME_FIELD || 'Name';
const F_ORG_REC_ID = process.env.AIRTABLE_USERS_ORG_REC_ID_FIELD || 'Organization Record ID';
const F_ROLES = process.env.AIRTABLE_USERS_ROLES_FIELD || 'Roles';
const F_SUSPENDED = process.env.AIRTABLE_USERS_SUSPENDED_FIELD || null; // optional boolean

// Field names in Roles table
const F_ROLE_NAME = process.env.AIRTABLE_ROLE_NAME_FIELD || 'Name';

const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function atGet(path, params = {}) {
  const url = new URL(`${AIRTABLE_URL}/${encodeURIComponent(path)}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { headers: authHeaders(), cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error?.message || json?.error || 'Airtable GET failed');
    err.status = res.status;
    err.body = json;
    err.url = url.toString();
    throw err;
  }
  return json;
}

async function atPost(path, body) {
  const res = await fetch(`${AIRTABLE_URL}/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error?.message || json?.error || 'Airtable POST failed');
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function atPatch(path, body) {
  const res = await fetch(`${AIRTABLE_URL}/${encodeURIComponent(path)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error?.message || json?.error || 'Airtable PATCH failed');
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function atDelete(path, body) {
  const res = await fetch(`${AIRTABLE_URL}/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error?.message || json?.error || 'Airtable DELETE failed');
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/** Fetch roles (id + name) */
async function getAllRoles() {
  const roles = [];
  let offset;
  do {
    const page = await atGet(ROLES_TABLE, {
      ...(offset ? { offset } : {}),
      'fields[]': [F_ROLE_NAME],
      pageSize: 100,
    });
    (page.records || []).forEach((r) => {
      roles.push({ id: r.id, name: r.fields?.[F_ROLE_NAME] || '' });
    });
    offset = page.offset;
  } while (offset);
  return roles;
}

/** Fetch users + map roles */
async function getUsers(limit = 100) {
  const roles = await getAllRoles();
  const roleNameById = new Map(roles.map((r) => [r.id, r.name]));

  const users = [];
  let offset;
  let pulled = 0;
  const wantedFields = [F_NAME, F_EMAIL, F_ROLES];
  if (F_SUSPENDED) wantedFields.push(F_SUSPENDED);

  do {
    const page = await atGet(USERS_TABLE, {
      ...(offset ? { offset } : {}),
      'fields[]': wantedFields,
      pageSize: Math.min(100, Math.max(1, limit - pulled)),
    });

    (page.records || []).forEach((r) => {
      const f = r.fields || {};
      const roleIds = Array.isArray(f[F_ROLES]) ? f[F_ROLES] : [];
      const roleFirstId = roleIds.length ? roleIds[0] : null;
      const roleName = roleFirstId ? roleNameById.get(roleFirstId) : '';
      users.push({
        id: r.id,
        name: f[F_NAME] || '',
        email: f[F_EMAIL] || '',
        role: roleFirstId ? { id: roleFirstId, name: roleName || '' } : null,
        suspended: F_SUSPENDED ? Boolean(f[F_SUSPENDED]) : false,
        raw: f,
      });
      pulled++;
    });

    offset = page.offset;
  } while (offset && pulled < limit);

  return { users, roles };
}

export async function GET(req) {
  try {
    if (!API_KEY || !BASE_ID) {
      return Response.json(
        { ok: false, message: 'Missing Airtable env: AIRTABLE_API_KEY or AIRTABLE_BASE_ID' },
        { status: 500 },
      );
    }
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || 100);
    const debug = searchParams.get('debug') === '1';

    const data = await getUsers(limit);

    if (debug) {
      return Response.json({
        ok: true,
        ...data,
        debug: {
          env: {
            baseId: BASE_ID?.slice(0, 6),
            usersTable: USERS_TABLE,
            rolesTable: ROLES_TABLE,
          },
        },
      });
    }

    return Response.json({ ok: true, ...data });
  } catch (err) {
    const payload = {
      ok: false,
      message: err.message || 'Airtable GET failed',
      airtableStatus: err.status || 500,
      airtableBody: err.body || null,
    };
    return Response.json(payload, { status: err.status || 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, name, orgRecId, roleRecIds } = body || {};

    if (!email) return Response.json({ ok: false, message: 'Missing email' }, { status: 400 });

    const fields = {
      [F_EMAIL]: email,
    };
    if (name) fields[F_NAME] = name;
    if (orgRecId && F_ORG_REC_ID) fields[F_ORG_REC_ID] = orgRecId;
    if (Array.isArray(roleRecIds) && roleRecIds.length) {
      fields[F_ROLES] = roleRecIds.map((id) => ({ id }));
    }

    const created = await atPost(USERS_TABLE, { records: [{ fields }] });
    return Response.json({ ok: true, created });
  } catch (err) {
    return Response.json(
      { ok: false, message: err.message || 'Airtable POST failed', airtableBody: err.body || null },
      { status: err.status || 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, email } = body || {};

    let recordId = id;

    // Allow delete-by-email for convenience
    if (!recordId && email) {
      const filter = `({${F_EMAIL}} = "${email.replace(/"/g, '\\"')}")`;
      const got = await atGet(USERS_TABLE, {
        filterByFormula: filter,
        pageSize: 1,
        'fields[]': [F_EMAIL],
      });
      recordId = got?.records?.[0]?.id;
    }

    if (!recordId) {
      return Response.json({ ok: false, message: 'Provide id or email' }, { status: 400 });
    }

    const deleted = await atDelete(`${USERS_TABLE}/${recordId}`);
    return Response.json({ ok: true, deleted });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        message: err.message || 'Airtable DELETE failed',
        airtableBody: err.body || null,
      },
      { status: err.status || 500 },
    );
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { action, recordId, roleId } = body || {};
    if (!recordId)
      return Response.json({ ok: false, message: 'Missing recordId' }, { status: 400 });

    if (action === 'toggleSuspend') {
      if (!F_SUSPENDED) {
        return Response.json(
          { ok: false, message: 'AIRTABLE_USERS_SUSPENDED_FIELD not set on server' },
          { status: 400 },
        );
      }
      // fetch current
      const r = await atGet(`${USERS_TABLE}/${recordId}`);
      const current = Boolean(r?.fields?.[F_SUSPENDED]);
      const updated = await atPatch(USERS_TABLE, {
        records: [{ id: recordId, fields: { [F_SUSPENDED]: !current } }],
        typecast: true,
      });
      return Response.json({ ok: true, updated, suspended: !current });
    }

    if (action === 'assignRole' || action === 'changeRole') {
      if (!roleId) return Response.json({ ok: false, message: 'Missing roleId' }, { status: 400 });
      const updated = await atPatch(USERS_TABLE, {
        records: [{ id: recordId, fields: { [F_ROLES]: [{ id: roleId }] } }],
        typecast: true,
      });
      return Response.json({ ok: true, updated });
    }

    return Response.json({ ok: false, message: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        message: err.message || 'Airtable PATCH failed',
        airtableBody: err.body || null,
      },
      { status: err.status || 500 },
    );
  }
}
