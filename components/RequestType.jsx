// app/api/service-requests/types/route.js  (or your exact path)
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TBL_REQUEST_TYPES = process.env.AIRTABLE_TABLE_REQUEST_TYPES || 'Request Types';

function pickLabel(fields, lang) {
  const name =
    fields.Name ?? fields.English ?? fields['Request Type'] ?? fields.Type ?? fields.Label ?? '';
  if (!lang || /^english$/i.test(lang)) return String(name || fields.Label || '').trim();

  const candidates = [
    fields[lang],
    fields[`${lang} Label`],
    fields[`Label ${lang}`],
    fields[`Label_${(lang || '').toLowerCase()}`],
    fields.Label,
  ];
  const chosen = candidates.find((v) => typeof v === 'string' && v.trim() !== '');
  return String(chosen || name || '').trim();
}

export async function GET(req) {
  const url = new URL(req.url);
  const lang = url.searchParams.get('lang') || 'English';
  const debug = url.searchParams.has('debug') || url.searchParams.has('options');
  const rid = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2)).slice(
    0,
    8,
  );
  const log = (...a) => console.log(`[types ${rid}]`, ...a);

  try {
    // lazy import to avoid any CJS/edge issues; your helper must use the PAT + base correctly
    const { table } = await import('@/lib/airtable');

    log('start', {
      base: (process.env.AIRTABLE_BASE_ID || '').slice(-6), // tail for safety
      table: TBL_REQUEST_TYPES,
      lang,
    });

    const rows = await table(TBL_REQUEST_TYPES).select(/* { view: 'Grid view' } */).all();

    const map = {};
    for (const rec of rows) {
      const f = rec.fields || {};
      const englishKey = String(
        f.Name ?? f.English ?? f['Request Type'] ?? f.Type ?? f.Label ?? '',
      ).trim();
      if (!englishKey) continue;

      const label = pickLabel(f, lang) || englishKey;
      if (!map[englishKey]) map[englishKey] = label; // de-dupe
    }

    return NextResponse.json(
      { ok: true, lang, count: Object.keys(map).length, types: map },
      { status: 200 },
    );
  } catch (err) {
    // Surface the real reason when ?debug=1 so it’s easy to diagnose
    log('airtable error', {
      name: err?.name,
      code: err?.statusCode,
      error: err?.error,
      message: err?.message,
    });
    return NextResponse.json(
      {
        ok: false,
        types: {},
        ...(debug && {
          error: {
            code: err?.statusCode,
            name: err?.name,
            message: err?.message,
          },
        }),
      },
      { status: 200 },
    );
  }
}
