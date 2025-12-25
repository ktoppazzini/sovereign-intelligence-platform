// scripts/seedAirtableGov.ts
// Usage:
//   ts-node scripts/seedAirtableGov.ts ./data/provincial_state_gov_roles_five_countries.csv
// or
//   node scripts/seedAirtableGov.js ./data/municipal_gov_roles_five_countries.csv

import fs from 'node:fs';
import path from 'node:path';
import csv from 'csv-parse/sync';
import Airtable from 'airtable';

// ── ENV you already use ───────────────────────────────────────────
const {
  AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID,
  AIRTABLE_GOV_TABLE = 'Governments', // change if needed
} = process.env;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local');
  process.exit(1);
}

// ── Init Airtable ─────────────────────────────────────────────────
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// ── Helpers ──────────────────────────────────────────────────────
type Row = {
  Country: string;
  Level: string;
  Region: string;
  'Executive Branch': string;
  Department: string;
  Branch: string;
  Division: string;
  Directorate: string;
  Unit: string;
  Role: string;
  SourceURL: string;
};

function chunk<T>(arr: T[], size = 10): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function run() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/seedAirtableGov.js <csv-path>');
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(csvPath));
  const records: Row[] = csv.parse(raw, { columns: true, skip_empty_lines: true });

  // Optional: filter by country to seed a subset
  // const ALLOWLIST = ['Canada','United States'];
  // const filtered = records.filter(r => ALLOWLIST.includes(r.Country));

  const batches = chunk(
    records.map((r) => ({
      fields: {
        Country: r.Country,
        Level: r.Level,
        Region: r.Region || null,
        Executive: r['Executive Branch'] || null,
        Department: r.Department || null,
        Branch: r.Branch || null,
        Division: r.Division || null,
        Directorate: r.Directorate || null,
        Unit: r.Unit || null,
        Role: r.Role || null,
        SourceURL: r.SourceURL || null,
      },
    })),
    10,
  );

  console.log(`Seeding ${records.length} rows into "${AIRTABLE_GOV_TABLE}"…`);
  let created = 0;

  for (const batch of batches) {
    await base(AIRTABLE_GOV_TABLE).create(batch);
    created += batch.length;
    process.stdout.write(`\rCreated: ${created}/${records.length}`);
  }

  console.log('\n✅ Done.');
}

run().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
