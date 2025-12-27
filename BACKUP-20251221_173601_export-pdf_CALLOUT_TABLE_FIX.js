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

    // [KT:PDF-QUALITY-FIX] Inject CSS to force high-quality print rendering
    // This ensures backgrounds and colors are preserved in the PDF
    const printQualityCSS = `
      <style>
        /* [KT:PDF-FIX] Force print color adjustment - preserve all colors and backgrounds */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Ensure SVG graphics render at high quality */
        svg {
          shape-rendering: geometricPrecision;
          text-rendering: optimizeLegibility;
        }
        /* Force backgrounds to print */
        body, .report, section, figure, .chart-container, .chart-card {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* [KT:PDF-CALLOUT-FIX] Force callout colors to print correctly */
        /* Teal/cyan callout boxes */
        [style*="background:#0d9488"], [style*="background: #0d9488"],
        [style*="background:#14b8a6"], [style*="background: #14b8a6"],
        [style*="background:#0f766e"], [style*="background: #0f766e"],
        .callout, .insight-box, .key-insight, section[style*="teal"],
        section[style*="cyan"], div[style*="teal"], div[style*="cyan"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background-color: inherit !important;
        }
        
        /* [KT:PDF-TABLE-FIX] Constrain tables to fit page width */
        table, .table, .report-table {
          max-width: 100% !important;
          width: 100% !important;
          table-layout: fixed !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          font-size: 10px !important;
        }
        table th, table td, .table th, .table td {
          padding: 4px 6px !important;
          font-size: 10px !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 150px !important;
        }
        /* Make table headers more compact */
        table th, .table th {
          white-space: normal !important;
          font-size: 9px !important;
        }
        
        /* [KT:PDF-PRINT-MEDIA] Additional print-specific optimizations */
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report {
            max-width: none !important;
            width: 100% !important;
          }
          /* Force all backgrounds and colors */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    `;
    
    // Inject the print quality CSS into <head>
    if (/<head[^>]*>/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(/<head[^>]*>/i, '$&' + printQualityCSS);
    } else {
      // Prepend if no head tag
      documentHtml = printQualityCSS + documentHtml;
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
    
    // [KT:PDF-QUALITY-FIX] Set high-resolution viewport for crisp text and graphics
    // deviceScaleFactor: 2 = Retina-quality (2x pixel density)
    await page.setViewport({
      width: 1000,
      height: 1400,  // Reasonable height, Puppeteer handles page breaks
      deviceScaleFactor: 2,  // [KT:FIX] Increased from 1 to 2 for high-quality PDF
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

    // [KT:PDF-QUALITY-FIX] Use 'print' media for better PDF rendering
    // 'print' media ensures proper color rendering and crisp text
    await page.emulateMediaType('print');

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

    // [KT:DEBUG] Log document dimensions to diagnose single-page issue
    const metrics = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return {
        bodyScrollHeight: body.scrollHeight,
        bodyOffsetHeight: body.offsetHeight,
        htmlScrollHeight: html.scrollHeight,
        sectionCount: document.querySelectorAll('section').length,
        reportDivs: document.querySelectorAll('.report').length,
        htmlLength: html.outerHTML.length
      };
    });
    console.log('[export-pdf] Document metrics:', metrics);

    console.log('[export-pdf] Generating PDF...');
    
    // [KT:FIX] Enable printBackground: true - required for dark-themed reports
    // The report uses dark backgrounds (#0a0e1a) with light text (#e8eefb)
    // Without printBackground, text becomes nearly invisible (white on white)
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,  // REQUIRED: Report has dark background with light text
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
