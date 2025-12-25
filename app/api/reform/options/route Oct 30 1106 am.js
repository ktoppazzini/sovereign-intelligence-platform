import { fetchAirtableOptions } from '@/lib/airtable-fetch';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const options = await fetchAirtableOptions();
    // options structure: { countries, tiers, companySizes, timeFrames }
    return NextResponse.json(options);
  } catch (error) {
    console.error('❌ /api/reform/options failed:', error?.message ?? error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message },
      { status: 500 },
    );
  }
}
