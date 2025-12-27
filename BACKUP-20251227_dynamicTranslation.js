// lib/dynamicTranslation.js
// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC TRANSLATION WRAPPER - Comprehensive I18N Orchestration
// ═══════════════════════════════════════════════════════════════════════════
// 
// This module provides universal translation functions that integrate with
// the Airtable-based i18nClient to ensure NO hard-coded English content
// ever reaches users. All content is dynamically translated before rendering.
//
// @version 2.1.0
// @author Sovereign Intelligence Platform

import { getUiTranslations, normalizeLang, isRTL } from './i18nClient';

const TAG = '[SR:DYNAMIC-TRANSLATION]';

/**
 * ZERO-HARDCODE POLICY: Never pass raw English strings to render functions
 * All strings must go through dynamic translation
 */

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL STRING TRANSLATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Translate a single string or object of strings to target language
 * Used for dynamic content that isn't in predefined BASE_UI
 */
export async function translateContent(content, targetLang = 'English', context = {}) {
  if (!content) return content;
  
  const effectiveLang = normalizeLang(targetLang);
  if (/^english$/i.test(effectiveLang)) return content;
  
  try {
    const response = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'text',
        targetLang: effectiveLang,
        text: typeof content === 'string' ? content : JSON.stringify(content),
        context,
      }),
    });
    
    const result = await response.json();
    console.log(TAG, 'Content translated', { lang: effectiveLang, success: !!result.translation });
    
    return result.translation || content;
  } catch (e) {
    console.warn(TAG, 'Translation failed, returning original', e);
    return content;
  }
}

/**
 * Translate an entire object/array structure recursively
 * Useful for API responses or database records
 */
export async function translateObject(obj, targetLang = 'English', keyPaths = []) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const effectiveLang = normalizeLang(targetLang);
  if (/^english$/i.test(effectiveLang)) return obj;
  
  try {
    // Extract strings to translate based on keyPaths or all string values
    const keysToTranslate = keyPaths.length > 0 
      ? keyPaths 
      : extractStringKeys(obj);
    
    const stringsToTranslate = keysToTranslate.map(path => getValueByPath(obj, path)).filter(Boolean);
    
    if (stringsToTranslate.length === 0) return obj;
    
    const response = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'bulk',
        targetLang: effectiveLang,
        strings: stringsToTranslate,
      }),
    });
    
    const result = await response.json();
    
    if (result.translations && Array.isArray(result.translations)) {
      const translated = { ...obj };
      keysToTranslate.forEach((path, i) => {
        setValueByPath(translated, path, result.translations[i]);
      });
      return translated;
    }
    
    return obj;
  } catch (e) {
    console.warn(TAG, 'Object translation failed', e);
    return obj;
  }
}

/**
 * Create a translation wrapper for React components
 * Ensures component content is always translated before render
 */
export function withDynamicTranslation(Component, baseUI = {}) {
  return async (props) => {
    const lang = props.lang || 'English';
    
    try {
      const { t, lang: effectiveLang } = await getUiTranslations({
        base: baseUI,
        lang,
        cachePrefix: `${props.module || 'SI'}_${props.component || 'DEFAULT'}`,
        setDir: true,
      });
      
      return <Component {...props} translations={t} effectiveLang={effectiveLang} />;
    } catch (e) {
      console.error(TAG, 'Component translation wrapper failed', e);
      return <Component {...props} translations={baseUI} effectiveLang="English" />;
    }
  };
}

/**
 * Ensure all strings in a response are translated before returning to client
 * Used in API routes to prevent English leakage
 */
export async function ensureTranslatedResponse(response, targetLang = 'English') {
  if (!response || typeof response !== 'object') return response;
  
  const effectiveLang = normalizeLang(targetLang);
  if (/^english$/i.test(effectiveLang)) return response;
  
  try {
    // Recursively translate all string values in the response
    return await translateObject(response, effectiveLang);
  } catch (e) {
    console.warn(TAG, 'Response translation failed', e);
    return response;
  }
}

/**
 * Batch translate multiple strings efficiently
 * Reduces API calls by grouping translations
 */
export async function translateBatch(strings = [], targetLang = 'English') {
  if (!strings || strings.length === 0) return [];
  
  const effectiveLang = normalizeLang(targetLang);
  if (/^english$/i.test(effectiveLang)) return strings;
  
  try {
    const response = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'bulk',
        targetLang: effectiveLang,
        strings,
      }),
    });
    
    const result = await response.json();
    return result.translations || strings;
  } catch (e) {
    console.warn(TAG, 'Batch translation failed', e);
    return strings;
  }
}

/**
 * Get all UI translations for a module upfront
 * Prevents waterfall requests
 */
export async function loadModuleTranslations(module, baseUI, lang = 'English') {
  try {
    const { t, lang: effectiveLang } = await getUiTranslations({
      base: baseUI,
      lang,
      cachePrefix: `SI_MODULE_${module}`,
      setDir: true,
    });
    
    console.log(TAG, 'Module translations loaded', { module, lang: effectiveLang, keys: Object.keys(t).length });
    
    return { translations: t, lang: effectiveLang };
  } catch (e) {
    console.error(TAG, 'Module translation load failed', e);
    return { translations: baseUI, lang: 'English' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function extractStringKeys(obj, prefix = '') {
  const keys = [];
  
  if (typeof obj !== 'object' || obj === null) return keys;
  
  Object.entries(obj).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      keys.push(path);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractStringKeys(value, path));
    }
  });
  
  return keys;
}

function getValueByPath(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setValueByPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) current[key] = {};
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Create a memoized translation getter for performance
 */
const translationCache = new Map();

export async function getCachedTranslations(cacheKey, baseUI, lang) {
  const effectiveLang = normalizeLang(lang);
  const fullKey = `${cacheKey}:${effectiveLang}`;
  
  if (translationCache.has(fullKey)) {
    return translationCache.get(fullKey);
  }
  
  const result = await getUiTranslations({
    base: baseUI,
    lang: effectiveLang,
    cachePrefix: cacheKey,
  });
  
  translationCache.set(fullKey, result);
  return result;
}

/**
 * Clear translation cache (useful for hot reload or language changes)
 */
export function clearTranslationCache() {
  translationCache.clear();
  console.log(TAG, 'Translation cache cleared');
}

/**
 * Validate that no hard-coded English exists in rendered output
 * Development helper to catch translation misses
 */
export function validateNoHardcodedEnglish(html, lang) {
  if (/^english$/i.test(lang)) return true; // Skip for English
  
  // This is a development helper - detect common English patterns
  const englishIndicators = /\b(the|and|or|is|are|was|were|be|have|has|had|do|does|did|can|could|will|would|should|may|might|must)\b/gi;
  
  const matches = html.match(englishIndicators);
  if (matches && matches.length > 5) {
    console.warn(TAG, 'WARNING: Potential hard-coded English detected', { 
      lang, 
      matches: matches.length,
      sample: matches.slice(0, 5)
    });
    return false;
  }
  
  return true;
}

export default {
  translateContent,
  translateObject,
  withDynamicTranslation,
  ensureTranslatedResponse,
  translateBatch,
  loadModuleTranslations,
  getCachedTranslations,
  clearTranslationCache,
  validateNoHardcodedEnglish,
};
