// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { airtableFetch, getAirtableEnv, validateAirtableEnv, readField } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

function debugBlock(extra) {
  const env = getAirtableEnv();
  return { env: { baseId: env.baseId, usersTable: env.usersTable, apiUrl: env.apiUrl }, ...extra };
}

function mapRecord(rec) {
  const f = rec.fields || rec; // accept either shape
  return {
    id: rec.id || f.id || '',
    Name: f.Name || f.name || '',
    Email: f.Email || f.email || '',
    Role: f.Role || f.role || '',
    Active: typeof f.Active === 'boolean' ? f.Active : !!f.Active,
    Suspended: !!f.Suspended,
    Locale: f.Locale || f.locale || '',
  };
}

// -------- GET /api/admin/users?limit=100&debug=1
export async function GET(req) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') || 100);
  const wantDebug = url.searchParams.get('debug') === '1';

  const val = validateAirtableEnv();
  if (!val.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        message: val.message,
        debug: wantDebug ? debugBlock({ hint: 'env invalid' }) : undefined,
      },
      { status: 500 },
    );
  }

  const { usersTable } = getAirtableEnv();
  const res = await airtableFetch({
    table: usersTable,
    method: 'GET',
    query: { pageSize: Math.min(limit || 100, 100) },
  });

  if (!res.ok) {
    const body = res.data || {};
    return NextResponse.json(
      {
        ok: false,
        status: res.status,
        message: 'Airtable GET failed',
        debug: wantDebug
          ? debugBlock({
              url: res.url,
              airtableStatus: res.status,
              airtableBody: body,
              hint: body?.error?.message || 'check base/table/key',
            })
          : undefined,
      },
      { status: res.status || 500 },
    );
  }

  const out = (res.data.records || []).map(mapRecord);
  return NextResponse.json({
    ok: true,
    records: out,
    debug: wantDebug ? debugBlock({ url: res.url, count: out.length }) : undefined,
  });
}

// Helpers
async function findUserByEmail(email) {
  const { usersTable } = getAirtableEnv();
  // case-insensitive compare
  const formula = `LOWER({Email})=LOWER("${email.replace(/"/g, '\\"')}")`;
  const res = await airtableFetch({
    table: usersTable,
    method: 'GET',
    query: { filterByFormula: formula, pageSize: 1 },
  });
  if (!res.ok) return { ok: false, res };
  const rec = res.data.records?.[0];
  return { ok: true, rec };
}

// -------- POST /api/admin/users (create/update/delete/suspend)
export async function POST(req) {
  const url = new URL(req.url);
  const wantDebug = url.searchParams.get('debug') === '1';

  const val = validateAirtableEnv();
  if (!val.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        message: val.message,
        debug: wantDebug ? debugBlock({ hint: 'env invalid' }) : undefined,
      },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  const role = (body.role || '').trim();
  const locale = (body.locale || 'en').trim();
  const active = typeof body.active === 'boolean' ? body.active : undefined;
  const doDelete = !!body.delete;

  if (!email) {
    return NextResponse.json(
      {
        ok: false,
        status: 400,
        message: 'email required',
        debug: wantDebug ? debugBlock({ body }) : undefined,
      },
      { status: 400 },
    );
  }

  const { usersTable } = getAirtableEnv();

  // Look up existing by email
  const found = await findUserByEmail(email);

  if (!found.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: found.res.status,
        message: 'Airtable lookup failed',
        debug: wantDebug
          ? debugBlock({
              url: found.res.url,
              airtableStatus: found.res.status,
              airtableBody: found.res.data,
            })
          : undefined,
      },
      { status: found.res.status || 500 },
    );
  }

  const rec = found.rec;

  // DELETE
  if (doDelete) {
    if (!rec) {
      return NextResponse.json(
        {
          ok: true,
          deleted: false,
          message: 'not found',
          debug: wantDebug ? debugBlock({ email }) : undefined,
        },
        { status: 200 },
      );
    }
    const resDel = await airtableFetch({
      table: usersTable,
      path: `${encodeURIComponent(usersTable)}/${rec.id}`,
      method: 'DELETE',
    });
    if (!resDel.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: resDel.status,
          message: 'Airtable DELETE failed',
          debug: wantDebug
            ? debugBlock({
                url: resDel.url,
                airtableStatus: resDel.status,
                airtableBody: resDel.data,
              })
            : undefined,
        },
        { status: resDel.status || 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      deleted: true,
      id: rec.id,
      debug: wantDebug ? debugBlock({ url: resDel.url }) : undefined,
    });
  }

  // Assemble fields for create/update
  const fields = {};
  if (name) fields['Name'] = name;
  if (role) fields['Role'] = role;
  if (locale) fields['Locale'] = locale;
  if (active !== undefined) fields['Active'] = !!active;
  fields['Email'] = email; // always keep

  if (!rec) {
    // CREATE
    const resCreate = await airtableFetch({
      table: usersTable,
      method: 'POST',
      body: { records: [{ fields }] },
    });
    if (!resCreate.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: resCreate.status,
          message: 'Airtable CREATE failed',
          debug: wantDebug
            ? debugBlock({
                url: resCreate.url,
                airtableStatus: resCreate.status,
                airtableBody: resCreate.data,
              })
            : undefined,
        },
        { status: resCreate.status || 500 },
      );
    }
    const newRec = resCreate.data.records?.[0] || {};
    return NextResponse.json({
      ok: true,
      created: mapRecord(newRec),
      debug: wantDebug ? debugBlock({ url: resCreate.url }) : undefined,
    });
  } else {
    // UPDATE
    const resUpdate = await airtableFetch({
      table: usersTable,
      method: 'PATCH',
      body: { records: [{ id: rec.id, fields }] },
    });
    if (!resUpdate.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: resUpdate.status,
          message: 'Airtable UPDATE failed',
          debug: wantDebug
            ? debugBlock({
                url: resUpdate.url,
                airtableStatus: resUpdate.status,
                airtableBody: resUpdate.data,
              })
            : undefined,
        },
        { status: resUpdate.status || 500 },
      );
    }
    const updated = resUpdate.data.records?.[0] || {};
    return NextResponse.json({
      ok: true,
      updated: mapRecord(updated),
      debug: wantDebug ? debugBlock({ url: resUpdate.url }) : undefined,
    });
  }
}
