// lib/userStore.js
// User helpers used by /api/verify2FA (named exports).
// Uses the same field defaults as the route. Override with env as needed.

import { findOneByEmail, updateRecord } from './airtable';

const TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
const F_EMAIL = process.env.AIRTABLE_USERS_EMAIL_FIELD || 'Email';
const F_CODE = process.env.AIRTABLE_USERS_MFA_CODE_FIELD || 'MFA Temp';
const F_EXP = process.env.AIRTABLE_USERS_MFA_EXPIRES_FIELD || 'MFA Code Expiry';
const F_VER = process.env.AIRTABLE_USERS_MFA_VERIFIED_FIELD || 'MFA Verified';
const F_FAIL = process.env.AIRTABLE_USERS_FAILED_ATTEMPTS_FIELD || 'FailedAttempts';

// Returns { id, fields } or null
export async function getUserByEmail(email, rid) {
  const t0 = Date.now();
  const rec = await findOneByEmail(TABLE, email);
  const ms = Date.now() - t0;
  console.log(`[AT ${rid || '-'}] findOneByEmail ${TABLE} ms=${ms} found=${!!rec}`);
  return rec ? { id: rec.id, fields: rec.fields || {} } : null;
}

export async function incrementFailedAttempts(recordId, rid) {
  await updateRecord(
    TABLE,
    recordId,
    {
      [F_FAIL]: { incrementBy: 1 }, // Airtable supports “incrementBy” with typecast
    },
    rid,
  ).catch(async () => {
    // Fallback in case incrementBy isn't available in your base
    // Read-modify-write would be needed; keeping this simple:
    await updateRecord(TABLE, recordId, { [F_FAIL]: 1 }, rid);
  });
}

export async function resetFailedAttempts(recordId, rid) {
  await updateRecord(TABLE, recordId, { [F_FAIL]: 0 }, rid);
}

export async function clear2FAFields(recordId, rid) {
  await updateRecord(TABLE, recordId, { [F_CODE]: '', [F_EXP]: null }, rid);
}

export async function setVerifiedFlag(recordId, value, rid) {
  await updateRecord(TABLE, recordId, { [F_VER]: !!value }, rid);
}
