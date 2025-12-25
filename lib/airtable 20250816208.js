// lib/airtable.js
// ESM module for Next.js app router

const DEFAULT_API_URL = process.env.AIRTABLE_API_URL || 'https://api.airtable.com/v0';

export function getAirtableEnv() {
  const apiKey = process.env.AIRTABLE_API_KEY || '';
  const baseId = process.env.AIRTABLE_BASE_ID || '';
  const usersTable = process.env.AIRTABLE_USERS_TABLE || 'Users';
  const apiUrl = DEFAULT_API_URL.replace(/\/+$/, '');
  return { apiKey, baseId, usersTable, apiUrl };
}

export function validateAirtableEnv() {
  const env = getAirtableEnv();
  const missing = [];
  if (!env.apiKey) missing.push('AIRTABLE_API_KEY');
  if (!env.baseId) missing.push('AIRTABLE_BASE_ID');
  if (!env.usersTable) missing.push('AIRTABLE_USERS_TABLE (or default "Users")');

  if (missing.length) {
    return {
      ok: false,
      message: `Missing Airtable env: ${missing.join(', ')}`,
      env,
    };
  }
  return { ok: true, env };
}

/**
 * Minimal smart stringifier used by old UI bits
 */
export function readField(v) {
  if (v == null) return '';
  if (Array.isArray(v)) {
    if (v.length === 0) return '';
    if (typeof v[0] === 'object' && v[0] && (v[0].id || v[0].name)) {
      return v.map((x) => x.name || x.id).join(','); // linked records/attachments names
    }
    return v.join(',');
  }
  if (typeof v === 'object') {
    if ('name' in v) return String(v.name ?? '');
    if ('id' in v) return String(v.id ?? '');
    return JSON.stringify(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

/**
 * Wraps fetch to Airtable REST API v0
 * @param {Object} opt
 * @param {string} opt.table - table name (unencoded)
 * @param {string} [opt.path] - optional subpath like `${table}/${id}`
 * @param {string} [opt.method='GET']
 * @param {Object} [opt.query] - query params object
 * @param {Object} [opt.body] - JSON body
 */
export async function airtableFetch(opt = {}) {
  const { env } = validateAirtableEnv();
  const { apiKey, baseId, apiUrl } = env;

  const method = (opt.method || 'GET').toUpperCase();
  const table = opt.table || '';
  const path = opt.path || encodeURIComponent(table);
  const usp = new URLSearchParams();
  if (opt.query) {
    for (const [k, v] of Object.entries(opt.query)) {
      if (v !== undefined && v !== null) usp.append(k, String(v));
    }
  }
  const url = `${apiUrl}/${baseId}/${path}${usp.toString() ? `?${usp.toString()}` : ''}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(opt.body || {}),
    cache: 'no-store',
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }

  return {
    ok: res.ok,
    status: res.status,
    url,
    data,
    headers: Object.fromEntries(res.headers.entries()),
  };
}
