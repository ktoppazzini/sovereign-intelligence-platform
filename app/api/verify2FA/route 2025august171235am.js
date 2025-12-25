// app/api/verify2FA/route.js
import { NextResponse } from 'next/server';
import * as userStore from '@/lib/userStore'; // <-- NOT a default import

function rid() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(req) {
  const r = rid();
  const err = (obj, status = 400) => NextResponse.json({ ok: false, ...obj }, { status });

  try {
    const { email, code } = await req.json();
    const emailLow = String(email || '')
      .trim()
      .toLowerCase();
    const codeStr = String(code || '').trim();

    if (!emailLow || !codeStr) {
      return err({ reason: 'missing_params' }, 400);
    }

    // 1) Lookup user
    const t0 = Date.now();
    const user = await userStore.getUserByEmail(emailLow, r);
    const tLookup = Date.now() - t0;

    if (!user) {
      console.warn(`[verify2FA ${r}] user_not_found email=${emailLow}`);
      return err({ reason: 'not_found' }, 404);
    }

    const recId = user.id;
    const f = user.fields || {};
    const storedCode = (f['2FA Code'] || '').toString().trim();
    const expiryRaw = f['2FA Expires'];

    console.log(`[verify2FA ${r}] lookup ms=${tLookup} rec=${recId} fields:`, {
      hasCode: !!storedCode,
      codeLen: storedCode.length,
      expiryRaw,
      attempts: f['2FA Attempts'] || 0,
    });

    // 2) Validate code & expiry
    if (!storedCode || !expiryRaw) {
      console.warn(`[verify2FA ${r}] expired_or_missing_code`, {
        storedCode: !!storedCode,
        expiryRaw,
      });
      await userStore.incrementFailedAttempts(recId, r).catch(() => {});
      return err({ reason: 'expired' }, 401);
    }

    const now = Date.now();
    const expiryMs = Date.parse(expiryRaw);
    if (!Number.isFinite(expiryMs) || now > expiryMs) {
      console.warn(`[verify2FA ${r}] expired`, { now, expiryMs });
      await userStore.incrementFailedAttempts(recId, r).catch(() => {});
      return err({ reason: 'expired' }, 401);
    }

    if (codeStr !== storedCode) {
      console.warn(`[verify2FA ${r}] code_mismatch`);
      await userStore.incrementFailedAttempts(recId, r).catch(() => {});
      return err({ reason: 'invalid_code' }, 401);
    }

    // 3) Success → clear the code
    await userStore.clear2FACode(recId, r).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`[verify2FA ${r}] unhandled error`, e);
    return NextResponse.json({ ok: false, reason: 'server_error' }, { status: 500 });
  }
}
