export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import crypto from 'crypto';

function need(keys) {
  const miss = [];
  const vals = {};
  for (const k of keys) {
    const v = process.env[k];
    if (!v || String(v).trim() === '') miss.push(k);
    vals[k] = v;
  }
  return { miss, vals };
}

async function i18n(baseUrl, lang, obj, ms = 6000) {
  if (!lang) return obj;
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    const safe = JSON.stringify(obj).replace(/\n/g, '\\n');
    const prompt = `Translate the following fields into ${lang}. Return ONLY a raw JSON object with the same keys.\n${safe}`;
    const r = await fetch(`${baseUrl}/api/gptTranslation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: c.signal,
    });
    clearTimeout(t);
    if (!r.ok) return obj;
    const j = await r.json().catch(() => ({}));
    const tr = j?.translation && typeof j.translation === 'object' ? j.translation : j;
    return { ...obj, ...tr };
  } catch {
    return obj;
  }
}

const strong = (p) =>
  typeof p === 'string' &&
  p.length >= 8 &&
  /[A-Za-z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

function scryptHash(pw) {
  return new Promise((res, rej) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (err, dk) => {
      if (err) return rej(err);
      res(`scrypt$16384$64$${salt.toString('hex')}$${dk.toString('hex')}`);
    });
  });
}

export async function POST(req) {
  try {
    const { email, token, password, lang } = await req.json();
    console.log('[performPasswordReset] in', { email, hasToken: Boolean(token), lang });

    const { miss, vals } = need([
      'AIRTABLE_API_KEY',
      'AIRTABLE_BASE_ID',
      'AIRTABLE_USERS_TABLE',
      'AIRTABLE_USERS_EMAIL_FIELD',
      'APP_BASE_URL',
    ]);
    if (miss.length) {
      console.error('[performPasswordReset] missing env', miss);
      return NextResponse.json({ error: `Missing env: ${miss.join(', ')}` }, { status: 500 });
    }

    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    if (!token) {
      const tr = await i18n(vals.APP_BASE_URL, lang, {
        uiErrorMessage: 'Reset link is invalid or expired.',
      });
      return NextResponse.json(
        { error: 'bad token', uiErrorMessage: tr.uiErrorMessage },
        { status: 400 },
      );
    }
    if (!strong(password)) {
      const tr = await i18n(vals.APP_BASE_URL, lang, {
        uiErrorMessage:
          'Password must be at least 8 characters and include letters, numbers, and a symbol.',
      });
      return NextResponse.json(
        { error: 'weak', uiErrorMessage: tr.uiErrorMessage },
        { status: 400 },
      );
    }

    // Hash
    const hash = await scryptHash(password);
    console.log('[performPasswordReset] hash ok');

    // Find user
    const base = vals.AIRTABLE_BASE_ID;
    const table = encodeURIComponent(vals.AIRTABLE_USERS_TABLE);
    const emailField = vals.AIRTABLE_USERS_EMAIL_FIELD;

    const listUrl = new URL(`https://api.airtable.com/v0/${base}/${table}`);
    listUrl.searchParams.set('filterByFormula', `LOWER({${emailField}})="${email.toLowerCase()}"`);
    listUrl.searchParams.set('maxRecords', '1');

    const headers = {
      Authorization: `Bearer ${vals.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    };
    const listRes = await fetch(listUrl, { headers, cache: 'no-store' });
    const listJson = await listRes.json();
    const rec = listJson?.records?.[0];

    if (!rec?.id) {
      const tr = await i18n(vals.APP_BASE_URL, lang, {
        uiErrorMessage: 'We could not find an account with that email.',
      });
      return NextResponse.json(
        { error: 'not found', uiErrorMessage: tr.uiErrorMessage },
        { status: 404 },
      );
    }

    // Update
    const field = process.env.AIRTABLE_USERS_PASSWORD_FIELD || 'PasswordHash';
    const updUrl = `https://api.airtable.com/v0/${base}/${table}`;
    const body = {
      records: [
        { id: rec.id, fields: { [field]: hash, PasswordUpdatedAt: new Date().toISOString() } },
      ],
      typecast: true,
    };

    const upd = await fetch(updUrl, { method: 'PATCH', headers, body: JSON.stringify(body) });
    if (!upd.ok) {
      const errTxt = await upd.text().catch(() => '<no text>');
      console.error('[performPasswordReset] airtable update failed:', errTxt);
      const tr = await i18n(vals.APP_BASE_URL, lang, {
        uiErrorMessage: 'Could not reset password. Please try again.',
      });
      return NextResponse.json(
        { error: 'airtable update failed', uiErrorMessage: tr.uiErrorMessage },
        { status: 500 },
      );
    }

    const ok = await i18n(vals.APP_BASE_URL, lang, {
      uiMessage: '✅ Password successfully changed.',
    });
    console.log('[performPasswordReset] OK for', email);
    return NextResponse.json({ ok: true, uiMessage: ok.uiMessage });
  } catch (e) {
    console.error('[performPasswordReset] server error', e);
    return NextResponse.json(
      { error: 'server', uiErrorMessage: 'Could not reset password. Please try again.' },
      { status: 500 },
    );
  }
}
