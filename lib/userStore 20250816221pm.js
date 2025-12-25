// lib/userStore.js
// Purpose: Single, stable surface for all Airtable user operations used by 2FA routes.
// - Avoids route code importing airtableUtils directly
// - Exposes helpers: getUserByEmail, getUserById, setMfaTemp, clearMfaTemp,
//   setMfaVerified, incrementFailedAttempts, resetFailedAttempts, logLoginEvent, getUserPhone
// - Adds consistent, high-signal debug logging with request ids (rid)

import Airtable from 'airtable';

// ---------- Debug helpers ----------
function reqId() {
  // short, sortable id
  return Math.random().toString(36).slice(2, 8);
}
function dbg(rid, ...args) {
  console.log(`[USERSTORE ${rid}]`, ...args);
}
function warn(rid, ...args) {
  console.warn(`[USERSTORE ${rid}]`, ...args);
}
function err(rid, ...args) {
  console.error(`[USERSTORE ${rid}]`, ...args);
}

// ---------- Env & configuration ----------
function assertEnv(rid) {
  const required = [
    'AIRTABLE_API_KEY',
    'AIRTABLE_BASE_ID',
    // Either table ID or table NAME for Users must exist
    // (we'll check dynamically below)
    'AIRTABLE_USERS_EMAIL_FIELD',
    'AIRTABLE_USERS_MFA_CODE_FIELD',
    'AIRTABLE_USERS_MFA_EXPIRES_FIELD',
    'AIRTABLE_USERS_MFA_VERIFIED_FIELD',
  ];
  const missing = required.filter(k => !process.env[k] || !String(process.env[k]).trim());
  // Users table id/name checked later to allow either/or
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

function makeBase(rid) {
  assertEnv(rid);
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  dbg(rid, 'init base', baseId);
  return new Airtable({ apiKey }).base(baseId);
}

// Resolve a table by ID if provided, otherwise by NAME
function resolveTable(base, idEnv, nameEnv, rid) {
  const id = process.env[idEnv];
  const name = process.env[nameEnv];
  if (!id && !name) {
    throw new Error(`One of ${idEnv} or ${nameEnv} must be set for table resolution`);
  }
  // Airtable SDK accepts either table(id) or table(name)
  const resolved = id ? base.table(id) : base.table(name);
  dbg(rid, 'resolved table', { id, name });
  return resolved;
}

// ---------- Field names (from env) ----------
export const fieldNames = {
  email: process.env.AIRTABLE_USERS_EMAIL_FIELD || 'Email',
  mfaCode: process.env.AIRTABLE_USERS_MFA_CODE_FIELD || 'MFA Temp',
  mfaExpiry: process.env.AIRTABLE_USERS_MFA_EXPIRES_FIELD || 'MFA Code Expiry',
  mfaVerified: process.env.AIRTABLE_USERS_MFA_VERIFIED_FIELD || 'MFA Verified',
  lockedUntil: process.env.AIRTABLE_USERS_LOCKED_UNTIL_FIELD || 'LockedUntil',
  failedAttempts: process.env.AIRTABLE_USERS_FAILED_ATTEMPTS_FIELD || 'FailedAttempts',
  phone: process.env.AIRTABLE_USER_PHONE_FIELD || 'Phone',
};

// ---------- Tables ----------
function usersTable(rid) {
  const base = makeBase(rid);
  return resolveTable(base, 'AIRTABLE_USERS_TABLE_ID', 'AIRTABLE_USERS_TABLE', rid);
}

function loginLogsTableOrNull(rid) {
  try {
    const base = makeBase(rid);
    return resolveTable(base, 'AIRTABLE_LOGIN_LOGS_TABLE_ID', 'AIRTABLE_LOGIN_LOGS_TABLE', rid);
  } catch (e) {
    // Optional — if not configured, just skip logging
    warn(rid, 'login logs table not configured:', e.message);
    return null;
  }
}

// ---------- Core helpers ----------
export async function getUserByEmail(email, rid = reqId()) {
  const t0 = Date.now();
  const tbl = usersTable(rid);
  const f = fieldNames.email;
  const lower = String(email || '')
    .trim()
    .toLowerCase();
  const formula = `LOWER({${f}}) = '${lower.replace(/'/g, "\\'")}'`;
  dbg(rid, 'getUserByEmail formula:', formula);

  const records = await tbl.select({ maxRecords: 1, filterByFormula: formula }).firstPage();

  const ms = (Date.now() - t0).toFixed(0);
  if (!records.length) {
    dbg(rid, `lookup: not found (${ms}ms)`);
    return null;
  }
  const rec = records[0];
  dbg(rid, `lookup: found (${ms}ms)`, { id: rec.id });
  return { id: rec.id, fields: rec.fields };
}

export async function getUserById(id, rid = reqId()) {
  const t0 = Date.now();
  const tbl = usersTable(rid);
  const rec = await tbl.find(id);
  dbg(rid, `getUserById: ${id} (${Date.now() - t0}ms)`);
  return { id: rec.id, fields: rec.fields };
}

// Set both temp code and expiry timestamp (ISO string recommended)
export async function setMfaTemp(id, code, expiresAtISO, rid = reqId()) {
  const tbl = usersTable(rid);
  const payload = {
    [fieldNames.mfaCode]: String(code),
    [fieldNames.mfaExpiry]: expiresAtISO ? new Date(expiresAtISO).toISOString() : null,
  };
  dbg(rid, 'setMfaTemp ->', payload);
  await tbl.update(id, payload);
}

export async function clearMfaTemp(id, rid = reqId()) {
  const tbl = usersTable(rid);
  const payload = {
    [fieldNames.mfaCode]: '',
    [fieldNames.mfaExpiry]: null,
  };
  dbg(rid, 'clearMfaTemp ->', payload);
  await tbl.update(id, payload);
}

export async function setMfaVerified(id, value, rid = reqId()) {
  const tbl = usersTable(rid);
  const payload = {
    [fieldNames.mfaVerified]: !!value,
  };
  dbg(rid, 'setMfaVerified ->', payload);
  await tbl.update(id, payload);
}

export async function incrementFailedAttempts(id, current = 0, rid = reqId()) {
  const tbl = usersTable(rid);
  const next = Number(current || 0) + 1;
  const payload = { [fieldNames.failedAttempts]: next };
  dbg(rid, 'incrementFailedAttempts ->', payload);
  await tbl.update(id, payload);
  return next;
}

export async function resetFailedAttempts(id, rid = reqId()) {
  const tbl = usersTable(rid);
  const payload = { [fieldNames.failedAttempts]: 0 };
  dbg(rid, 'resetFailedAttempts ->', payload);
  await tbl.update(id, payload);
}

export function getUserPhone(user) {
  const val = user?.fields?.[fieldNames.phone];
  // Allow numbers stored with or without '+'; Twilio accepts E.164
  return val ? String(val).trim() : null;
}

// Optional, best-effort login activity log
export async function logLoginEvent(id, event, reason = '', rid = reqId()) {
  const tbl = loginLogsTableOrNull(rid);
  if (!tbl) return;

  // We don't know the exact column schema of your Login Logs table.
  // We try a few common field names; unknown fields are ignored by Airtable SDK.
  const candidate = {
    UserId: id,
    Event: event, // may not exist (we'll swallow errors in the caller)
    Reason: reason, // may not exist
    Timestamp: new Date().toISOString(),
  };

  try {
    dbg(rid, 'logLoginEvent ->', candidate);
    await tbl.create(candidate);
  } catch (e) {
    // Do not throw; only warn so login flow is never blocked by log schema.
    warn(rid, 'logLoginEvent skipped:', e?.message || e);
  }
}

// Re-export a small API surface so routes never call Airtable directly.
export default {
  fieldNames,
  getUserByEmail,
  getUserById,
  setMfaTemp,
  clearMfaTemp,
  setMfaVerified,
  incrementFailedAttempts,
  resetFailedAttempts,
  getUserPhone,
  logLoginEvent,
  _internal: { reqId, usersTable }, // for tests/diagnostics if needed
};
