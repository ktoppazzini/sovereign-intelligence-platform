// lib/userStore.js
// Airtable helpers used by 2FA routes. Only named exports (no default).

import * as AirtablePkg from 'airtable';
const Airtable = AirtablePkg?.default ?? AirtablePkg;

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';

if (!API_KEY || !BASE_ID) {
  console.warn('[userStore] Missing Airtable env vars AIRTABLE_API_KEY / AIRTABLE_BASE_ID');
}

let _base;
function base() {
  if (!_base) _base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);
  return _base;
}

// ------- helpers -------
function toPlainRecord(r) {
  return r ? { id: r.id, fields: r.fields || {} } : null;
}

// ------- API -------
export async function getUserByEmail(email, rid) {
  const low = String(email || '')
    .trim()
    .toLowerCase();
  if (!low) return null;

  const t0 = Date.now();
  const records = await base()(USERS_TABLE)
    .select({
      maxRecords: 1,
      filterByFormula: `LOWER({Email})='${low.replace(/'/g, "\\'")}'`,
    })
    .firstPage();

  const rec = toPlainRecord(records?.[0]);
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
  const recs = await base()(USERS_TABLE).find(recId);
  const current = Number(recs?.fields?.['2FA Attempts'] ?? 0) || 0;
  await base()(USERS_TABLE).update([{ id: recId, fields: { '2FA Attempts': current + 1 } }]);
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
}
