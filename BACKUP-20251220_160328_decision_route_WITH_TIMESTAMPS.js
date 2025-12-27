// app/api/reform/decision/route.js
// Handles approval decisions: Approve, Reject with Comments, Request Changes
// Updates Airtable and notifies the preparer

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { sendMail } from '../../../../lib/mailer.js';
import { translate } from '../../../../lib/translate.js';

// Airtable configuration
const AT_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AT_BASE_ID = process.env.AIRTABLE_BASE_ID || '';
const TABLE_REQUESTS = process.env.AIRTABLE_TABLE_REQUESTS || 'Reform Requests';

// Field names (matching your Airtable schema)
const F_STATUS = process.env.AIRTABLE_STATUS_FIELD || 'Status';
const F_APPROVAL_STATE = process.env.AIRTABLE_APPROVAL_STATE_FIELD || 'Approval State';
const F_APPROVED_BY = process.env.AIRTABLE_APPROVED_BY_FIELD || 'Approved By';
const F_APPROVED_AT = process.env.AIRTABLE_APPROVED_AT_FIELD || 'Approved At';
const F_REJECTED_BY = process.env.AIRTABLE_REJECTED_BY_FIELD || 'Rejected By';
const F_REJECTED_AT = process.env.AIRTABLE_REJECTED_AT_FIELD || 'Rejected At';
const F_CHANGES_REQUESTED_AT = process.env.AIRTABLE_CHANGES_REQUESTED_AT_FIELD || 'Changes Requested At';
const F_DECISION_NOTES = process.env.AIRTABLE_DECISION_NOTES_FIELD || 'Decision Notes';

