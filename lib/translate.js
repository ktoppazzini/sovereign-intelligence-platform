// lib/translate.js
// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE - Translation Utility with Self-Learning
// ═══════════════════════════════════════════════════════════════════════════
// Routes through SovereignAI for:
// - Translation quality improvement over time
// - Pattern recognition across language pairs
// - Never forgets translation contexts and preferences
// - Exponential improvement with every translation
// ═══════════════════════════════════════════════════════════════════════════

import SovereignAI from './ai/sovereignAI';

// Hard-lock Nano 5 for dev; you can swap this in prod.
const MODEL = process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07";

/**
 * Translate text to target language using SovereignAI
 * @param {string} targetLang - Target language (e.g., 'Spanish', 'French', 'Mandarin Chinese')
 * @param {string} text - Text to translate
 * @param {boolean} [preserveHtml=false] - Whether to preserve HTML tags
 * @returns {Promise<string>} Translated text
 */
export async function translate(targetLang, text, preserveHtml = false) {
  // Skip translation for English
  if (!targetLang || /^english$/i.test(targetLang)) {
    return text;
  }

  try {
    console.log('[SR:translate] Translating to:', targetLang, 'Length:', text.length);

    const systemPrompt = preserveHtml
      ? `You are a professional translator. Translate the following text to ${targetLang}.
         Preserve ALL HTML tags, attributes, and structure.
         Translate ONLY the text content between tags.
         Do NOT translate technical terms, currency codes, or numbers.
         Return ONLY the translated text with no explanations.`
      : `You are a professional translator. Translate the following text to ${targetLang}.
         Maintain professional business terminology.
         Do NOT translate technical terms, currency codes, or numbers.
         Return ONLY the translated text with no explanations.`;

    const result = await SovereignAI.call({
      prompt: text,
      systemPrompt,
      callType: 'translation',
      vertical: 'translations',
      lang: targetLang,
      maxTokens: 12000,
      context: { preserveHtml, originalLength: text.length }
    });

    const translated = result?.response?.trim() || result?.raw?.trim() || text;

    console.log('[SR:translate] Translation complete:', {
      targetLang,
      originalLength: text.length,
      translatedLength: translated.length,
      learnings: result?.learnings ? 'captured' : 'none'
    });

    return translated;
  } catch (error) {
    console.error('[SR:translate] Translation error:', error);
    // Return original text on error
    return text;
  }
}

/**
 * Translate multiple texts in parallel
 * @param {string} targetLang - Target language
 * @param {string[]} texts - Array of texts to translate
 * @param {boolean} [preserveHtml=false] - Whether to preserve HTML tags
 * @returns {Promise<string[]>} Array of translated texts
 */
export async function translateBatch(targetLang, texts, preserveHtml = false) {
  if (!targetLang || /^english$/i.test(targetLang)) {
    return texts;
  }

  try {
    const translations = await Promise.all(
      texts.map((text) => translate(targetLang, text, preserveHtml))
    );
    return translations;
  } catch (error) {
    console.error('[translate] Batch translation error:', error);
    return texts; // Return originals on error
  }
}

export default { translate, translateBatch };
