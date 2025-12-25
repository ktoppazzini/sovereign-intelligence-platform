// scripts/ingest-national-gov.ts
// Run:
//   npx ts-node scripts/ingest-national-gov.ts
// or (JS build) node scripts/ingest-national-gov.js

import 'dotenv/config';
import fetch from 'node-fetch';
import Airtable from 'airtable';
import { GOV_COUNTRIES, GovCountry } from '../config/countries.gov';

// ───────────────────────────────────────────────────────────
// ENV
const {
  AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID,
  AIRTABLE_GOV_TABLE = 'Governments',
  OPENAI_API_KEY, // optional: only used for translating fixed strings when needed
} = process.env;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local');
  process.exit(1);
}

// ───────────────────────────────────────────────────────────
// Airtable
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

type GovRow = {
  Country: string;
  Level: 'National';
  Region: string | null; // unused at national level
  Executive: string | null;
  Department: string | null; // ministry name
  Branch: string | null; // "Policy"
  Division: string | null; // "Programs"
  Directorate: string | null; // "Operations"
  Unit: string | null; // "Unit A"
  Role: string | null; // ladder role
  SourceURL: string | null; // where we got the department name
};

// Fixed ladder (political + non-political)
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

// ───────────────────────────────────────────────────────────
// Wikidata helpers

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';

// SPARQL: ministries for a given country (QID)
function ministriesQuery(countryQID: string, languages: string[]) {
  // Build a label language preference like "fr,en"
  const langPref = languages.join(',') + ',en';
  return `
SELECT ?item ?itemLabel ?itemAltLabel ?itemDescription ?itemArticle
WHERE {
  ?item wdt:P31/wdt:P279* wd:Q995275 .   # instance of (or subclass of) ministry
  ?item wdt:P17 wd:${countryQID} .       # country = target

  OPTIONAL {
    ?itemArticle schema:about ?item ;
                 schema:inLanguage "${languages[0]}" ;
                 schema:isPartOf <https://${languages[0]}.wikipedia.org/> .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
`;
}

async function fetchMinistries(country: GovCountry) {
  const q = ministriesQuery(country.wikidataQID, country.languages);
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(q)}&format=json`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Sovereign-OPS Data Ingest (contact: admin@example.com)',
      Accept: 'application/sparql-results+json',
    },
  });
  if (!r.ok) throw new Error(`Wikidata error: ${r.status} ${r.statusText}`);
  const data = await r.json();

  type Bind = {
    item?: { value: string };
    itemLabel?: { value: string };
    itemArticle?: { value: string };
  };

  const rows = (data?.results?.bindings as Bind[] | undefined) ?? [];
  return rows
    .map((b) => ({
      qid: b.item?.value ?? '',
      label: (b.itemLabel?.value ?? '').trim(),
      article: (b.itemArticle?.value ?? '').trim() || null,
    }))
    .filter((x) => x.label);
}

// ───────────────────────────────────────────────────────────
// Optional translation for fixed strings (if you want)
async function translateFixed(label: string, lang: string): Promise<string> {
  // If no OpenAI key or target is English, just return as-is.
  if (!OPENAI_API_KEY || lang === 'en') return label;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'Translate the user string into the target language. Return only the translated string.',
          },
          { role: 'user', content: `Language: ${lang}\nText: ${label}` },
        ],
      }),
    });
    const j = await r.json();
    const out = j?.choices?.[0]?.message?.content?.trim();
    return out || label;
  } catch {
    return label;
  }
}

// ───────────────────────────────────────────────────────────
// Build rows for Airtable

async function buildRowsForCountry(country: GovCountry): Promise<GovRow[]> {
  const ministries = await fetchMinistries(country);
  if (!ministries.length) {
    console.warn(`(No ministries found for ${country.name})`);
    return [];
  }

  // Executive label per language preference
  // We simply translate "Executive Branch" into the first preferred language (or leave EN).
  const execLabel = await translateFixed('Executive Branch', country.languages[0]);

  const rows: GovRow[] = [];
  for (const m of ministries) {
    // Ladder per ministry
    for (const roleEN of ROLE_LADDER) {
      const roleLocalized = await translateFixed(roleEN, country.languages[0]);
      rows.push({
        Country: country.name,
        Level: 'National',
        Region: null,
        Executive: execLabel,
        Department: m.label,
        Branch: 'Policy',
        Division: 'Programs',
        Directorate: 'Operations',
        Unit: 'Unit A',
        Role: roleLocalized,
        SourceURL: m.article,
      });
    }
  }
  return rows;
}

// ───────────────────────────────────────────────────────────
// Airtable write

function chunk<T>(a: T[], n = 10): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

async function writeRows(rows: GovRow[]) {
  const batches = chunk(
    rows.map((r) => ({ fields: r })),
    10,
  );
  let created = 0;
  for (const batch of batches) {
    await base(AIRTABLE_GOV_TABLE).create(batch);
    created += batch.length;
    process.stdout.write(`\rCreated: ${created}/${rows.length}`);
  }
  process.stdout.write('\n');
}

// ───────────────────────────────────────────────────────────
// Main

async function main() {
  const active = GOV_COUNTRIES.filter((c) => c.enabled);
  if (!active.length) {
    console.log('No countries enabled in config/countries.gov.ts');
    return;
  }

  for (const c of active) {
    console.log(`\n🌐 ${c.name} — National level (languages: ${c.languages.join(', ')})`);
    const rows = await buildRowsForCountry(c);
    console.log(`Inserting ${rows.length} rows into Airtable…`);
    await writeRows(rows);
    console.log(`✅ Done: ${c.name}`);
  }

  console.log('\nAll enabled countries processed.');
}

main().catch((err) => {
  console.error('\n❌ Ingest failed:', err);
  process.exit(1);
});
