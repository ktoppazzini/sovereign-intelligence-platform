// lib/translateReportLabels.js

function __isEnglishReportLang(lang) {
  const v = String(lang || '').toLowerCase();
  return v === 'english' || v === 'en' || v.startsWith('en-');
}

/**
 * Server-side label translator for the reform report.
 * - Takes your DEFAULT_LABELS object and target language.
 * - Calls /api/gptTranslation in JSON mode.
 * - Merges translated keys over the base so missing keys fall back cleanly.
 */
// Ensure fetch is available (for Node.js environments)
if (typeof fetch === 'undefined') {
  globalThis.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

async function translateReportLabels(baseLabels, lang) {
// Fast-path: English → just return the base map
  if (__isEnglishReportLang(lang)) return baseLabels || {};

  const safeBase = baseLabels && typeof baseLabels === 'object' ? baseLabels : {};

  try {
    const payload = {
      mode: 'json',
      targetLang: lang || 'English',
      ui: safeBase,
    };

    const res = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SI-Debug': 'report-labels-json:' + String(lang || 'English'),
      },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.warn('[SR:REPORT:I18N] label parse error', e, raw.slice(0, 160));
    }

    if (res.ok && json && json.translation && typeof json.translation === 'object') {
      // Merge over base so any missing keys fall back cleanly
      const merged = { ...safeBase, ...json.translation };
      return merged;
    }

    console.warn('[SR:REPORT:I18N] label translate fallback → base', {
      status: res.status,
      err: json && json.error,
    });
  } catch (err) {
    console.warn('[SR:REPORT:I18N] label translate exception', err);
  }

  return safeBase;
}

module.exports = { translateReportLabels };
