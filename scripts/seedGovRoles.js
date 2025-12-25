// scripts/seedGovRoles.js
// Usage: node scripts/seedGovRoles.js /absolute/or/relative/path/to/national_gov_roles_five_countries.csv

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_GOV_ROLES_TABLE } = process.env;
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in env.');
  process.exit(1);
}
const TABLE = AIRTABLE_GOV_ROLES_TABLE || 'GovRoles';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function parseCSV(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = [];
  const rows = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (headers.length === 0) {
      headers = line.split(',').map((h) => h.trim().replace(/^\uFEFF/, '')); // strip BOM
      continue;
    }
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        parts.push(current);
        current = '';
        continue;
      }
      current += ch;
    }
    parts.push(current);
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = (parts[idx] ?? '').trim()));
    rows.push(obj);
  }
  return rows;
}

async function batchInsert(records) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}`;
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // Airtable allows up to 10 records per request
  for (let i = 0; i < records.length; i += 10) {
    const slice = records.slice(i, i + 10);
    const payload = { records: slice.map((fields) => ({ fields })) };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) {
      const text = await res.text();
      console.error('Batch failed:', text);
      process.exit(1);
    }
    console.log(`Inserted ${i + slice.length}/${records.length}`);
    await sleep(210); // be nice to API
  }
}

(async () => {
  try {
    const csvPath = process.argv[2];
    if (!csvPath) {
      console.error(
        'Provide path to CSV file. Example: node scripts/seedGovRoles.js ./national_gov_roles_five_countries.csv',
      );
      process.exit(1);
    }
    const abs = path.resolve(csvPath);
    const rows = await parseCSV(abs);

    // Map CSV columns directly to Airtable fields (same names)
    const records = rows.map((r) => ({
      Country: r['Country'] || '',
      Level: r['Level'] || 'National',
      'Executive Branch': r['Executive Branch'] || 'Executive',
      Department: r['Department'] || '',
      Branch: r['Branch'] || '',
      Division: r['Division'] || '',
      Directorate: r['Directorate'] || '',
      Unit: r['Unit'] || '',
      Role: r['Role'] || '',
      SourceURL: r['SourceURL'] || '',
    }));

    await batchInsert(records);
    console.log('Done!');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
