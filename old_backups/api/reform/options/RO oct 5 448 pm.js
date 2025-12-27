// app/api/reform/options/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_HOST = process.env.AIRTABLE_API_URL || 'https://api.airtable.com/v0';

export async function GET(req) {
  // Accept both server-only and NEXT_PUBLIC names
  const apiKey = process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  // Table/view names (support *_TABLE and *_TABLE_NAME)
  const T = {
    countries:
      process.env.AIRTABLE_COUNTRIES_TABLE ||
      process.env.AIRTABLE_COUNTRIES_TABLE_NAME ||
      'Countries',
    tiers: process.env.AIRTABLE_TIERS_TABLE || process.env.AIRTABLE_TIERS_TABLE_NAME || 'Tiers',
    sizes:
      process.env.AIRTABLE_SIZES_TABLE ||
      process.env.AIRTABLE_COMPANY_SIZES_TABLE_NAME ||
      'Company Sizes',
    frames:
      process.env.AIRTABLE_TIMEFRAMES_TABLE ||
      process.env.AIRTABLE_TIME_FRAMES_TABLE_NAME ||
      'Time Frames',
  };

  const V = {
    countries: process.env.AIRTABLE_COUNTRIES_VIEW || 'Grid view',
    tiers: process.env.AIRTABLE_TIERS_VIEW || 'Grid view',
    sizes: process.env.AIRTABLE_SIZES_VIEW || 'Grid view',
    frames: process.env.AIRTABLE_TIMEFRAMES_VIEW || 'Grid view',
  };

  // Quick health check: /api/reform/options?ping=1
  const { searchParams } = new URL(req.url);
  if (searchParams.get('ping') === '1') {
    return Response.json({
      ok: true,
      hasKey: !!apiKey,
      hasBase: !!baseId,
      tables: T,
      views: V,
    });
  }

  if (!apiKey || !baseId) {
    console.error('❌ Missing Airtable API key or base id.');
    return Response.json({ countries: [], tiers: [], sizes: [], timeFrames: [] }, { status: 500 });
  }

  const headers = { Authorization: `Bearer ${apiKey}` };

  // Extract first non-empty string field from a record (robust to column renames)
  const firstString = (fields) => {
    if (!fields || typeof fields !== 'object') return null;
    for (const val of Object.values(fields)) {
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
    return null;
  };

  async function fetchAllStrings(table, view) {
    const values = [];
    let offset;
    for (let guard = 0; guard < 50; guard++) {
      const u = new URL(`${API_HOST}/${baseId}/${encodeURIComponent(table)}`);
      u.searchParams.set('view', view || 'Grid view');
      u.searchParams.set('pageSize', '100');
      if (offset) u.searchParams.set('offset', offset);

      const res = await fetch(u.toString(), { headers, cache: 'no-store' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Airtable ${table} ${res.status}: ${text.slice(0, 200)}`);
      }

      const j = await res.json();
      for (const r of j.records || []) {
        const v = firstString(r.fields);
        if (v) values.push(v);
      }
      offset = j.offset;
      if (!offset) break;
    }

    // De-dupe preserving order
    const seen = new Set();
    return values.filter((v) => {
      const k = v.trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  try {
    const [countries, tiers, sizes, timeFrames] = await Promise.all([
      fetchAllStrings(T.countries, V.countries),
      fetchAllStrings(T.tiers, V.tiers),
      fetchAllStrings(T.sizes, V.sizes),
      fetchAllStrings(T.frames, V.frames),
    ]);

    return Response.json(
      { countries, tiers, sizes, timeFrames },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('❌ /api/reform/options failed:', err);
    return Response.json({ countries: [], tiers: [], sizes: [], timeFrames: [] }, { status: 500 });
  }
}
