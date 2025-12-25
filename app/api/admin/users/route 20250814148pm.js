// Next.js App Router API for Users Admin -> Airtable
// Users table fields expected in Airtable:
// Name (text), Email (email), Role (text), Locale (text), Active (checkbox),
// Organization (link to Organizations table) [optional],
// OrgType (single select or text) [optional]

export const dynamic = 'force-dynamic';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_USERS = process.env.AIRTABLE_TABLE_USERS || 'Users';

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.warn('[users API] Missing Airtable env vars AIRTABLE_API_KEY/AIRTABLE_BASE_ID');
}

const AT_URL = (path) =>
  `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_USERS)}${path || ''}`;
const AT_HEADERS = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

// Normalize to the shape your page maps: {records: [{id, Name, Email, Role, Locale, Active}]}
function normalizeRecords(atRecords = []) {
  return {
    records: atRecords.map((r) => ({
      id: r.id,
      Name: r.fields?.Name ?? '',
      Email: r.fields?.Email ?? '',
      Role: r.fields?.Role ?? '',
      Locale: r.fields?.Locale ?? '',
      Active: !!r.fields?.Active,
      // Optional extras if you ever want to use them on UI later:
      Organization: r.fields?.Organization ?? undefined, // array of linked rec IDs or names (if lookup)
      OrgType: r.fields?.OrgType ?? undefined,
    })),
  };
}

async function findByEmail(email) {
  const formula = `LOWER({Email})='${String(email).trim().toLowerCase().replaceAll('\'', '\\\'')}'`;
  const url = AT_URL(`?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`);
  const res = await fetch(url, { headers: AT_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`Airtable findByEmail ${res.status}`);
  const json = await res.json();
  return json.records?.[0] || null;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const max = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200);
    const res = await fetch(AT_URL(`?pageSize=${max}&sort[0][field]=Name&sort[0][direction]=asc`), {
      headers: AT_HEADERS,
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ error: 'Airtable list failed' }, { status: 500 });
    const data = await res.json();
    return Response.json(normalizeRecords(data.records));
  } catch (e) {
    console.error('[users GET] Error:', e);
    return Response.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim();
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

    const role = body.role !== undefined ? String(body.role || '') : undefined;
    const activeFlag = typeof body.active === 'boolean' ? body.active : undefined;

    // Organization link expects an Airtable record id (e.g., recXXXX)
    const orgId = String(body.orgId || '').trim();
    const hasOrg = !!orgId;

    // OrgType can be single select or text; send as-is
    const orgType = body.orgType !== undefined ? String(body.orgType || '') : undefined;

    if (body.delete) {
      const existing = await findByEmail(email);
      if (!existing) return Response.json({ ok: true, deleted: false, reason: 'Not found' });
      const del = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_USERS)}/${existing.id}`,
        {
          method: 'DELETE',
          headers: AT_HEADERS,
        },
      );
      if (!del.ok) return Response.json({ error: 'Delete failed' }, { status: 500 });
      return Response.json({ ok: true, deleted: true });
    }

    const existing = await findByEmail(email);

    // Build fields object for create/update
    const fields = {
      ...(body.name !== undefined ? { Name: String(body.name || '') } : {}),
      ...(role !== undefined ? { Role: role } : {}),
      ...(body.locale !== undefined ? { Locale: String(body.locale || 'en') } : {}),
      ...(activeFlag !== undefined ? { Active: activeFlag } : {}),
      ...(hasOrg ? { Organization: [orgId] } : {}), // link field
      ...(orgType !== undefined ? { OrgType: orgType } : {}),
      Email: email.toLowerCase(), // keep normalized
    };

    if (!existing) {
      // Create
      const createPayload = { records: [{ fields }] };
      const resCreate = await fetch(AT_URL(''), {
        method: 'POST',
        headers: AT_HEADERS,
        body: JSON.stringify(createPayload),
      });
      if (!resCreate.ok) return Response.json({ error: 'Create failed' }, { status: 500 });
      const j = await resCreate.json();
      return Response.json(normalizeRecords(j.records));
    }

    // Update
    const resUpd = await fetch(AT_URL(''), {
      method: 'PATCH',
      headers: AT_HEADERS,
      body: JSON.stringify({ records: [{ id: existing.id, fields }] }),
    });
    if (!resUpd.ok) return Response.json({ error: 'Update failed' }, { status: 500 });
    const j = await resUpd.json();
    return Response.json(normalizeRecords(j.records));
  } catch (e) {
    console.error('[users POST] Error:', e);
    return Response.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
