// Users Admin -> Airtable (instrumented)
export const dynamic = 'force-dynamic';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_USERS = process.env.AIRTABLE_TABLE_USERS || 'Users';

const AT_URL = (path = '') =>
  `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_USERS)}${path}`;

const AT_HEADERS = () => ({
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
});

// uniform error helper
async function relayAirtableError(res, label) {
  const txt = await res.text().catch(() => '');
  return Response.json(
    { ok: false, error: `${label}`, airtable: txt },
    { status: res.status || 500 },
  );
}

// quick normalization for UI
function normalize(records = []) {
  return {
    records: records.map((r) => ({
      id: r.id,
      Name: r.fields?.Name ?? '',
      Email: r.fields?.Email ?? '',
      Role: r.fields?.Role ?? '',
      Locale: r.fields?.Locale ?? '',
      Active: !!r.fields?.Active,
    })),
  };
}

async function findByEmail(email) {
  const formula = `LOWER({Email})='${String(email).trim().toLowerCase().replaceAll('\'', '\\\'')}'`;
  const url = AT_URL(`?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`);
  const res = await fetch(url, { headers: AT_HEADERS(), cache: 'no-store' });
  if (!res.ok) throw new Error(`findByEmail ${res.status}: ${await res.text().catch(() => '')}`);
  const j = await res.json();
  return j.records?.[0] || null;
}

export async function GET(req) {
  // hard env check so you see it immediately
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_USERS) {
    return Response.json(
      {
        ok: false,
        error: 'Missing env',
        details: {
          hasKey: !!AIRTABLE_API_KEY,
          hasBase: !!AIRTABLE_BASE_ID,
          table: AIRTABLE_TABLE_USERS,
        },
      },
      { status: 500 },
    );
  }
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200);

    // no sort/view — avoid 422 when fields/views differ
    const res = await fetch(AT_URL(`?pageSize=${limit}`), {
      headers: AT_HEADERS(),
      cache: 'no-store',
    });
    if (!res.ok) return relayAirtableError(res, 'Airtable list failed');

    const j = await res.json();
    return Response.json(normalize(j.records));
  } catch (e) {
    return Response.json({ ok: false, error: 'Unexpected', detail: String(e) }, { status: 500 });
  }
}

export async function POST(req) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_USERS) {
    return Response.json({ ok: false, error: 'Missing env' }, { status: 500 });
  }
  try {
    const body = await req.json();
    const email = String(body.email || '').trim();
    if (!email) return Response.json({ ok: false, error: 'Email required' }, { status: 400 });

    const role = body.role !== undefined ? String(body.role || '') : undefined;
    const activeFlag = typeof body.active === 'boolean' ? body.active : undefined;
    const orgId = String(body.orgId || '').trim();
    const orgType = body.orgType !== undefined ? String(body.orgType || '') : undefined;

    if (body.delete) {
      const existing = await findByEmail(email);
      if (!existing) return Response.json({ ok: true, deleted: false, reason: 'Not found' });
      const del = await fetch(AT_URL(`/${existing.id}`), {
        method: 'DELETE',
        headers: AT_HEADERS(),
      });
      if (!del.ok) return relayAirtableError(del, 'Delete failed');
      return Response.json({ ok: true, deleted: true });
    }

    const existing = await findByEmail(email);
    const fields = {
      ...(body.name !== undefined ? { Name: String(body.name || '') } : {}),
      ...(role !== undefined ? { Role: role } : {}),
      ...(body.locale !== undefined ? { Locale: String(body.locale || 'en') } : {}),
      ...(activeFlag !== undefined ? { Active: activeFlag } : {}),
      ...(orgId ? { Organization: [orgId] } : {}),
      ...(orgType !== undefined ? { OrgType: orgType } : {}),
      Email: email.toLowerCase(),
    };

    if (!existing) {
      const resC = await fetch(AT_URL(''), {
        method: 'POST',
        headers: AT_HEADERS(),
        body: JSON.stringify({ records: [{ fields }] }),
      });
      if (!resC.ok) return relayAirtableError(resC, 'Create failed');
      const j = await resC.json();
      return Response.json(normalize(j.records));
    }

    const resU = await fetch(AT_URL(''), {
      method: 'PATCH',
      headers: AT_HEADERS(),
      body: JSON.stringify({ records: [{ id: existing.id, fields }] }),
    });
    if (!resU.ok) return relayAirtableError(resU, 'Update failed');
    const j = await resU.json();
    return Response.json(normalize(j.records));
  } catch (e) {
    return Response.json({ ok: false, error: 'Unexpected', detail: String(e) }, { status: 500 });
  }
}
