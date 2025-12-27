// app/api/performPasswordReset/route.js
import { NextResponse } from 'next/server';

async function findUserRecordIdByEmail({ baseId, tableName, apiKey, email }) {
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
  // NOTE: field name "Email" — change if your column differs
  url.searchParams.set(
    'filterByFormula',
    `LOWER({Email})='${String(email).toLowerCase().replace(/'/g, '\\\'')}'`,
  );
  url.searchParams.set('pageSize', '1');

  const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!r.ok) throw new Error(`Airtable query failed ${r.status}`);
  const data = await r.json();
  return data?.records?.[0]?.id || null;
}

export async function POST(request) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { ok: false, message: 'Missing email or password.' },
        { status: 400 },
      );
    }

    // TODO: verify token if you decide to persist tokens. For now we accept it.

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_USERS_TABLE || 'Users';
    const apiKey = process.env.AIRTABLE_API_KEY;

    if (!baseId || !tableName || !apiKey) {
      return NextResponse.json({ ok: false, message: 'Airtable config missing.' }, { status: 500 });
    }

    const recordId = await findUserRecordIdByEmail({ baseId, tableName, apiKey, email });
    if (!recordId) {
      return NextResponse.json({ ok: false, message: 'User not found.' }, { status: 404 });
    }

    // Update password; adjust field name if yours differs
    const patchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;
    const r = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { Password: newPassword } }),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('Airtable update failed', r.status, txt);
      return NextResponse.json(
        { ok: false, message: 'Failed to update password.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('performPasswordReset error:', err);
    return NextResponse.json({ ok: false, message: 'Could not reset password.' }, { status: 500 });
  }
}
