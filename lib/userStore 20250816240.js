// /lib/userStore.js
// High-level user operations for login/2FA, using the REST helper above.
// This file does NOT touch your existing /lib/airtable.js used by the Users page.

import airtableRest, {
  TABLES,
  findUserByEmail,
  updateRecord,
  nowPlusMinutes,
} from './airtableRest';

// If your column names differ, override with env vars here.
const FIELDS = {
  EMAIL: process.env.AIRTABLE_FIELD_EMAIL || 'Email',
  PHONE: process.env.AIRTABLE_FIELD_PHONE || 'Phone',
  ACTIVE: process.env.AIRTABLE_FIELD_ACTIVE || 'Active',
  MFA_CODE: process.env.AIRTABLE_FIELD_MFA_CODE || 'MFA Temp', // alt: 'VerificationCode'
  MFA_EXPIRY: process.env.AIRTABLE_FIELD_MFA_EXPIRY || 'MFA Code Exp...', // alt: 'CodeExpiry'
  MFA_VERIFIED: process.env.AIRTABLE_FIELD_MFA_VERIFIED || 'MFA Verified',
  MFA_ATTEMPTS: process.env.AIRTABLE_FIELD_MFA_ATTEMPTS || 'MFA Attempts',
  MFA_LOCK_UNTIL: process.env.AIRTABLE_FIELD_MFA_LOCK_UNTIL || 'mfa_lock_until', // or 'LockedUntil'
};

const MFA_TTL_MIN = Number(process.env.MFA_TTL_MIN || 10);
const MFA_LOCK_THRESHOLD = Number(process.env.MFA_LOCK_THRESHOLD || 5);
const MFA_LOCK_MIN = Number(process.env.MFA_LOCK_MIN || 15);

function f(rec, key) {
  return rec?.fields?.[key];
}

function ensureActiveAndPhone(rec) {
  const active = f(rec, FIELDS.ACTIVE);
  const phone = f(rec, FIELDS.PHONE);
  if (!active) throw new Error('User is not active.');
  if (!phone) throw new Error('No phone on record.');
  return { active, phone };
}

export async function loadUser(email) {
  const rec = await findUserByEmail(email);
  return rec || null;
}

export async function setMfaCode(email, code) {
  const rec = await findUserByEmail(email);
  if (!rec) throw new Error('User not found.');
  ensureActiveAndPhone(rec);

  const fields = {
    [FIELDS.MFA_CODE]: String(code),
    [FIELDS.MFA_EXPIRY]: nowPlusMinutes(MFA_TTL_MIN),
    [FIELDS.MFA_VERIFIED]: false,
    [FIELDS.MFA_ATTEMPTS]: 0,
    [FIELDS.MFA_LOCK_UNTIL]: null,
  };

  await updateRecord(TABLES.USERS, rec.id, fields);
  return { id: rec.id, email, ttlMinutes: MFA_TTL_MIN };
}

export async function verifyMfaCode(email, submittedCode) {
  const rec = await findUserByEmail(email);
  if (!rec) return { ok: false, reason: 'not_found' };

  const lockUntil = f(rec, FIELDS.MFA_LOCK_UNTIL);
  if (lockUntil && new Date(lockUntil).getTime() > Date.now()) {
    return { ok: false, reason: 'locked', lockUntil };
  }

  const stored = f(rec, FIELDS.MFA_CODE);
  const expiry = f(rec, FIELDS.MFA_EXPIRY);
  const attempts = Number(f(rec, FIELDS.MFA_ATTEMPTS) || 0);

  if (!expiry || Date.now() > new Date(expiry).getTime()) {
    await updateRecord(TABLES.USERS, rec.id, { [FIELDS.MFA_VERIFIED]: false });
    return { ok: false, reason: 'expired' };
  }

  const isMatch = String(submittedCode || '').trim() === String(stored || '').trim();
  if (!isMatch) {
    const nextAttempts = attempts + 1;
    const patch = {
      [FIELDS.MFA_ATTEMPTS]: nextAttempts,
      [FIELDS.MFA_VERIFIED]: false,
    };
    if (nextAttempts >= MFA_LOCK_THRESHOLD) {
      patch[FIELDS.MFA_LOCK_UNTIL] = nowPlusMinutes(MFA_LOCK_MIN);
    }
    await updateRecord(TABLES.USERS, rec.id, patch);
    return {
      ok: false,
      reason: nextAttempts >= MFA_LOCK_THRESHOLD ? 'locked' : 'mismatch',
      attempts: nextAttempts,
    };
  }

  await updateRecord(TABLES.USERS, rec.id, {
    [FIELDS.MFA_VERIFIED]: true,
    [FIELDS.MFA_ATTEMPTS]: 0,
    [FIELDS.MFA_CODE]: '',
    [FIELDS.MFA_EXPIRY]: '',
    [FIELDS.MFA_LOCK_UNTIL]: null,
  });
  return { ok: true, id: rec.id };
}

export async function canSendMfa(email) {
  const rec = await findUserByEmail(email);
  if (!rec) return { ok: false, reason: 'not_found' };
  try {
    const { phone } = ensureActiveAndPhone(rec);
    return { ok: true, phone };
  } catch (e) {
    return { ok: false, reason: e.message || 'blocked' };
  }
}

export default { loadUser, setMfaCode, verifyMfaCode, canSendMfa };
