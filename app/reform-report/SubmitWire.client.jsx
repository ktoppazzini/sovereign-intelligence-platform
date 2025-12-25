// app/reform-report/SubmitWire.client.jsx
'use client';
import { useEffect } from 'react';

function findButtonByLabel(rx) {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    rx.test((b.textContent || '').trim()),
  );
}
function markGreen(btn, label) {
  if (!btn) return;
  btn.textContent = label;
  btn.style.background = '#0b6b3a';
  btn.style.borderColor = '#0b6b3a';
  btn.style.color = '#fff';
}

/**
 * This wire:
 * - finds your existing "5 - Submit" button,
 * - pulls the composed HTML from the report container,
 * - posts to /api/reform/submit with approver email + language,
 * - handles translated email/PDF server-side.
 *
 * HOW IT PICKS FIELDS:
 * - preparedFor:   the visible "Prepared For" input
 * - preparedBy:    the visible "Prepared By"  input
 * - lang:          optional <html lang> or data-lang="xx" on body
 * - to:            value from a hidden input #approval-email, else prompts
 */
export default function SubmitWire() {
  useEffect(() => {
    const btn = findButtonByLabel(/^\s*5\s*[–-]\s*Submit\s*$/i) || findButtonByLabel(/\bSubmit\b/i);
    if (!btn || btn.__siBound) return;
    btn.__siBound = true;

    async function onClick(e) {
      try {
        e.preventDefault();

        const preparedFor =
          (document.querySelector('input[name*="preparedfor" i]') || {}).value ||
          (document.querySelector('input[placeholder*="Prepared For" i]') || {}).value ||
          '';
        const preparedBy =
          (document.querySelector('input[name*="preparedby" i]') || {}).value ||
          (document.querySelector('input[placeholder*="Prepared By" i]') || {}).value ||
          '';
        const to =
          (document.getElementById('approval-email') || {}).value ||
          prompt('Approver email(s), comma-separated:') ||
          '';
        const lang =
          document.documentElement.lang || document.body.getAttribute('data-lang') || 'en';

        const root =
          document.getElementById('si-report-root') ||
          document.querySelector('.report, .report-container, main');
        const html = root?.outerHTML || '';
        if (!html || html.length < 400) {
          alert('Missing or short report HTML.');
          return;
        }
        const payload = {
          html,
          preparedFor,
          preparedBy,
          lang,
          to,
          subject: 'Reform Report – Approval Required',
          message: 'Please review and approve the attached report.',
          fileName: 'Reform_Report.pdf',
        };

        const res = await fetch('/api/reform/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.ok) {
          throw new Error(j?.error || `Submit failed (${res.status})`);
        }
        markGreen(btn, 'Submitted');
      } catch (err) {
        console.error('[SI:Submit] error', err);
        alert('Submit failed: ' + (err?.message || err));
      }
    }

    btn.addEventListener('click', onClick, true);
    return () => btn.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
