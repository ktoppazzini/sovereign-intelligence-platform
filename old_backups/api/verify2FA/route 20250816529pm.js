// app/api/verify2FA/route.js
// Purpose: Verify the 2FA code from the user against Airtable.
// Behavior:
//   - Looks up user by email.
//   - Validates code existence, equality, and expiry (now >= expiry -> expired).
//   - On success: sets "MFA Verified" = true, clears temp code + expiry, resets attempts.
//   - On failure: increments FailedAttempts and returns structured reason.
//   - Returns precise {reason} so the UI can translate the correct message.
//
// Debugging strategy (request-scoped rid):
//   - Every run logs a compact trace with timings and field snapshots.
//   - All updates are logged with the record ID + changed fields.
//   - Fail paths carry a "reason" string for the frontend to show correct UX.
//
// Assumptions (from .env.local):
//   AIRTABLE_USERS_MFA_CODE_FIELD="MFA Temp"
//   AIRTABLE_USERS_MFA_EXPIRES_FIELD="MFA Code Expiry"   (Airtable Date w/ time)
//   AIRTABLE_USERS_MFA_VERIFIED_FIELD="MFA Verified"     (Airtable Checkbox)
//   AIRTABLE_USERS_FAILED_ATTEMPTS_FIELD="FailedAttempts"
//   TWOFA_MAX_ATTEMPTS (optional), TWOFA_CODE_TTL_MINUTES (informational)
//   Phone, lockout, etc are handled elsewhere.
//
// Dependencies:
//   - /lib/userStore.js exposes the following helpers (sent earlier):
//       getUserByEmail(email, rid)
//       setMfaVerified(recordId, value, rid)
//       clearMfaTemp(recordId, rid)                 // clears code + expiry
//       resetFailedAttempts(recordId, rid)
//       incrementFailedAttempts(recordId, rid)

// Next.js App Router API route
import { NextResponse } from 'next/server';
//import userStore from '@/lib/userStore';
import userStore from '../../../lib/userStore';

export async function POST(req) {
  const rid = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();
  const ok = (body, init = 200) => NextResponse.json(body, { status: init });
  const err = (body, init = 400) =>
    NextResponse.json({ success: false, ...body }, { status: init });

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      console.warn(`[verify2FA ${rid}] missing email or code`, {
        email: !!email,
        codeLen: String(code ?? '').length,
      });
      return err({ reason: 'bad_request', message: 'Email and code are required.' }, 400);
    }

    // ——— 1) Lookup user ———
    const tLookup0 = Date.now();
    const user = await userStore.getUserByEmail(email, rid);
    const tLookup = Date.now() - tLookup0;

    if (!user) {
      console.warn(`[verify2FA ${rid}] user not found`, { email });
      return err({ reason: 'user_not_found', message: 'User not found.' }, 404);
    }

    // Resolve field names from env to avoid hardcoding
    const F_CODE = process.env.AIRTABLE_USERS_MFA_CODE_FIELD || 'MFA Temp';
    const F_EXP = process.env.AIRTABLE_USERS_MFA_EXPIRES_FIELD || 'MFA Code Expiry';
    const F_VER = process.env.AIRTABLE_USERS_MFA_VERIFIED_FIELD || 'MFA Verified';
    const F_FAIL = process.env.AIRTABLE_USERS_FAILED_ATTEMPTS_FIELD || 'FailedAttempts';

    const recId = user.id;
    const fields = user.fields || {};

    const storedCode = (fields[F_CODE] ?? '').toString().trim();
    const expiryRaw = fields[F_EXP]; // Airtable date/time (string) or null
    const attempts = Number(fields[F_FAIL] ?? 0);

    // Parse expiry; treat missing/invalid as "expired"
    const expiry = expiryRaw ? new Date(expiryRaw) : null;
    const now = new Date();

    console.log(`[verify2FA ${rid}] lookup ms=${tLookup} rec=${recId} fields:`, {
      hasCode: !!storedCode,
      codeLen: storedCode.length,
      expiryRaw,
      attempts,
    });

    // ——— 2) Validate expiry ———
    if (!storedCode || !expiry || isNaN(expiry.getTime())) {
      // missing or unparsable -> expired path to prompt resend
      console.warn(`[verify2FA ${rid}] expired_or_missing_code`, {
        storedCode: !!storedCode,
        expiryRaw,
      });
      await userStore
        .incrementFailedAttempts(recId, rid)
        .catch((e) => console.warn(`[verify2FA ${rid}] incrementFailedAttempts failed`, e));
      return err({ reason: 'expired', message: 'Code expired. Please request a new one.' }, 401);
    }

    if (now >= expiry) {
      console.warn(`[verify2FA ${rid}] code expired`, {
        now: now.toISOString(),
        expiry: expiry.toISOString(),
      });
      await userStore
        .incrementFailedAttempts(recId, rid)
        .catch((e) => console.warn(`[verify2FA ${rid}] incrementFailedAttempts failed`, e));
      return err({ reason: 'expired', message: 'Code expired. Please request a new one.' }, 401);
    }

    // ——— 3) Validate equality ———
    const submitted = code.toString().trim();
    if (submitted !== storedCode) {
      console.warn(`[verify2FA ${rid}] code_mismatch`, { submittedLen: submitted.length });
      await userStore
        .incrementFailedAttempts(recId, rid)
        .catch((e) => console.warn(`[verify2FA ${rid}] incrementFailedAttempts failed`, e));

      // Optional: lockout if exceeding limit
      const max = Number(process.env.TWOFA_MAX_ATTEMPTS ?? 5);
      if (attempts + 1 >= max) {
        console.warn(`[verify2FA ${rid}] too_many_attempts -> consider lockout UX`, {
          attempts: attempts + 1,
          max,
        });
      }

      return err({ reason: 'invalid_code', message: 'Invalid code.' }, 401);
    }

    // ——— 4) Success path ———
    const tUpdate0 = Date.now();

    // Set MFA Verified, clear temp code+expiry, reset attempts
    await userStore.setMfaVerified(recId, true, rid);
    await userStore.clearMfaTemp(recId, rid);
    await userStore.resetFailedAttempts(recId, rid);

    const tUpdate = Date.now() - tUpdate0;

    console.log(`[verify2FA ${rid}] VERIFIED ok; updates ms=${tUpdate}`);

    // --- Return success + set unlock cookies (works without console hacks) ---
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const oneYear = 60 * 60 * 24 * 365;

    const res = NextResponse.json(
      {
        success: true,
        reason: 'verified',
        message: '✅ Verified.',
        meta: { verifiedField: F_VER },
      },
      { status: 200 },
    );

    res.headers.append(
      'Set-Cookie',
      `nav_unlocked=true; Path=/; Max-Age=${oneYear}; SameSite=Lax${secureFlag}`,
    );
    res.headers.append(
      'Set-Cookie',
      `auth_isVerified=true; Path=/; Max-Age=${oneYear}; SameSite=Lax${secureFlag}`,
    );

    const total = Date.now() - t0;
    console.log(`[verify2FA ${rid}] total=${total}ms -> 200`);

    return res;
  } catch (e) {
    const total = Date.now() - t0;
    console.error(`[verify2FA ${rid}] unhandled error total=${total}ms`, e);
    return NextResponse.json(
      { success: false, reason: 'server_error', message: 'Server error during verification.' },
      { status: 500 },
    );
  }
}
