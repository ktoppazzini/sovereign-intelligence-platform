// lib/aiOverlay.js
// AI Content Overlay & Enhancement Module
// Provides overlays for reports with translated content

import { translateContent, translateBatch } from './dynamicTranslation';

/**
 * Create AI-powered content overlay with translations
 * @param {string} content - Content to overlay
 * @param {string} lang - Target language
 * @returns {Promise<string>} Translated overlay content
 */
export async function createAIOverlay(content, lang = 'English') {
  if (!content) return '';
  
  // Translate content asynchronously
  const translatedContent = await translateContent(content, lang);
  
  return `<div class="ai-overlay" data-lang="${lang}">${translatedContent}</div>`;
}

/**
 * Batch create overlays with translation
 * @param {Array<string>} contents - Array of content strings
 * @param {string} lang - Target language
 * @returns {Promise<Array<string>>} Array of translated overlay HTML
 */
export async function createBatchOverlays(contents, lang = 'English') {
  if (!Array.isArray(contents) || contents.length === 0) return [];
  
  const translated = await translateBatch(contents, lang);
  
  return translated.map((content, idx) => 
    `<div class="ai-overlay" data-index="${idx}" data-lang="${lang}">${content}</div>`
  );
}

/**
 * Enhance text with AI context and translation
 * @param {string} text - Text to enhance
 * @param {string} context - Context for enhancement
 * @param {string} lang - Target language
 * @returns {Promise<string>} Enhanced translated text
 */
export async function enhanceWithAI(text, context = '', lang = 'English') {
  if (!text) return '';
  
  const enhanced = `${text}${context ? ` (${context})` : ''}`;
  return translateContent(enhanced, lang);
}

export default {
  createAIOverlay,
  createBatchOverlays,
  enhanceWithAI,
};
