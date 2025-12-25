'use client';
/* [KT:SURGICAL TRACEABILITY] Load-time log for audit trail. */
try { console.log('[TRACE] ApprovalsWire.client.jsx loaded at', new Date().toISOString()); } catch (e) {}
import '../utils/driftGuard.js';
import { useEffect } from 'react';

/* --- tiny helpers --- */
function findButtonByNumber(n) {
  const btns = Array.from(document.querySelectorAll('button'));
  return btns.find((b) => (b.textContent || '').trim().startsWith(`${n}-`));
}
function green(btn) {
  try {
    btn?.classList?.add('bg-green-600');
    btn?.classList?.remove('bg-blue-600', 'bg-gray-600');
  } catch {}
}
function readReportHtml() {
  const el =
    document.querySelector('#reportHtml') ||
    document.querySelector('main') ||
    document.body;
  if (el?.outerHTML) return el.outerHTML;
  if (el?.innerHTML) return `<main>${el.innerHTML}</main>`;
  return document.documentElement.outerHTML;
}

/**
 * Wires numbered buttons to actions:
 * 3 — Export PDF
 * 4 — Finalize (persist)
 * 5 — Submit approval email
 */
export default function ApprovalsWire() {
  useEffect(() => {
    /* 3 — Export to PDF */
    const b3 = findButtonByNumber(3);
    if (b3 && !b3.dataset._siBound3) {
      b3.dataset._siBound3 = '1';
      b3.addEventListener(
        'click',
        async (ev) => {
          ev.preventDefault();
          try {
            const html = readReportHtml();
            const r = await fetch('/api/reform/export-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ html }),
            });
            const j = await r.json();
            if (!r.ok || !j?.downloadUrl) {
              throw new Error(j?.error || 'Export failed');
            }

            const a = document.createElement('a');
            a.href = j.downloadUrl;
            a.download = 'Reform_Report.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();

            green(b3);
          } catch (e) {
            console.error('[Button 3] error:', e);
            alert('PDF export failed: ' + (e?.message || e));
          }
        },
        { passive: false },
      );
    }

    /* 4 — Finalize (persist to store) */
    const b4 = findButtonByNumber(4);
    if (b4 && !b4.dataset._siBound4) {
      b4.dataset._siBound4 = '1';
      b4.addEventListener(
        'click',
        async (ev) => {
          ev.preventDefault();
          try {
            const ctx = window.__SR_REFORM__ || {};
            const lastExportBody = ctx.lastExportBody || {};
            const rid = lastExportBody.recordId;
            if (!rid) throw new Error('Report not generated. Click Generate first.');
            const html = readReportHtml();

            const res = await fetch('/api/reform/finalize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ html, rid }),
            });
            const j = await res.json();
            if (!res.ok || j?.error) throw new Error(j?.error || `HTTP ${res.status}`);

            window.__SR_REFORM__.finalizeResult = j;
            green(b4);
            alert('Report finalized: ' + (j.rid || ''));
          } catch (e) {
            console.error('[Finalize] error:', e);
            alert('Finalize failed: ' + (e?.message || e));
          }
        },
        { passive: false },
      );
    }

    /* 5 — Submit: send approval request email with action links */
    const b5 = findButtonByNumber(5);
    if (b5 && !b5.dataset._siBound5) {
      b5.dataset._siBound5 = '1';
      b5.addEventListener(
        'click',
        async (ev) => {
          ev.preventDefault();
          try {
            const ctx = window.__SR_REFORM__ || {};
            const lastExportBody = ctx.lastExportBody || {};
            const lastExportResponse = ctx.lastExportResponse || {};
            const rid = lastExportBody.recordId || '';
            const pdfUrl =
              lastExportResponse.downloadUrl || lastExportResponse.pdfUrl || '';
            const htmlUrl = lastExportResponse.htmlUrl || '';
            if (!rid) throw new Error('RID not found. Generate the report first.');
            if (!pdfUrl) throw new Error('PDF not exported. Click "Export to PDF" first.');

            const q = (sel) => document.querySelector(sel);
            const orgName = (
              q('input[placeholder="Organization Name"], input[name="orgName"]')?.value ||
              ''
            ).trim();
            const preparedFor = (
              q('input[placeholder="e.g., Ministry of Health (Ontario)"]')?.value ||
              ''
            ).trim();
            const preparedForEmail = (
              q('input[type="email"][placeholder="email@example.com"]')?.value ||
              ''
            ).trim();
            const emailInputs = Array.from(document.querySelectorAll('input[type="email"]'));
            const preparedByEmail = (emailInputs[1]?.value || preparedForEmail || '').trim();
            const preparedBy = (
              q('input[placeholder="Your name or organization"]')?.value || ''
            ).trim();

            const payload = {
              rid,
              title: `Sovereign Intelligence Reform Report — ${orgName || ''}`.trim(),
              lang: 'English',
              preparedByName: preparedBy,
              preparedByEmail,
              preparedForName: preparedFor,
              preparedForEmail,
              pdfUrl,
              htmlUrl,
            };

            const res = await fetch('/api/approvals/request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok || j?.error) throw new Error(j?.error || `HTTP ${res.status}`);

            green(b5);
            alert('Approval request sent to approver.');
          } catch (e) {
            console.error('[Submit] error:', e);
            alert('Submit failed: ' + (e?.message || e));
          }
        },
        { passive: false },
      );
    }
  }, []);

  return null;
}