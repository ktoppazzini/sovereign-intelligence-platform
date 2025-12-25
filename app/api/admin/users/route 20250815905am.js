/* app/api/admin/users/route.js */
import { NextResponse } from 'next/server';

const AIRTABLE_API = 'https://api.airtable.com/v0';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const USERS_TABLE_ID = process.env.AIRTABLE_USERS_TABLE_ID || 'Users';
const ROLES_TABLE_ID = process.env.AIRTABLE_ROLES_TABLE_ID || 'Roles';

const F_NAME = process.env.AIRTABLE_USERS_NAME_FIELD || 'Name';
const F_EMAIL = process.env.AIRTABLE_USERS_EMAIL_FIELD || 'Email';
const F_ROLE = process.env.AIRTABLE_USERS_ROLE_FIELD || 'Role'; // set to "Roles" in .env if yours is plural
const F_SUSP = process.env.AIRTABLE_USERS_SUSPENDED_FIELD || 'Suspended';
const F_ORG = process.env.AIRTABLE_USERS_ORG_LINK_FIELD || 'Organization';

function JErr(message, status = 500, extra = {}) {
  return NextResponse.json({ ok: false, status, message, ...extra }, { status });
}
function JOk(payload = {}) {
  return NextResponse.json({ ok: true, ...payload });
}
const hdrs = () => ({ Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' });

async function ag(path) {
  const r = await fetch(`${AIRTABLE_API}/${BASE_ID}/${path}`, {
    headers: hdrs(),
    cache: 'no-store',
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
async function ap(path, body) {
  const r = await fetch(`${AIRTABLE_API}/${BASE_ID}/${path}`, {
    method: 'POST',
    headers: hdrs(),
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
async function ah(path, body) {
  const r = await fetch(`${AIRTABLE_API}/${BASE_ID}/${path}`, {
    method: 'PATCH',
    headers: hdrs(),
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
async function ad(path) {
  const r = await fetch(`${AIRTABLE_API}/${BASE_ID}/${path}`, {
    method: 'DELETE',
    headers: hdrs(),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

async function loadAllRoles() {
  const roles = [];
  let offset;
  do {
    const q = new URLSearchParams();
    if (offset) q.set('offset', offset);
    q.append('fields[]', 'Name');
    const { status, json } = await ag(`${encodeURIComponent(ROLES_TABLE_ID)}?${q.toString()}`);
    if (status >= 400) throw new Error(json?.error?.message || `Roles GET ${status}`);
    for (const rec of json.records || []) roles.push({ id: rec.id, name: rec.fields?.Name || '' });
    offset = json.offset;
  } while (offset);
  const byId = new Map(roles.map((r) => [r.id, r.name]));
  return { roles, byId };
}

export async function GET(req) {
  try {
    if (!API_KEY || !BASE_ID || !USERS_TABLE_ID) {
      return JErr(
        'Missing Airtable env: AIRTABLE_API_KEY / AIRTABLE_BASE_ID / AIRTABLE_USERS_TABLE_ID',
        500,
      );
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000));
    const wantRoles = searchParams.get('roles') === '1';
    const wantDebug = searchParams.get('debug') === '1';

    if (wantRoles) {
      const { roles } = await loadAllRoles();
      return JOk({ roles });
    }

    const q = new URLSearchParams();
    q.set('pageSize', String(Math.min(limit, 100)));
    const { status, json } = await ag(`${encodeURIComponent(USERS_TABLE_ID)}?${q.toString()}`);
    if (status >= 400) {
      return JErr('Airtable GET failed', status, {
        debug: {
          url: `${AIRTABLE_API}/${BASE_ID}/${USERS_TABLE_ID}?${q.toString()}`,
          airtableBody: json,
        },
      });
    }

    const { byId: roleNameById } = await loadAllRoles();

    const records = (json.records || []).map((rec) => {
      const f = rec.fields || {};
      const roleIds = Array.isArray(f[F_ROLE])
        ? f[F_ROLE]
        : Array.isArray(f['Roles'])
          ? f['Roles']
          : [];
      const roleId = roleIds?.[0] || '';
      const roleName = roleId ? roleNameById.get(roleId) || roleId : '';
      return {
        id: rec.id,
        Name: f[F_NAME] || '',
        Email: f[F_EMAIL] || '',
        RoleId: roleId,
        RoleName: roleName,
        Suspended: !!f[F_SUSP],
        Active: !f[F_SUSP],
      };
    });

    return JOk({
      records,
      ...(wantDebug
        ? {
            debug: {
              env: { baseId: BASE_ID, usersTable: USERS_TABLE_ID, rolesTable: ROLES_TABLE_ID },
            },
          }
        : {}),
    });
  } catch (e) {
    return JErr(e.message || 'GET failed', 500);
  }
}

export async function POST(req) {
  try {
    if (!API_KEY || !BASE_ID || !USERS_TABLE_ID) {
      return JErr(
        'Missing Airtable env: AIRTABLE_API_KEY / AIRTABLE_BASE_ID / AIRTABLE_USERS_TABLE_ID',
        500,
      );
    }
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();
    if (!email) return JErr('Missing email', 400);

    async function findUserByEmail() {
      const q = new URLSearchParams();
      q.set('filterByFormula', `LOWER({${F_EMAIL}})="${email}"`);
      const { status, json } = await ag(`${encodeURIComponent(USERS_TABLE_ID)}?${q.toString()}`);
      if (status >= 400) throw new Error(json?.error?.message || `Lookup failed ${status}`);
      return (json.records || [])[0];
    }

    if (body.add) {
      const name = (body.name || '').trim();
      if (!name) return JErr('Missing name', 400);
      const fields = { [F_EMAIL]: email, [F_NAME]: name };
      if (body.orgId) fields[F_ORG] = [body.orgId];
      if (body.roleId) fields[F_ROLE] = [body.roleId];
      const { status, json } = await ap(encodeURIComponent(USERS_TABLE_ID), { fields });
      if (status >= 400)
        return JErr(json?.error?.message || 'Create failed', status, { debug: json });
      return JOk({ id: json.id });
    }

    if (body.delete) {
      const rec = await findUserByEmail();
      if (!rec) return JErr('Not found', 404);
      const { status, json } = await ad(`${encodeURIComponent(USERS_TABLE_ID)}/${rec.id}`);
      if (status >= 400)
        return JErr(json?.error?.message || 'Delete failed', status, { debug: json });
      return JOk({ id: rec.id });
    }

    if (typeof body.active === 'boolean') {
      const rec = await findUserByEmail();
      if (!rec) return JErr('Not found', 404);
      const fields = { [F_SUSP]: !body.active };
      const { status, json } = await ah(`${encodeURIComponent(USERS_TABLE_ID)}/${rec.id}`, {
        fields,
      });
      if (status >= 400)
        return JErr(json?.error?.message || 'Update failed', status, { debug: json });
      return JOk({ id: rec.id, active: body.active });
    }

    if (body.roleId) {
      const rec = await findUserByEmail();
      if (!rec) return JErr('Not found', 404);
      const fields = { [F_ROLE]: [body.roleId] };
      const { status, json } = await ah(`${encodeURIComponent(USERS_TABLE_ID)}/${rec.id}`, {
        fields,
      });
      if (status >= 400)
        return JErr(json?.error?.message || 'Role update failed', status, { debug: json });
      return JOk({ id: rec.id, roleId: body.roleId });
    }

    return JErr('No supported operation found in body', 400);
  } catch (e) {
    return JErr(e.message || 'POST failed', 500);
  }
}
