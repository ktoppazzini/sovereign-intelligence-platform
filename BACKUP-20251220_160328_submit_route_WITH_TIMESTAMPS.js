// app/api/reform/submit/route.js
// Submits a report for approval: translates subject/body, generates PDF with 3-button approval email
// Enhanced with proper workflow: Approve, Reject with Comments, Change Request with Comments

import { NextResponse } from 'next/server';
import { translate } from '../../../../lib/translate.js';
import { sendMail } from '../../../../lib/mailer.js';
import puppeteer from 'puppeteer';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for PDF generation

// Generate secure token for approval links
function generateToken(recordId, action, expiry, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify({ rid: recordId, action, exp: expiry }))
    .digest('hex');
}

export async function POST(req) {
  let browser = null;
  
  try {
    const body = await req.json().catch(() => ({}));
    const {
      html = '',
      recordId = '',
      preparedFor = '',
      preparedBy = '',
      orgName = '',
      lang = 'English',
      approverEmail = '', // Primary approver
      requesterEmail = '', // Person who prepared the report
      subject = 'Reform Report Approval Required',
      fileName = 'Reform_Report.pdf',
    } = body || {};

    console.log('[submit] Starting submission process:', {
      recordId,
      lang,
      approverEmail,
      requesterEmail,
      htmlLength: html.length,
    });

    // Validation
    if (!html || html.length < 400) {
      return NextResponse.json(
        { ok: false, error: 'Missing or short HTML payload' },
        { status: 400 },
      );
    }
    if (!approverEmail) {
      return NextResponse.json({ ok: false, error: 'Missing approver email' }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ ok: false, error: 'Missing record ID' }, { status: 400 });
    }

    // Generate approval links with expiry (7 days)
    const secret = process.env.APPROVAL_SECRET || process.env.OPENAI_API_KEY || 'change-me';
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    const approveToken = generateToken(recordId, 'approve', expiry, secret);
    const rejectToken = generateToken(recordId, 'reject', expiry, secret);
    const changeToken = generateToken(recordId, 'change', expiry, secret);

    const approveUrl = `${baseUrl}/api/reform/decision?rid=${recordId}&action=approve&token=${approveToken}&exp=${expiry}&lang=${encodeURIComponent(lang)}&req=${encodeURIComponent(requesterEmail)}`;
    const rejectUrl = `${baseUrl}/api/reform/decision?rid=${recordId}&action=reject&token=${rejectToken}&exp=${expiry}&lang=${encodeURIComponent(lang)}&req=${encodeURIComponent(requesterEmail)}`;
    const changeUrl = `${baseUrl}/api/reform/decision?rid=${recordId}&action=change&token=${changeToken}&exp=${expiry}&lang=${encodeURIComponent(lang)}&req=${encodeURIComponent(requesterEmail)}`;

    // 1) Translate email content
    const [tSubject, tApprove, tReject, tChange, tMessage] = await Promise.all([
      translate(lang, subject, false),
      translate(lang, 'Approve Report', false),
      translate(lang, 'Reject with Comments', false),
      translate(lang, 'Request Changes', false),
      translate(
        lang,
        `A reform report has been prepared and requires your approval.\n\nOrganization: ${orgName}\nPrepared For: ${preparedFor}\nPrepared By: ${preparedBy}\n\nPlease review the attached report and select one of the options below:`,
        false,
      ),
    ]);

    console.log('[submit] Translations complete');

    // 2) Generate PDF
    console.log('[submit] Launching Puppeteer for PDF generation...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    
    // Ensure HTML has proper structure
    const documentHtml = html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>\n${html}`;
    
    await page.setContent(documentHtml, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000,
    });

    // Wait for resources to load
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const images = Array.from(document.images);
      await Promise.all(
        images
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          )
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    await page.waitForTimeout(1000);

    const pdf = await page.pdf({
      format: 'Letter', // US Letter (8.5" x 11")
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      displayHeaderFooter: false,
      pageRanges: '', // All pages
      scale: 1.0,
    });

    await browser.close();
    browser = null;

    console.log('[submit] PDF generated successfully, size:', pdf.length, 'bytes');

    // 3) Build approval email HTML with 3 buttons
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
    }
    .info-box {
      background: white;
      padding: 15px;
      border-left: 4px solid #10b981;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 5px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      margin: 10px 5px;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .btn-approve {
      background: #10b981;
      color: white;
    }
    .btn-reject {
      background: #ef4444;
      color: white;
    }
    .btn-change {
      background: #f59e0b;
      color: white;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">🔔 ${tSubject}</h2>
  </div>
  <div class="content">
    <p>${tMessage.replace(/\n/g, '<br/>')}</p>
    
    <div class="info-box">
      <p><strong>Organization:</strong> ${orgName}</p>
      <p><strong>Prepared For:</strong> ${preparedFor}</p>
      <p><strong>Prepared By:</strong> ${preparedBy}</p>
      <p><strong>Record ID:</strong> ${recordId}</p>
    </div>

    <div class="button-container">
      <a href="${approveUrl}" class="button btn-approve">✓ ${tApprove}</a>
      <br/>
      <a href="${rejectUrl}" class="button btn-reject">✗ ${tReject}</a>
      <br/>
      <a href="${changeUrl}" class="button btn-change">✎ ${tChange}</a>
    </div>

    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
      <strong>Note:</strong> This approval request will expire in 7 days. Please review the attached PDF report and select one of the options above. You will be able to add comments after clicking your selection.
    </p>
  </div>
  <div class="footer">
    <p>Sovereign Intelligence Platform</p>
    <p>Automated Business Transformation Reports</p>
  </div>
</body>
</html>
`;

    // 4) Send approval email
    console.log('[submit] Sending approval email to:', approverEmail);
    
    await sendMail({
      to: approverEmail,
      cc: requesterEmail, // Copy preparer
      subject: tSubject,
      html: emailHtml,
      attachments: [
        {
          filename: fileName,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log('[submit] Approval email sent successfully');

    // 5) Update Airtable with timestamp
    try {
      const atApiKey = process.env.AIRTABLE_API_KEY || '';
      const atBaseId = process.env.AIRTABLE_BASE_ID || '';
      const atTableRequests = process.env.AIRTABLE_TABLE_REQUESTS || 'Reform Requests';
      const atFieldSubmittedAt = process.env.AIRTABLE_SUBMITTED_AT_FIELD || 'Submitted At';
      
      if (atApiKey && atBaseId && recordId) {
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
              [atFieldSubmittedAt]: timestamp,
            },
          }),
        });

        if (atResponse.ok) {
          console.log('[submit] Airtable timestamp updated successfully');
        } else {
          console.warn('[submit] Airtable timestamp update warning:', atResponse.status);
        }
      }
    } catch (atError) {
      console.warn('[submit] Could not update Airtable timestamp:', atError.message);
      // Don't fail the whole request if Airtable update fails
    }

    return NextResponse.json({
      ok: true,
      message: 'Report submitted for approval',
      recordId,
      approverEmail,
      pdfSize: pdf.length,
    });

  } catch (error) {
    console.error('[submit] Error:', error);
    
    // Clean up browser if still running
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('[submit] Error closing browser:', closeErr);
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: String(error?.message || error),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

