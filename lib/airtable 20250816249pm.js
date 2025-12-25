// /lib/airtable.js
// Thin wrapper around Airtable with both default and named exports,
// so callers can use either a default object or named functions.

import Airtable from 'airtable';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  // Don’t crash; you’ll just get 401s from Airtable if unset.
  console.warn('[airtable] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID');
}

const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

function table(name) {
  return base(name);
}

async function findOne(name, filterByFormula, fields) {
  const t = table(name);
  const opts = { maxRecords: 1, filterByFormula };
  if (Array.isArray(fields) && fields.length) opts.fields = fields;

  const records = await t.select(opts).firstPage();
  return records[0] || null;
}

async function updateRecord(name, id, fields) {
  const t = table(name);
  const [rec] = await t.update([{ id, fields }], { typecast: true });
  return rec;
}

async function createRecord(name, fields) {
  const t = table(name);
  const [rec] = await t.create([{ fields }], { typecast: true });
  return rec;
}

// Named exports
export { base, table, findOne, updateRecord, createRecord };

// Default export for callers that expect a default
export default {
  base,
  table,
  findOne,
  updateRecord,
  createRecord,
};
