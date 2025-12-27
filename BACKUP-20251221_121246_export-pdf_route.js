// [KT:SURGICAL] PDF Export Route - Generates PDF from HTML report
// Supports translation: exports PDF in whatever language the HTML is in
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for PDF generation

function safeName(name = 'reform-report') {
  const base = name.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'reform-report';
  return base.endsWith('.pdf') ? base : base + '.pdf';
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
    console.warn(`[export-pdf] Airtable update error for ${fieldName}:`, error.message);
    return false;
  }
}

export async function POST(req) {
  let browser = null;
  
  try {
    console.log('[export-pdf] Starting PDF generation...');
    
    // Get HTML and metadata from request
    const payload = await req.json().catch(() => ({}));
    let html = payload.reportHtml || payload.html;
    const title = payload.title || 'Sovereign Intelligence Reform Report';
    const filenameSlug = payload.filenameSlug || payload.fileName || payload.filename || 'reform-report';
    const recordId = payload.recordId || payload.rid;
    
    // If no HTML provided, try to generate it
    if (!html && typeof payload === 'object') {
      console.log('[export-pdf] No HTML provided, calling generate endpoint...');
      const genUrl = new URL('/api/reform/generate', req.url).toString();
      const genRes = await fetch(genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (genRes.ok) {
        const genData = await genRes.json();
        html = genData.html;
        console.log('[export-pdf] HTML generated successfully');
      } else {
        const err = await genRes.text();
        console.error('[export-pdf] Generate failed:', err);
        return NextResponse.json(
          { ok: false, error: 'Failed to generate HTML: ' + err },
          { status: 500 },
        );
      }
    }

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing HTML content for PDF export' },
        { status: 400 }
      );
    }

    // Ensure HTML has DOCTYPE and proper UTF-8 charset declaration
    // This is critical for proper rendering of multi-language content (French accents, etc.)
    let documentHtml = html;
    
    if (!html.startsWith('<!DOCTYPE')) {
      // Add DOCTYPE
      documentHtml = '<!DOCTYPE html>\n' + html;
    }
    
    // Ensure charset is declared in <head>
    // If the HTML doesn't have a <head> tag with charset, add one
    if (!/<\s*meta\s+charset/i.test(documentHtml)) {
      // Check if there's a <head> tag
      const headMatch = documentHtml.match(/<\s*head\s*>/i);
      if (headMatch) {
        // Insert charset meta right after <head>
        documentHtml = documentHtml.replace(
          headMatch[0],
          headMatch[0] + '<meta charset="utf-8">'
        );
      } else {
        // No <head> tag - add one with charset at the beginning
        documentHtml = '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>' + 
          (documentHtml.replace(/^<!DOCTYPE[^>]*>\s*<html>\s*/i, '') || html) + 
          '</body>\n</html>';
      }
    }
    
    // Ensure HTML document structure is complete
    if (!/<html/i.test(documentHtml) && documentHtml.startsWith('<!DOCTYPE')) {
      // DOCTYPE without <html> - wrap content
      const bodyContent = documentHtml.replace(/^<!DOCTYPE[^>]*>/i, '').trim();
      documentHtml = '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>' + 
        bodyContent + '</body>\n</html>';
    }

    console.log('[export-pdf] Launching Puppeteer...');
    
    // Launch Puppeteer with appropriate settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        // REMOVED: --single-process (limits memory, causes crashes on large docs)
      ],
    });

    const page = await browser.newPage();
    
    // Set reasonable viewport - not too tall to avoid memory issues
    // PDF generation handles multi-page automatically with format: 'Letter'
    await page.setViewport({
      width: 1000,
      height: 1400,  // Reasonable height, Puppeteer handles page breaks
      deviceScaleFactor: 1,
    });

    console.log('[export-pdf] Loading HTML content...');
    
    // Load the HTML content with explicit UTF-8 handling
    await page.setContent(documentHtml, {
      waitUntil: ['domcontentloaded'],  // Faster than networkidle0
      timeout: 30000
    });
    
    // Verify that content was loaded with proper encoding
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
    console.log('[export-pdf] HTML loaded, body preview:', bodyText);

    // Emulate screen media for better styling
    await page.emulateMediaType('screen');

    console.log('[export-pdf] Waiting for fonts...');
    
    // Wait for fonts to load (minimal wait to save memory)
    await page.evaluate(async () => {
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch (e) {
          // Ignore font loading errors
        }
      }
    });

    // Brief pause for rendering
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('[export-pdf] Generating PDF...');
    
    // Generate PDF with minimal settings to avoid memory crash on large documents
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: false,  // CRITICAL: Disable for large documents to save memory
      preferCSSPageSize: false,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      displayHeaderFooter: false,
      scale: 1.0,
    });

    await browser.close();
    browser = null;

    console.log('[export-pdf] PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Generate filename
    const timestamp = recordId || new Date().toISOString().split('T')[0];
    const filename = safeName(`${filenameSlug}-${timestamp}`);

    // Update Airtable with export timestamp (fire and forget)
    if (recordId) {
      const atFieldDownloadedAt = process.env.AIRTABLE_DOWNLOADED_AT_FIELD || 'Downloaded At';
      updateAirtableTimestamp(recordId, atFieldDownloadedAt).catch(() => {});
    }

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });

  } catch (err) {
    console.error('[export-pdf] Error:', err);
    
    // Clean up browser if it's still running
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('[export-pdf] Error closing browser:', closeErr);
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: String(err?.message || err),
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
