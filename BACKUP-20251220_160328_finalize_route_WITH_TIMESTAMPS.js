export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const strip = (s) =>
  String(s || '')
    .replace(/<style[^>]*>.*?<\/style>/gis, ' ')
    .replace(/<script[^>]*>.*?<\/script>/gis, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
    console.warn(`[finalize] Airtable update error for ${fieldName}:`, error.message);
    return false;
  }
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {}
  const html = body?.html || '';
  const rid = body?.rid || Math.random().toString(36).slice(2, 8);
  if (!html || html.length < 100) {
    return NextResponse.json({ ok: false, error: 'Missing/short HTML' }, { status: 400 });
  }
  const words = strip(html).split(' ').filter(Boolean).length;
  const sha256 = crypto.createHash('sha256').update(html, 'utf8').digest('hex');
  
  // Update Airtable with timestamps
  const atFieldGeneratedAt = process.env.AIRTABLE_GENERATED_AT_FIELD || 'Generated At';
  const atFieldFinalizedAt = process.env.AIRTABLE_FINALIZED_AT_FIELD || 'Finalized At';
  
  // Trigger timestamp updates (fire and forget)
  if (rid) {
    updateAirtableTimestamp(rid, atFieldGeneratedAt).catch(() => {});
    updateAirtableTimestamp(rid, atFieldFinalizedAt).catch(() => {});
  }
  
  return NextResponse.json({ ok: true, rid, words, sha256 });
}
