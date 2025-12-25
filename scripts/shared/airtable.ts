import Airtable from 'airtable';

export function airtable(baseId: string) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
  return new Airtable.Base(baseId);
}

export type GovRow = {
  Country: string;
  Level: 'National' | 'Provincial/State' | 'Municipal';
  Region: string | null;
  Executive: string;
  Department: string;
  Branch: string;
  Division: string;
  Directorate: string;
  Unit: string;
  Role: string;
  SourceURL?: string | null;
};

export async function upsertRows(
  base: Airtable.Base,
  tableName: string,
  rows: GovRow[],
  keyFields: (keyof GovRow)[] = ['Country', 'Level', 'Region', 'Department', 'Role'],
) {
  const BATCH = 10;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const toCreate = slice.map((r) => ({ fields: r as any }));
    await base(tableName).create(toCreate);
    await delay(+process.env.REQUEST_DELAY_MS! || 200);
  }
}

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
