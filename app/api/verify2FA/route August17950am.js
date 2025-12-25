// app/api/verify2FA/route.js
import { NextResponse } from 'next/server';
import * as userStore from '@/lib/userStore';

const { TWOFA_MAX_ATTEMPTS = '5', AIRTABLE_USERS_ROLE_FIELD = 'Role' } = process.env;

function rid() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(req) {
  const r = rid();
  try {
    const { email, code, lang = 'English' } = await req.json();
    console.log(`[verify2FA ${r}]`, { email, lang });

    const rec = await userStore.getUserByEmail(email, r);
    if (!rec) {
      return NextResponse.json(
        { ok: false, reason: 'user_not_found', uiErrorMessage: 'User not found.' },
        { status: 404 },
      );
    }

    const fields = rec.fields || {};
    const expected = String(fields['2FA Code'] || '').trim();
    const expires = new Date(fields['2FA Expires'] || 0).getTime();
    const attempts = Number(fields['2FA Attempts'] || 0) || 0;

    if (attempts >= Number(TWOFA_MAX_ATTEMPTS)) {
      return NextResponse.json(
        { ok: false, reason: 'too_many_attempts', uiErrorMessage: 'Too many attempts.' },
        { status: 429 },
      );
    }

    const now = Date.now();
    if (!expected || now > expires) {
      return NextResponse.json(
        { ok: false, reason: 'expired', uiErrorMessage: 'Code expired. Please request a new one.' },
        { status: 401 },
      );
    }

    if (String(code).trim() !== expected) {
      await userStore.incrementFailedAttempts(rec.id, r);
      return NextResponse.json(
        { ok: false, reason: 'invalid', uiErrorMessage: 'Invalid code.' },
        { status: 401 },
      );
    }

    await userStore.clear2FACode(rec.id, r);

    let roleValue = fields[AIRTABLE_USERS_ROLE_FIELD];
    if (Array.isArray(roleValue)) roleValue = roleValue[0]?.name || roleValue[0] || '';
    const role = String(roleValue || '').trim() || 'User';

    const res = NextResponse.json({
      ok: true,
      role,
      uiMessage: null, // your login page already has localized "verified" copy
    });
    // short-lived demo cookies
    res.cookies.set('auth_isVerified', 'true', { httpOnly: false, sameSite: 'lax', path: '/' });
    res.cookies.set('nav_unlocked', 'true', { httpOnly: false, sameSite: 'lax', path: '/' });
    res.cookies.set('ui_lang', lang, { httpOnly: false, sameSite: 'lax', path: '/' });
    res.cookies.set('user_role', role, { httpOnly: false, sameSite: 'lax', path: '/' });
    res.cookies.set('user_email', email, { httpOnly: false, sameSite: 'lax', path: '/' });
    return res;
  } catch (err) {
    console.log('[verify2FA] unhandled', err);
    return NextResponse.json({ ok: false, reason: 'server_error' }, { status: 500 });
  }
}
