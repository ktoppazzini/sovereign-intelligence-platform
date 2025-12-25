export const dynamic = 'force-dynamic';

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_LOGIN = process.env.AIRTABLE_TABLE_LOGIN || 'login';

const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

function j(status, body) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function airtable(method, path, body) {
  const res = await fetch(`${AIRTABLE_BASE_URL}/${encodeURIComponent(path)}`, {
    method,
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    redirect: 'manual', // block any upstream redirects
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw Object.assign(new Error('Airtable request failed'), {
      status: res.status,
      data: json,
    });
  }
  return json;
}

async function findUserByEmail(email) {
  const safe = email.toLowerCase().replace(/'/g, '\\\'');
  const formula = `LOWER({Email})='${safe}'`;
  const url = `${TABLE_LOGIN}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const data = await airtable('GET', url);
  return (data.records && data.records[0]) || null;
}

function getField(record, candidates = []) {
  const fields = record?.fields || {};
  for (const name of candidates) {
    if (fields[name] != null && fields[name] !== '') return fields[name];
  }
  return undefined;
}

function getExpiryMs(record) {
  const raw = getField(record, ['MFA Expiry', 'mfa_expiry', 'Expiry', 'MFA_Expiry']);
  if (!raw) return undefined;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : undefined;
}

async function clearMfa(recordId) {
  const fields = { 'MFA Temp': '', 'MFA Code': '', mfa_code: '', Verified: true };
  return airtable('PATCH', `${TABLE_LOGIN}/${recordId}`, { fields });
}

async function logError(fields) {
  try {
    await airtable('POST', 'errors', {
      records: [{ fields: { ...fields, Timestamp: new Date().toISOString() } }],
      typecast: true,
    });
  } catch {
    // ignore logging errors
  }
}

// ✅ Export a reusable handler so other routes can re-export without duplicating logic
export async function handleVerifyPost(req) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return j(400, { ok: false, message: 'Email and code are required.' });

    const record = await findUserByEmail(email);
    if (!record) {
      await logError({ Scope: 'verify2FA', Email: email, Detail: 'No matching record' });
      return j(404, { ok: false, message: 'No account found for that email.' });
    }

    const storedCodeRaw = getField(record, ['MFA Code', 'mfa_code', 'MFA', 'Code']);
    const storedCode = String(storedCodeRaw ?? '').trim();
    const submitted = String(code).trim();

    if (!storedCode) {
      await logError({ Scope: 'verify2FA', Email: email, Detail: 'No code on file' });
      return j(400, {
        ok: false,
        message: 'No verification code on file. Please request a new code.',
      });
    }

    const expiryMs = getExpiryMs(record);
    const now = Date.now();
    const windowMs = 20 * 60 * 1000; // 20min

    if (expiryMs && now > expiryMs) {
      await logError({ Scope: 'verify2FA', Email: email, Detail: 'Code expired' });
      return j(400, { ok: false, message: 'That code has expired. Please request a new one.' });
    }

    if (!expiryMs) {
      const lastUpdated = Date.parse(record?.createdTime || 0);
      if (Number.isFinite(lastUpdated) && now - lastUpdated > windowMs) {
        await logError({
          Scope: 'verify2FA',
          Email: email,
          Detail: 'Implicit-expiry window exceeded',
        });
        return j(400, { ok: false, message: 'That code has expired. Please request a new one.' });
      }
    }

    if (submitted !== storedCode) {
      await logError({ Scope: 'verify2FA', Email: email, Detail: 'Code mismatch' });
      return j(400, { ok: false, message: 'Incorrect verification code.' });
    }

    await clearMfa(record.id);
    return j(200, { ok: true, message: 'Verification successful.' });
  } catch (err) {
    await logError({
      Scope: 'verify2FA',
      Detail: (err && err.message) || 'Unknown error',
      Status: err && err.status ? String(err.status) : '',
    });
    if (err && err.status) {
      return j(500, { ok: false, message: 'Verification failed due to a data service error.' });
    }
    return j(500, { ok: false, message: 'Unexpected error occurred during verification.' });
  }
}

// Default export used by this route
export async function POST(req) {
  return handleVerifyPost(req);
}

// Lock down other methods
export async function GET() {
  return j(405, { ok: false, message: 'Method Not Allowed' });
}
export async function PUT() {
  return j(405, { ok: false, message: 'Method Not Allowed' });
}
export async function DELETE() {
  return j(405, { ok: false, message: 'Method Not Allowed' });
}
export async function OPTIONS() {
  return j(204, {});
}
