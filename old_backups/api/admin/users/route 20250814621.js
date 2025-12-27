// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { airtableFetch, getAirtableEnv, validateAirtableEnv, readField } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 100);
  const debug = url.searchParams.get('debug') === '1';

  // 1) Env sanity check
  const envCheck = validateAirtableEnv();
  if (!envCheck.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'env_missing',
        problems: envCheck.problems,
        hint: 'Check .env.local values for AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_USERS_TABLE (default is "Users").',
        envPreview: envCheck.summary,
      },
      { status: 500 },
    );
  }

  const { table } = getAirtableEnv();

  // 2) Query Airtable
  const {
    status,
    json,
    url: atUrl,
  } = await airtableFetch({
    table,
    params: {
      maxRecords: Math.max(1, Math.min(limit, 1000)),
      pageSize: Math.max(1, Math.min(limit, 100)),
      // Avoid naming a specific view to prevent 404s if the view name differs
      // view: "Grid view",
    },
  });

  // 3) Map common failure modes to crystal-clear messages
  if (status !== 200) {
    const atError = json?.error?.message || json?.error || json;
    let reason = 'airtable_error';
    let hint =
      'See \'details\'. Confirm base id, table name, and API key belong to the base you\'re editing.';

    if (status === 401) {
      reason = 'unauthorized';
      hint = '401 from Airtable: API key invalid or not allowed for this base.';
    } else if (status === 403) {
      reason = 'forbidden';
      hint = '403 from Airtable: key lacks permission for this base/table.';
    } else if (status === 404) {
      reason = 'not_found';
      hint =
        '404 from Airtable: base id or table name mismatch. Verify AIRTABLE_BASE_ID and AIRTABLE_USERS_TABLE (default "Users").';
    } else if (status === 422) {
      reason = 'invalid_params';
      hint = '422 from Airtable: a query parameter (e.g., view) is invalid for this table.';
    } else if (status === 429) {
      reason = 'rate_limited';
      hint = '429 from Airtable: rate-limited; try again shortly.';
    }

    return NextResponse.json(
      {
        ok: false,
        reason,
        status,
        hint,
        details: atError,
        requestUrl: atUrl,
        envPreview: envCheck.summary,
      },
      { status: 500 },
    );
  }

  const records = Array.isArray(json?.records) ? json.records : [];

  // 4) Normalize for UI (do NOT drop the first row)
  const users = records.map((r) => {
    const f = r.fields || {};
    const name = readField(f, 'Name') ?? readField(f, 'Full Name') ?? readField(f, 'name') ?? '';
    const email = readField(f, 'Email') ?? readField(f, 'email') ?? '';
    const role = readField(f, 'Role') ?? readField(f, 'role') ?? readField(f, 'Roles') ?? '';

    const active = (f['Active'] ?? f['active'] ?? false) === true;
    const suspended = (f['Suspended'] ?? f['suspended'] ?? false) === true;
    const statusLabel = suspended ? 'Suspended' : active ? 'Active' : 'Inactive';

    const orgRecId =
      readField(f, 'Record ID (from Organization)') ?? readField(f, 'Organization') ?? '';

    return {
      id: r.id,
      name,
      email,
      role,
      status: statusLabel,
      organizationRecordId: orgRecId,
      _fields: f, // left for on-screen debugging
    };
  });

  // 5) Surface exactly which fields Airtable returned
  const fieldsSeen = Array.from(
    new Set(records.flatMap((r) => Object.keys(r.fields || {}))),
  ).sort();

  const payload = {
    ok: true,
    count: users.length,
    users,
  };

  if (debug) {
    payload.debug = {
      env: envCheck.summary,
      tableUsed: table,
      fieldsSeen,
      airtableUrl: atUrl,
      sample: records[0] || null,
    };
  }

  return NextResponse.json(payload, { status: 200 });
}
