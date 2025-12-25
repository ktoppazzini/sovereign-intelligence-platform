// Airtable options loader
// This module reads Airtable data from the base configured in env vars.
// Environment variables (preferably NEXT_PUBLIC_*) should be set in env.local
// BASE: NEXT_PUBLIC_AIRTABLE_BASE_ID, API key: NEXT_PUBLIC_AIRTABLE_API_KEY

const path = require('path');
const fs = require('fs');

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;

const TABLES = {
  countries: 'Countries',
  tiers: 'Tiers',
  companySizes: 'Company Sizes',
  timeFrames: 'Time Frames',
};

let countriesCache;
let tiersCache;
let companySizesCache;
let timeFramesCache;

function extractFirstString(fields) {
  if (!fields) return null;
  for (const v of Object.values(fields)) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function sortTableValues(tableName, values) {
  const arr = Array.from(values || []);
  switch (tableName) {
    case TABLES.countries:
      return arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    case TABLES.tiers: {
      const firstNumber = (s) => {
        const m = s.match(/\d+/);
        return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
      };
      return arr.sort((a, b) => {
        const na = firstNumber(a);
        const nb = firstNumber(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      });
    }
    case TABLES.companySizes: {
      const lower = (s) => {
        const m = s.match(/\d+/);
        return m ? parseInt(m[0].replace(/,/g, ''), 10) : Number.POSITIVE_INFINITY;
      };
      return arr.sort((a, b) => lower(a) - lower(b));
    }
    case TABLES.timeFrames: {
      const toMonths = (s) => {
        const mMonth = s.match(/(\d+(?:\.\d+)?)\s*(month|months)/i);
        if (mMonth) return parseFloat(mMonth[1]);
        const mYear = s.match(/(\d+(?:\.\d+)?)\s*(year|years)/i);
        if (mYear) return parseFloat(mYear[1]) * 12;
        const m = s.match(/(\d+)/);
        return m ? parseFloat(m[1]) : Number.POSITIVE_INFINITY;
      };
      return arr.sort((a, b) => toMonths(a) - toMonths(b));
    }
    default:
      return arr.sort((a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
          return a.localeCompare(b, undefined, { sensitivity: 'base' });
        }
        return 0;
      });
  }
}

async function fetchTable(tableName, cache) {
  if (cache) {
    if (process.env.AIRTABLE_DEBUG === 'true') console.debug('[airtable-fetch] cache hit for ' + tableName);
    return cache;
  }
  const hasCreds = !!BASE_ID && !!API_KEY;
  if (!hasCreds) {
    console.warn('[airtable-fetch] Missing Airtable credentials; falling back to local defaults.');
    const credStatus = 'BASE_ID=' + (BASE_ID ? 'SET' : 'MISSING') + ', API_KEY=' + (API_KEY ? 'SET' : 'MISSING');
    console.warn('[airtable-fetch] credentials: ' + credStatus);
    try {
      const defaultsPath = path.resolve(process.cwd(), 'data', 'default-airtable-options.json');
      if (fs.existsSync(defaultsPath)) {
        const defs = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
        const keyMap = {
          [TABLES.countries]: 'countries',
          [TABLES.tiers]: 'tiers',
          [TABLES.companySizes]: 'companySizes',
          [TABLES.timeFrames]: 'timeFrames',
        };
        const key = keyMap[tableName];
        if (defs && Array.isArray(defs[key])) {
          const values = defs[key].map((v) => (typeof v === 'string' ? v : String(v)));
          const uniqueValues = Array.from(new Set(values.map((v) => v.trim())));
          const sortedValues = sortTableValues(tableName, uniqueValues);
          switch (tableName) {
            case TABLES.countries:
              countriesCache = sortedValues;
              break;
            case TABLES.tiers:
              tiersCache = sortedValues;
              break;
            case TABLES.companySizes:
              companySizesCache = sortedValues;
              break;
            case TABLES.timeFrames:
              timeFramesCache = sortedValues;
              break;
          }
          if (process.env.AIRTABLE_DEBUG === 'true') {
            console.debug('[airtable-fetch] using local defaults for ' + tableName + ': ' + sortedValues.length + ' items');
          }
          return sortedValues;
        }
      }
    } catch (err) {
      // ignore
    }
    return [];
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}?view=Grid%20view&maxRecords=100`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
  if (!res.ok) {
    throw new Error(`Airtable fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const values = data?.records?.map((r) => extractFirstString(r.fields)).filter((v) => !!v);
  // Ensure uniqueness and stable order
  const uniqueValues = Array.from(new Set(values || []));
  const sortedValues = sortTableValues(tableName, uniqueValues);
  switch (tableName) {
    case TABLES.countries:
      countriesCache = sortedValues;
      break;
    case TABLES.tiers:
      tiersCache = sortedValues;
      break;
    case TABLES.companySizes:
      companySizesCache = sortedValues;
      break;
    case TABLES.timeFrames:
      timeFramesCache = sortedValues;
      break;
  }
  if (process.env.AIRTABLE_DEBUG === 'true') {
    console.debug('[airtable-fetch] loaded ' + sortedValues.length + ' values for ' + tableName + ' from Airtable');
  }
  return sortedValues;
}

export async function fetchAirtableOptions() {
  const countries = await fetchTable(TABLES.countries, countriesCache);
  const tiers = await fetchTable(TABLES.tiers, tiersCache);
  const companySizes = await fetchTable(TABLES.companySizes, companySizesCache);
  const timeFrames = await fetchTable(TABLES.timeFrames, timeFramesCache);
  return { countries, tiers, companySizes, timeFrames };
}

export default fetchAirtableOptions;
