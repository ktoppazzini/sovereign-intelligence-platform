import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function safeName(name = 'reform-report') {
  const base = name.replace(/[^\\w.\\-]+/g, '_').slice(0, 80) || 'reform-report';
  return base.endsWith('.html') ? base : base + '.html';
}

async function updateAirtableTimestamp(recordId, fieldName) {
  try {
    const atApiKey = process.env.AIRTABLE_API_KEY || '';
    const atBaseId = process.env.AIRTABLE_BASE_ID || '';
    const atTableRequests = process.env.AIRTABLE_TABLE_REQUESTS || 'Reform Requests';
    
    if (!atApiKey || !atBaseId || !recordId || !fieldName) {
      return false;
    }

    const timestamp = new Date().toISOString();
    const atUrl = `https://api.airtable.com/v0/${atBaseId}/${encodeURIComponent(atTableRequests)}/${recordId}`;
    
    const atResponse = await fetch(atUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${atApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          [fieldName]: timestamp,
        },
      }),
    });

    return atResponse.ok;
  } catch (error) {
    console.warn(`[export-html] Airtable update error for ${fieldName}:`, error.message);
    return false;
  }
}

export async function POST(req) {
  try {
    // Determine HTML: use provided html or generate via reform-generate
    const payload = await req.json().catch(() => ({}));
    let html = payload.reportHtml || payload.html;
    if (!html && typeof payload === 'object') {
      // call internal generate endpoint
      const genUrl = new URL('/api/reform/generate', req.url).toString();
      const genRes = await fetch(genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (genRes.ok) {
        html = await genRes.text();
      } else {
        const err = await genRes.text();
        return NextResponse.json(
          { ok: false, error: 'Generate HTML failed: ' + err },
          { status: 500 },
        );
      }
    }
    const title = payload.title || 'Sovereign Intelligence Reform Report';
    const fileName = safeName(
      payload.fileName || payload.filename || payload.filenameSlug || title,
    );
    const recordId = payload.recordId || payload.rid || '';

    if (!html || typeof html !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing HTML to export.' }, { status: 400 });
    }

    const documentHtml = html.startsWith('<!DOCTYPE') ? html : '<!DOCTYPE html>\n' + html;
    const buffer = Buffer.from(documentHtml, 'utf8');

    // Update Airtable with export timestamp (fire and forget)
    if (recordId) {
      const atFieldExportedAt = process.env.AIRTABLE_EXPORTED_AT_FIELD || 'Exported At';
      updateAirtableTimestamp(recordId, atFieldExportedAt).catch(() => {});
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="' + fileName + '"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[reform][export-html] error', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
