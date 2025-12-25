// lib/airtable.js
// ESM-friendly helpers for Airtable + redacted debug output

const redact = (v) => (v ? v.replace(/.(?=.{6}$)/g, '•') : '');

export function getAirtableEnv() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;

  // If you’ve set AIRTABLE_USERS_TABLE in .env.local it will be used.
  // Otherwise we default to "Users". Change the default here if your table name differs.
  const table =
    (process.env.AIRTABLE_USERS_TABLE && process.env.AIRTABLE_USERS_TABLE.trim()) ||
    (process.env.AIRTABLE_USERS_TBL && process.env.AIRTABLE_USERS_TBL.trim()) ||
    'Users';

  return { key, base, table };
}

export function validateAirtableEnv() {
  const { key, base, table } = getAirtableEnv();
  const problems = [];
  if (!key) problems.push('AIRTABLE_API_KEY is missing');
  if (!base) problems.push('AIRTABLE_BASE_ID is missing');
  if (!table) problems.push('AIRTABLE_USERS_TABLE is missing (or defaulted to "Users")');

  return {
    ok: problems.length === 0,
    problems,
    summary: {
      base,
      table,
      keyPreview: redact(key),
    },
  };
}

export async function airtableFetch({ table, params = {} }) {
  const { key, base } = getAirtableEnv();

  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) search.set(k, String(v));
  });

  const url = `https://api.airtable.com/v0/${encodeURIComponent(
    base || '',
  )}/${encodeURIComponent(table || '')}?${search.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = { error: { message: 'Non-JSON response from Airtable' } };
  }

  return { status: res.status, json, url };
}

// Best-effort unifier for common Airtable field shapes
export function readField(fields, name) {
  const v = fields?.[name];
  if (v == null) return null;

  if (Array.isArray(v)) {
    if (v.length === 0) return '';
    if (typeof v[0] === 'string') return v.join(',');
    if (typeof v[0] === 'object' && v[0]?.id) return v.map((x) => x.id).join(',');
    return JSON.stringify(v);
  }
  if (typeof v === 'object' && v?.name) return v.name; // single/multi select
  if (typeof v === 'boolean') return v ? 'true' : 'false'; // checkbox
  return String(v);
}
