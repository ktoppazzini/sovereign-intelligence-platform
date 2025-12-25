// lib/i18nClient.js
export function normalizeLang(raw) {
  if (!raw) return 'English';
  const lower = String(raw).toLowerCase();
  const map = {
    ar: 'Arabic',
    arabic: 'Arabic',
    he: 'Hebrew',
    hebrew: 'Hebrew',
    fa: 'Persian',
    farsi: 'Persian',
    persian: 'Persian',
    ur: 'Urdu',
    urdu: 'Urdu',
    ps: 'Pashto',
    pashto: 'Pashto',
    en: 'English',
    english: 'English',
  };
  return map[lower] || raw;
}

export function isRTL(lang) {
  return /arabic|hebrew|urdu|persian|farsi|pashto/i.test(lang || '');
}

function tCacheKey(prefix, lang) {
  return `${prefix}:${(lang || 'English').toLowerCase()}`;
}

/**
 * Fetch UI labels via /api/gptTranslation with:
 * - immediate cache apply
 * - flexible response parsing
 * - localStorage persistence
 */
export async function getUiTranslations({
  base, // { title: '...', ... } default English labels
  lang, // requested language
  cachePrefix = 'SI_UI',
  setDir = true, // set document dir automatically
}) {
  const effectiveLang = normalizeLang(lang || 'English');

  // direction
  if (typeof document !== 'undefined' && setDir) {
    try {
      document.documentElement.setAttribute('dir', isRTL(effectiveLang) ? 'rtl' : 'ltr');
    } catch {}
  }

  // apply cached labels first
  let labels = { ...base };
  try {
    const cached = localStorage.getItem(tCacheKey(cachePrefix, effectiveLang));
    if (cached) labels = { ...labels, ...JSON.parse(cached) };
  } catch {}

  // English — return early
  if (/^english$/i.test(effectiveLang)) return { t: labels, lang: effectiveLang };

  // fetch fresh
  try {
    const prompt = `Translate the following UI labels into ${effectiveLang}. Return ONLY a raw JSON object with the same keys.`;
    const res = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        lang: effectiveLang,
        targetLang: effectiveLang,
        json: base,
        text: JSON.stringify(base),
        maxTokens: 800,
      }),
    });

    const raw = await res.text();
    let j;
    try {
      j = JSON.parse(raw);
    } catch {
      j = { translation: null };
    }

    const translated =
      j?.translation || j?.data || (typeof j === 'object' && !Array.isArray(j) ? j : null);

    if (res.ok && translated) {
      labels = { ...labels, ...translated };
      try {
        localStorage.setItem(tCacheKey(cachePrefix, effectiveLang), JSON.stringify(translated));
      } catch {}
    }
  } catch {}

  return { t: labels, lang: effectiveLang };
}
