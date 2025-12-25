/**
 * [KT:TRANSLATION-VALIDATOR] Translation Validation Middleware
 * 
 * Catches English text leaking into non-English reports.
 * Runs AFTER AI generation, BEFORE content goes to report.
 * 
 * Features:
 * 1. Detects common English words/phrases in non-English content
 * 2. Auto-replaces from known dictionary
 * 3. Flags untranslated content for GPT correction
 * 4. Logs warnings for debugging
 * 
 * @created 2025-12-21
 */

// Common English words that should NEVER appear in translated reports
// These are business/report terms that AI often forgets to translate
const ENGLISH_LEAK_PATTERNS = [
  // Section titles
  'Executive Summary', 'Table of Contents', 'Current State', 'Financial Analysis',
  'Risk Assessment', 'ROI Projections', 'Next Steps', 'Appendix', 'Appendices',
  'Implementation Plan', 'Operational Analysis', 'KPI',
  
  // Dashboard labels
  'Projected ROI', 'Payback Period', 'Annual Savings', 'Timeline',
  'Confidence Level', 'Strategic Impact', 'Industry benchmark',
  'faster than industry average', 'Best-in-class timing', 'in annual value',
  'Top quartile performance', 'implementation horizon', 'Accelerated delivery',
  'data-supported', 'High certainty', 'Transformational change', 'across value chain',
  
  // Risk matrix labels
  'Risk Assessment Matrix', 'Risk Heat Map', 'Likelihood', 'Severity',
  'Critical', 'Major', 'Moderate', 'Minor', 'Negligible',
  'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain',
  
  // Chart labels
  'Overall', 'Key Insights', 'Value Bridge', 'Waterfall',
  'Quick Wins', 'Big Bets', 'Fill-Ins', 'Major Projects',
  
  // Table headers
  'Phase', 'Objective', 'Owner', 'Status', 'Priority', 'Description',
  'Initiative', 'Cost', 'Revenue', 'Savings', 'Investment',
  
  // Common phrases
  'This means', 'KEY INSIGHT', 'Potential value', 'Go-to-market',
  'Current State', 'Target State', 'Baseline', 'Benchmark'
];

// Regex patterns to detect English sentences (rough heuristic)
const ENGLISH_SENTENCE_PATTERNS = [
  /\bthe\s+\w+\s+(is|are|was|were|will|has|have)\b/gi,
  /\b(This|That|These|Those)\s+(is|are|means|shows|indicates)\b/gi,
  /\b(should|would|could|must)\s+be\s+\w+/gi,
  /\bIn\s+order\s+to\b/gi,
  /\bAs\s+a\s+result\b/gi,
  /\bDue\s+to\b/gi,
  /\bIn\s+addition\b/gi,
  /\bFurthermore\b/gi,
  /\bHowever\b/gi,
  /\bTherefore\b/gi,
];

/**
 * Check if a language is English (case-insensitive)
 */
function isEnglish(lang) {
  return /^english$/i.test(String(lang || '').trim());
}

/**
 * Detect English text in content that should be translated
 * @param {string} content - The content to check
 * @param {string} targetLang - The expected language
 * @returns {Object} - { hasEnglish: boolean, detected: string[], score: number }
 */
