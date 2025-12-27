// app/reform-report/PdfExportWire.client.jsx
'use client';
import { useEffect } from 'react';
import { loadModuleTranslations, ensureTranslatedResponse } from '../lib/dynamicTranslation';

function findButton(rx) {
  return Array.from(document.querySelectorAll('button')).find((b) => rx.test(b.textContent || ''));
}
function markGreen(btn, label) {
  btn.textContent = label;
  btn.style.background = '#0b6b3a';
  btn.style.borderColor = '#0b6b3a';
  btn.style.color = '#fff';
}

function getReportHTML() {
  console.log('[PdfExport] Starting HTML extraction...');
  console.log('[PdfExport] window.__REFORM_REPORT_HTML__ exists:', !!window.__REFORM_REPORT_HTML__);
  console.log('[PdfExport] window.__REFORM_REPORT_HTML__ length:', window.__REFORM_REPORT_HTML__?.length || 0);
  
  // [KT:PDF-EXPORT-FIX] Strategy 0: Check window variable first (most reliable)
  if (typeof window !== 'undefined' && window.__REFORM_REPORT_HTML__ && window.__REFORM_REPORT_HTML__.length > 1000) {
    console.log('[PdfExport] ✓ Using window.__REFORM_REPORT_HTML__ (length:', window.__REFORM_REPORT_HTML__.length + ')');
    const html = window.__REFORM_REPORT_HTML__;
    // Ensure it has proper DOCTYPE and wrapper
    if (html.startsWith('<!DOCTYPE') || html.startsWith('<!doctype')) {
      return html;
    }
    return '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{background:#0a0e14;color:#e8eefb;margin:0;padding:20px;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>' + html + '</body></html>';
  }
  
  console.log('[PdfExport] ⚠ window.__REFORM_REPORT_HTML__ not found or too short, falling back to DOM extraction...');
  console.log('[PdfExport] All divs with "report" in class:', document.querySelectorAll('[class*="report"]').length);
  
  // Debug: Show all divs with meaningful classes
  document.querySelectorAll('[class*="report"]').forEach((el, i) => {
    console.log(`[PdfExport] Element ${i}:`, el.className, 'innerHTML length:', el.innerHTML?.length || 0);
  });
  
  // Strategy 1: Look for the report viewer div
  const reportViewer = document.querySelector('[class*="reform-report-viewer"]');
  console.log('[PdfExport] reportViewer (pattern match) found:', !!reportViewer, 'innerHTML length:', reportViewer?.innerHTML?.length || 0);
  
  if (reportViewer && reportViewer.innerHTML && reportViewer.innerHTML.length > 1000) {
    console.log('[PdfExport] ✓ Using reportViewer HTML');
    return '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{background:#0a0e14;color:#e8eefb;margin:0;padding:20px;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>' + reportViewer.innerHTML + '</body></html>';
  }
  
  // Strategy 2: Look for any div with a lot of content that's not the form
  const allDivs = document.querySelectorAll('div');
  console.log('[PdfExport] Total divs:', allDivs.length);
  
  for (let div of allDivs) {
    const html = div.innerHTML;
    // Looking for a div with substantial content that contains pages or report structure
    if (html && html.length > 50000 && (html.includes('page') || html.includes('Page') || html.includes('section'))) {
      console.log('[PdfExport] ✓ Found large div with report structure, length:', html.length);
      return '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{background:#0a0e14;color:#e8eefb;margin:0;padding:20px;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>' + html + '</body></html>';
    }
  }
  
  // Fallback: try .page (legacy)
  const page = document.querySelector('.page');
  console.log('[PdfExport] page found:', !!page, 'outerHTML length:', page?.outerHTML?.length || 0);
  if (page && page.outerHTML && page.outerHTML.length > 1000) {
    console.log('[PdfExport] ✓ Using page HTML');
    return '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{background:#0a0e14;color:#e8eefb;margin:0;padding:20px;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>' + page.outerHTML + '</body></html>';
  }
  
  // Last resort: try reform-report-root
  const root = document.getElementById('reform-report-root');
  console.log('[PdfExport] root found:', !!root, 'innerHTML length:', root?.innerHTML?.length || 0);
  if (root && root.innerHTML && root.innerHTML.length > 1000) {
    console.log('[PdfExport] ⚠ Using reform-report-root HTML (includes form)');
    return '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{background:#0a0e14;color:#e8eefb;margin:0;padding:20px;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>' + root.innerHTML + '</body></html>';
  }
  
  console.log('[PdfExport] ✗ No suitable HTML found!');
  return '';
}

async function exportPDF(btn) {
  const html = getReportHTML();
  if (!html || html.length < 1000) {
    alert('Missing or short HTML payload.');
    return;
  }
  const res = await fetch('/api/reform/export-pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ html, fileName: 'Reform_Report.pdf' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err?.error || `Export failed (${res.status})`);
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Reform_Report.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  markGreen(btn, 'Exported ✓');
}

export default function PdfExportWire() {
  useEffect(() => {
    const btnExport =
      findButton(/^\s*2\s*[–-]\s*Export to PDF\s*$/i) || findButton(/\bExport to PDF\b/i);
    const btnDownload =
      findButton(/^\s*3\s*[–-]\s*Download PDF\s*$/i) || findButton(/\bDownload PDF\b/i);

    if (btnExport && !btnExport.__siBound) {
      btnExport.__siBound = true;
      btnExport.addEventListener('click', (e) => {
        e.preventDefault();
        exportPDF(btnExport);
      });
    }
    if (btnDownload && !btnDownload.__siBound) {
      btnDownload.__siBound = true;
      btnDownload.addEventListener('click', (e) => {
        e.preventDefault();
        // re-trigger export to get a fresh PDF; avoids stale state
        exportPDF(btnDownload);
      });
    }
    return () => {
      if (btnExport) btnExport.__siBound = false;
      if (btnDownload) btnDownload.__siBound = false;
    };
  }, []);
  return null;
}
