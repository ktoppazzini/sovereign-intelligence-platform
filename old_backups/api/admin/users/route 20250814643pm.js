// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { airtableFetch, getAirtableEnv, validateAirtableEnv, readField } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

function ok(data, extra = {}) {
  return NextResponse.json({ ok: true, ...data, ...extra }, { status: 200 });
}
function fail(status, message, extra = {}) {
  return NextResponse.json({ ok: false, status, message, ...extra }, { status });
}

function usersUrl({ usersTable }, qs = '') {
  const table = encodeURIComponent(usersTable);
  return `${table}${qs ? `?${qs}` : ''}`;
}

function normalizeUserRecord(rec) {
  const f = rec.fields || {};
  // Try both common variants: Role single-select (string) or linked Role (array)
  let role = null;
  if (Array.isArray(f.Role)) {
    // linked records -> show first id or first name if present
    role = f.Role[0]?.name || f.Role[0]?.id || null;
  } else {
    role = f.Role ?? null;
  }

  return {
    id: rec.id,
    Name: f.Name || '',
    Email: f.Email || '',
    Role: role,
    Active: !!f.Active && !f.Suspended,
    Suspended: !!f.Suspended,
    Organization: Array.isArray(f.Organization) ? f.Organization.map((x) => x.id) : [],
    _raw: f,
  };
}

export async function GET(req) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 100);
  const debugOn = url.searchParams.get('debug') === '1';

  // 1) Validate env
  const env = getAirtableEnv();
  const envCheck = validateAirtableEnv(env);
  if (!envCheck.ok) {
    return fail(
      500,
      `Missing env: ${envCheck.missing.join(', ')}`,
      debugOn ? { debug: { step: 'validate_env', env: envCheck.envForDebug } } : undefined,
    );
  }

  // 2) Get users
  try {
    const records = await airtableFetch(
      usersUrl(
        env,
        new URLSearchParams({ pageSize: String(Math.min(Math.max(limit, 1), 100)) }).toString(),
      ),
      { method: 'GET' },
      env,
    );

    const out = (records.records || []).map(normalizeUserRecord);

    return ok(
      { records: out },
      debugOn ? { debug: { step: 'list_users', env: envCheck.envForDebug } } : undefined,
    );
  } catch (err) {
    const status = err.status || 500;

    // Give a helpful hint
    let hint =
      'Confirm API key, base id and table name. (Table defaults to \'Users\' if AIRTABLE_USERS_TABLE is unset.)';
    if (status === 401) hint = '401 from Airtable: API key invalid or not allowed for this base.';
    if (status === 403) hint = '403 from Airtable: key lacks permission for this base/table.';
    if (status === 404) hint = '404 from Airtable: base id or table name mismatch.';

    return fail(
      status,
      'Failed to fetch users from Airtable.',
      debugOn
        ? {
            debug: {
              step: 'list_users_error',
              env: envCheck.envForDebug,
              url: err.url,
              airtableStatus: status,
              airtableBody: err.body,
              hint,
            },
          }
        : undefined,
    );
  }
}

export async function POST(req) {
  const url = new URL(req.url);
  const debugOn = url.searchParams.get('debug') === '1';

  const env = getAirtableEnv();
  const envCheck = validateAirtableEnv(env);
  if (!envCheck.ok) {
    return fail(
      500,
      `Missing env: ${envCheck.missing.join(', ')}`,
      debugOn ? { debug: { step: 'validate_env', env: envCheck.envForDebug } } : undefined,
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {}
  if (!body || typeof body !== 'object') return fail(400, 'Invalid JSON body.');

  const email = (body.email || body.Email || '').trim().toLowerCase();
  const name = (body.name || body.Name || '').trim();
  const orgId = (body.orgId || body.Organization || '').trim();
  const roleInput = (body.role || body.Role || '').trim();
  const activeProvided = typeof body.active === 'boolean';
  const deleteFlag = !!body.delete;

  // helper: find a user by email
  async function findByEmail() {
    const formula = `LOWER({Email})='${email.replace(/'/g, '\\\'')}'`;
    const qs = new URLSearchParams({
      filterByFormula: formula,
      maxRecords: '1',
    }).toString();
    const found = await airtableFetch(usersUrl(env, qs), { method: 'GET' }, env);
    return found.records?.[0] || null;
  }

  // helper: build fields for Role and Organization (cover both select + linked-record cases)
  function roleFieldFromInput(v) {
    if (!v) return undefined;
    if (/^rec[a-zA-Z0-9]{14}$/.test(v)) return [{ id: v }]; // looks like a record id => linked record style
    return v; // single select string
  }
  function orgFieldFromInput(v) {
    if (!v) return undefined;
    if (/^rec[a-zA-Z0-9]{14}$/.test(v)) return [{ id: v }];
    return undefined; // ignore if it’s not a rec id
  }

  try {
    // DELETE
    if (deleteFlag) {
      if (!email) return fail(400, 'Email required to delete.');
      const rec = await findByEmail();
      if (!rec) return fail(404, `No user with email ${email}.`);
      await airtableFetch(
        `${encodeURIComponent(env.usersTable)}/${rec.id}`,
        { method: 'DELETE' },
        env,
      );
      return ok(
        { deleted: rec.id },
        debugOn ? { debug: { step: 'delete_user', email } } : undefined,
      );
    }

    // UPSERT (create or update)
    if (!email) return fail(400, 'Email required.');
    const existing = await findByEmail();

    // Build fields update
    const fields = {};
    if (name) fields.Name = name;
    if (roleInput) fields.Role = roleFieldFromInput(roleInput);
    if (activeProvided) {
      fields.Active = !!body.active;
      fields.Suspended = !body.active;
    }
    const orgField = orgFieldFromInput(orgId);
    if (orgField) fields.Organization = orgField;

    if (!existing) {
      // create
      if (!name) return fail(400, 'Name required to create a user.');
      const createFields = {
        Email: email,
        Name: name,
        Active: activeProvided ? !!body.active : true,
        Suspended: activeProvided ? !body.active : false,
      };
      Object.assign(createFields, fields);
      const created = await airtableFetch(
        encodeURIComponent(env.usersTable),
        {
          method: 'POST',
          body: JSON.stringify({ records: [{ fields: createFields }] }),
        },
        env,
      );

      return ok(
        { created: (created.records || [])[0]?.id || null },
        debugOn ? { debug: { step: 'create_user', fields: createFields } } : undefined,
      );
    } else {
      // update
      if (Object.keys(fields).length === 0) {
        return fail(400, 'Nothing to update. Provide name, role, active, or orgId.');
      }
      const updated = await airtableFetch(
        encodeURIComponent(env.usersTable),
        {
          method: 'PATCH',
          body: JSON.stringify({ records: [{ id: existing.id, fields }] }),
        },
        env,
      );

      return ok(
        { updated: (updated.records || [])[0]?.id || existing.id },
        debugOn
          ? {
              debug: {
                step: 'update_user',
                id: existing.id,
                set: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, readField(v)])),
              },
            }
          : undefined,
      );
    }
  } catch (err) {
    const status = err.status || 500;
    return fail(
      status,
      'Airtable operation failed.',
      debugOn
        ? {
            debug: {
              step: 'mutate_error',
              url: err.url,
              airtableStatus: status,
              airtableBody: err.body,
            },
          }
        : undefined,
    );
  }
}