// Helper to call Airtable
async function atFetch(path, init = {}) {
  const url = `https://api.airtable.com/v0/${AT_BASE_ID}/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${AT_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// Verify approval token
function verifyToken(rid, action, exp, token, secret) {
  const h = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify({ rid, action, exp }))
    .digest('hex');
  return h === token && Date.now() < Number(exp);
}

// GET handler - Initial decision page (shows comment form)
export async function GET(req) {
  const url = new URL(req.url);
  const rid = url.searchParams.get('rid') || '';
  const action = url.searchParams.get('action') || '';
  const token = url.searchParams.get('token') || '';
  const exp = url.searchParams.get('exp') || 0;
  const lang = url.searchParams.get('lang') || 'English';
  const requesterEmail = url.searchParams.get('req') || '';
  const secret = process.env.APPROVAL_SECRET || process.env.OPENAI_API_KEY || 'secret';

  console.log('[decision] GET request:', { rid, action, lang, requesterEmail });

  // Verify token
  const isValid = verifyToken(rid, action, exp, token, secret);
  
  if (!isValid) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invalid Link</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
         max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
  .error { background: #fee; border: 2px solid #f00; padding: 20px; border-radius: 8px; }
</style></head>
<body>
  <div class="error">
    <h2>❌ Invalid or Expired Link</h2>
    <p>This approval link is no longer valid. It may have expired or been used already.</p>
    <p>Please contact the report preparer if you need a new approval link.</p>
  </div>
</body></html>`;
    return new Response(html, { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  // Show comment form
  const actionLabels = {
    approve: { title: '✓ Approve Report', color: '#10b981', label: 'Approval Notes (Optional)' },
    reject: { title: '✗ Reject Report', color: '#ef4444', label: 'Rejection Reason (Required)' },
    change: { title: '✎ Request Changes', color: '#f59e0b', label: 'Change Request Details (Required)' },
  };

  const { title, color, label } = actionLabels[action] || actionLabels.approve;
  const isRequired = action !== 'approve';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    max-width: 600px;
    margin: 50px auto;
    padding: 20px;
    background: #f9fafb;
  }
  .card {
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  h2 {
    color: ${color};
    margin-top: 0;
    text-align: center;
  }
  .info {
    background: #f3f4f6;
    padding: 15px;
    border-radius: 6px;
    margin: 20px 0;
  }
  label {
    display: block;
    font-weight: 600;
    margin: 15px 0 5px;
  }
  input, textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-family: inherit;
    font-size: 14px;
    box-sizing: border-box;
  }
  textarea {
    min-height: 120px;
    resize: vertical;
  }
  button {
    width: 100%;
    padding: 14px;
    background: ${color};
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 20px;
    transition: opacity 0.2s;
  }
  button:hover {
    opacity: 0.9;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .required {
    color: #ef4444;
  }
</style></head>
<body>
  <div class="card">
    <h2>${title}</h2>
    <div class="info">
      <strong>Record ID:</strong> ${rid}<br/>
      <strong>Action:</strong> ${action.toUpperCase()}
    </div>
    <form id="decisionForm">
      <label>Your Name/Email</label>
      <input type="text" name="approver" placeholder="John Doe / john@example.com" required />
      
      <label>${label} ${isRequired ? '<span class="required">*</span>' : ''}</label>
      <textarea name="comments" placeholder="Enter your ${action === 'approve' ? 'notes' : 'comments'} here..." ${isRequired ? 'required' : ''}></textarea>
      
      <button type="submit" id="submitBtn">${title}</button>
    </form>
    <div id="result" style="margin-top: 20px; display: none;"></div>
  </div>

  <script>
    document.getElementById('decisionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const result = document.getElementById('result');
      
      btn.disabled = true;
      btn.textContent = 'Processing...';
      
      const formData = new FormData(e.target);
      const data = {
        rid: '${rid}',
        action: '${action}',
        token: '${token}',
        exp: '${exp}',
        lang: '${lang}',
        requesterEmail: '${requesterEmail}',
        approver: formData.get('approver'),
        comments: formData.get('comments')
      };
      
      try {
        const response = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const json = await response.json();
        
        if (json.ok) {
          result.style.display = 'block';
          result.style.background = '#d1fae5';
          result.style.padding = '15px';
          result.style.borderRadius = '6px';
          result.style.color = '#065f46';
          result.innerHTML = '<strong>✓ Success!</strong><br/>' + json.message + '<br/><br/>The preparer has been notified.';
          e.target.style.display = 'none';
        } else {
          throw new Error(json.error || 'Unknown error');
        }
      } catch (error) {
        result.style.display = 'block';
        result.style.background = '#fee';
        result.style.padding = '15px';
        result.style.borderRadius = '6px';
        result.style.color = '#991b1b';
        result.innerHTML = '<strong>✗ Error:</strong> ' + error.message;
        btn.disabled = false;
        btn.textContent = '${title}';
      }
    });
  </script>
</body></html>`;

  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// POST handler - Process the decision
export async function POST(req) {
  try {
    const body = await req.json();
    const { rid, action, token, exp, approver, comments, lang = 'English', requesterEmail } = body;
    const secret = process.env.APPROVAL_SECRET || process.env.OPENAI_API_KEY || 'secret';

    console.log('[decision] POST request:', { rid, action, approver, lang });

    // Verify token again
    if (!verifyToken(rid, action, exp, token, secret)) {
      return Response.json({ ok: false, error: 'Invalid or expired token' }, { status: 400 });
    }

    // Update Airtable based on action
    const timestamp = new Date().toISOString();
    let fields = {};

    switch (action) {
      case 'approve':
        fields = {
          [F_STATUS]: 'Approved',
          [F_APPROVAL_STATE]: 'Approved',
          [F_APPROVED_BY]: approver,
          [F_APPROVED_AT]: timestamp,
          [F_DECISION_NOTES]: comments || 'Approved without comments',
        };
        break;

      case 'reject':
        fields = {
          [F_STATUS]: 'Rejected',
          [F_APPROVAL_STATE]: 'Rejected',
          [F_REJECTED_BY]: approver,
          [F_REJECTED_AT]: timestamp,
          [F_DECISION_NOTES]: comments,
        };
        break;

      case 'change':
        fields = {
          [F_STATUS]: 'Changes Requested',
          [F_APPROVAL_STATE]: 'Changes Requested',
          [F_CHANGES_REQUESTED_AT]: timestamp,
          [F_DECISION_NOTES]: comments,
        };
        break;

      default:
        return Response.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    }

    // Update Airtable
    const updateResult = await atFetch(`${TABLE_REQUESTS}/${rid}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });

    if (!updateResult.ok) {
      console.error('[decision] Airtable update failed:', updateResult.json);
      return Response.json(
        { ok: false, error: 'Failed to update record', details: updateResult.json },
        { status: 502 }
      );
    }

    console.log('[decision] Airtable updated successfully');

    // Send notification email to preparer with translations
    const toEmail = requesterEmail || process.env.MAIL_REQUESTER || process.env.EMAIL_FROM;
    const actionText = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CHANGES REQUESTED';
    
    // Translate email content
    const [tSubject, tDecision, tBy, tTimestamp, tComments, tNotification, tDecisionLabel] = await Promise.all([
      translate(lang, `Report ${actionText} - ${rid}`, false),
      translate(lang, 'Report Decision', false),
      translate(lang, 'Decision By', false),
      translate(lang, 'Timestamp', false),
      translate(lang, 'Comments', false),
      translate(lang, 'This is an automated notification from the Sovereign Intelligence Platform.', false),
      translate(lang, 'Decision', false),
    ]);
    
    try {
      await sendMail({
        to: toEmail,
        subject: tSubject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${tDecision}: ${actionText}</h2>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Record ID:</strong> ${rid}</p>
              <p><strong>${tBy}:</strong> ${approver}</p>
              <p><strong>${tDecisionLabel}:</strong> ${actionText}</p>
              <p><strong>${tTimestamp}:</strong> ${new Date(timestamp).toLocaleString()}</p>
            </div>
            ${comments ? `
            <div style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <strong>${tComments}:</strong><br/>
              ${comments}
            </div>
            ` : ''}
            <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
              ${tNotification}
            </p>
          </div>
        `,
      });
      console.log('[decision] Notification email sent to preparer with lang:', lang);
    } catch (emailError) {
      console.error('[decision] Failed to send notification email:', emailError);
      // Don't fail the whole request if email fails
    }

    return Response.json({
      ok: true,
      message: `Report ${actionText.toLowerCase()} successfully. Record updated.`,
      recordId: rid,
      action,
    });

  } catch (error) {
    console.error('[decision] Error:', error);
    return Response.json(
      { ok: false, error: String(error?.message || error) },
      { status: 500 }
    );
  }
}

