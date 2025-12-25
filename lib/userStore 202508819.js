// /lib/userStore.js
// User & 2FA helpers backed by Airtable. Exports default + named.

import airtable, { table, findOneByEmail, updateRecord } from './airtable';

const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';

// Field names (env overrideable; must match your Users table)
const F_CODE = process.env.AIRTABLE_USERS_MFA_CODE_FIELD || 'MFA Temp';
const F_EXP = process.env.AIRTABLE_USERS_MFA_EXPIRES_FIELD || 'MFA Code Expiry';
const F_VER = process.env.AIRTABLE_USERS_MFA_VERIFIED_FIELD || 'MFA Verified';
const F_FAIL = process.env.AIRTABLE_USERS_FAILED_ATTEMPTS_FIELD || 'FailedAttempts';

export async function getUserByEmail(email, rid) {
  return findOneByEmail(USERS_TABLE, email, rid); // returns Airtable record (id, fields)
}

export async function incrementFailedAttempts(recordId, rid) {
  const tbl = table(USERS_TABLE);
  let next = 1;
  try {
    const current = await tbl.find(recordId);
    const prev = Number(current?.fields?.[F_FAIL] ?? 0) || 0;
    next = prev + 1;
  } catch {}
  await updateRecord(USERS_TABLE, recordId, { [F_FAIL]: next }, rid);
}

export async function resetFailedAttempts(recordId, rid) {
  await updateRecord(USERS_TABLE, recordId, { [F_FAIL]: 0 }, rid);
}

export async function setMfaVerified(recordId, value, rid) {
  await updateRecord(USERS_TABLE, recordId, { [F_VER]: !!value }, rid);
}

export async function clearMfaTemp(recordId, rid) {
  await updateRecord(USERS_TABLE, recordId, { [F_CODE]: '', [F_EXP]: '' }, rid);
}

// Default export for convenience
const userStore = {
  getUserByEmail,
  incrementFailedAttempts,
  resetFailedAttempts,
  setMfaVerified,
  clearMfaTemp,
};
export default userStore;
