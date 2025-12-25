/* app/api/admin/users/route.js */
export const dynamic = 'force-dynamic';

const API_URL = 'https://api.airtable.com/v0';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const USERS_TBL =
  process.env.AIRTABLE_USERS_TABLE_ID || process.env.AIRTABLE_USERS_TABLE || 'Users';
const ROLES_TBL = process.env.AIRTABLE_ROLES_TABLE_ID || 'Roles';

// ------------ helpers ------------
function hdrs() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function listAll(table, pageSize = 100, extra = {}) {
  const out = [];
  let offset;
  do {
    const url = new URL(`${API_URL}/${BASE_ID}/${table}`);
    url.searchParams.set('pageSize', String(pageSize));
    Object.entries(extra).forEach(([k, v]) => url.searchParams.set(k, v));
    if (offset) url.searchParams.set('offset', offset);

    const r = await fetch(url, { headers: hdrs(), cache: 'no-store' });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      const err = new Error(`Airtable GET failed ${table}`);
      err.status = r.status;
      err.body = body;
      throw err;
    }
    const j = await r.json();
    (j.records || []).forEach((rec) => out.push(rec));
    offset = j.offset;
  } while (offset);
  return out;
}

function pickRoleString(fields) {
  // Try a few common field names and lookup/single-selects
  const candidates = [
    fields.Role,
    fields.Roles,
    fields['Role Name'],
    fields['Role (from Roles)'],
    fields['Roles (from Roles)'],
  ];
  for (const v of candidates) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'string') return v[0];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function isSuspended(fields) {
  return !!(fields.Suspended || fields['Is Suspended'] || fields.suspended);
}

async function findUserByEmail(email) {
  const url = new URL(`${API_URL}/${BASE_ID}/${USERS_TBL}`);
  url.searchParams.set('filterByFormula', `LOWER({Email})='${String(email).toLowerCase()}'`);
  url.searchParams.set('pageSize', '1');
  const r = await fetch(url, { headers: hdrs(), cache: 'no-store' });
  if (!r.ok) return null;
  const j = await r.json();
  return (j.records || [])[0] || null;
}

// ------------ GET ------------
export async function GET(req) {
  try {
    if (!API_KEY || !BASE_ID || !USERS_TBL) {
      return Response.json(
        {
          ok: false,
          status: 500,
          message: 'Missing Airtable env',
          debug: { API_KEY: !!API_KEY, BASE_ID: !!BASE_ID, USERS_TBL },
        },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || 100);

    // Users (one page is usually enough)
    const usersExtra = isFinite(limit)
      ? { pageSize: String(Math.min(Math.max(limit, 1), 100)) }
      : {};
    const users = await listAll(USERS_TBL, usersExtra.pageSize || 100);

    const records = users.map((r) => {
      const f = r.fields || {};
      return {
        id: r.id,
        Name: f.Name || '',
        Email: f.Email || '',
        Role: pickRoleString(f),
        Active: !isSuspended(f),
        Suspended: isSuspended(f),
      };
    });

    // Roles (full table with pagination)
    let roleSet = new Set();
    try {
      const roles = await listAll(ROLES_TBL, 100);
      roles.forEach((r) => {
        const f = r.fields || {};
        // Collect possible sources of the role label
        [f.Roles, f.Name, f['Role Name']].forEach((v) => {
          if (!v) return;
          if (Array.isArray(v)) v.forEach((x) => typeof x === 'string' && roleSet.add(x.trim()));
          if (typeof v === 'string') roleSet.add(v.trim());
        });
      });
    } catch (e) {
      // If a Roles table doesn't exist, we just return no roles; page still works
      roleSet = new Set();
    }
    const allRoles = Array.from(roleSet)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return Response.json({
      ok: true,
      records,
      roles: allRoles,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        status: err.status || 500,
        message: err.message || 'Airtable GET failed',
        debug: err.body || null,
      },
      { status: err.status || 500 },
    );
  }
}

// ------------ POST ------------
export async function POST(req) {
  try {
    const body = await req.json();
    const email = (body.email || '').toLowerCase();
    if (!email)
      return Response.json({ ok: false, status: 400, message: 'Missing email' }, { status: 400 });

    // delete
    if (body.delete) {
      const rec = await findUserByEmail(email);
      if (!rec) return Response.json({ ok: true, deleted: false }); // idempotent
      const url = `${API_URL}/${BASE_ID}/${USERS_TBL}/${rec.id}`;
      const r = await fetch(url, { method: 'DELETE', headers: hdrs() });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        return Response.json(
          { ok: false, status: r.status, message: 'Delete failed', debug: j },
          { status: r.status },
        );
      }
      return Response.json({ ok: true, deleted: true });
    }

    // create if not exists, else patch
    let rec = await findUserByEmail(email);
    const fields = {};
    if (body.name) fields.Name = body.name;
    if (typeof body.active === 'boolean') {
      // we store suspension as a boolean; Active is derived
      fields.Suspended = !body.active;
    }
    if (body.role && String(body.role).trim()) {
      // works for single-select/text role fields
      fields.Role = String(body.role).trim();
      // also try alternate field name
      fields.Roles = String(body.role).trim();
    }
    if (body.orgId && String(body.orgId).trim()) {
      // optional org id if your base has it
      fields.Organization = String(body.orgId).trim();
      fields['Organization Record ID'] = String(body.orgId).trim();
    }

    if (!rec) {
      fields.Email = email;
      // Create
      const r = await fetch(`${API_URL}/${BASE_ID}/${USERS_TBL}`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ records: [{ fields }] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        return Response.json(
          { ok: false, status: r.status, message: 'Create failed', debug: j },
          { status: r.status },
        );
      return Response.json({ ok: true, created: true, id: j.records?.[0]?.id || null });
    } else {
      // Update
      const r = await fetch(`${API_URL}/${BASE_ID}/${USERS_TBL}`, {
        method: 'PATCH',
        headers: hdrs(),
        body: JSON.stringify({ records: [{ id: rec.id, fields }] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        return Response.json(
          { ok: false, status: r.status, message: 'Update failed', debug: j },
          { status: r.status },
        );
      return Response.json({ ok: true, updated: true, id: rec.id });
    }
  } catch (err) {
    return Response.json(
      { ok: false, status: 500, message: err.message || 'Operation failed' },
      { status: 500 },
    );
  }
}
