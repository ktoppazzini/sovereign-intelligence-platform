// app/api/admin/users/route.js

// =====================
// Version / diagnostics
// =====================
const API_VERSION = 'admin-users-api@1.0.0';
const API_BUILD_DATE = '2025-08-15';

// =====================
// Env & field config
// =====================
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

// Users table (ID or name)
const USERS_TABLE =
  process.env.AIRTABLE_USERS_TABLE_ID || process.env.AIRTABLE_USERS_TABLE || 'Users';

// Roles table (ID or name)
const ROLES_TABLE =
  process.env.AIRTABLE_ROLES_TABLE_ID || process.env.AIRTABLE_ROLES_TABLE || 'Roles';

// Users fields
const F_EMAIL = process.env.AIRTABLE_USERS_EMAIL_FIELD || 'Email';
const F_NAME = process.env.AIRTABLE_USERS_NAME_FIELD || 'Name';
const F_ROLE = process.env.AIRTABLE_USERS_ROLE_FIELD || 'Roles'; // linked-record OR select field
const F_SUSP = process.env.AIRTABLE_USERS_SUSPENDED_FIELD || 'Suspended';

// Roles fields
const F_ROLE_NAME = process.env.AIRTABLE_ROLES_NAME_FIELD || 'Name';

// Optional: roles as single/multi-select field (when you don't use linked records)
const F_ROLE_SELECT = process.env.AIRTABLE_ROLES_SELECT_FIELD || 'Roles';

// =====================
// Helpers
// =====================
const API = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

function authHeaders() {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function mkDebugBase() {
  return {
    version: API_VERSION,
    buildDate: API_BUILD_DATE,
    env: {
      baseId: AIRTABLE_BASE_ID,
      hasKey: Boolean(AIRTABLE_API_KEY),
      usersTable: USERS_TABLE,
      rolesTable: ROLES_TABLE,
      usersFields: { F_EMAIL, F_NAME, F_ROLE, F_SUSP },
      rolesFields: { F_ROLE_NAME, F_ROLE_SELECT },
    },
  };
}

// Fetch all pages from a table
async function fetchAllRecords(table, query = '') {
  const out = [];
  let url = `${API}/${encodeURIComponent(table)}${query ? `?${query}` : ''}`;
  while (url) {
    const r = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      const error = { status: r.status, body: txt };
      throw Object.assign(new Error(`Airtable GET ${table} ${r.status}`), {
        airtableError: error,
      });
    }
    const j = await r.json();
    out.push(...(j.records || []));
    url = j.offset ? `${API}/${encodeURIComponent(table)}?offset=${j.offset}` : '';
  }
  return out;
}

// Mode A: Roles = records in Roles table (id -> name)
function buildRoleLookupFromRecords(records) {
  const byId = new Map();
  const options = [];
  for (const rec of records) {
    const name = rec.fields?.[F_ROLE_NAME];
    if (name) {
      byId.set(rec.id, name);
      options.push({ id: rec.id, name });
    }
  }
  return { byId, options, mode: 'linkedRecords' };
}

// Mode B: Roles = single/multi-select values in a field (flattened)
function buildRoleOptionsFromSelect(records) {
  const set = new Set();
  for (const rec of records) {
    const val = rec.fields?.[F_ROLE_SELECT];
    if (Array.isArray(val)) val.forEach((s) => s && set.add(String(s)));
    else if (typeof val === 'string' && val.trim()) set.add(val.trim());
  }
  // synthesize ids like name::<roleName>
  const options = Array.from(set).map((name) => ({
    id: `name::${name}`,
    name,
  }));
  return { options, mode: 'selectField' };
}

