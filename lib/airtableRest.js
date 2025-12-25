// /lib/airtableRest.js
// Lightweight Airtable REST helpers (no 'airtable' SDK). Safe to add alongside your existing /lib/airtable.js

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  // Fail early (you'll see this in terminal if envs are missing)
  console.warn('[airtableRest] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID');
}

export const TABLES = {
  USERS: process.env.AIRTABLE_USERS_TABLE || 'Users',
  LOGIN_LOGS: process.env.AIRTABLE_LOGIN_LOGS_TABLE || 'Login Logs',
  ROLES: process.env.AIRTABLE_ROLES_TABLE || 'Roles',
};

async function apiRequest(method, path, body) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg = json?.error?.message || text || `Airtable error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

function enc(name) {
  return encodeURIComponent(name);
}

export async function selectOneByFormula(tableName, formula) {
  const params = new URLSearchParams({
    maxRecords: '1',
    filterByFormula: formula,
  }).toString();
  const data = await apiRequest('GET', `${enc(tableName)}?${params}`);
  return (data.records && data.records[0]) || null;
}

export async function updateRecord(tableName, id, fields, typecast = true) {
  const payload = { records: [{ id, fields }], typecast };
  const data = await apiRequest('PATCH', enc(tableName), payload);
  return (data.records && data.records[0]) || null;
}

export async function createRecord(tableName, fields, typecast = true) {
  const payload = { records: [{ fields }], typecast };
  const data = await apiRequest('POST', enc(tableName), payload);
  return (data.records && data.records[0]) || null;
}

export async function findUserByEmail(email) {
  const esc = String(email || '')
    .trim()
    .toLowerCase()
    .replace(/'/g, "\\'");
  const formula = `LOWER({Email})='${esc}'`;
  return selectOneByFormula(TABLES.USERS, formula);
}

export function nowPlusMinutes(mins) {
  return new Date(Date.now() + (mins || 0) * 60000).toISOString();
}

export default {
  TABLES,
  selectOneByFormula,
  updateRecord,
  createRecord,
  findUserByEmail,
  nowPlusMinutes,
};
