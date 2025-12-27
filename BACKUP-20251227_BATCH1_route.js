// Clinical Plan Generate API Route
// Generates a clinical trial plan document based on submitted form data

import { NextResponse } from 'next/server';
import { ensureTranslatedResponse } from '@/lib/dynamicTranslation';

export async function POST(req) {
  try {
    const data = await req.json();
    const form = data?.form || {};
    const title = `Clinical Plan for ${form.drugName || form.indication || 'New Drug'}`;

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>` +
      `<style>body{font-family:Arial, sans-serif; padding:24px; line-height:1.6;}</style>` +
      `</head><body><h1>${title}</h1>` +
      `<p><strong>Indication:</strong> ${form.indication || ''}</p>` +
      `<p><strong>Therapeutic Area:</strong> ${form.therapeuticArea || ''}</p>` +
      `<p><strong>Phase:</strong> ${form.phase || ''}</p>` +
      `<p><strong>Trial Type:</strong> ${form.trialType || ''}</p>` +
      `<p><strong>Regulatory Pathway:</strong> ${form.regulatoryPathway || ''}</p>` +
      `<p><strong>Country:</strong> ${form.country || ''}</p>` +
      `<p><strong>Planned Sites:</strong> ${form.plannedSites || ''}</p>` +
      `<p><strong>Estimated Enrollment:</strong> ${form.estimatedEnrollment || ''}</p>` +
      `<p><strong>Primary Endpoint:</strong> ${form.primaryEndpoint || ''}</p>` +
      `<p><strong>Key Secondary Endpoints:</strong> ${form.secondaryEndpoints || ''}</p>` +
      `<p><strong>Trial Duration:</strong> ${form.trialDuration || ''}</p>` +
      `<p><strong>Estimated Cost:</strong> ${form.estimatedCost || ''}</p>` +
      `<p><strong>Prepared For:</strong> ${form.preparedFor || ''} ${form.preparedForEmail ? `&lt;${form.preparedForEmail}&gt;` : ''}</p>` +
      `<p><strong>Prepared By:</strong> ${form.preparedBy || ''} ${form.preparedByEmail ? `&lt;${form.preparedByEmail}&gt;` : ''}</p>` +
      `</body></html>`;

    const responseData = { ok: true, html, wordCount: (html.match(/\w+/g) || []).length };
    const lang = data?.lang || 'English';
    const translatedData = await ensureTranslatedResponse(responseData, lang);
    return NextResponse.json(translatedData);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || 'Generation failed' }, { status: 500 });
  }
}
