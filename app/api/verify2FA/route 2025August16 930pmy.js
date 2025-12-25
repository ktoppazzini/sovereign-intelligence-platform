// app/api/verify2FA/route.js
import { NextResponse } from 'next/server';
import * as userStore from '../../../lib/userStore.js';

export async function POST(req) {
  const rid = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();

  const err = (payload, status = 400) => NextResponse.json({ ok: false, ...payload }, { status });

  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim();
    const code = (body.code || '').trim();

    if (!email || !code) {
      return err({ error: 'missing_params' }, 400);
    }

    // 1) Lookup
    const u = await userStore.getUserByEmail(email, rid);
    if (!u) return err({ error: 'no_user' }, 404);

    // 2) Load stored code/expiry/attempts
    const fresh = await userStore.get2FAState(u.id, rid);

    const now = Date.now();
    const expiryMs = fresh.expiresAt ? Date.parse(fresh.expiresAt) : NaN;
    const expired = Number.isFinite(expiryMs) ? now > expiryMs : true;

    if (!fresh.code || expired) {
      console.warn(
        `[verify2FA ${rid}] expired_or_missing_code rec=${u.id} codePresent=${!!fresh.code} expiry=${fresh.expiresAt}`,
      );
      // soft-increment attempts on expired
      await userStore.safeIncrementAttempts(u.id, rid);
      return err({ error: 'expired', message: 'Code expired. Please request a new one.' }, 401);
    }

    // 3) Compare
    if (fresh.code !== code) {
      const attempts = await userStore.safeIncrementAttempts(u.id, rid);
      const tooMany = attempts >= 5;
      return err(
        {
          error: 'mismatch',
          attempts,
          ...(tooMany ? { lock: true, message: 'Too many failed attempts.' } : {}),
        },
        401,
      );
    }

    // 4) Success — clear code + attempts
    await userStore.clear2FAState(u.id, rid);

    const ms = Date.now() - t0;
    console.log(`[verify2FA ${rid}] ok email=${email} ms=${ms}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`[verify2FA ${rid}] unhandled`, e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
