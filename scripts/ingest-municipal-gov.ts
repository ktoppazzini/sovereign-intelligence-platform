import 'cross-fetch/polyfill';
import { airtable, upsertRows, GovRow } from './shared/airtable';
import { COUNTRIES, GovCountry } from './shared/countries';
import { getFixedTranslations, ROLE_LADDER } from './shared/translations';

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE = process.env.AIRTABLE_MUNI_TABLE || 'Municipal Government';
if (!AIRTABLE_BASE_ID) throw new Error('Missing AIRTABLE_BASE_ID');

const base = airtable(AIRTABLE_BASE_ID);

// Cities/municipalities per country
function municipalitiesSparql(countryQID: string, lang: string) {
  return `
SELECT ?mun ?munLabel ?article WHERE {
  ?mun wdt:P31 ?type ; wdt:P17 ${countryQID} .
  VALUES ?type {
    wd:Q515       # city
    wd:Q15284     # municipality
    wd:Q7930989   # city/town
    wd:Q1637706   # urban municipality
  }
  OPTIONAL {
    ?article schema:about ?mun ;
             schema:isPartOf <https://${lang}.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
}
LIMIT 400
  `;
}

// “City departments” – grab items that are “government agency” (Q327333), “municipal department” if available.
// Fallback: we’ll just seed hierarchy under the city name if none found.
function municipalDepartmentsSparql(munQID: string, lang: string) {
  return `
SELECT ?dept ?deptLabel ?article WHERE {
  ?dept wdt:P31 ?t ;
        wdt:P131* ${munQID} .
  VALUES ?t {
    wd:Q327333   # government agency
    wd:Q4164871  # position? (rare)
  }
  OPTIONAL {
    ?article schema:about ?dept ;
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

async function fetchMunicipalities(country: GovCountry, countryQID: string) {
  const lang = country.languages[0] || 'en';
  const rows = await wikidata(municipalitiesSparql(countryQID, lang));
  return rows.map((r: any) => ({
    id: r.mun.value.replace('http://www.wikidata.org/entity/', 'wd:'),
    label: r.munLabel?.value || '—',
    article: r.article?.value || null,
  })) as { id: string; label: string; article: string | null }[];
}

async function fetchMunicipalDepartments(munQID: string, lang: string) {
  const rows = await wikidata(municipalDepartmentsSparql(munQID, lang));
  return rows.map((r: any) => ({
    id: r.dept.value.replace('http://www.wikidata.org/entity/', 'wd:'),
    label: r.deptLabel?.value || '—',
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

  const municipalities = await fetchMunicipalities(country, countryQID);
  const allRows: GovRow[] = [];

  for (const city of municipalities) {
    const depts = await fetchMunicipalDepartments(city.id, lang);
    const departments = depts.length
      ? depts
      : [{ id: city.id, label: city.label, article: city.article }];

    for (const dept of departments) {
      for (const roleEN of ROLE_LADDER) {
        const role = t[roleEN] ?? roleEN;
        allRows.push({
          Country: country.name,
          Level: 'Municipal',
          Region: city.label, // city/municipality name
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
  const enabled = COUNTRIES;
  let total = 0;
  for (const c of enabled) {
    console.log(`\n▶ Municipal seeding: ${c.name}`);
    const rows = await buildRowsForCountry(c);
    if (!rows.length) {
      console.log('  (no rows)');
      continue;
    }
    await upsertRows(base, AIRTABLE_TABLE, rows);
    console.log(`  ✓ inserted ${rows.length}`);
    total += rows.length;
  }
  console.log(`\nDONE. Total Municipal rows: ${total}`);
})();
