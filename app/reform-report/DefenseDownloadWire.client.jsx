'use client';
/**
 * Wires Step 3 ("Download PDF") to the Defense Report API when "Defense" is selected.
 * Auto-resolves the API URL from: window.__SI_DEFENSE_API__ → localStorage → <meta> → #defense-api-url
 * → NEXT_PUBLIC_DEFENSE_API_URL → GET /api/config/defense-url
 */
import { useEffect } from 'react';

/** Find a <button> whose text starts with the given prefix (case-insensitive). */
function byLabelPrefix(prefix) {
  try {
    const p = String(prefix || '')
      .trim()
      .toLowerCase();
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find((b) => (b.textContent || '').trim().toLowerCase().startsWith(p)) || null;
  } catch {
    return null;
  }
}

/** Query inputs/selects/textareas by hint substrings and return the first non-empty value. */
function qVal(...hints) {
  for (const hintRaw of hints) {
    const hint = String(hintRaw || '');
    if (!hint) continue;
    const esc = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sel = [
      `input[name*="${esc}" i]`,
      `input[id*="${esc}" i]`,
      `input[placeholder*="${esc}" i]`,
      `select[name*="${esc}" i]`,
      `select[id*="${esc}" i]`,
      `textarea[name*="${esc}" i]`,
    ].join(',');
    const el = document.querySelector(sel);
    if (!el) continue;
    if ('value' in el && typeof el.value !== 'undefined') {
      const v = String(el.value || '').trim();
      if (v) return v;
    }
  }
  return '';
}

/** Return true if the page/form indicates a Defense report. */
function isDefenseSelected() {
  try {
    const candidates = Array.from(
      document.querySelectorAll(
        'input[name*="template" i], select[name*="template" i], input[name*="type" i], select[name*="type" i], input[id*="template" i], select[id*="template" i], input[id*="type" i], select[id*="type" i]',
      ),
    );
    for (const el of candidates) {
      const v = (el && 'value' in el ? String(el.value || '') : '').toLowerCase();
      if (v.includes('defense')) return true;
    }
    const txt = (document.body?.innerText || '').toLowerCase();
    return /\bdefen(c|s)e\b/.test(txt);
  } catch {
    return false;
  }
}

/** Visual success cue. */
function green(el) {
  if (!el) return;
  try {
    el.style.backgroundColor = '#16a34a';
    el.style.borderColor = '#16a34a';
    el.style.color = '#fff';
  } catch {}
}

/** Resolve the Defense API URL with multiple fallbacks. */
async function resolveDefenseApiUrl() {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    const fromGlobal = g.__SI_DEFENSE_API__ ? String(g.__SI_DEFENSE_API__) : '';
    const fromLS =
      (typeof localStorage !== 'undefined' && localStorage.getItem('SI_DEFENSE_API_URL')) || '';
    const fromMeta = (document.querySelector('meta[name="si-defense-api"]') || {}).content || '';
    const fromInput = (document.getElementById('defense-api-url') || {}).value || '';
    const fromEnv =
      (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_DEFENSE_API_URL) ||
      '';
    const first = String(fromGlobal || fromLS || fromMeta || fromInput || fromEnv || '');
    if (first) return first;

    // Server fallback
    try {
      const res = await fetch('/api/config/defense-url', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      const url = String(json?.url || '');
      if (url) {
        try {
          localStorage.setItem('SI_DEFENSE_API_URL', url);
        } catch {}
        return url;
      }
    } catch {}
  } catch {}
  return '';
}

/** Call the Defense API; returns a direct link to the generated PDF or null. */
async function callDefenseApi() {
  const url = await resolveDefenseApiUrl();
  if (!url) {
    alert('Defense API URL is not configured on the server.');
    return null;
  }

  const orgName = qVal('org', 'organization', 'company') || 'Organization';
  const preparedFor = qVal('preparedfor', 'prepared_for', 'client') || orgName;
  const preparedBy = qVal('preparedby', 'prepared_by', 'author') || 'Author';
  const size = qVal('size', 'companysize');
  const tf = qVal('timeframe', 'time frame', 'timeline', 'months', 'years');
  const years = Math.max(1, parseInt(((tf || '').match(/\d+/) || ['1'])[0], 10));

  const payload = {
    orgName,
    preparedFor,
    preparedBy,
    plan: {
      projectPhases: Array.from({ length: Math.max(3, years) }, (_, i) => `Phase ${i + 1}`),
      keyMilestones: ['Kickoff', 'Pilot', 'Scale'],
      timeline: [`${years} year plan`, `Bi-monthly cadence`, `Gate reviews`],
      resources: [size || 'Right-size team', 'Vendors & SLAs', 'Training waves'],
      risks: ['Change resistance', 'Data quality', 'Vendor delays'],
    },
    assets: [],
    risks: [],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let json = {};
  try {
    json = await res.json();
  } catch {}
  if (!res.ok || !json || json.ok === false) {
    const msg = (json && json.error) || `Defense API failed (${res.status})`;
    throw new Error(msg);
  }
  return String(json.url || json.downloadUrl || json.pdfUrl || '');
}

export default function DefenseDownloadWire() {
  useEffect(() => {
    const btn = byLabelPrefix('3'); // "3 - Download PDF"
    if (!btn) return;

    const onClick = async (ev) => {
      try {
        if (!isDefenseSelected()) return; // let existing handler proceed
        ev.preventDefault();
        ev.stopImmediatePropagation();
        const link = await callDefenseApi();
        if (link) {
          window.open(link, '_blank', 'noopener,noreferrer');
          green(btn);
        }
      } catch (e) {
        alert('Defense PDF generation failed: ' + ((e && e.message) || String(e)));
        // eslint-disable-next-line no-console
        console.error('[SI] Defense PDF error:', e);
      }
    };

    btn.addEventListener('click', onClick, true);
    return () => {
      try {
        btn.removeEventListener('click', onClick, true);
      } catch {}
    };
  }, []);

  return null;
}