function detectEnglishLeaks(content, targetLang) {
  if (!content || isEnglish(targetLang)) {
    return { hasEnglish: false, detected: [], score: 0 };
  }
  
  const text = String(content);
  const detected = [];
  let score = 0;
  
  // Check for known English phrases
  for (const phrase of ENGLISH_LEAK_PATTERNS) {
    const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
    if (regex.test(text)) {
      detected.push(phrase);
      score += 10; // High penalty for known phrases
    }
  }
  
  // Check for English sentence patterns
  for (const pattern of ENGLISH_SENTENCE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      detected.push(...matches.slice(0, 3)); // Limit to 3 examples
      score += matches.length * 5;
    }
  }
  
  // Heuristic: High ratio of common English words
  const commonEnglishWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'been'];
  const words = text.toLowerCase().split(/\s+/);
  const englishWordCount = words.filter(w => commonEnglishWords.includes(w)).length;
  const englishRatio = englishWordCount / Math.max(words.length, 1);
  
  if (englishRatio > 0.15 && words.length > 20) {
    score += Math.round(englishRatio * 50);
    detected.push(`High English word ratio: ${(englishRatio * 100).toFixed(1)}%`);
  }
  
  return {
    hasEnglish: score > 15,
    detected: [...new Set(detected)], // Dedupe
    score
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate and fix translated content
 * @param {string} content - HTML or text content
 * @param {string} targetLang - Target language
 * @param {Object} translatedLabels - Dictionary of translated labels
 * @param {Object} options - { autoFix: boolean, logWarnings: boolean }
 * @returns {Object} - { content: string, wasFixed: boolean, issues: string[] }
 */
function validateTranslatedContent(content, targetLang, translatedLabels = {}, options = {}) {
  const { autoFix = true, logWarnings = true } = options;
  
  if (!content || isEnglish(targetLang)) {
    return { content, wasFixed: false, issues: [] };
  }
  
  let fixedContent = String(content);
  const issues = [];
  let wasFixed = false;
  
  // Step 1: Auto-replace known English terms with translations
  if (autoFix && translatedLabels && Object.keys(translatedLabels).length > 0) {
    for (const [english, translated] of Object.entries(translatedLabels)) {
      if (english && translated && english !== translated) {
        // Only replace if English term exists in content
        const regex = new RegExp(`\\b${escapeRegex(english)}\\b`, 'g');
        if (regex.test(fixedContent)) {
          const before = fixedContent;
          fixedContent = fixedContent.replace(regex, translated);
          if (before !== fixedContent) {
            wasFixed = true;
            if (logWarnings) {
              console.log(`[TRANSLATION-VALIDATOR] Auto-fixed: "${english}" → "${translated}"`);
            }
          }
        }
      }
    }
  }
  
  // Step 2: Detect remaining English leaks
  const detection = detectEnglishLeaks(fixedContent, targetLang);
  
  if (detection.hasEnglish) {
    issues.push(...detection.detected.map(d => `English detected: "${d}"`));
    
    if (logWarnings) {
      console.warn(`[TRANSLATION-VALIDATOR] ⚠️ English leaks detected in ${targetLang} content:`, {
        score: detection.score,
        samples: detection.detected.slice(0, 5),
        contentPreview: fixedContent.substring(0, 200) + '...'
      });
    }
  }
  
  return {
    content: fixedContent,
    wasFixed,
    issues,
    englishScore: detection.score
  };
}

/**
 * Validate an array of items with name/description fields
 * Common pattern for risks, initiatives, KPIs, etc.
 * @param {Array} items - Array of objects with name, description, etc.
 * @param {string} targetLang - Target language
 * @param {Object} translatedLabels - Dictionary
 * @returns {Array} - Fixed items with validation info
 */
function validateItemArray(items, targetLang, translatedLabels = {}) {
  if (!items || !Array.isArray(items) || isEnglish(targetLang)) {
    return items;
  }
  
  return items.map((item, index) => {
    const issues = [];
    
    // Check name
    if (item.name && !item.nameTranslated) {
      const nameCheck = detectEnglishLeaks(item.name, targetLang);
      if (nameCheck.hasEnglish) {
        issues.push(`Item ${index + 1} name appears to be English: "${item.name}"`);
      }
    }
    
    // Check description
    if (item.description && !item.descriptionTranslated) {
      const descCheck = detectEnglishLeaks(item.description, targetLang);
      if (descCheck.hasEnglish) {
        issues.push(`Item ${index + 1} description appears to be English`);
      }
    }
    
    if (issues.length > 0) {
      console.warn(`[TRANSLATION-VALIDATOR] Item validation issues:`, issues);
    }
    
    return {
      ...item,
      _validationIssues: issues.length > 0 ? issues : undefined
    };
  });
}

/**
 * Validate risk heatmap spec
 * @param {Object} spec - Risk heatmap spec from buildRiskHeatmapSpec
 * @param {string} targetLang - Target language
 * @returns {Object} - Validated spec with warnings
 */
function validateRiskHeatmap(spec, targetLang) {
  if (!spec || !spec.risks || isEnglish(targetLang)) {
    return spec;
  }
  
  const validatedRisks = spec.risks.map((risk, i) => {
    const issues = [];
    
    // Check if risk has translated version
    if (!risk.nameTranslated) {
      const nameCheck = detectEnglishLeaks(risk.name, targetLang);
      if (nameCheck.hasEnglish) {
        issues.push(`Risk ${i + 1} "${risk.name}" needs translation`);
      }
    }
    
    if (!risk.descriptionTranslated && risk.description) {
      const descCheck = detectEnglishLeaks(risk.description, targetLang);
      if (descCheck.hasEnglish) {
        issues.push(`Risk ${i + 1} description needs translation`);
      }
    }
    
    if (issues.length > 0) {
      console.warn(`[TRANSLATION-VALIDATOR] Risk validation:`, issues);
    }
    
    return risk;
  });
  
  return { ...spec, risks: validatedRisks };
}

/**
 * Validate final HTML report before returning to client
 * This is the main entry point - call this on the final report HTML
 * @param {string} html - Full report HTML
 * @param {string} targetLang - Target language
 * @param {Object} translatedLabels - Full L object with translations
 * @returns {Object} - { html: string, issues: string[], englishScore: number }
 */
function validateFinalReport(html, targetLang, translatedLabels = {}) {
  if (!html || isEnglish(targetLang)) {
    return { html, issues: [], englishScore: 0 };
  }
  
  console.log(`[TRANSLATION-VALIDATOR] 🔍 Validating ${targetLang} report...`);
  
  // Run validation with auto-fix enabled
  const result = validateTranslatedContent(html, targetLang, translatedLabels, {
    autoFix: true,
    logWarnings: true
  });
  
  // Summary log
  if (result.issues.length > 0) {
    console.warn(`[TRANSLATION-VALIDATOR] ⚠️ Found ${result.issues.length} potential translation issues`);
    console.warn(`[TRANSLATION-VALIDATOR] English score: ${result.englishScore} (higher = more English detected)`);
  } else {
    console.log(`[TRANSLATION-VALIDATOR] ✅ Report passed validation for ${targetLang}`);
  }
  
  return {
    html: result.content,
    issues: result.issues,
    englishScore: result.englishScore,
    wasFixed: result.wasFixed
  };
}

/**
 * Quick check if content likely needs translation review
 * Lightweight version for performance-sensitive paths
 * @param {string} content - Content to check
 * @param {string} targetLang - Target language
 * @returns {boolean} - true if likely has English issues
 */
function needsTranslationReview(content, targetLang) {
  if (!content || isEnglish(targetLang)) return false;
  
  const detection = detectEnglishLeaks(content, targetLang);
  return detection.score > 20;
}

// Export all functions
export {
  detectEnglishLeaks,
  validateTranslatedContent,
  validateItemArray,
  validateRiskHeatmap,
  validateFinalReport,
  needsTranslationReview,
  isEnglish,
  ENGLISH_LEAK_PATTERNS
};

export default {
  detectEnglishLeaks,
  validateTranslatedContent,
  validateItemArray,
  validateRiskHeatmap,
  validateFinalReport,
  needsTranslationReview,
  isEnglish
};
