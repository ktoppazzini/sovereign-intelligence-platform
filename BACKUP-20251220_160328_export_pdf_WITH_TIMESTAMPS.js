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

    // Ensure HTML has DOCTYPE and proper structure
    const documentHtml = html.startsWith('<!DOCTYPE') ? html : '<!DOCTYPE html>\n' + html;

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
        '--single-process', // This helps on some environments
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2, // High DPI for better quality
    });

    console.log('[export-pdf] Loading HTML content...');
    
    // Load the HTML content
    await page.setContent(documentHtml, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    // Emulate screen media for better styling
    await page.emulateMediaType('screen');

    console.log('[export-pdf] Waiting for fonts and images...');
    
    // Wait for fonts, images, and SVGs to load
    await page.evaluate(async () => {
      // [CLIENT-SIDE FONT DEBUG]
      const styles = Array.from(document.querySelectorAll('style'));
      const styleTexts = styles.map(s => s.textContent || '');
      const hasFontCSS = styleTexts.some(text => text.includes('Georgia') || text.includes('font-family'));
      const bodyStyle = window.getComputedStyle(document.body);
      const bodyFont = bodyStyle.fontFamily;
      
      console.log('[export-pdf] CLIENT-SIDE FONT DEBUG', {
        styleTagCount: styles.length,
        hasFontCSS: hasFontCSS,
        computedBodyFont: bodyFont,
        styleTagsWithGeorgia: styleTexts.filter(t => t.includes('Georgia')).length,
        firstStyleLength: styles[0]?.textContent?.length || 0,
      });
      
      // Log first style tag content for debugging
      if (styles.length > 0) {
        const firstStyle = styles[0].textContent || '';
        console.log('[export-pdf] FIRST STYLE TAG (first 500 chars):', firstStyle.substring(0, 500));
      }
      
      // Wait for all fonts to load
      if (document.fonts) {
        try {
          await document.fonts.ready;
          console.log('[export-pdf] ✓ Fonts loaded via document.fonts.ready');
        } catch (e) {
          console.log('[export-pdf] ✗ Font loading error:', String(e));
        }
      }
      
      // Wait for all images to load
      const images = Array.from(document.images);
      await Promise.all(
        images
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
      
      // Give SVGs time to render
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Additional wait for any remaining renders
    await page.waitForTimeout(1000);

    console.log('[export-pdf] Generating PDF...');
    
    // Get page height to ensure we capture the full document
    const documentHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
    });
    
    console.log('[export-pdf] Document height:', documentHeight, 'pixels');
    
    // Generate PDF with optimal settings for FULL MULTI-PAGE document
    const pdfBuffer = await page.pdf({
      format: 'Letter', // US Letter format (8.5" x 11") NOT A4
      printBackground: true, // Include background colors and images
      preferCSSPageSize: false, // Use our Letter format setting, not CSS
      margin: {
        top: '0.5in',    // Reduced margins to fit more content
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      displayHeaderFooter: false,
      // CRITICAL: These settings ensure ALL pages are captured
      pageRanges: '', // Empty string means ALL pages (not just first page)
      omitBackground: false, // Keep backgrounds
      scale: 1.0, // 100% scale for accurate rendering
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
