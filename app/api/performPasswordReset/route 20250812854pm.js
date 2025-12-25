export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import crypto from 'crypto';

function requiredEnv(keys) {
  const missing = [];
  const values = {};
  for (const k of keys) {
    const v = process.env[k];
    if (!v || String(v).trim() === '') missing.push(k);
    values[k] = v;
  }
  return { missing, values };
}

async function translateFields(baseUrl, lang, obj, timeoutMs = 6000) {
  if (!lang) return obj;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const safe = JSON.stringify(obj).replace(/\n/g, '\\n');
    const prompt = `Translate the following fields into ${lang}. Return ONLY a raw JSON object with the same keys.\n${safe}`;
    const res = await fetch(`${baseUrl}/api/gptTranslation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return obj;
    const json = await res.json().catch(() => ({}));
    const tr = json?.translation && typeof json.translation === 'object' ? json.translation : json;
    return { ...obj, ...tr };
  } catch {
    return obj;
  }
}

function passwordStrong(pw) {
  return (
    typeof pw === 'string' &&
    pw.length >= 8 &&
    /[A-Za-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

function scryptHash(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      const out = `scrypt$16384$64$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
      resolve(out);
    });
  });
}

export async function POST(request) {
  try {
    const { email, token, password, lang } = await request.json();

    const { missing, values: envs } = requiredEnv([
      'AIRTABLE_API_KEY',
      'AIRTABLE_BASE_ID',
      'AIRTABLE_USERS_TABLE',
      'AIRTABLE_USERS_EMAIL_FIELD',
      'APP_BASE_URL',
    ]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing env var(s): ${missing.join(', ')}` },
        { status: 500 },
      );
    }

    const PASSWORD_FIELD = process.env.AIRTABLE_USERS_PASSWORD_FIELD || 'PasswordHash';

    // Minimum checks
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!passwordStrong(password)) {
      const obj = await translateFields(envs.APP_BASE_URL, lang, {
        uiErrorMessage:
          'Password must be at least 8 characters and include letters, numbers, and a symbol.',
      });
      return NextResponse.json(
        { error: 'Weak password', uiErrorMessage: obj.uiErrorMessage },
        { status: 400 },
      );
    }

    // (Optional) verify token if you store it. For now we just require it to exist to match your flow.
    if (!token || typeof token !== 'string') {
      const obj = await translateFields(envs.APP_BASE_URL, lang, {
        uiErrorMessage: 'Reset link is invalid or expired.',
      });
      return NextResponse.json(
        { error: 'Missing token', uiErrorMessage: obj.uiErrorMessage },
        { status: 400 },
      );
    }

    // Hash the password
    const hashed = await scryptHash(password);

    // Find user in Airtable by email
    const base = envs.AIRTABLE_BASE_ID;
    const table = encodeURIComponent(envs.AIRTABLE_USERS_TABLE);
    const emailField = envs.AIRTABLE_USERS_EMAIL_FIELD;

    const listUrl = new URL(`https://api.airtable.com/v0/${base}/${table}`);
    // Lowercase exact match
    listUrl.searchParams.set('filterByFormula', `LOWER({${emailField}})="${email.toLowerCase()}"`);
    listUrl.searchParams.set('maxRecords', '1');

    const headers = {
      Authorization: `Bearer ${envs.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    };

    const listRes = await fetch(listUrl, { headers, cache: 'no-store' });
    const listJson = await listRes.json();

    const rec = listJson?.records?.[0];
    if (!rec?.id) {
      const obj = await translateFields(envs.APP_BASE_URL, lang, {
        uiErrorMessage: 'We could not find an account with that email.',
      });
      return NextResponse.json(
        { error: 'User not found', uiErrorMessage: obj.uiErrorMessage },
        { status: 404 },
      );
    }

    // Update password field
    const updateUrl = `https://api.airtable.com/v0/${base}/${table}`;
    const patchBody = {
      records: [
        {
          id: rec.id,
          fields: {
            [PASSWORD_FIELD]: hashed,
            PasswordUpdatedAt: new Date().toISOString(),
          },
        },
      ],
      typecast: true,
    };

    const updRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchBody),
    });

    if (!updRes.ok) {
      const txt = await updRes.text();
      const obj = await translateFields(envs.APP_BASE_URL, lang, {
        uiErrorMessage: 'Could not reset password. Please try again.',
      });
      return NextResponse.json(
        { error: 'Airtable update failed', detail: txt, uiErrorMessage: obj.uiErrorMessage },
        { status: 500 },
      );
    }

    const okObj = await translateFields(envs.APP_BASE_URL, lang, {
      uiMessage: '✅ Password successfully changed.',
    });
    return NextResponse.json({ ok: true, uiMessage: okObj.uiMessage });
  } catch (err) {
    console.error('performPasswordReset error:', err);
    return NextResponse.json(
      { error: 'Server error', uiErrorMessage: 'Could not reset password. Please try again.' },
      { status: 500 },
    );
  }
}
