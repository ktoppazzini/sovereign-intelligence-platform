// lib/airtable.js
// Robust Airtable helper that works under Next/Turbopack (ESM/CJS safe).
// Exposes both named and default exports so existing imports don't break.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Late-bind the package to avoid ESM/CJS "default" chaos under Turbopack
const airtableMod = require('airtable');
const Airtable = airtableMod?.default || airtableMod;

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.warn('[airtable] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in env (using .env.local)');
}

let _base;
function getBase() {
  if (!_base) _base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);
  return _base;
}

function table(name) {
  return getBase()(name);
}

// Get a single record by field/value
async function readOneBy(tableName, field, value) {
  const tb = table(tableName);
  const filterByFormula = `{${field}} = "${String(value).replace(/"/g, '\\"')}"`;
  const records = await tb.select({ maxRecords: 1, filterByFormula }).firstPage();
  return records[0] ?? null;
}

// Update one record and return it
async function update(tableName, id, fields) {
  const tb = table(tableName);
  const [rec] = await tb.update([{ id, fields }], { typecast: true });
  return rec;
}

export { table, readOneBy, update };
export default { table, readOneBy, update };
