// seed-national-airtable.js
/* eslint-disable no-console */
// NATIONAL GOVERNMENT SEEDER – matches provincial/municipal patterns

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 250);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';
const AIRTABLE_TABLE = process.env.AIRTABLE_NAT_TABLE || 'National Government';
const AIRTABLE_MODE = (process.env.AIRTABLE_MODE || 'append').toLowerCase();
const AIRTABLE_ENDPOINT = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) =>
    v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join(
    '\n',
  );
}

const COUNTRIES = [
  { name: 'United States', languages: ['en'], wikidata: 'Q30' },
  { name: 'United Kingdom', languages: ['en'], wikidata: 'Q145' },
  { name: 'France', languages: ['fr'], wikidata: 'Q142' },
  { name: 'Germany', languages: ['de'], wikidata: 'Q183' },
  // { name:'Canada',         languages:['en','fr'], wikidata:'Q16' },
];

const ROLE_LADDER = [
  'Minister / Cabinet Member',
  'Deputy Minister / Permanent Secretary',
  'Associate/Additional Secretary',
  'Director General',
  'Executive Director',
  'Director',
  'Manager / Section Chief',
  'Supervisor / Unit Head',
  'Employee / Analyst',
  'Intern / Trainee',
];

const CACHE_DIR = path.join(process.cwd(), '.cache');
const TRANS_CACHE_FILE = path.join(CACHE_DIR, 'translations.json');
const FIXED_TERMS = [
  'Executive Branch',
  'Policy',
  'Programs',
  'Operations',
  'Unit A',
  ...ROLE_LADDER,
];
function loadCache() {
  try {
    if (fs.existsSync(TRANS_CACHE_FILE))
      return JSON.parse(fs.readFileSync(TRANS_CACHE_FILE, 'utf8'));
  } catch {}
  return {};
}
function saveCache(cache) {
  try {
    ensureDir(CACHE_DIR);
    fs.writeFileSync(TRANS_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch {}
}
const translationCache = loadCache();

async function getFixedTranslations(lang) {
  if (lang === 'en' || !OPENAI_API_KEY) {
    return Object.fromEntries(FIXED_TERMS.map((t) => [t, t]));
  }
  if (translationCache[lang]) {
    const missing = FIXED_TERMS.filter((k) => !translationCache[lang][k]);
    if (missing.length === 0) return translationCache[lang];
  }
  const prompt = [
    `Translate the following UI terms into ${lang}.`,
    `Return ONLY a raw JSON object mapping the English string to the translation (no markdown).`,
    `If a term is commonly kept in English locally, you may keep it unchanged.`,
    ``,
    JSON.stringify(FIXED_TERMS),
  ].join('\n');

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are a precise localization engine. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content ?? '{}';
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = Object.fromEntries(FIXED_TERMS.map((t) => [t, t]));
  }
  translationCache[lang] = { ...(translationCache[lang] || {}), ...parsed };
  saveCache(translationCache);
  return translationCache[lang];
}

// ───────────────────────────────────────────────────────────
// Wikidata fetches

async function fetchNationalMinistries(country) {
  const endpoint = 'https://query.wikidata.org/sparql';
  const query = `
    SELECT ?item ?itemLabel ?article WHERE {
      { ?item wdt:P31/wdt:P279* wd:Q1234894 . }  # ministry
      ?item wdt:P17 wd:${country.wikidata} .
      OPTIONAL {
        ?article schema:about ?item .
        ?article schema:inLanguage "en" .
        ?article schema:isPartOf <https://en.wikipedia.org/> .
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    } LIMIT 500
  `;
  const url = `${endpoint}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SovOps Seeder/1.0 (contact: you@example.com)' },
  });
  const data = await res.json().catch(() => ({}));
  const rows = data?.results?.bindings || [];
  return rows
    .map((b) => ({
      id: b?.item?.value || '',
      label: b?.itemLabel?.value || '',
      article: b?.article?.value || '',
    }))
    .filter((x) => x.label);
}

// ───────────────────────────────────────────────────────────
// Row builder

async function buildRowsForCountry(country) {
  const lang = country.languages[0] || 'en';
  const t = await getFixedTranslations(lang);

  const execLabel = t['Executive Branch'] ?? 'Executive Branch';
  const branchLabel = t['Policy'] ?? 'Policy';
  const divisionLabel = t['Programs'] ?? 'Programs';
  const directorateLabel = t['Operations'] ?? 'Operations';
  const unitLabel = t['Unit A'] ?? 'Unit A';

  const rows = [];
  const orgs = await fetchNationalMinistries(country);
  for (const org of orgs) {
    for (const roleEN of ROLE_LADDER) {
      rows.push({
        Country: country.name,
        Level: 'National',
        Region: '', // no region for national
        Executive: execLabel,
        Department: org.label,
        Branch: branchLabel,
        Division: divisionLabel,
        Directorate: directorateLabel,
        Unit: unitLabel,
        Role: t[roleEN] ?? roleEN,
        SourceURL: org.article,
      });
    }
  }
  return rows;
}

// ───────────────────────────────────────────────────────────
// Airtable client

function atHeaders() {
  return { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' };
}
async function airtableListAllIds(name) {
  const ids = [];
  let offset = undefined;
  do {
    const u = new URL(`${AIRTABLE_ENDPOINT}/${encodeURIComponent(name)}`);
    if (offset) u.searchParams.set('offset', offset);
    const res = await fetch(u, { headers: atHeaders() });
    const j = await res.json();
    (j.records || []).forEach((r) => ids.push(r.id));
    offset = j.offset;
  } while (offset);
  return ids;
}
async function airtableDeleteBatch(name, recordIds) {
  if (!recordIds.length) return;
  const url = `${AIRTABLE_ENDPOINT}/${encodeURIComponent(name)}`;
  for (const ids of chunk(recordIds, 10)) {
    const u = new URL(url);
    ids.forEach((id) => u.searchParams.append('records[]', id));
    await fetch(u, { method: 'DELETE', headers: atHeaders() });
    await sleep(120);
  }
}
async function airtableCreateRows(name, rows) {
  const url = `${AIRTABLE_ENDPOINT}/${encodeURIComponent(name)}`;
  let created = 0;
  for (const b of chunk(rows, 10)) {
    const payload = { records: b.map((fields) => ({ fields })), typecast: true };
    const res = await fetch(url, {
      method: 'POST',
      headers: atHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`Airtable POST failed (${res.status}):`, txt.slice(0, 400));
    } else {
      const j = await res.json();
      created += (j.records || []).length;
    }
    await sleep(150);
  }
  return created;
}

// ───────────────────────────────────────────────────────────
// Main

async function main() {
  const allRows = [];
  for (const c of COUNTRIES) {
    console.log(`→ Building NAT rows for ${c.name}`);
    const rows = await buildRowsForCountry(c);
    allRows.push(...rows);
  }
  console.log(`Built ${allRows.length} national rows.`);

  ensureDir(path.join(process.cwd(), 'data', 'out'));
  const outFile = path.join(process.cwd(), 'data', 'out', 'national_government.csv');
  fs.writeFileSync(outFile, toCSV(allRows), 'utf8');
  console.log(`✔ Wrote CSV to ${outFile}`);

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('⚠ Skipping Airtable push: missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID.');
    return;
  }
  if (AIRTABLE_MODE === 'replace') {
    const ids = await airtableListAllIds(AIRTABLE_TABLE);
    console.log(`Replacing ${ids.length} existing records in "${AIRTABLE_TABLE}"...`);
    await airtableDeleteBatch(AIRTABLE_TABLE, ids);
  } else {
    console.log(`Appending into "${AIRTABLE_TABLE}"...`);
  }
  const created = await airtableCreateRows(AIRTABLE_TABLE, allRows);
  console.log(`✔ Pushed ${created} records to "${AIRTABLE_TABLE}".`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
