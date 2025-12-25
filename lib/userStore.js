// lib/userStore.js
// Airtable helpers used by 2FA routes. Named exports only.

import * as AirtablePkg from 'airtable';
const Airtable = AirtablePkg?.default ?? AirtablePkg;

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
const USERS_EMAIL_FIELD = process.env.AIRTABLE_USERS_EMAIL_FIELD || 'Email';

if (!API_KEY || !BASE_ID) {
  console.warn('[userStore] Missing AIRTABLE_API_KEY / AIRTABLE_BASE_ID');
}

let _base;
function base() {
  if (!_base) _base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);
  return _base;
}

function toPlain(r) {
  return r ? { id: r.id, fields: r.fields || {} } : null;
}

export async function getUserByEmail(email, rid) {
  const low = String(email || '')
    .trim()
    .toLowerCase();
  if (!low) return null;
  const t0 = Date.now();
  const formula = `LOWER({${USERS_EMAIL_FIELD}})='${low.replace(/'/g, "\\'")}'`;
  const recs = await base()(USERS_TABLE)
    .select({ maxRecords: 1, filterByFormula: formula })
    .firstPage();
  const rec = toPlain(recs?.[0]);
  console.log(`[AT ${rid}] findOneByEmail ${USERS_TABLE} ms=${Date.now() - t0} found=${!!rec}`);
  return rec;
}

export async function set2FACode(recId, code, expiresIso, rid) {
  const t0 = Date.now();
  await base()(USERS_TABLE).update([
    {
      id: recId,
      fields: {
        '2FA Code': String(code),
        '2FA Expires': expiresIso,
        '2FA Attempts': 0,
      },
    },
  ]);
  console.log(`[AT ${rid}] updateRecord ${USERS_TABLE} id=${recId} ms=${Date.now() - t0}`);
}

export async function incrementFailedAttempts(recId, rid) {
  const rec = await base()(USERS_TABLE).find(recId);
  const cur = Number(rec?.fields?.['2FA Attempts'] ?? 0) || 0;
  await base()(USERS_TABLE).update([{ id: recId, fields: { '2FA Attempts': cur + 1 } }]);
  console.log(`[AT ${rid}] attempts++ -> ${cur + 1}`);
}

export async function clear2FACode(recId, rid) {
  await base()(USERS_TABLE).update([
    {
      id: recId,
      fields: {
        '2FA Code': '',
        '2FA Expires': '',
        '2FA Attempts': 0,
      },
    },
  ]);
  console.log(`[AT ${rid}] cleared 2FA fields`);
}

// Alias for consumeMfa - clears code and marks as verified
export async function consumeMfa(recordId, rid) {
  await base()(USERS_TABLE).update([
    {
      id: recordId,
      fields: {
        '2FA Code': '',
        '2FA Expires': '',
        '2FA Attempts': 0,
        'MFA Verified': true,
      },
    },
  ]);
  console.log(`[AT ${rid}] consumed MFA and marked verified`);
}
