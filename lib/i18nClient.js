// lib/i18nClient.js
export function normalizeLang(raw) {
  if (!raw) return 'English';
  const lower = String(raw).toLowerCase();
  
  // Comprehensive language mapping
  const map = {
    // RTL Languages
    ar: 'Arabic', arabic: 'Arabic',
    he: 'Hebrew', hebrew: 'Hebrew',
    fa: 'Persian', farsi: 'Persian', persian: 'Persian',
    ur: 'Urdu', urdu: 'Urdu',
    ps: 'Pashto', pashto: 'Pashto',
    sd: 'Sindhi', sindhi: 'Sindhi',
    
    // Major European Languages
    en: 'English', english: 'English',
    es: 'Spanish', spanish: 'Spanish', español: 'Spanish',
    fr: 'French', french: 'French', français: 'French',
    de: 'German', german: 'German', deutsch: 'German',
    it: 'Italian', italian: 'Italian', italiano: 'Italian',
    pt: 'Portuguese', portuguese: 'Portuguese', português: 'Portuguese',
    nl: 'Dutch', dutch: 'Dutch', nederlands: 'Dutch',
    pl: 'Polish', polish: 'Polish', polski: 'Polish',
    ru: 'Russian', russian: 'Russian', русский: 'Russian',
    uk: 'Ukrainian', ukrainian: 'Ukrainian',
    cs: 'Czech', czech: 'Czech', čeština: 'Czech',
    hu: 'Hungarian', hungarian: 'Hungarian', magyar: 'Hungarian',
    ro: 'Romanian', romanian: 'Romanian', română: 'Romanian',
    el: 'Greek', greek: 'Greek', ελληνικά: 'Greek',
    
    // Nordic Languages
    sv: 'Swedish', swedish: 'Swedish', svenska: 'Swedish',
    no: 'Norwegian', norwegian: 'Norwegian', norsk: 'Norwegian',
    da: 'Danish', danish: 'Danish', dansk: 'Danish',
    fi: 'Finnish', finnish: 'Finnish', suomi: 'Finnish',
    is: 'Icelandic', icelandic: 'Icelandic',
    
    // Asian Languages
    zh: 'Chinese', chinese: 'Chinese', 中文: 'Chinese',
    ja: 'Japanese', japanese: 'Japanese', 日本語: 'Japanese',
    ko: 'Korean', korean: 'Korean', 한국어: 'Korean',
    hi: 'Hindi', hindi: 'Hindi', हिन्दी: 'Hindi',
    vi: 'Vietnamese', vietnamese: 'Vietnamese', tiếng: 'Vietnamese',
    th: 'Thai', thai: 'Thai', ไทย: 'Thai',
    id: 'Indonesian', indonesian: 'Indonesian',
    ms: 'Malay', malay: 'Malay',
    tl: 'Tagalog', tagalog: 'Tagalog', filipino: 'Tagalog',
    
    // Other Languages
    tr: 'Turkish', turkish: 'Turkish', türkçe: 'Turkish',
    bn: 'Bengali', bengali: 'Bengali',
    ta: 'Tamil', tamil: 'Tamil',
    te: 'Telugu', telugu: 'Telugu',
    mr: 'Marathi', marathi: 'Marathi',
    gu: 'Gujarati', gujarati: 'Gujarati',
    pa: 'Punjabi', punjabi: 'Punjabi',
    sw: 'Swahili', swahili: 'Swahili',
    am: 'Amharic', amharic: 'Amharic',
  };
  
  return map[lower] || raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
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
  console.log('[i18nClient] getUiTranslations called', { lang, effectiveLang, cachePrefix });

  // direction
  if (typeof document !== 'undefined' && setDir) {
    try {
      document.documentElement.setAttribute('dir', isRTL(effectiveLang) ? 'rtl' : 'ltr');
    } catch {}
  }

  // apply cached labels first
  let labels = { ...base };
  let hasCachedTranslation = false;
  try {
    const cached = localStorage.getItem(tCacheKey(cachePrefix, effectiveLang));
    if (cached) {
      const parsedCache = JSON.parse(cached);
      // Only use cache if it has different values than base (i.e., actually translated)
      const hasTranslations = Object.keys(parsedCache).some(k => parsedCache[k] !== base[k]);
      if (hasTranslations) {
        labels = { ...labels, ...parsedCache };
        hasCachedTranslation = true;
        console.log('[i18nClient] Using cached translations', { lang: effectiveLang });
      }
    }
  } catch (e) {
    console.warn('[i18nClient] Cache read error', e);
  }

  // English — return early
  if (/^english$/i.test(effectiveLang)) return { t: labels, lang: effectiveLang };

  // If we have cached translations and they're fresh (within 24h), return them
  if (hasCachedTranslation) {
    // Still return cached, but fetch fresh in background
    fetchFreshTranslations(base, effectiveLang, cachePrefix).catch(() => {});
    return { t: labels, lang: effectiveLang };
  }

  // fetch fresh translations
  const freshLabels = await fetchFreshTranslations(base, effectiveLang, cachePrefix);
  return { t: freshLabels || labels, lang: effectiveLang };
}

async function fetchFreshTranslations(base, effectiveLang, cachePrefix) {
  let labels = { ...base }; // Start with base labels
  try {
    console.log('[i18nClient] Fetching fresh translations for', effectiveLang);
    const res = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'json',
        targetLang: effectiveLang,
        ui: base,
      }),
    });

    const raw = await res.text();
    console.log('[i18nClient] Translation response status:', res.status, 'length:', raw.length);
    let j;
    try {
      j = JSON.parse(raw);
    } catch {
      console.warn('[i18nClient] Failed to parse translation response');
      j = { translation: null };
    }

    const translated =
      j?.translation || j?.data || (typeof j === 'object' && !Array.isArray(j) && j !== null ? j : null);

    console.log('[i18nClient] Translated result:', { 
      hasTranslation: !!translated, 
      keys: translated ? Object.keys(translated).length : 0 
    });

    if (res.ok && translated && typeof translated === 'object') {
      labels = { ...labels, ...translated };
      try {
        localStorage.setItem(tCacheKey(cachePrefix, effectiveLang), JSON.stringify(translated));
        console.log('[i18nClient] Cached translations for', effectiveLang);
      } catch (e) {
        console.warn('[i18nClient] Failed to cache translations', e);
      }
    }
  } catch (e) {
    console.error('[i18nClient] Translation fetch error:', e);
  }

  return labels; // Return just the labels object, not wrapped
}
