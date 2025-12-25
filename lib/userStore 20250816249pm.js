// /lib/userStore.js
// User helpers for login / 2FA. Provides BOTH a default export object
// (userStore.getUserByEmail(...)) and named exports so existing code keeps working.

import AT, { findOne, updateRecord } from './airtable';

const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';

// Several bases/views have slightly different field names; support them all.
const F = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  NAME: 'Name',

  // temporary code + expiry variants we’ve seen
  CODE_A: 'VerificationCode',
  CODE_B: 'MFA Temp',
  EXP_A: 'CodeExpiry',
  EXP_B: 'MFA Code Exp...',
  VERIFIED: 'MFA Verified',
  ATTEMPTS: 'MFA Attempts',
};

/** Case-insensitive email lookup. */
async function getUserByEmail(rawEmail /*, rid */) {
  const email = String(rawEmail || '')
    .trim()
    .toLowerCase();
  if (!email) return null;

  // LOWER({Email}) = 'user@x.com'
  const filter = `LOWER({${F.EMAIL}}) = '${email.replace(/'/g, "\\'")}'`;

  const rec = await findOne(USERS_TABLE, filter, [
    F.EMAIL,
    F.PHONE,
    F.NAME,
    F.CODE_A,
    F.CODE_B,
    F.EXP_A,
    F.EXP_B,
    F.VERIFIED,
    F.ATTEMPTS,
  ]);
  if (!rec) return null;

  const fields = rec.fields || {};
  return {
    id: rec.id,
    email: fields[F.EMAIL],
    phone: fields[F.PHONE],
    name: fields[F.NAME],
    code: fields[F.CODE_A] ?? fields[F.CODE_B] ?? null,
    expiryIso: fields[F.EXP_A] ?? fields[F.EXP_B] ?? null,
    verified: !!fields[F.VERIFIED],
    attempts: Number(fields[F.ATTEMPTS] || 0),
    raw: rec,
  };
}

/** Save a new MFA code + expiry on the user. */
async function setVerificationCode(userId, code, expiresIso) {
  return updateRecord(USERS_TABLE, userId, {
    [F.CODE_A]: code,
    [F.CODE_B]: code, // keep in sync with either field present
    [F.EXP_A]: expiresIso || null,
    [F.EXP_B]: expiresIso || null,
    [F.VERIFIED]: false,
  });
}

/** Mark MFA verified and clear temp code/expiry/attempts. */
async function markMfaVerified(userId) {
  return updateRecord(USERS_TABLE, userId, {
    [F.VERIFIED]: true,
    [F.ATTEMPTS]: 0,
    [F.CODE_A]: null,
    [F.CODE_B]: null,
    [F.EXP_A]: null,
    [F.EXP_B]: null,
  });
}

/** +1 attempts (defensive floor at 0). */
async function incrementMfaAttempts(userId, current = 0) {
  const next = Math.max(0, Number(current || 0)) + 1;
  return updateRecord(USERS_TABLE, userId, { [F.ATTEMPTS]: next });
}

/** Explicit reset of attempts without verifying. */
async function resetMfaAttempts(userId) {
  return updateRecord(USERS_TABLE, userId, { [F.ATTEMPTS]: 0 });
}

// Named exports
export {
  getUserByEmail,
  setVerificationCode,
  markMfaVerified,
  incrementMfaAttempts,
  resetMfaAttempts,
};

// Default export (so existing code `import userStore from ...` keeps working)
const userStore = {
  getUserByEmail,
  setVerificationCode,
  markMfaVerified,
  incrementMfaAttempts,
  resetMfaAttempts,
};
export default userStore;
