// /app/api/verify2FA/route.js
// VERSION: 2025-08-16 v2.0 (fix #2 err helper, plus relative import path)
// Notes:
// - Uses userStore default export (which now includes getUserByEmail, incrementFailedAttempts, etc).
// - Tolerant logging; returns structured JSON errors.

import { NextResponse } from 'next/server';
import userStore from '../../../lib/userStore'; // ← relative path (no @ alias)

function rid() {
  return Math.random().toString(36).slice(2, 8);
}

// Fixed err helper (spread the object, not ".body")
const err = (body, init = 400) => NextResponse.json({ success: false, ...body }, { status: init });

const ok = (body = {}) => NextResponse.json({ success: true, ...body }, { status: 200 });

// Field names used in Airtable (kept here for debug text only)
const CODE_FIELD_HINTS = ['MFA Code', 'mfa_code', 'MFA Temp', 'Code'];
const EXPIRY_FIELD_HINTS = [
  'MFA Code Expiry',
  'MFA Expires',
  'mfa_expires',
  'MFA Expiry',
  'Expiry',
];

export async function POST(req) {
  const requestId = rid();
  const tAll0 = Date.now();

  try {
    const { email, code, lang } = await req.json();
    if (!email || !code) {
      return err({ reason: 'bad_request', message: 'Email and code are required.' }, 400);
    }

    // ——— 1) Lookup user ———
    const t0 = Date.now();
    const user = await userStore.getUserByEmail(email, requestId);
    const tLookup = Date.now() - t0;

    if (!user) {
      console.warn(`[verify2FA ${requestId}] user_not_found email=${email}`);
      return err({ reason: 'not_found', message: 'User not found.' }, 404);
    }

    const recId = user.id || user.recId;
    const storedCode = user.mfaCode ? String(user.mfaCode).trim() : '';
    const expiryRaw = user.mfaExpiresIso ? String(user.mfaExpiresIso).trim() : '';
    const attemptsPrev = Number.isFinite(+user.mfaAttempts) ? +user.mfaAttempts : 0;

    // Parse expiry (ISO or Airtable date)
    const nowMs = Date.now();
    const expMs = expiryRaw ? Date.parse(expiryRaw) : NaN;
    const expired = Number.isFinite(expMs) ? expMs < nowMs : true;

    console.log(
      `[verify2FA ${requestId}] lookup ms=${tLookup} rec=${recId} ` +
        `fields: { hasCode: ${!!storedCode}, codeLen: ${storedCode?.length || 0}, expiryRaw: ${expiryRaw || 'n/a'}, attempts: ${attemptsPrev} }`,
    );

    // ——— 2) Validate presence & expiry ———
    if (!storedCode || expired) {
      console.warn(
        `[verify2FA ${requestId}] expired_or_missing_code { storedCode: ${!!storedCode}, expiryRaw: ${expiryRaw} }`,
      );
      try {
        await userStore.incrementFailedAttempts(recId, requestId);
      } catch {}
      return err(
        {
          reason: expired ? 'expired' : 'missing',
          message: expired
            ? 'Code expired. Please request a new one.'
            : 'No code on file. Please request a new one.',
          hints: {
            codeFieldCandidates: CODE_FIELD_HINTS,
            expiryFieldCandidates: EXPIRY_FIELD_HINTS,
          },
        },
        401,
      );
    }

    // ——— 3) Compare codes ———
    const clientCode = String(code).trim();
    if (clientCode !== storedCode) {
      console.warn(
        `[verify2FA ${requestId}] code_mismatch client=${clientCode} stored=${storedCode}`,
      );
      try {
        await userStore.incrementFailedAttempts(recId, requestId);
      } catch {}
      return err({ reason: 'invalid_code', message: 'Verification code is incorrect.' }, 401);
    }

    // ——— 4) Success ———
    try {
      await userStore.clear2FACode(recId, requestId);
      await userStore.resetFailedAttempts(recId, requestId);
    } catch (e) {
      console.warn(`[verify2FA ${requestId}] post-success cleanup warning`, e?.message || e);
    }

    const resp = ok({ verified: true, lang: lang || 'English' });
    // Optional: you were using cookies like nav_unlocked/auth_isVerified
    // resp.cookies.set('auth_isVerified', 'true', { httpOnly: false, path: '/' });
    // resp.cookies.set('nav_unlocked', 'true', { httpOnly: false, path: '/' });
    console.log(`[verify2FA ${requestId}] success total=${Date.now() - tAll0}ms`);
    return resp;
  } catch (e) {
    console.error(`[verify2FA ${requestId}] unhandled error total=${Date.now() - tAll0}ms`, e);
    return err(
      { reason: 'server_error', message: 'Internal error', detail: e?.message || String(e) },
      500,
    );
  }
}
