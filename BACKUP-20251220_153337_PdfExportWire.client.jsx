// app/reform-report/PdfExportWire.client.jsx
'use client';
import { useEffect } from 'react';

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
  const root = document.getElementById('reform-report-root');
  if (root && root.outerHTML && root.outerHTML.length > 1000)
    return '<!doctype html><html><head><meta charset="utf-8"/></head><body>' + root.outerHTML + '</body></html>';
  // Fallback: try .page
  const page = document.querySelector('.page');
  return page
    ? `<!doctype html><html><head><meta charset="utf-8"/></head><body>${page.outerHTML}</body></html>`
    : '';
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