async function getRoleMeta() {
  // Try linked-record mode first
  const roleRecords = await fetchAllRecords(ROLES_TABLE, 'pageSize=100').catch(() => []);
  const linked = buildRoleLookupFromRecords(roleRecords);

  // Also build select-field fallback if useful
  const selectFallback = buildRoleOptionsFromSelect(roleRecords);

  // Prefer linked-records if we have at least one valid name
  if (linked.options.length > 0) {
    return {
      options: linked.options,
      byId: (id) => linked.byId.get(id) || '',
      mode: 'linkedRecords',
      rawCount: roleRecords.length,
      selectFallbackCount: selectFallback.options.length,
    };
  }

  // If no linked names, try the select-field mode
  if (selectFallback.options.length > 0) {
    return {
      options: selectFallback.options,
      byId: (id) => '', // not used in this mode
      mode: 'selectField',
      rawCount: roleRecords.length,
      selectFallbackCount: selectFallback.options.length,
    };
  }

  // Nothing found
  return {
    options: [],
    byId: () => '',
    mode: 'none',
    rawCount: roleRecords.length,
    selectFallbackCount: selectFallback.options.length,
  };
}

async function findUserByEmail(email) {
  // Case-insensitive match
  const formula = `LOWER({${F_EMAIL}})=LOWER('${email.replace(/'/g, '\\\'')}')`;
  const url = `${API}/${encodeURIComponent(
    USERS_TABLE,
  )}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const r = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw Object.assign(new Error(`Find user ${r.status}`), {
      airtableError: { status: r.status, body: txt },
    });
  }
  const j = await r.json();
  return (j.records || [])[0];
}

// =====================
// GET
// =====================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const wantDebug = searchParams.get('debug') === '1';
  const dbg = mkDebugBase();

  try {
    const rolesMeta = await getRoleMeta().catch((err) => {
      dbg.rolesMetaError = err?.airtableError || String(err);
      return { options: [], byId: () => '', mode: 'none' };
    });
    dbg.rolesMeta = {
      mode: rolesMeta.mode,
      optionsCount: rolesMeta.options.length,
      rawCount: rolesMeta.rawCount,
      selectFallbackCount: rolesMeta.selectFallbackCount,
    };

    const usersRecords = await fetchAllRecords(USERS_TABLE, 'pageSize=100');
    dbg.usersCount = usersRecords.length;

    const transformed = usersRecords.map((rec) => {
      const f = rec.fields || {};
      const rawRoleVal = f[F_ROLE];
      let roleNames = [];

      // Users role field may be:
      // 1) linked record IDs: ["rec...", ...]
      // 2) select values: ["Super Admin"] or "Super Admin"
      if (Array.isArray(rawRoleVal)) {
        // either array of recIDs or array of strings
        const isRecIds = rawRoleVal.some((v) => typeof v === 'string' && v.startsWith('rec'));
        if (isRecIds && rolesMeta.mode === 'linkedRecords') {
          roleNames = rawRoleVal.map((id) => rolesMeta.byId(id)).filter(Boolean);
        } else {
          roleNames = rawRoleVal.map(String);
        }
      } else if (typeof rawRoleVal === 'string') {
        roleNames = [rawRoleVal];
      }

      const active = !f[F_SUSP];

      return {
        id: rec.id,
        Name: f[F_NAME] || '',
        Email: f[F_EMAIL] || '',
        RoleNames: roleNames,
        RawRole: rawRoleVal ?? null,
        Active: active,
      };
    });

    return Response.json({
      ok: true,
      apiVersion: API_VERSION,
      buildDate: API_BUILD_DATE,
      roles: rolesMeta.options, // [{id,name}]
      records: transformed,
      debug: wantDebug ? dbg : undefined,
    });
  } catch (err) {
    dbg.catch = err?.airtableError || String(err);
    return Response.json(
      {
        ok: false,
        status: 500,
        message: err.message || 'Server error',
        debug: wantDebug ? dbg : undefined,
      },
      { status: 500 },
    );
  }
}

// =====================
// POST
// =====================
export async function POST(req) {
  const dbg = mkDebugBase();
  try {
    const body = await req.json();
    dbg.request = body;

    // Delete
    if (body?.delete && body?.email) {
      const found = await findUserByEmail(body.email);
      if (!found) return Response.json({ ok: true, deleted: 0, debug: dbg });
      const del = await fetch(`${API}/${encodeURIComponent(USERS_TABLE)}/${found.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!del.ok) {
        const txt = await del.text().catch(() => '');
        dbg.airtable = { status: del.status, body: txt };
        return Response.json({ ok: false, status: del.status, debug: dbg }, { status: del.status });
      }
      return Response.json({ ok: true, deleted: 1, debug: dbg });
    }

    // Suspend / activate
    if (typeof body?.active === 'boolean' && body?.email) {
      const found = await findUserByEmail(body.email);
      if (!found)
        return Response.json(
          { ok: false, status: 404, message: 'User not found', debug: dbg },
          { status: 404 },
        );

      const patch = await fetch(`${API}/${encodeURIComponent(USERS_TABLE)}/${found.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ fields: { [F_SUSP]: body.active ? false : true } }),
      });
      if (!patch.ok) {
        const txt = await patch.text().catch(() => '');
        dbg.airtable = { status: patch.status, body: txt };
        return Response.json(
          { ok: false, status: patch.status, debug: dbg },
          { status: patch.status },
        );
      }
      return Response.json({ ok: true, debug: dbg });
    }

    // Update role via dropdown
    // Accepts either:
    // - roleId like "recXXXXXXXX"  (linked record)
    // - roleId like "name::Super Admin" (select field)
    if (body?.email && body?.roleId) {
      const found = await findUserByEmail(body.email);
      if (!found)
        return Response.json(
          { ok: false, status: 404, message: 'User not found', debug: dbg },
          { status: 404 },
        );

      let fields;
      if (String(body.roleId).startsWith('rec')) {
        // linked record
        fields = { [F_ROLE]: [body.roleId] };
      } else if (String(body.roleId).startsWith('name::')) {
        // select field string
        const roleName = String(body.roleId).slice('name::'.length);
        fields = { [F_ROLE]: [roleName] };
      } else {
        // fallback: treat as plain name
        fields = { [F_ROLE]: [String(body.roleId)] };
      }

      dbg.updateFields = fields;

      const patch = await fetch(`${API}/${encodeURIComponent(USERS_TABLE)}/${found.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ fields }),
      });
      if (!patch.ok) {
        const txt = await patch.text().catch(() => '');
        dbg.airtable = { status: patch.status, body: txt };
        return Response.json(
          { ok: false, status: patch.status, debug: dbg },
          { status: patch.status },
        );
      }
      return Response.json({ ok: true, debug: dbg });
    }

    // Create user
    if (body?.email && body?.name) {
      const fields = {
        [F_EMAIL]: body.email,
        [F_NAME]: body.name,
      };
      if (typeof body.active === 'boolean') fields[F_SUSP] = body.active ? false : true;

      if (body.roleId) {
        if (String(body.roleId).startsWith('rec')) {
          fields[F_ROLE] = [body.roleId];
        } else if (String(body.roleId).startsWith('name::')) {
          const roleName = String(body.roleId).slice('name::'.length);
          fields[F_ROLE] = [roleName];
        } else {
          fields[F_ROLE] = [String(body.roleId)];
        }
      }

      dbg.createFields = fields;

      const cr = await fetch(`${API}/${encodeURIComponent(USERS_TABLE)}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ fields }),
      });
      if (!cr.ok) {
        const txt = await cr.text().catch(() => '');
        dbg.airtable = { status: cr.status, body: txt };
        return Response.json({ ok: false, status: cr.status, debug: dbg }, { status: cr.status });
      }
      return Response.json({ ok: true, created: 1, debug: dbg });
    }

    return Response.json(
      { ok: false, status: 400, message: 'Invalid request', debug: dbg },
      { status: 400 },
    );
  } catch (err) {
    dbg.catch = err?.airtableError || String(err);
    return Response.json(
      { ok: false, status: 500, message: err.message || 'Server error', debug: dbg },
      { status: 500 },
    );
  }
}
