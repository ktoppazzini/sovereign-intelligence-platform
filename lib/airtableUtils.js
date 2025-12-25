// lib/airtableUtils.js
// Airtable bootstrap + tiny debug helpers, aligned to your .env.local (no underscores in field names)

import Airtable from 'airtable';

// ---------- debug helpers ----------
export function reqId() {
  return Math.random().toString(36).slice(2, 8);
}
export function dbg(rid, ...args) {
  // prefix every line with a tag so it’s easy to filter in the console
  console.log(`[AT ${rid}]`, ...args);
}

// ---------- env validation ----------
export function assertEnv(rid) {
  const must = [
    'AIRTABLE_API_KEY',
    'AIRTABLE_BASE_ID',
    // allow either table ID or name for Users
    // (IDs preferred for speed/stability)
    'AIRTABLE_USERS_TABLE_ID', // recommended
    // optional fallbacks:
    // 'AIRTABLE_USERS_TABLE',
  ];

  const missing = must.filter(k => !process.env[k]);
  if (missing.length) {
    dbg(rid, 'Missing env vars:', missing);
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

// ---------- base + table factories ----------
let _base = null;

export function getBase(rid) {
  assertEnv(rid);
  if (_base) return _base;

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  // never log the actual key
  dbg(rid, `init base ${baseId}`);
  _base = new Airtable({ apiKey }).base(baseId);
  return _base;
}

/**
 * Returns an Airtable table instance by ID or Name.
 * Accepts either an internal "tbl..." id (preferred) or a table name.
 */
export function table(rid, idOrName) {
  const base = getBase(rid);
  return base(idOrName);
}

// Specific table helpers (prefer IDs, fallback to names if provided)
export function usersTable(rid) {
  const id = process.env.AIRTABLE_USERS_TABLE_ID || process.env.AIRTABLE_USERS_TABLE;
  if (!id) {
    throw new Error('AIRTABLE_USERS_TABLE_ID (or AIRTABLE_USERS_TABLE) not configured');
  }
  return table(rid, id);
}

export function loginLogsTable(rid) {
  const id = process.env.AIRTABLE_LOGIN_LOGS_TABLE_ID || process.env.AIRTABLE_LOGIN_LOGS_TABLE;
  if (!id) {
    // optional table; only throw if someone tries to use it without config
    throw new Error('AIRTABLE_LOGIN_LOGS_TABLE_ID (or AIRTABLE_LOGIN_LOGS_TABLE) not configured');
  }
  return table(rid, id);
}

export function verificationsTable(rid) {
  const id =
    process.env.AIRTABLE_VERIFICATIONS_TABLE_ID || process.env.AIRTABLE_VERIFICATIONS_TABLE;
  if (!id) {
    // optional table; only throw if someone tries to use it without config
    throw new Error(
      'AIRTABLE_VERIFICATIONS_TABLE_ID (or AIRTABLE_VERIFICATIONS_TABLE) not configured'
    );
  }
  return table(rid, id);
}

// ---------- tiny utils ----------
/** Safely returns an env value; throws if missing. */
export function envGet(key) {
  const v = process.env[key];
  if (typeof v === 'undefined' || v === null || v === '') {
    throw new Error(`Missing env: ${key}`);
  }
  return v;
}

/** Escapes single quotes for use inside formula strings. */
export function escFormulaString(s) {
  return String(s).replace(/'/g, "\\'");
}
