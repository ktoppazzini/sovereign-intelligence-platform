// lib/airtable.js
// Small, explicit helpers used by /api/admin/users and the Users UI.

export function getAirtableEnv() {
  return {
    apiKey:
      process.env.AIRTABLE_API_KEY ||
      process.env.NEXT_PUBLIC_AIRTABLE_API_KEY ||
      process.env.SI_AIRTABLE_API_KEY, // tolerate your older key name if present
    baseId: process.env.AIRTABLE_BASE_ID,
    usersTable: process.env.AIRTABLE_USERS_TABLE || 'Users',
  };
}

export function validateAirtableEnv(env = getAirtableEnv()) {
  const missing = [];
  if (!env.apiKey) missing.push('AIRTABLE_API_KEY');
  if (!env.baseId) missing.push('AIRTABLE_BASE_ID');
  if (!env.usersTable) missing.push('AIRTABLE_USERS_TABLE');

  return {
    ok: missing.length === 0,
    missing,
    // never leak secrets back to the client
    envForDebug: {
      baseId: env.baseId,
      usersTable: env.usersTable,
      apiKey: env.apiKey ? '***' : '',
    },
  };
}

export async function airtableFetch(path, init = {}, env = getAirtableEnv()) {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${env.apiKey}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const url = `https://api.airtable.com/v0/${env.baseId}/${path}`;
  const res = await fetch(url, { ...init, headers, cache: 'no-store' });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* keep text */
  }

  if (!res.ok) {
    const err = new Error('airtable_fetch_failed');
    err.status = res.status;
    err.url = url;
    err.body = json || text || null;
    throw err;
  }
  return json;
}

// For debugging: flatten an Airtable field for logging.
export function readField(v) {
  if (Array.isArray(v)) {
    if (v.length === 0) return '';
    if (typeof v[0] === 'string') return v.join(',');
    if (typeof v[0] === 'object' && v[0]?.id) return v.map((x) => x.id).join(',');
  }
  if (v && typeof v === 'object' && 'name' in v) return v.name;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `${v ?? ''}`;
}
