import 'cross-fetch/polyfill';
import { airtable, upsertRows, GovRow } from './shared/airtable';
import { COUNTRIES, GovCountry } from './shared/countries';
import { getFixedTranslations, ROLE_LADDER } from './shared/translations';

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE = process.env.AIRTABLE_PROV_TABLE || 'Provincial Government';
if (!AIRTABLE_BASE_ID) throw new Error('Missing AIRTABLE_BASE_ID');

const base = airtable(AIRTABLE_BASE_ID);

// First-level divisions (states/provinces) by country
function divisionsSparql(countryQID: string, lang: string) {
  // This query grabs first-level administrative divisions (states/provinces/regions/etc.) for a country
  // Uses P31 (instance of) with common first-level types; feel free to add more.
  return `
SELECT ?division ?divisionLabel ?article WHERE {
  ?division wdt:P31 ?type ;
            wdt:P17 ${countryQID} .
  VALUES ?type {
    wd:Q10864048 # first-level admin division (generic)
    wd:Q35657    # state of the United States
    wd:Q179872   # province
    wd:Q36784    # region
    wd:Q13218630 # oblast
    wd:Q15060255 # governorate
  }
  OPTIONAL {
    ?article schema:about ?division ;
             schema:isPartOf <https://${lang}.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
}
  `;
}

// “Ministries” of a division: items that are instances of “ministry” and part of that division
function divisionMinistriesSparql(divisionQID: string, lang: string) {
  return `
SELECT ?ministry ?ministryLabel ?article WHERE {
  ?ministry wdt:P31 wd:Q33506 ;  # ministry
            wdt:P131* ${divisionQID} .
  OPTIONAL {
    ?article schema:about ?ministry ;
             schema:isPartOf <https://${lang}.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
}
LIMIT 400
  `;
}

async function wikidata<T = any>(query: string): Promise<T[]> {
  const url = 'https://query.wikidata.org/sparql';
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sparql-query' },
    body: query,
  });
  if (!r.ok) throw new Error(`SPARQL failed: ${r.status}`);
  const j = await r.json();
  return j?.results?.bindings || [];
}

async function fetchCountryQID(iso2: string): Promise<string | null> {
  const q = `
SELECT ?country WHERE {
  ?country wdt:P297 "${iso2}" .
} LIMIT 1`;
  const rows = await wikidata(q);
  const uri = rows?.[0]?.country?.value;
  return uri ? uri.replace('http://www.wikidata.org/entity/', 'wd:') : null;
}

async function fetchDivisions(country: GovCountry, countryQID: string) {
  const lang = country.languages[0] || 'en';
  const rows = await wikidata(divisionsSparql(countryQID, lang));
  return rows.map((r: any) => ({
    id: r.division.value.replace('http://www.wikidata.org/entity/', 'wd:'),
    label: r.divisionLabel?.value || '—',
    article: r.article?.value || null,
  })) as { id: string; label: string; article: string | null }[];
}

async function fetchDivisionMinistries(divisionQID: string, lang: string) {
  const rows = await wikidata(divisionMinistriesSparql(divisionQID, lang));
  return rows.map((r: any) => ({
    id: r.ministry.value.replace('http://www.wikidata.org/entity/', 'wd:'),
    label: r.ministryLabel?.value || '—',
    article: r.article?.value || null,
  })) as { id: string; label: string; article: string | null }[];
}

async function buildRowsForCountry(country: GovCountry): Promise<GovRow[]> {
  const lang = country.languages[0] || 'en';
  const t = await getFixedTranslations(lang);

  const execLabel = t['Executive Branch'] ?? 'Executive Branch';
  const branchLabel = t['Policy'] ?? 'Policy';
  const divisionLabel = t['Programs'] ?? 'Programs';
  const directorate = t['Operations'] ?? 'Operations';
  const unitLabel = t['Unit A'] ?? 'Unit A';

  const countryQID = await fetchCountryQID(country.code);
  if (!countryQID) {
    console.warn(`No QID for country ${country.name}`);
    return [];
  }
  const divisions = await fetchDivisions(country, countryQID);
  const allRows: GovRow[] = [];

  for (const div of divisions) {
    // Ministries for each division
    const ministries = await fetchDivisionMinistries(div.id, lang);
    // If none, still create a single department row as the division name
    const departments = ministries.length
      ? ministries
      : [{ id: div.id, label: div.label, article: null }];

    for (const dept of departments) {
      for (const roleEN of ROLE_LADDER) {
        const role = t[roleEN] ?? roleEN;
        allRows.push({
          Country: country.name,
          Level: 'Provincial/State',
          Region: div.label, // province/state/region name
          Executive: execLabel,
          Department: dept.label,
          Branch: branchLabel,
          Division: divisionLabel,
          Directorate: directorate,
          Unit: unitLabel,
          Role: role,
          SourceURL: dept.article || null,
        });
      }
    }
  }

  return allRows;
}

(async () => {
  const enabled = COUNTRIES; // keep your short list enabled
  let total = 0;
  for (const c of enabled) {
    console.log(`\n▶ Provincial/State seeding: ${c.name}`);
    const rows = await buildRowsForCountry(c);
    if (!rows.length) {
      console.log('  (no rows)');
      continue;
    }
    await upsertRows(base, AIRTABLE_TABLE, rows);
    console.log(`  ✓ inserted ${rows.length}`);
    total += rows.length;
  }
  console.log(`\nDONE. Total Provincial/State rows: ${total}`);
})();
