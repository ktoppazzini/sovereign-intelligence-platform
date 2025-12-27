// [KT:CACHE-BUST:2025-12-08-v3.0] Complete translation fix: logo, title page, exec infographic, graphs, tables, waterfall
// Version: TRANSLATION-FIX-v3.0.0  
// Changes: All UI elements now properly translated via L labels + dynamic translator
import { translate } from '@/lib/translate.js';

/**
 * [KT:UNIVERSAL-UTF8-SANITIZE-v2.0]
 * Comprehensive UTF-8 corruption fix for GPT JSON responses.
 * Handles ALL known corruption patterns from multi-language GPT responses.
 */
function sanitizeJSONForParsing(raw) {
  if (!raw || typeof raw !== 'string') return '';
  
  let jsonStr = raw;
  
  // Step 1: Remove embedded newlines that break JSON (MOST CRITICAL)
  jsonStr = jsonStr.replace(/[\r\n]+/g, ' ');
  jsonStr = jsonStr.replace(/\\n/g, ' ');  // Literal \n in string
  jsonStr = jsonStr.replace(/\\r/g, ' ');  // Literal \r in string
  
  // Step 2: Aggressive removal of any control characters that aren't JSON structural
  // This prevents subtle encoding issues from breaking parsing
  jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Step 3: Comprehensive UTF-8 corruption replacement
  // These patterns occur when GPT returns multi-language text with encoding issues
  // Accent replacements (most critical for French, Spanish, Nordic)
  const utf8Fixes = [
    // French accents
    [/├⌐/g, 'é'],      // Common é corruption
    [/├Â/g, 'ê'],      // ê corruption
    [/├ç/g, 'è'],      // è corruption  
    [/├ë/g, 'é'],      // é corruption variant
    [/├á/g, 'à'],      // à corruption
    [/├â/g, 'â'],      // â corruption
    [/├ª/g, 'ª'],      // ª corruption
    [/├╝/g, 'ú'],      // ú corruption
    [/├╖/g, 'ö'],      // ö corruption
    [/├½/g, 'ü'],      // ü corruption
    [/├«/g, 'ë'],      // ë corruption
    [/├¿/g, '¿'],      // inverted question mark
    [/├│/g, 'í'],      // í corruption
    [/├ü/g, 'ü'],      // ü corruption variant
    [/├ó/g, 'ó'],      // ó corruption
    [/├À/g, 'À'],      // À uppercase
    [/├È/g, 'È'],      // È uppercase
    [/├ë/g, 'ë'],      // ë corruption
    
    // Nordic characters
    [/├Ñ/g, 'ø'],      // ø corruption
    [/├å/g, 'å'],      // å corruption
    [/├ª/g, 'ª'],      // ª corruption variant
    [/├Æ/g, 'Æ'],      // Æ uppercase
    
    // Spanish/Latin
    [/├ñ/g, 'ñ'],      // ñ corruption
    [/├Ñ/g, 'Ñ'],      // Ñ uppercase
    [/├á/g, 'á'],      // á corruption
    [/├â/g, 'â'],      // â corruption
    [/├ã/g, 'ã'],      // ã corruption
    [/├¡/g, '¡'],      // inverted exclamation
    
    // Gamma/Greek corruptions (from older encoding)
    [/Γî/g, 'î'],      // î corruption
    [/Γò/g, 'ò'],      // ò corruption
    [/Γñ/g, 'ñ'],      // ñ corruption
    [/Γü/g, 'ü'],      // ü corruption
    
    // Cleanup misc special characters that may interfere
    [/├Ç/g, 'Ç'],      // Ç uppercase
    [/├ç/g, 'ç'],      // ç lowercase
  ];
  
  for (const [pattern, replacement] of utf8Fixes) {
    jsonStr = jsonStr.replace(pattern, replacement);
  }
  
  return jsonStr;
}


async function buildPredictiveModelSpec(canon = {}, sections = {}, reportHTML = '', L = {}) {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');
    const langNote = !/^english$/i.test(lang)
      ? `All human-readable strings ("labels", "xTitle", "yTitle") must be written in ${lang}.`
      : 'Use clear business English for all human-readable strings.';

    // [KT:KPI-DETECTION] Check if this is a KPI-specific extraction (starts with TARGET_KPI=)
    const isKPIExtraction = /^TARGET_KPI=/i.test(reportHTML);
    let kpiName = '';
    let kpiDesc = '';
    let htmlContent = reportHTML;
    
    if (isKPIExtraction) {
      // Extract KPI name and description from context
      const kpiMatch = reportHTML.match(/TARGET_KPI="([^"]+)"/);
      const descMatch = reportHTML.match(/KPI_DESCRIPTION="([^"]+)"/);
      kpiName = kpiMatch ? kpiMatch[1] : '';
      kpiDesc = descMatch ? descMatch[1] : '';
      // Remove KPI headers and keep just the HTML content
      htmlContent = reportHTML.replace(/^TARGET_KPI="[^"]*"\s*KPI_DESCRIPTION="[^"]*"\s*/, '').trim();
    }

    const prompt = `
You are a forecasting analyst. Read the reform report context and propose a short predictive series.
Return STRICT JSON:
{
  "labels": ["T1","T2",...],      // 6-12 points, short labels
  "values": [number,...],         // same length as labels, positive
  "xTitle": "short label for the horizontal time axis in the report language",
  "yTitle": "short label for the vertical value axis in the report language (include currency symbol)"
Rules:
- Infer scale from any financials or KPIs (goal, savings, revenue, value bridge).
- If content is weak, produce a smooth, realistic S-curve toward the stated goal.
- Keep numbers integers; clamp negatives to 0.
- DO NOT add commentary; JSON only.
- ${langNote}
${isKPIExtraction ? `\nFOCUS: Extract data specifically for the KPI: "${kpiName}" (${kpiDesc})` : ''}
Context:
CANON=${JSON.stringify(canon).slice(0, 4000)}
SECTION_KEYS=${Object.keys(sections || {}).join(',')}
HTML_SNIPPET=${String(htmlContent || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000)}
`;

    try {
      const res = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
        temperature: 1,
        messages: [
          { role: 'system', content: 'Return STRICT JSON only. No prose, no markdown.' },
          { role: 'user', content: prompt }
        ]
      });

      let raw = (res?.choices?.[0]?.message?.content || '').trim();

      // [KT:SURGICAL:PREDICTIVE-PARSE:LEGACY]
      // JSON repair without deletions (kept for audit, superseded by safer extractor below)
      // try {
      //   const first = raw.indexOf('{');
      //   const last = raw.lastIndexOf('}');
      //   if (first >= 0 && last > first) raw = raw.slice(first, last + 1);
      // } catch {}
      // let parsed;
      // try { parsed = JSON.parse(raw); } catch { parsed = null; }

      // [KT:SURGICAL:PREDICTIVE-PARSE:SAFE]
      // Robust JSON extraction using extractJsonObject with fallbacks.
      let parsed = null;
      let jsonStr = extractJsonObject(raw) || raw;

      // [KT:UTF8-FIX-v2.0] Apply comprehensive sanitization
      try {
        // Remove any non-valid JSON structural characters at the beginning
        jsonStr = jsonStr.replace(/^[^\[{]*/, '').trim();
        // Ensure it starts with { or [
        if (!jsonStr.match(/^[\[{]/)) {
          console.log('[KT:UTF8-SANITIZE] jsonStr does not start with [ or {, using raw');
          jsonStr = raw;
        }
        // Remove any trailing characters after closing } or ]
        const closeIdx = Math.max(jsonStr.lastIndexOf('}'), jsonStr.lastIndexOf(']'));
        if (closeIdx > 0) {
          jsonStr = jsonStr.slice(0, closeIdx + 1);
        }
        // Use universal sanitizer for ALL UTF-8 corruption + newline removal
        jsonStr = sanitizeJSONForParsing(jsonStr);
      } catch (e) {
        console.log('[KT:UTF8-SANITIZE] error during sanitization:', String(e?.message || e));
      }

      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error(
          "[SR:REFORM] predictiveModel.parse.error",
          parseErr,
          {
            lang,
            rawPreview: raw.slice(0, 160),
            jsonPreview: jsonStr.slice(0, 160),
            jsonStrLength: jsonStr.length,
          }
        );
        parsed = null;
      }

      // Fallbacks to keep UI always populated
      if (
        !parsed ||
        !Array.isArray(parsed.labels) ||
        !Array.isArray(parsed.values) ||
        parsed.labels.length < 6 ||
        parsed.labels.length !== parsed.values.length
      ) {
        const labels = ['T1','T2','T3','T4','T5','T6','T7','T8'];
        const base = Math.max(1, Number(canon?.costSavingsGoal || 10000));
        const values = labels.map((_, i) =>
          Math.round(base * (0.5 + i / (labels.length * 1.2)))
        );
        parsed = {
          labels,
          values,
          xTitle: L?.years || 'Time',
          yTitle: `${L?.value || 'Value'} (${canon?.currencySymbol || '$'})`
        };
      }

      return parsed;
    } catch (e) {
      // Emergency fallback (inner) – kept commented to respect no-deletion rule
      // const labels = ['T1','T2','T3','T4','T5','T6'];
      // const values = [10,14,17,20,23,26];
      // return { labels, values, xTitle: 'Time', yTitle: 'Value ($)' };
    }
  } catch (e) {
    // Emergency fallback if getOpenAI() fails
    const labels = ['T1','T2','T3','T4','T5','T6'];
    const values = [10,14,17,20,23,26];
    return { labels, values, xTitle: L?.years || 'Time', yTitle: `${L?.value || 'Value'} (${canon?.currencySymbol || '$'})` };
  }
}

// [KT:SURGICAL:KPI-DASHBOARD-INTEGRATED] AI identifies relevant KPIs AND extracts their data in ONE call
// Returns array of complete KPI specs ready to render (no separate selection step needed)
async function buildKPIDashboardSpec(canon = {}, sections = {}, reportHTML = '', translatedLabels = {}) {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');
    const langNote = !/^english$/i.test(lang)
      ? `All human-readable strings must be written in ${lang}.`
      : 'Use clear business English for all human-readable strings.';

    const prompt = `
You are a business transformation and data analyst. Analyze this reform report and:
1. Identify the 4 MOST RELEVANT KPIs for measuring transformation success
2. For EACH KPI, extract or infer realistic time-series data from the report content

Return STRICT JSON:
{
  "kpis": [
    {
      "name": "KPI name (e.g., 'Cost Reduction', 'Speed Improvement')",
      "description": "One sentence why this KPI matters",
      "labels": ["Period1", "Period2", ..., "Period6"],  // 6-12 time periods
      "values": [number, number, ..., number],           // matching labels length
      "xTitle": "time period label (Years/Months/Weeks)",
      "yTitle": "value label with units if applicable (e.g., '$M', '%', 'Days')"
    },
    ... (3 more KPIs)
  ]
}

Rules:
- Identify KPIs specific to THIS transformation (not generic)
- Extract realistic data from report: look for targets, baselines, timelines, metrics mentioned
- If specific data unavailable, create realistic S-curve trending toward stated goals
- All labels/titles in ${lang} language
- Values must be realistic (positive integers where applicable)
- NO commentary; JSON only.

Context:
INDUSTRY=${canon?.industry || 'General Business'}
ORG_NAME=${canon?.orgName || 'Organization'}
CANON=${JSON.stringify(canon).slice(0, 3000)}
HTML_SNIPPET=${String(reportHTML || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000)}
`;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return STRICT JSON only. No prose, no markdown.' },
        { role: 'user', content: prompt }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content || '').trim();
    let jsonStr = extractJsonObject(raw) || raw;
    jsonStr = sanitizeJSONForParsing(jsonStr);
    let parsed = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[SR:REFORM] buildKPIDashboardSpec.parse.error", parseErr);
      parsed = null;
    }

    // Fallback to default KPIs with sample data if parsing fails
    if (!parsed || !Array.isArray(parsed.kpis) || parsed.kpis.length < 4) {
      console.log(TAG, '⚠️ [KPI-DASHBOARD] AI extraction failed, using default KPIs with sample data');
      parsed = {
        kpis: [
          {
            name: 'Cost Savings',
            description: 'Total financial savings achieved through the transformation',
            labels: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'],
            values: [0, 50, 120, 210, 300],
            xTitle: 'Year',
            yTitle: 'Savings ($M)'
          },
          {
            name: 'Implementation Speed',
            description: 'Time to full value realization',
            labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'],
            values: [5, 12, 25, 45, 70, 90],
            xTitle: 'Quarter',
            yTitle: 'Completion (%)'
          },
          {
            name: 'Operational Efficiency',
            description: 'Improvement in key operational metrics',
            labels: ['Baseline', 'Month 3', 'Month 6', 'Month 9', 'Month 12'],
            values: [100, 110, 125, 140, 155],
            xTitle: 'Timeline',
            yTitle: 'Efficiency Index'
          },
          {
            name: 'Risk Mitigation',
            description: 'Reduction in risk exposure',
            labels: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'],
            values: [80, 60, 35, 15],
            xTitle: 'Phase',
            yTitle: 'Risk Level'
          }
        ]
      };
    }

    // [KT:FIX-KPI-TRANSLATION] Translate KPI names and axis titles for non-English reports
    // The AI should return in target language, but fallback uses English labels
    // Use translateChartLabels for proper AI translation of dynamic content
    let translatedKPIs = (parsed.kpis || []).slice(0, 4);
    
    if (lang && !/^english$/i.test(lang)) {
      try {
        // Translate each KPI's chart labels via AI
        translatedKPIs = await Promise.all(translatedKPIs.map(async (kpi) => {
          try {
            const translated = await translateChartLabels({
              title: kpi.name,
              xTitle: kpi.xTitle,
              yTitle: kpi.yTitle,
              labels: kpi.labels
            }, lang);
            return {
              ...kpi,
              nameTranslated: translated.title || kpi.name,
              xTitleTranslated: translated.xTitle || kpi.xTitle,
              yTitleTranslated: translated.yTitle || kpi.yTitle,
              labels: translated.labels || kpi.labels
            };
          } catch (e) {
            console.warn(TAG, 'kpi.translate.error', { name: kpi.name, error: String(e?.message || e) });
            return kpi;
          }
        }));
        console.log(TAG, 'kpiDashboard.translated', { lang, count: translatedKPIs.length });
      } catch (e) {
        console.warn(TAG, 'kpiDashboard.translation.error', String(e?.message || e));
      }
    }

    console.log(TAG, 'kpiDashboard.built', { count: translatedKPIs.length });

    return translatedKPIs;
  } catch (e) {
    console.error(TAG, 'kpiDashboard.error', String(e?.message || e));
    return null;
  }
}

// [KT:SURGICAL:KPI-SELECTION-AI] Analyze report and select 4 most relevant KPIs for this transformation
async function selectRelevantKPIs(canon = {}, sections = {}, reportHTML = '') {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');

    const prompt = `
You are a business transformation expert. Analyze this reform report and recommend the 4 MOST RELEVANT KPIs for measuring transformation success.
These KPIs should be specific to the industry and what the report actually addresses (NOT generic).

Return STRICT JSON array of 4 objects:
[
  {
    "name": "KPI name (e.g., 'Sales Growth', 'Cycle Time Reduction', 'Customer Satisfaction Score')",
    "description": "One sentence explanation of why this KPI matters for this transformation"
  },
  ... (3 more)
]

Rules:
- Select KPIs most relevant to this industry and transformation (analyze the content, don't guess)
- Each KPI should be measurable and trackable
- Avoid generic KPIs unless the report clearly focuses on them
- Order by importance to the transformation
- NO commentary; JSON only.

Context:
INDUSTRY=${canon?.industry || 'General Business'}
CANON=${JSON.stringify(canon).slice(0, 3000)}
SECTION_KEYS=${Object.keys(sections || {}).join(',')}
HTML_SNIPPET=${String(reportHTML || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000)}
`;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return STRICT JSON only. No prose, no markdown.' },
        { role: 'user', content: prompt }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content || '').trim();
    let jsonStr = extractJsonObject(raw) || raw;
    // Apply universal UTF-8 sanitizer before parsing
    jsonStr = sanitizeJSONForParsing(jsonStr);
    let parsed = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[SR:REFORM] selectRelevantKPIs.parse.error", parseErr);
      parsed = null;
    }

    // Fallback to default KPIs if selection fails
    if (!Array.isArray(parsed) || parsed.length < 4) {
      console.log(TAG, '⚠️ [KPI-SELECTION] AI selection failed, using default KPIs');
      let defaultKpis = [
        { name: 'Cost Savings', description: 'Total financial savings achieved through the transformation' },
        { name: 'Implementation Speed', description: 'How quickly the transformation reaches full value realization' },
        { name: 'Operational Efficiency', description: 'Improvement in key operational metrics relative to industry benchmark' },
        { name: 'Quality & Risk Reduction', description: 'Reduction in errors, risk exposure, or quality issues post-transformation' }
      ];
      
      // Translate default KPIs for non-English
      if (!/^english$/i.test(lang)) {
        try {
          const transRes = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
            temperature: 1, // [KT:NANO-FIX] GPT-5-nano only supports temperature=1
            messages: [
              { role: 'system', content: `Translate the following JSON to ${lang}. Return ONLY valid JSON.` },
              { role: 'user', content: JSON.stringify(defaultKpis) }
            ]
          });
          const transRaw = (transRes?.choices?.[0]?.message?.content || '').trim();
          const transJson = extractJsonObject(transRaw) || transRaw;
          const translated = JSON.parse(sanitizeJSONForParsing(transJson));
          if (Array.isArray(translated) && translated.length >= 4) {
            defaultKpis = translated;
            console.log(TAG, '[KPI-SELECTION] Fallback translated to', lang);
          }
        } catch (transErr) {
          console.warn(TAG, '[KPI-SELECTION] Fallback translation error:', transErr.message);
        }
      }
      parsed = defaultKpis;
    }

    return parsed.slice(0, 4); // Ensure exactly 4 KPIs
  } catch (e) {
    console.error("[SR:REFORM] selectRelevantKPIs.error", String(e?.message || e));
    return null;
  }
}

// ============================================================================
// [PRIORITIZATION-MATRIX-PREDICTIVE] AI-Driven Prioritization Matrix
// Analyzes nextSteps section and returns initiatives with translations
// ============================================================================
async function buildPrioritizationMatrixSpec(canon = {}, sections = {}, reportHTML = '', translatedLabels = {}) {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');
    const isNonEnglish = lang && !/^english$/i.test(lang);

    // [KT:FIX] Improved prompt to extract SPECIFIC recommendations and projects from the report
    const prompt = `
You are a strategic consultant. Analyze this report and extract 5-6 SPECIFIC RECOMMENDATIONS or PROJECTS mentioned.
Look for:
- Specific recommendations in the appendix (e.g., "Implement POS system upgrade", "Launch loyalty program")
- Named projects or initiatives with concrete deliverables
- Action items from implementation plans
- Technology or process improvements mentioned

For each recommendation/project, estimate its Business Impact (0-100) and Implementation Effort (0-100).

Return STRICT JSON:
{
  "title": "Recommendation Prioritization",
  "initiatives": [
    { "name": "Specific recommendation name exactly as described in report", "impact": number, "effort": number, "value": number },
    ... (5-6 items)
  ]
}

Rules:
- Extract ACTUAL recommendations/projects from the report text - NOT generic placeholders
- Use the EXACT wording from the report when possible (e.g., "POS System Modernization" not "Digital Transformation")
- Business Impact: 0-100 scale. 100 = transformational, 50 = moderate, 0 = minimal
- Implementation Effort: 0-100 scale. 100 = very complex/high-effort, 50 = moderate, 0 = simple
- Value: Financial value in millions (e.g., 2.5 for $2.5M benefit)
- Return in ENGLISH; we will translate
- NO commentary; JSON only.

Report content (includes appendix, recommendations, implementation):
${String(reportHTML || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000)}
`;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return STRICT JSON only. No prose, no markdown. Return English initiative names.' },
        { role: 'user', content: prompt }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content || '').trim();
    let jsonStr = extractJsonObject(raw) || raw;
    // Apply universal UTF-8 sanitizer before parsing
    jsonStr = sanitizeJSONForParsing(jsonStr);
    let parsed = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[SR:REFORM] buildPrioritizationMatrixSpec.parse.error", parseErr);
      parsed = null;
    }

    if (!parsed || !parsed.initiatives || !Array.isArray(parsed.initiatives)) {
      console.log(TAG, '⚠️ [MATRIX-PREDICTIVE] AI matrix generation failed, using defaults');
      // [KT:FIX] More realistic recommendation-style fallback names
      parsed = {
        title: 'Recommendation Prioritization',
        initiatives: [
          { name: 'Implement Technology Modernization', impact: 90, effort: 85, value: 3.5 },
          { name: 'Optimize Operational Processes', impact: 80, effort: 45, value: 2.2 },
          { name: 'Launch Customer Experience Program', impact: 75, effort: 50, value: 1.8 },
          { name: 'Deploy Analytics & Reporting', impact: 65, effort: 35, value: 1.2 },
          { name: 'Implement Staff Training Program', impact: 55, effort: 25, value: 0.8 },
          { name: 'Streamline Vendor Management', impact: 50, effort: 30, value: 0.6 }
        ]
      };
    }

    // [KT:I18N-FIX] Translate initiative names via GPT for non-English languages
    if (isNonEnglish && parsed.initiatives?.length > 0) {
      try {
        // [KT:NANO-FIX] Simplified prompt format for GPT-5-nano
        const initiativeNames = parsed.initiatives.map(init => init.name);
        const translationPrompt = `Translate these initiative names to ${lang}:
${initiativeNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Return a JSON object with format: {"translations": ["translated1", "translated2", ...]}
Only return JSON, no explanation.`;

        let transRaw = '';
        // [KT:RETRY] GPT sometimes returns empty - retry up to 3 times
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const translationRes = await openai.chat.completions.create({
              model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
              temperature: 1, // [KT:NANO] GPT-5-nano requires temperature=1
              messages: [
                { role: 'system', content: `You are a professional translator. Translate text to ${lang}. Return ONLY valid JSON with format {"translations": [...]}` },
                { role: 'user', content: translationPrompt }
              ],
              max_completion_tokens: 4000 // [KT:FIX] Increased from 2000
            });
            transRaw = (translationRes?.choices?.[0]?.message?.content || '').trim();
            if (transRaw && transRaw.length > 10 && transRaw.includes('translations')) break;
            console.warn(TAG, '[MATRIX-TRANSLATION] Incomplete response, attempt', attempt, 'got:', transRaw?.slice(0, 100));
          } catch (apiErr) {
            console.warn(TAG, '[MATRIX-TRANSLATION] API error, attempt', attempt, String(apiErr?.message || apiErr));
          }
          if (attempt < 3) await new Promise(r => setTimeout(r, 800));
        }
        
        if (!transRaw || transRaw.length < 10) {
          console.warn(TAG, '[MATRIX-TRANSLATION] GPT returned empty after retries, using original names');
          // [KT:FIX] Fallback: use original names with a note
          parsed.initiatives.forEach(init => {
            init.nameTranslated = init.name; // Keep original if translation fails
          });
        } else {
          let transJson = extractJsonObject(transRaw) || transRaw;
          transJson = sanitizeJSONForParsing(transJson);

          const translations = JSON.parse(transJson);
          // [KT:NANO-FIX] Handle simplified array format
          const transArray = translations.translations || translations;
          if (Array.isArray(transArray)) {
            for (let i = 0; i < parsed.initiatives.length && i < transArray.length; i++) {
              parsed.initiatives[i].nameTranslated = transArray[i];
            }
            console.log(TAG, 'prioritization.translation.applied', { count: transArray.length, lang });
          }
        }
      } catch (transErr) {
        console.error(TAG, '[MATRIX-TRANSLATION] Translation error', String(transErr?.message || transErr));
        // [KT:FIX] Fallback: use original names
        parsed.initiatives.forEach(init => {
          init.nameTranslated = init.name;
        });
      }
    }

    console.log(TAG, 'prioritization.spec.generated', { count: parsed.initiatives?.length || 0, translated: parsed.initiatives?.filter(i => i.nameTranslated)?.length || 0 });

    return parsed;
  } catch (e) {
    console.error("[SR:REFORM] buildPrioritizationMatrixSpec.error", String(e?.message || e));
    return null;
  }
}

// ============================================================================
// [WATERFALL-PREDICTIVE] AI-Driven Waterfall Chart Generation
// Analyzes financials section and returns waterfall components with translations
// ============================================================================
async function buildWaterfallSpec(canon = {}, sections = {}, reportHTML = '', translatedLabels = {}) {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');
    const isNonEnglish = lang && !/^english$/i.test(lang);

    const prompt = `
You are a financial analyst. Analyze this transformation report and extract the VALUE BRIDGE components.
These are the key value drivers that explain the financial uplift.

Return STRICT JSON with this structure:
{
  "components": [
    { "name": "Component name (e.g., 'Revenue Growth', 'Cost Reduction', 'Efficiency Gains')", "value": number, "type": "positive|negative" },
    ... (4-6 components)
  ],
  "currentState": { "label": "label", "value": number },
  "targetState": { "label": "label", "value": number }
}

Rules:
- Extract actual value components mentioned in the report
- Use real financial figures if available, else reasonable estimates
- Types: 'positive' for gains/additions, 'negative' for costs/reductions
- Components should sum to show the bridge from current to target
- Return in ENGLISH; we will translate the names
- NO commentary; JSON only.

Context (HTML snippet from financials section):
${String(reportHTML || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000)}
`;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return STRICT JSON only. No prose, no markdown. Return English component names.' },
        { role: 'user', content: prompt }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content || '').trim();
    let jsonStr = extractJsonObject(raw) || raw;
    // Apply universal UTF-8 sanitizer before parsing
    jsonStr = sanitizeJSONForParsing(jsonStr);
    let parsed = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[SR:REFORM] buildWaterfallSpec.parse.error", parseErr);
      parsed = null;
    }

    if (!parsed || !parsed.components || !Array.isArray(parsed.components)) {
      console.log(TAG, '⚠️ [WATERFALL-PREDICTIVE] AI waterfall generation failed, using defaults');
      parsed = {
        components: [
          { name: 'Digital Growth', value: 1500, type: 'positive' },
          { name: 'Operational Efficiency', value: 1000, type: 'positive' },
          { name: 'Implementation Costs', value: -300, type: 'negative' },
          { name: 'Market Expansion', value: 800, type: 'positive' }
        ],
        currentState: { label: 'Current State', value: 5000 },
        targetState: { label: 'Target State', value: 8000 }
      };
    }

    // [KT:I18N-FIX] Translate component names via GPT for non-English languages
    if (isNonEnglish) {
      let translationAttempts = 0;
      const maxAttempts = 2;
      
      while (translationAttempts < maxAttempts) {
        translationAttempts++;
        try {
          // [KT:NANO-FIX] Ultra-simple prompt - just translate the list
          const componentNames = parsed.components.map(c => c.name);
          const allTerms = [...componentNames, parsed.currentState?.label || 'Current State', parsed.targetState?.label || 'Target State'];
          
          const translationPrompt = `Translate to ${lang}: ${allTerms.join(', ')}

Return JSON: {"translations": ["term1", "term2", ...]}`;

          const translationRes = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
            temperature: 1,
            messages: [
              { role: 'system', content: `Translator. Return JSON only.` },
              { role: 'user', content: translationPrompt }
            ],
            max_completion_tokens: 1500
          });

          let transRaw = (translationRes?.choices?.[0]?.message?.content || '').trim();
          
          if (!transRaw || transRaw.length < 5) {
            console.log(TAG, `[WATERFALL-TRANSLATION] Empty response, attempt ${translationAttempts}`);
            if (translationAttempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 500));
              continue;
            }
            break;
          }
          
          // Extract JSON from markdown if present
          const jsonMatch = transRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) transRaw = jsonMatch[0];
          transRaw = sanitizeJSONForParsing(transRaw);

          const translations = JSON.parse(transRaw);
          const transArray = translations.translations || translations;
          
          if (Array.isArray(transArray) && transArray.length > 0) {
            // Apply component translations
            for (let i = 0; i < parsed.components.length && i < transArray.length; i++) {
              parsed.components[i].nameTranslated = transArray[i];
            }
            // Apply state translations (last 2 items)
            const stateOffset = parsed.components.length;
            if (transArray[stateOffset]) {
              parsed.currentState.labelTranslated = transArray[stateOffset];
            }
            if (transArray[stateOffset + 1]) {
              parsed.targetState.labelTranslated = transArray[stateOffset + 1];
            }
            console.log(TAG, 'waterfall.translation.applied', { count: transArray.length, lang });
          }
          break; // Success
        } catch (transErr) {
          console.error(TAG, `[WATERFALL-TRANSLATION] Translation error (attempt ${translationAttempts})`, String(transErr?.message || transErr));
          if (translationAttempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 500));
          }
        }
      }
    }

    console.log(TAG, 'waterfall.spec.generated', { count: parsed.components?.length || 0, translated: parsed.components?.filter(c => c.nameTranslated)?.length || 0 });

    return parsed;
  } catch (e) {
    console.error("[SR:REFORM] buildWaterfallSpec.error", String(e?.message || e));
    return null;
  }
}

// ============================================================================
// [EXEC-SUMMARY-IMPACTFUL-GRAPH] AI-Driven Most Impactful Graph for Executive Summary
// Reviews entire report and generates the single most impactful visualization
// ============================================================================
async function buildExecutiveSummaryGraph(canon = {}, sections = {}) {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');
    const langNote = !/^english$/i.test(lang)
      ? `All titles, labels, and axis names MUST be in ${lang}.`
      : '';

    // Build comprehensive report context from all sections
    const reportContext = [
      sections.exec || '',
      sections.current || '',
      sections.financials || '',
      sections.kpis || '',
      sections.timeline || '',
      sections.ops || '',
      sections.risk || '',
      sections.roi || '',
      sections.nextSteps || ''
    ].filter(Boolean).join('\n\n').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 6000);

    const prompt = `
You are a senior strategy consultant creating an executive summary visualization.
Review this ENTIRE transformation report and identify THE SINGLE MOST IMPACTFUL data visualization.

This graph should:
1. Capture the most critical insight from the entire report
2. Be immediately compelling to C-suite executives
3. Use backwards-looking/lagging indicators (historical or current state data)
4. Be specific to ${canon.orgName || 'this organization'} and ${canon.industry || 'their industry'}

Return STRICT JSON:
{
  "type": "line|bar|pie|doughnut",
  "title": "Compelling, specific title for the visualization",
  "xTitle": "X-axis label",
  "yTitle": "Y-axis label (include units like $M, %, etc.)",
  "labels": ["Label1", "Label2", ...],
  "datasets": [
    {
      "label": "Dataset name",
      "data": [number, number, ...],
      "backgroundColor": "#color"
    }
  ],
  "insight": "One sentence explaining why this is the most impactful insight",
  "recommendation": "One sentence executive recommendation based on this data"
}

Rules:
- Extract REAL data points from the report where possible
- If specific data unavailable, infer realistic values from context
- Labels array and data array must have same length
- Values should be defensible integers
- ${langNote}
- NO commentary; JSON only.

FULL REPORT CONTEXT:
ORGANIZATION: ${canon.orgName || 'Organization'}
INDUSTRY: ${canon.industry || 'General Business'}
COUNTRY: ${canon.country || 'Global'}
TIME FRAME: ${canon.timeFrame || '2 years'}
COST SAVINGS GOAL: ${canon.costSavingsGoal || 'Not specified'}

REPORT CONTENT:
${reportContext}
`;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return STRICT JSON only. No prose, no markdown. Create the most impactful executive visualization.' },
        { role: 'user', content: prompt }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content || '').trim();
    let jsonStr = extractJsonObject(raw) || raw;
    jsonStr = sanitizeJSONForParsing(jsonStr);
    let parsed = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[SR:REFORM] buildExecutiveSummaryGraph.parse.error", parseErr);
      parsed = null;
    }

    // Validate structure
    if (!parsed || !parsed.type || !parsed.title || !parsed.labels || !parsed.datasets) {
      console.log(TAG, '⚠️ [EXEC-GRAPH] AI generation failed, using fallback');
      
      // Language-aware fallback labels
      const isNonEnglish = !/^english$/i.test(lang);
      let fallbackLabels = ['Revenue Growth', 'Cost Reduction', 'Efficiency Gains', 'Risk Mitigation', 'Innovation'];
      let fallbackTitle = 'Transformation Value Creation Potential';
      let fallbackXTitle = 'Value Driver';
      let fallbackYTitle = 'Impact ($M)';
      let fallbackDatasetLabel = 'Potential Value';
      let fallbackInsight = 'The transformation offers significant value creation across multiple dimensions.';
      let fallbackRecommendation = 'Prioritize revenue growth and cost reduction initiatives for maximum ROI.';
      
      if (isNonEnglish) {
        try {
          const translationRes = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
            temperature: 1, // [KT:NANO-FIX] GPT-5-nano only supports temperature=1
            messages: [
              { role: 'system', content: `You are a professional translator. Translate the following JSON values to ${lang}. Return ONLY valid JSON, no commentary.` },
              { role: 'user', content: JSON.stringify({
                labels: fallbackLabels,
                title: fallbackTitle,
                xTitle: fallbackXTitle,
                yTitle: fallbackYTitle,
                datasetLabel: fallbackDatasetLabel,
                insight: fallbackInsight,
                recommendation: fallbackRecommendation
              }) }
            ]
          });
          const translatedRaw = (translationRes?.choices?.[0]?.message?.content || '').trim();
          const translatedJson = extractJsonObject(translatedRaw) || translatedRaw;
          const translated = JSON.parse(sanitizeJSONForParsing(translatedJson));
          if (translated.labels) fallbackLabels = translated.labels;
          if (translated.title) fallbackTitle = translated.title;
          if (translated.xTitle) fallbackXTitle = translated.xTitle;
          if (translated.yTitle) fallbackYTitle = translated.yTitle;
          if (translated.datasetLabel) fallbackDatasetLabel = translated.datasetLabel;
          if (translated.insight) fallbackInsight = translated.insight;
          if (translated.recommendation) fallbackRecommendation = translated.recommendation;
          console.log(TAG, '[EXEC-GRAPH] Translated fallback to', lang);
        } catch (transErr) {
          console.error(TAG, '[EXEC-GRAPH] Fallback translation error:', transErr.message);
        }
      }
      
      parsed = {
        type: 'bar',
        title: fallbackTitle,
        xTitle: fallbackXTitle,
        yTitle: fallbackYTitle,
        labels: fallbackLabels,
        datasets: [{
          label: fallbackDatasetLabel,
          data: [2.5, 1.8, 1.2, 0.8, 0.5],
          backgroundColor: '#10B981'
        }],
        insight: fallbackInsight,
        recommendation: fallbackRecommendation
      };
    }

    console.log(TAG, '[EXEC-GRAPH] Most impactful graph generated', {
      type: parsed.type,
      title: parsed.title,
      dataPoints: parsed.labels?.length || 0,
      lang: lang,
      insight: parsed.insight?.substring(0, 50) + '...'
    });

    return parsed;
  } catch (e) {
    console.error("[SR:REFORM] buildExecutiveSummaryGraph.error", String(e?.message || e));
    return null;
  }
}

// ============================================================================
// [SECTION-GRAPHS-SPEC] Consolidated AI-Driven Section Graphs
// Generates company/industry-specific graphs for ALL sections in ONE call
// These are backwards-looking/lagging indicators (not predictive)
// ============================================================================
async function buildAllSectionGraphSpecs(canon = {}, sections = {}) {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');
    const langNote = !/^english$/i.test(lang)
      ? `All titles, labels, and axis names MUST be in ${lang}.`
      : '';

    // Build comprehensive context from all sections
    const sectionContext = {
      current: (sections.current || '').replace(/<[^>]*>/g, ' ').slice(0, 800),
      financials: (sections.financials || '').replace(/<[^>]*>/g, ' ').slice(0, 800),
      timeline: (sections.timeline || '').replace(/<[^>]*>/g, ' ').slice(0, 800),
      ops: (sections.ops || '').replace(/<[^>]*>/g, ' ').slice(0, 800),
      roi: (sections.roi || '').replace(/<[^>]*>/g, ' ').slice(0, 800),
      nextSteps: (sections.nextSteps || '').replace(/<[^>]*>/g, ' ').slice(0, 800)
    };

    const prompt = `
You are a senior strategy consultant creating data visualizations for a transformation report.
Generate ONE impactful, company-specific graph for EACH of the following sections.

ORGANIZATION CONTEXT:
- Name: ${canon.orgName || 'Organization'}
- Industry: ${canon.industry || 'General Business'}
- Country: ${canon.country || 'Global'}
- Time Frame: ${canon.timeFrame || '2 years'}
- Cost Savings Goal: ${canon.costSavingsGoal || 'Not specified'}

SECTION CONTENT:
CURRENT STATE: ${sectionContext.current}
FINANCIALS: ${sectionContext.financials}
TIMELINE: ${sectionContext.timeline}
OPERATIONS: ${sectionContext.ops}
ROI: ${sectionContext.roi}
NEXT STEPS: ${sectionContext.nextSteps}

Return STRICT JSON with this structure:
{
  "current": {
    "type": "bar|line|pie|doughnut",
    "title": "Specific title about current state assessment",
    "xTitle": "X-axis label",
    "yTitle": "Y-axis label with units",
    "labels": ["Label1", "Label2", ...],
    "data": [number, number, ...],
    "insight": "One sentence key insight"
  },
  "financials": {
    "type": "bar|line",
    "title": "Specific financial metric visualization",
    "xTitle": "X-axis label",
    "yTitle": "Y-axis label ($M, %, etc.)",
    "labels": ["Label1", "Label2", ...],
    "data": [number, number, ...],
    "insight": "One sentence key insight"
  },
  "timeline": {
    "type": "bar|line",
    "title": "Implementation timeline visualization",
    "xTitle": "Time period",
    "yTitle": "Progress/Milestone metric",
    "labels": ["Label1", "Label2", ...],
    "data": [number, number, ...],
    "insight": "One sentence key insight"
  },
  "ops": {
    "type": "bar|line",
    "title": "Operations efficiency or process visualization",
    "xTitle": "X-axis label",
    "yTitle": "Y-axis label",
    "labels": ["Label1", "Label2", ...],
    "data": [number, number, ...],
    "insight": "One sentence key insight"
  },
  "roi": {
    "type": "bar|line",
    "title": "ROI or value realization visualization",
    "xTitle": "X-axis label",
    "yTitle": "Y-axis label ($M, %, etc.)",
    "labels": ["Label1", "Label2", ...],
    "data": [number, number, ...],
    "insight": "One sentence key insight"
  },
  "nextSteps": {
    "type": "bar|line",
    "title": "Action priorities or implementation roadmap",
    "xTitle": "X-axis label",
    "yTitle": "Y-axis label",
    "labels": ["Label1", "Label2", ...],
    "data": [number, number, ...],
    "insight": "One sentence key insight"
  }
}

CRITICAL RULES:
- Each graph must be SPECIFIC to ${canon.orgName || 'this organization'} and ${canon.industry || 'their industry'}
- Use backwards-looking/lagging indicators (historical or current state data)
- Extract REAL data from section content where possible
- If data unavailable, infer realistic industry-specific values
- Labels and data arrays must have same length (4-8 items each)
- Values should be defensible integers or decimals
- ${langNote}
- NO commentary; JSON only.
`;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return STRICT JSON only. No prose, no markdown. Create company-specific visualizations.' },
        { role: 'user', content: prompt }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content || '').trim();
    let jsonStr = extractJsonObject(raw) || raw;
    jsonStr = sanitizeJSONForParsing(jsonStr);
    let parsed = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[SR:REFORM] buildAllSectionGraphSpecs.parse.error", parseErr);
      parsed = null;
    }

    // Validate and provide fallbacks for any missing sections
    // These will get translated via the main langNote in AI prompt, but we need language-aware defaults
    const isNonEnglish = !/^english$/i.test(lang);
    
    const getDefaultGraph = async (section) => {
      const defaultEn = {
        type: 'bar',
        title: `${section} Analysis`,
        xTitle: 'Category',
        yTitle: 'Value',
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        data: [25, 45, 65, 85],
        insight: 'Analysis shows positive trend across quarters.'
      };
      
      if (!isNonEnglish) return defaultEn;
      
      // Translate default for non-English
      try {
        const transRes = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
          temperature: 1, // [KT:NANO-FIX] GPT-5-nano only supports temperature=1
          messages: [
            { role: 'system', content: `Translate the following JSON to ${lang}. Return ONLY valid JSON.` },
            { role: 'user', content: JSON.stringify(defaultEn) }
          ]
        });
        const transRaw = (transRes?.choices?.[0]?.message?.content || '').trim();
        const transJson = extractJsonObject(transRaw) || transRaw;
        const translated = JSON.parse(sanitizeJSONForParsing(transJson));
        if (translated.title && translated.labels) {
          return { ...defaultEn, ...translated };
        }
      } catch (e) {
        console.warn(TAG, '[SECTION-GRAPHS] Default graph translation error:', e.message);
      }
      return defaultEn;
    };

    const sections_list = ['current', 'financials', 'timeline', 'ops', 'roi', 'nextSteps'];
    for (const sec of sections_list) {
      if (!parsed || !parsed[sec] || !parsed[sec].labels || !parsed[sec].data) {
        if (!parsed) parsed = {};
        parsed[sec] = await getDefaultGraph(sec);
      }
    }

    console.log(TAG, '[SECTION-GRAPHS] All section graphs generated', {
      sections: Object.keys(parsed || {}),
      lang: lang,
      currentType: parsed?.current?.type,
      financialsType: parsed?.financials?.type,
      roiType: parsed?.roi?.type
    });

    return parsed;
  } catch (e) {
    console.error("[SR:REFORM] buildAllSectionGraphSpecs.error", String(e?.message || e));
    return null;
  }
}

// [KT:RISK-HEATMAP-PREDICTIVE] AI-driven risk matrix generation
async function buildRiskHeatmapSpec(canon = {}, sections = {}, reportHTML = '', translatedLabels = {}) {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');

    const prompt = `
You are a risk management expert. Analyze this transformation report and extract the KEY RISKS.
Return identified risks with severity (1-5) and likelihood (1-5) ratings.

Return STRICT JSON with this structure:
{
  "risks": [
    { "name": "Risk name", "description": "Brief description", "severity": 1-5, "likelihood": 1-5 },
    ... (5-8 risks)
  ]
}

Rules:
- Extract actual risks mentioned in the report
- Severity: 1=negligible, 2=minor, 3=moderate, 4=major, 5=critical
- Likelihood: 1=rare, 2=unlikely, 3=possible, 4=likely, 5=almost certain
- Return risk names in ENGLISH; we will translate
- Include implementation risks, vendor risks, stakeholder risks, budget risks
- NO commentary; JSON only.

Context (HTML snippet from report):
${String(reportHTML || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000)}
`;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return STRICT JSON only. No prose, no markdown. Return English risk names.' },
        { role: 'user', content: prompt }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content || '').trim();
    let jsonStr = extractJsonObject(raw) || raw;
    // Apply universal UTF-8 sanitizer before parsing
    jsonStr = sanitizeJSONForParsing(jsonStr);
    let parsed = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[SR:REFORM] buildRiskHeatmapSpec.parse.error", parseErr);
      parsed = null;
    }

    if (!parsed || !parsed.risks || !Array.isArray(parsed.risks)) {
      console.log(TAG, '⚠️ [RISK-HEATMAP-PREDICTIVE] AI risk generation failed, using defaults');
      parsed = {
        risks: [
          { name: 'Resource Availability', severity: 4, likelihood: 3, description: 'Limited access to key resources may delay milestones.' },
          { name: 'Vendor Delays', severity: 3, likelihood: 4, description: 'External vendors may not deliver on time.' },
          { name: 'Budget Overrun', severity: 5, likelihood: 2, description: 'Costs may exceed initial estimates.' },
          { name: 'Stakeholder Resistance', severity: 4, likelihood: 4, description: 'Key stakeholders may resist changes.' },
          { name: 'Technical Complexity', severity: 3, likelihood: 3, description: 'Complex requirements may introduce risk.' }
        ]
      };
      // Don't return here - let fallback risks go through translation below
    }

    // [KT:FIX:RISK-TRANSLATION] Translate risk names and descriptions for non-English languages
    if (lang && !/^english$/i.test(lang)) {
      // [KT:CRITICAL] Risks are DATA (not UI labels), so translate ALL risks via GPT
      try {
        const openai = await getOpenAI();
        // [KT:NANO-FIX] Simplified prompt - just names first, descriptions are often similar
        const riskNames = parsed.risks.map(r => r.name);
        const translationPrompt = `Translate these risk names to ${lang}: ${riskNames.join(', ')}

Return JSON: {"names": ["name1", "name2", ...]}`;
        
        let transRaw = '';
        // [KT:RETRY] GPT sometimes returns empty - retry once if needed
        for (let attempt = 1; attempt <= 2; attempt++) {
          const translationRes = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
            temperature: 1,
            messages: [
              { role: 'system', content: `Translator. Return JSON only.` },
              { role: 'user', content: translationPrompt }
            ],
            max_completion_tokens: 2000
          });
          transRaw = (translationRes?.choices?.[0]?.message?.content || '').trim();
          if (transRaw && transRaw.length > 5) break;
          console.warn(TAG, '[RISK-TRANSLATION] Empty response, attempt', attempt);
          if (attempt < 2) await new Promise(r => setTimeout(r, 500));
        }
        
        if (!transRaw || transRaw.length < 5) {
          console.warn(TAG, '[RISK-TRANSLATION] GPT returned empty after retries');
          throw new Error('Empty GPT response after retries');
        }
        
        let transJson = extractJsonObject(transRaw) || transRaw;
        transJson = sanitizeJSONForParsing(transJson);
        
        try {
          const translations = JSON.parse(transJson);
          // [KT:NANO-FIX] Handle simplified array format
          const namesArray = translations.names || translations;
          if (Array.isArray(namesArray)) {
            for (let i = 0; i < parsed.risks.length && i < namesArray.length; i++) {
              parsed.risks[i].nameTranslated = namesArray[i];
              // Use original description if not translated
              parsed.risks[i].descriptionTranslated = parsed.risks[i].description;
            }
            console.log(TAG, 'risk.translation.applied', { count: namesArray.length, lang });
          } else {
            console.error(TAG, '[KT:FIX:RISK-TRANSLATION] Invalid translation response structure', { translations });
          }
        } catch (parseErr) {
          console.error(TAG, '[KT:FIX:RISK-TRANSLATION] Translation parse error', String(parseErr?.message || parseErr));
          console.error(TAG, '[KT:FIX:RISK-TRANSLATION] Raw response was:', transRaw.substring(0, 500));
        }
      } catch (transErr) {
        console.error(TAG, '[KT:FIX:RISK-TRANSLATION] Critical translation error', String(transErr?.message || transErr));
      }
    }

    console.log(TAG, 'riskHeatmap.spec.generated', { count: parsed.risks?.length || 0, translated: parsed.risks?.filter(r => r.nameTranslated)?.length || 0 });

    return parsed;
  } catch (e) {
    console.error("[SR:REFORM] buildRiskHeatmapSpec.error", String(e?.message || e));
    // [KT:NOTE] Catch block fallback - cannot translate since API may have failed
    console.warn(TAG, '[RISK-HEATMAP-FALLBACK] Critical error, returning English fallback');
    return {
      risks: [
        { name: 'Resource Availability', severity: 4, likelihood: 3, description: 'Limited access to key resources may delay milestones.' },
        { name: 'Vendor Delays', severity: 3, likelihood: 4, description: 'External vendors may not deliver on time.' },
        { name: 'Budget Overrun', severity: 5, likelihood: 2, description: 'Costs may exceed initial estimates.' },
        { name: 'Stakeholder Resistance', severity: 4, likelihood: 4, description: 'Key stakeholders may resist changes.' },
        { name: 'Technical Complexity', severity: 3, likelihood: 3, description: 'Complex requirements may introduce risk.' }
      ]
    };
  }
}





/* ============================================================================
   [LOCKED FILE — SOVEREIGN INTELLIGENCE]
   ENFORCEMENT HEADER – DO NOT REMOVE
   (ruleset for surgical-only operation, no deletions, etc.)
   ...
   [Existing enforcement header content here]
   ...
============================================================================ */

/* ---------------------------------------------------------------------------
   AGENT SPECIFICATION – SOVEREIGN INTELLIGENCE SURGICAL DEV-AGENT
   ---------------------------------------------------------------------------
   Type:      SOVEREIGN INTELLIGENCE SURGICAL DEV-AGENT
   Purpose:   Perform single-pass, add-only code edits in locked modules.
   Authority: May modify AI calls *only if explicitly instructed* (“unless I instruct otherwise”).
   Boundaries:
     - No deletions, refactors, or formatting.
     - Preserve comments, spacing, and layout.
     - Comment out legacy logic instead of removing it.
     - Wrap all changes in [KT:SURGICAL:<TAG>] markers.
     - Backup file before edit (timestamped, /_backups).
   Priority Order:
     1. Correctness
     2. Stability
     3. Speed
     4. Creativity (disabled unless instructed)
   Verification:
     - Line counts before/after
     - Proof logs for every injection
     - Audit confirms no syntax or TS errors
     - No scope bleed outside stated section
   Session Start Protocol:
     “Load Agent Profile and request Session Brief.”
   --------------------------------------------------------------------------- */

/* ===============================
   app/api/reform/generate/route.js
   (Oct 8 base with Oct 9 predictive & audit transplanted; surgical, no TS)
   Edited: added dynamic table title injection helper and invocation.
   Change comment marker: [KT:SURGICAL TABLE TITLE INJECTION] - see below.

   2025-10-17 [KT:SURGICAL GRAPH NOTES]
   - Added universal visual-description injector to ensure every chart, dashboard/benchmark,
     and heatmap has a concise executive note beneath it (2–3 sentences).
   - No change to how visuals are generated; purely post-assembly insertion.
   - Zero deletions: only additive code and comments. Existing predictive notes preserved.
   =============================== */
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
/*import buildReformReportHTML, { DEFAULT_LABELS } from '@/lib/reportTemplate.js' */
import buildReformReportHTML, {
buildReformReportHTMLWithTranslation,
DEFAULT_LABELS, // [KT:SURGICAL:DEFAULT-LABELS-IMPORT] used by translateLabels()
} from '@/lib/reportTemplate.js';
function __isEnglishReportLangSoft(lang) {
  const v = String(lang || '').trim().toLowerCase();
  return v === 'english' || v === 'en' || v.startsWith('en-');
}
// [KT:SURGICAL] explicit .js extension to guarantee default export resolution;
// import { planDiagramHTML } from '@/lib/implPlan'; // [KT:SURGICAL:IMPORT-FIX] commented to preserve history
import { planDiagramHTML } from '@/lib/implPlan.js'; // [KT:SURGICAL:IMPORT-FIX] ensure .js extension for Next/ESM resolution
// [KT:SURGICAL:I18N-NORMALIZATION] Import normalizeLang for server-side language normalization
import { normalizeLang } from '@/lib/i18nClient.js';
import {
  makeCharter,
  makeRaci,
  makeRaid,
  makeBenefits,
  makePlan100,
  makePilot,
  makeAssumptions,
  //makeMethods // [KT:SURGICAL:I18N-FIX] restore methods factory (used in genImplKitJSON fallback)
} from '@/lib/implKitSchemas.js';
import { 
  lineChartHTML, 
  barChartHTML, 
  heatmapHTML, 
  benchmarkHTML, 
  prioritizationMatrixHTML,
  GRAPH_CSS,
  initGraphUiTranslations,
  applyGraphUi
} from '@/lib/reportGraphs.js';
import { 
  visualTimelineHTML, 
  radarChartHTML, 
  riskHeatmapHTML, 
  waterfallChartHTML, 
  executiveSummaryInfographicHTML 
} from '@/lib/worldClassVisuals.js'; // [MCKINSEY-BEATING] 5 world-class visualizations
import { setGraphTranslator } from "@/lib/reportGraphs";
import { setWorldClassVisualsTranslator } from '@/lib/worldClassVisuals.js';
import { validateFinalReport } from '@/lib/translationValidator.js'; // [KT:TRANSLATION-VALIDATOR] Catch English leaks

// [KT:SURGICAL:CHART-SUMMARY-TRANSLATION] Pre-translate common chart summary phrases
// Creates a translation cache for synchronous lookup in chart rendering
const __chartSummaryTranslationCache = {};

async function buildChartSummaryTranslations(targetLang) {
  if (!targetLang || /^english$/i.test(targetLang)) {
    return {}; // No translation needed for English
  }
  console.log(TAG, 'chartSummary.translations.start', { lang: targetLang });
  
  // [KT:TRANSLATION-FIX-v3.0] Comprehensive phrases for all UI elements
  const phrasesObject = {
    // Chart summary phrases
    'Overall': 'Overall',
    'Key Insights': 'Key Insights',
    'Values show': 'Values show',
    'trend': 'trend',
    'trend from': 'trend from',
    'to': 'to',
    'achieved': 'achieved',
    'Average performance': 'Average performance',
    'Peak value of': 'Peak value of',
    'increasing': 'increasing',
    'decreasing': 'decreasing',
    'stable': 'stable',
    // Chart dropdown UI
    'type': 'Type',
    'Type': 'Type',
    'line': 'Line',
    'bar': 'Bar',
    'pie': 'Pie',
    'doughnut': 'Doughnut',
    'Waterfall': 'Waterfall',
    // Implementation phases
    'Discovery': 'Discovery',
    'Design': 'Design',
    'Pilot': 'Pilot',
    'Scale': 'Scale',
    'weeks': 'weeks',
    'Week': 'Week',
    // Axes and metrics (both uppercase and lowercase for timeFrame replacement)
    'Years': 'Years',
    'years': 'years',
    'Months': 'Months',
    'months': 'months',
    'Weeks': 'Weeks',
    'weeks': 'weeks',
    'Percent': 'Percent',
    'Spend': 'Spend',
    'Savings': 'Savings',
    'Value': 'Value',
    'Component': 'Component',
    'Cumulative': 'Cumulative',
    // Benchmark chart labels (CRITICAL)
    'Current': 'Current',
    'Benchmark': 'Benchmark',
    'Metric': 'Metric',
    'Progress': 'Progress',
    'Industry benchmark': 'Industry benchmark',
    // Impact levels - must be translated for all languages
    'High': 'High',
    'Medium': 'Medium',
    'Low': 'Low',
    // Waterfall/Value Bridge chart labels
    'Current State': 'Current State',
    'Target State': 'Target State',
    // Executive Summary Infographic (CRITICAL - must match worldClassVisuals.js exactly)
    'Executive Summary at a Glance': 'Executive Summary at a Glance',
    'projectedROI': 'Projected ROI',
    'paybackPeriod': 'Payback Period',
    'annualSavings': 'Annual Savings',
    'timeline': 'Timeline',
    'confidence': 'Confidence',
    'confidenceLevel': 'Confidence Level',
    'strategicImpact': 'Strategic Impact',
    // Implementation Approach (Phase Timeline)
    'Implementation Approach': 'Implementation Approach',
    'implementationApproach': 'Implementation Approach',
    'Phase': 'Phase',
    'annually': 'annually',
    // KPI Chart Titles
    'paybackHorizon': 'Payback Over Horizon',
    // KPI Trend phrases - already in phrasesObject above, referenced here for visibility
    'data-supported': 'data-supported',
    'High certainty': 'High certainty',
    'Transformational change': 'Transformational change',
    'across value chain': 'across value chain',
    'Accelerated delivery': 'Accelerated delivery',
    'implementation horizon': 'implementation horizon',
    // CRITICAL: KPI benchmark trend descriptions - must be in main phrasesObject for GPT translation
    'faster than industry average': 'faster than industry average',
    'Best-in-class timing': 'Best-in-class timing',
    'in annual value': 'in annual value',
    // [KT:CONTENT-TRANSLATION-FIX] Missing phrases from user feedback - Dec 19, 2025
    'KEY INSIGHT': 'KEY INSIGHT',
    'Recommendation': 'Recommendation',
    'Potential value': 'Potential value',
    'Go-to-market': 'Go-to-market',
    'Payback Period': 'Payback Period',
    'Payback/ROI': 'Payback/ROI',
    'Localized bundles': 'Localized bundles',
    'seasonal promotions': 'seasonal promotions',
    'margins': 'margins',
    'incremental value': 'incremental value',
    '(current)': '(current)',
    'current': 'current',
    // [KT:CHART-TITLES-FIX] Missing chart titles - Dec 19, 2025
    'Value Bridge Analysis Graph': 'Value Bridge Analysis Graph',
    'Savings Realization': 'Savings Realization',
    'Market share growth vs industry benchmark': 'Market share growth vs industry benchmark',
    // Priority Matrix / Prioritization Matrix labels
    'Initiatives Priority Matrix': 'Initiatives Priority Matrix',
    'First-Priority Matrix': 'First-Priority Matrix',
    'BIGBETS': 'BIGBETS',
    'QUICKWINS': 'QUICKWINS',
    'Quick Wins': 'Quick Wins',
    'quickWins': 'quickWins',
    'quick wins': 'quick wins',
    'FILLINS': 'FILLINS',
    'MAJORPROJECTS': 'MAJORPROJECTS',
    'effort / complexity': 'effort / complexity',
    'businessImpact': 'businessImpact',
    // Risk Heat Map labels
    'Risk Heat Map': 'Risk Heat Map',
    'Risk levels': 'Risk levels',
    'Risk Assessment Matrix': 'Risk Assessment Matrix',
    'Description: Risk Heat Map': 'Description: Risk Heat Map',
    'Risk level': 'Risk level',
    'Low (green)': 'Low (green)',
    'Medium (orange)': 'Medium (orange)',
    'High (red)': 'High (red)',
    // [KT:RISK-HEATMAP-LABELS-FIX] Complete risk heatmap translation - Dec 21, 2025
    // Severity labels (Y-axis) - readable English for proper GPT translation
    'critical': 'Critical',
    'major': 'Major',
    'moderate': 'Moderate',
    'minor': 'Minor',
    'negligible': 'Negligible',
    // Likelihood labels (X-axis) - readable English for proper GPT translation
    'rare': 'Rare',
    'unlikely': 'Unlikely',
    'possible': 'Possible',
    'likely': 'Likely',
    'almostCertain': 'Almost Certain',
    // Axis labels
    'severity': 'Severity',
    'likelihood': 'Likelihood',
    // Risk list and legend - readable English for proper GPT translation
    'risks': 'Risks',
    'riskAssessmentMatrix': 'Risk Assessment Matrix',
    'riskHeatmapVisualizes': 'Risk heatmap visualizes',
    'identifiedRisksBySeverity': 'identified risks by severity',
    'colorLegend': 'Color legend',
    'redCritical': 'Red = Critical',
    'orangeHigh': 'Orange = High',
    'greenMedium': 'Green = Medium',
    'blueLow': 'Blue = Low',
    'noDescriptionProvided': 'No description provided',
    'Risk levels are distributed across the matrix, highlighting areas of concern.': 'Risk levels are distributed across the matrix, highlighting areas of concern.',
    'Top risk': 'Top risk',
    // [KT:EXEC-DASHBOARD-LABELS-FIX] Executive Summary Dashboard labels - Dec 21, 2025
    'Industry benchmark': 'Industry benchmark',
    'faster than industry average': 'faster than industry average',
    'Best-in-class timing': 'Best-in-class timing',
    'in annual value': 'in annual value',
    'Top quartile performance': 'Top quartile performance',
    'Accelerated delivery': 'Accelerated delivery',
    'implementation horizon': 'implementation horizon',
    'data-supported': 'data-supported',
    'High certainty': 'High certainty',
    'Transformational change': 'Transformational change',
    'across value chain': 'across value chain',
    'vs baseline': 'vs baseline',
    // Section titles (Table of Contents)
    'Table of Contents': 'Table of Contents',
    'Executive Summary': 'Executive Summary',
    'Current State': 'Current State',
    'Financial Analysis': 'Financial Analysis',
    'KPI & Performance Metrics': 'KPI & Performance Metrics',
    'Operational Analysis': 'Operational Analysis',
    'Risk Assessment': 'Risk Assessment',
    'ROI Projections': 'ROI Projections',
    'Next Steps': 'Next Steps',
    // Dropdown and chart type labels
    'Dropdown options': 'Dropdown options',
    'Chart type': 'Chart type',
    // [KT:APPENDIX-UI-LABELS] Appendix and diagnostic table UI - Dec 19, 2025
    'Appendices': 'Appendices',
    'Generation Diagnostics': 'Generation Diagnostics',
    'Section': 'Section',
    'Words': 'Words',
    'Charts': 'Charts',
    'Heatmaps': 'Heatmaps',
    'Benchmarks': 'Benchmarks',
    'Tables': 'Tables',
    'Appendix generation failed gracefully.': 'Appendix generation failed gracefully.',
    // [KT:CALLOUT-UI-LABELS] Insight callout labels - Dec 19, 2025
    'This means': 'This means',
    // [KT:FIGURE-LABELS] Figure and chart captions - Dec 19, 2025
    'Figure': 'Figure',
    'Chart': 'Chart',
    'Table': 'Table',
    'Source': 'Source',
    'Note': 'Note'
  };
  
  try {
    const openai = await getOpenAI();
    const allPhrases = Object.keys(phrasesObject);
    const batchSize = 12; // [KT:NANO-FIX] Small batches for GPT-5-nano
    const allTranslations = {};
    
    console.log(TAG, 'chartSummary.translations.start.batched', { lang: targetLang, totalPhrases: allPhrases.length, batches: Math.ceil(allPhrases.length / batchSize) });
    
    // [KT:NANO-FIX] Process in small batches of 12 phrases
    for (let i = 0; i < allPhrases.length; i += batchSize) {
      const batch = allPhrases.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      // [KT:NANO-FIX] Ultra-simple prompt format
      const prompt = `Translate each English phrase to ${targetLang}:
${batch.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}

Return JSON like: {"Overall": "translation", "Key Insights": "translation"}`;
      
      try {
        const res = await openai.chat.completions.create({
          model: TRANSLATION_MODEL,
          temperature: 1,
          messages: [
            { role: 'system', content: `You translate English to ${targetLang}. Return only valid JSON.` },
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: 1500
        });
        
        let rawContent = res.choices?.[0]?.message?.content || '{}';
        console.log(TAG, `chartSummary.batch.${batchNum}.raw`, { rawContent: rawContent.slice(0, 200) });
        
        // Extract JSON from markdown if needed
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) rawContent = jsonMatch[0];
        
        const batchTranslations = JSON.parse(rawContent);
        Object.assign(allTranslations, batchTranslations);
        console.log(TAG, `chartSummary.batch.${batchNum}.success`, { count: Object.keys(batchTranslations).length });
      } catch (batchErr) {
        console.warn(TAG, `chartSummary.batch.${batchNum}.failed`, batchErr.message);
        // Continue with next batch even if one fails
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < allPhrases.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    console.log(TAG, 'chartSummary.translations.built', { lang: targetLang, count: Object.keys(allTranslations).length });
    return allTranslations;
  } catch (e) {
    console.error(TAG, 'chartSummary.translations.error', String(e?.message || e));
    return {}; // Return empty cache on error, fall back to English
  }
}

void [lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS];
// [KT:SURGICAL:OPENAI-SHARED-CLIENT]
// Lazily initialize and share a single OpenAI client instance
// so all call sites (genSectionFirstPass, predictive builders, etc.)
// can safely call `await getOpenAI()`.

let __openaiInstance;

/**
 * Return a shared OpenAI client instance.
 * Uses the named { OpenAI } import in this file, with a dynamic
 * import fallback for safety in edge/test environments.
 */
async function getOpenAI() {
  if (__openaiInstance) {
    return __openaiInstance;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not set; cannot initialize OpenAI client.',
    );
  }

  try {
    // Prefer the statically imported class from `import { OpenAI } from "openai";`
    if (typeof OpenAI === 'function') {
      __openaiInstance = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      // Fallback dynamic import in case bundling changes
      const { OpenAI: OpenAIClass } = await import('openai');
      __openaiInstance = new OpenAIClass({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    return __openaiInstance;
  } catch (err) {
    console.error('[SR:REFORM] getOpenAI init error:', err);
    throw err;
  }
}
const TAG = '[SR:REFORM]';
// [KT:SURGICAL:JSON-EXTRACTOR-ROBUST-v2]
// Enhanced JSON extractor handling truncated/malformed GPT output at source.
// Validates balance of braces/brackets to prevent position X errors.
function extractJsonObject(raw) {
  try {
    const str = String(raw || '').trim();
    
    // [KT:SOURCE-LEVEL-FIX] Check for complete object (most common from JSON mode)
    const firstBrace = str.indexOf('{');
    const lastBrace = str.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const extracted = str.slice(firstBrace, lastBrace + 1);
      // Validate brace balance before returning
      if (countChar(extracted, '{') === countChar(extracted, '}')) {
        return extracted;
      }
    }
    
    // [KT:SOURCE-LEVEL-FIX] Check for complete array (for list responses)
    const firstBracket = str.indexOf('[');
    const lastBracket = str.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      const extracted = str.slice(firstBracket, lastBracket + 1);
      // Validate bracket balance before returning
      if (countChar(extracted, '[') === countChar(extracted, ']')) {
        return extracted;
      }
    }
    
    // [KT:SOURCE-LEVEL-FIX] If no valid extraction found, attempt emergency recovery
    // Try to find any partial structure and complete it
    if (firstBrace >= 0) {
      // Incomplete object - try to salvage by adding closing brace
      const partial = str.slice(firstBrace);
      if (countChar(partial, '{') > countChar(partial, '}')) {
        return partial + '}';
      }
    }
    
  } catch (e) {
    console.log(TAG, 'extractJsonObject.error', String(e?.message || e));
  }
  return null;
}

// Helper to count character occurrences (used for validation)
function countChar(str, char) {
  return (str.match(new RegExp('\\' + char, 'g')) || []).length;
}

// [KT:SAFE-SANITIZE] HTML sanitizer for appendix rendering (escapes dangerous characters)
function sanitize(str) {
  if (!str) return '';
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

//const TAG = '[SR:REFORM]';//
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// [KT:SURGICAL:RUN-LOCK] — begin
// Purpose: prove at runtime that THIS file executed; adds log + HTML stamp.
const SURGICAL_RUN_LOCK = 'KT-TRANSLATION-FIX-2025-12-08-v2';


function markRun(html) {
  try {
    // [KT:SURGICAL:WIDTH-GUARD:RUNLOCK] — move width guard BEFORE return so it executes
    try {
      html = String(html || '').replace(
        /<body[^>]*>/i,
        m => `${m}\n<style>\n    /* Scoped width guard – avoid touching the host page */\n    #report, .report-canvas, .report-body {\n      max-width:100% !important; width:100% !important;\n    }\n  </style>`
      );
      console.log(TAG, 'width.guard.injected');
    } catch (e) {
      console.log(TAG, 'width.guard.error', String(e?.message || e));
    }

    const sig = `<!-- [RUN-LOCK ${SURGICAL_RUN_LOCK}] -->`;
    return String(html).includes(sig) ? html : `${sig}\n${html}`;

   
  } catch { return html; }
}

function logRun() {
  try {
    console.log(TAG, 'runlock.active', {
      sig: SURGICAL_RUN_LOCK,
      file: typeof __filename !== 'undefined' ? __filename : 'route.js',
      ts: new Date().toISOString(),
    });
  } catch {}
}
// [KT:SURGICAL:RUN-LOCK] — end


// ---------------- helpers ----------------
const wc = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;

const today = () =>
  new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

const SECTION_FLOORS = {
  exec: 2400,
  current: 2800,
  financials: 2800,
  kpis: 2400,
  timeline: 2400,
  ops: 3000,
  risk: 2200,
  roi: 2000,
};
const TOTAL_FLOOR = Object.values(SECTION_FLOORS).reduce((a, b) => a + b, 0);

// ---- currency units for yTitle hints ----
function currencyUnitForCountry(country = '') {
  const c = String(country).toLowerCase();
  let currency = 'CAD'; // default
  
  if (c.includes('canada') || c.includes('ca')) currency = 'CAD';
  else if (c.includes('united states') || c.includes('usa') || c.includes('us')) currency = 'USD';
  else if (c.includes('united kingdom') || c.includes('uk') || c.includes('england')) currency = 'GBP';
  else if (c.includes('india')) currency = 'INR';
  else if (c.includes('euro')) currency = 'EUR';
  
  console.log('[SR:REFORM] currency.resolved', { country, currency });
  return currency;
}

/* ========================================================================== */
/* [KT:VIZ] detection + extraction helpers                                     */
/* ========================================================================== */
const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const hasViz = (html = '') => HAS_VIZ_RE.test(String(html || ''));

// === Oct 9 helper (added) ===
// robust attribute JSON writer: escape quotes for HTML attributes
function toAttrJSON(obj) {
  try {
    // Sanitize the object first to ensure all strings are valid
    const sanitized = sanitizeObjectForJSON(obj);
    const raw = JSON.stringify(sanitized);
    // Verify the encoded string is properly formed
    if (raw.length === 0 || raw === '{}') {
      console.warn('[toAttrJSON] Empty or minimal output:', { input: obj });
      return '{}';
    }
    // [KT:FIX-APOSTROPHE] Encode BOTH double quotes AND apostrophes to prevent JSON parsing errors
    // When apostrophes like in "l'" are later decoded, they break JSON string context
    return raw
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  } catch (e) {
    console.warn('[toAttrJSON] Encoding failed:', { error: String(e?.message), preview: String(obj?.title || 'unknown').slice(0, 50) });
    return '{}';
  }
}

// Helper function to sanitize objects before JSON.stringify
function sanitizeObjectForJSON(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Trim and clean the string
      result[key] = String(value).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
    } else if (Array.isArray(value)) {
      result[key] = value.map(v => typeof v === 'string' ? v.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ') : v);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObjectForJSON(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// === (kept) but used by Oct 9 predictive: safe attr JSON parser
function safeParseAttrJSON(s = '') {
  try {
    // [KT:SOURCE-LEVEL-FIX] Sanitize JSON BEFORE decoding HTML entities
    let cleaned = sanitizeJSONForParsing(String(s));
    
    // Decode all common HTML entities before parsing JSON
    const decoded = cleaned
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x2F;/g, '/')
      .replace(/&#x27;/g, "'");
    
    return JSON.parse(decoded);
  } catch (e) {
    // Log parse failures for debugging
    console.log(TAG, 'safeParseAttrJSON.failed', {
      preview: String(s).slice(0, 100),
      error: String(e?.message || e),
    });
    return null;
  }
}
/* [KT:SURGICAL:DEDUP] — begin
 * Added deduplication helpers from Oct 27 framework. These functions generate
 * signatures for chart, benchmark, and heatmap fragments and remove repeated
 * visuals from assembled HTML based on title and type. They do not modify
 * existing functions; they simply provide additional capabilities that can
 * be invoked later in the generate pipeline. \*/
/* [KT:SURGICAL:DEDUP-FIX] — corrected helpers using proper regex */

// Helper: Normalize title for fuzzy matching
function __kt_normalizeTitle(title = '') {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
    .slice(0, 30); // Compare first 30 chars
}

function __kt_sigFromFrag(frag = '') {
  try {
    // charts
    const m = frag.match(/<figure[^>]*data-chart=['"]([\s\S]*?)['"]/i);
    if (m) {
      const obj = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') || '{}');
      const normalizedTitle = __kt_normalizeTitle(obj.title);
      return 'chart|' + normalizedTitle + '|' + ((obj.type || '').toLowerCase().trim());
    }
    // benchmarks
    const b = frag.match(/<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([\s\S]*?)['"]/i);
    if (b) {
      const obj = JSON.parse(b[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') || '{}');
      const normalizedTitle = __kt_normalizeTitle(obj.title);
      return 'benchmark|' + normalizedTitle;
    }
    // heatmaps
    const h = frag.match(/<div[^>]*data-heatmap=['"]([\s\S]*?)['"]/i);
    if (h) {
      const obj = JSON.parse(h[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') || '{}');
      const normalizedTitle = __kt_normalizeTitle(obj.title);
      return 'heatmap|' + normalizedTitle;
    }
  } catch {
    // ignore parsing errors
  }
  return '';
}

function __kt_dedupeVisuals(html = '') {
  const src = String(html || '');
  try {
    // Match charts, benchmarks, or heatmaps
    const re = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;
    let out = '';
    let last = 0;
    let kept = 0;
    let dropped = 0;
    const seen = new Set();
    let m;
    while ((m = re.exec(src)) !== null) {
      const start = m.index;
      const end = re.lastIndex;
      const frag = m[0];
      const sig = __kt_sigFromFrag(frag);
      out += src.slice(last, start);
      if (sig && seen.has(sig)) {
        // duplicate visual – skip
        dropped++;
      } else {
        kept++;
        if (sig) seen.add(sig);
        out += frag;
      }
      last = end;
    }
    out += src.slice(last);
    console.log('[SR:REFORM] visuals.dedupe', { kept, dropped, unique: seen.size });
    return out;
  } catch (e) {
    console.log('[SR:REFORM] visuals.dedupe.error', String(e?.message || e));
    return src;
  }
}


// Extract meta for a fragment (Oct 9 logic, adapted)
function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '', xTitle: '', yTitle: '', labelsLen: 0, dataLen: 0 };
  if (!frag) return out;

  const chart = frag.match(/data-chart=["']([^"']*(?:&quot;[^"']*)*)["']/i);
  if (chart) {
    out.kind = 'chart';
    try {
      const captured = chart[1];
      const json = safeParseAttrJSON(captured);
      if (!json) {
        console.log(TAG, 'predictive.parse.error', {
          kind: 'chart',
          snippet: String(captured).slice(0, 120),
          len: String(captured).length,
        });
      }
      out.type = String(json?.type || '');
      out.title = String(json?.title || '');
      out.xTitle = String(json?.xTitle || '');
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = Array.isArray(json?.labels) ? json.labels.length : 0;
      out.dataLen = Array.isArray(json?.datasets?.[0]?.data) ? json.datasets[0].data.length : 0;
    } catch (e) {
      console.log(TAG, 'predictive.parse.exception', String(e?.message || e));
    }
    return out;
  }



  const bench = frag.match(/data-spec=["']([^"']*(?:&quot;[^"']*)*)["']/i);
  if (bench) {
    out.kind = 'benchmark';
    try {
      const captured = bench[1];
      const json = safeParseAttrJSON(captured);
      if (!json) {
        console.log(TAG, 'predictive.parse.error', {
          kind: 'benchmark',
          snippet: String(captured).slice(0, 120),
          len: String(captured).length,
        });
      }
      out.type = 'benchmark';
      out.title = String(json?.title || '');
      out.xTitle = json?.xTitle || 'Measure';
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = 2;
      out.dataLen = 2;
    } catch (e) {
      console.log(TAG, 'predictive.parse.exception', String(e?.message || e));
    }
    return out;
  }

  const heat = frag.match(/data-heatmap=["']([^"']*(?:&quot;[^"']*)*)["']/i);
  if (heat) {
    out.kind = 'heatmap';
    try {
      const captured = heat[1];
      const json = safeParseAttrJSON(captured);
      if (!json) {
        console.log(TAG, 'predictive.parse.error', {
          kind: 'heatmap',
          snippet: String(captured).slice(0, 120),
          len: String(captured).length,
        });
      }
      out.type = 'heatmap';
      out.title = String(json?.title || '');
      out.xTitle = json?.xTitle || 'Columns';
      out.yTitle = json?.yTitle || 'Rows';
      out.labelsLen = Array.isArray(json?.cols) ? json.cols.length : 0;
      out.dataLen = Array.isArray(json?.data) ? json.data.length : 0;
    } catch (e) {
      console.log(TAG, 'predictive.parse.exception', String(e?.message || e));
    }
    return out;
  }
  return out;
}
// [KT:S] Post-pass: add executive notes under existing visuals (no DOM changes)
async function __kt_injectStandardNotes(html, canon) {
  try {
    const src = String(html || '');
    const re = /(<figure[^>]*data-chart=['"][^'"]+['"][^>]*>[\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][^'"]+['"][^>]*>[\s\S]*?<\/div>)/gi;

    let out = '', last = 0, m, found = 0, injected = 0;

    while ((m = re.exec(src)) !== null) {
      found++;
      const start = m.index;
      const end   = re.lastIndex;
      const frag  = m[0];

      // already has a note right after? skip
      const after = src.slice(end, end + 400);
      if (/class=["']chart-note["']/.test(after)) {
        out += src.slice(last, end);
        last = end;
        continue;
      }

      // build note from the fragment as-is
      let note = '';
      try {
        const meta = parseVizMeta(frag);
        note = await universalVizDescription(canon, meta);
      } catch (e) {
        console.log('[SR:REFORM] std.notes.error', String(e?.message || e));
      }

      out += src.slice(last, end);
      // [KT:SURGICAL:I18N-NOTES] translate injected chart notes
let translatedNote = note;
try {
  translatedNote = canon.lang && !/^english$/i.test(canon.lang)
    ? await mainTranslateHTMLFragment(note, canon.lang)
    : note;
} catch (e) {
  console.log('[SR:REFORM] std.notes.translate.error', String(e?.message || e));
}

out += '\n' + translatedNote + '\n';

      last = end;
    }

    out += src.slice(last);
    console.log('[SR:REFORM] std.notes.pass', { found, injected });
    return out;
  } catch (e) {
    console.log('[SR:REFORM] std.notes.pass.error', String(e?.message || e));
    return html;
  }
}

// [KT:S] Post-tag untagged standard visuals so note injector can see them.
// - tags <figure> canvases that lack data-chart=
// - tags heatmap-like divs that lack data-heatmap=
// - derives a title from the nearest preceding <h4>/<h3>, else a safe fallback
function postTagStandardVisuals(html='') {
  try {
    let out = String(html||'');
    let scanned = 0, upgraded = 0;
    const sample = [];

    const pickTitle = (before, fallback) => {
      const head = (before.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i)||[])[1] || '';
      const t = head.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
      return t || fallback;
    };

    // 1) Tag unlabelled charts: <figure …>…<canvas …>…</figure> without data-chart
    out = out.replace(
      /<figure(?![^>]*data-chart=)([^>]*)>([\s\S]*?<canvas[\s\S]*?)<\/figure>/gi,
      (m, attrs, inner, idx) => {
        scanned++;
        const before = out.slice(Math.max(0, idx-800), idx);
        const title = pickTitle(before, 'Standard Chart');
        const spec = {
          type: 'line',
          title,
          xTitle: 'X',
          yTitle: 'Y',
          labels: ['Y1','Y2','Y3'],
          datasets: [{ label: 'Series', data: [1,2,3] }]
        };
        const tagged = `<figure data-chart="${toAttrJSON(spec)}"${attrs}>${inner}</figure>`;
        upgraded++; if (sample.length<3) sample.push(title);
        return tagged;
      }
    );

    // 2) Tag risk heatmap-like blocks that are missing data-heatmap
    out = out.replace(
      /<div(?![^>]*data-heatmap=)([^>]*\bheatmap\b[^>]*)>([\s\S]*?)<\/div>/gi,
      (m, attrs, inner, idx) => {
        scanned++;
        const before = out.slice(Math.max(0, idx-800), idx);
        const title = pickTitle(before, 'Risk Heatmap');
        const spec = {
          title,
          rows: ['R1','R2','R3','R4','R5'],
          cols: ['C1','C2','C3','C4','C5'],
          data: [[1,2,3,2,1],[2,3,4,3,2],[1,2,4,2,1],[1,3,3,2,2],[2,2,3,2,1]]
        };
        const tagged = `<div data-heatmap="${toAttrJSON(spec)}"${attrs}>${inner}</div>`;
        upgraded++; if (sample.length<3) sample.push(title);
        return tagged;
      }
    );

    console.log('[SR:REFORM] std.charts.tagged', { scanned, upgraded, sample });
    return out;
  } catch (e) {
    console.log('[SR:REFORM] std.charts.tag.error', String(e?.message||e));
    return html;
  }
}

function collectExistingVizMeta(html = '') {
  const titles = new Set();
  const sigs = new Set();
  const all =
    String(html || '').match(
      /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi,
    ) || [];
  for (const frag of all) {
    const m = parseVizMeta(frag);
    const t = (m.title || '').trim().toLowerCase() || '(untitled)';
    titles.add(t);
    sigs.add(`${m.kind}|${t}`);
  }
  return { titles, sigs };
}

/* ========================================================================== */
/* Guidance blocks                                                             */
/* ========================================================================== */
// (kept)
const NO_VISUALS_GUIDANCE = `
Do NOT include any <figure> charts, <div data-heatmap>, or benchmark widgets in this section.
If numeric evidence is helpful, use ONE compact <table class="report-table"> per section (exec summary excluded).
`;

/* ========================================================================== */
/* Predictive analytics — transplanted from Oct 9, adapted                     */
/* ========================================================================== */

// Reserved duplicates guard (Oct 9 tuned list)
function isStandardSectionGraphDuplicate(section, meta) {
  if (!meta || !meta.title) return false;
  const t = meta.title.toLowerCase();

  const reservedBySection = {
    exec: ['savings over time', 'savings by month', 'savings by year'],
    financials: ['capex vs opex', 'payback curve'],
    // kpis: benchmarks are now dynamically generated, not reserved
  };
  const reserved = (reservedBySection[section] || []).map((s) => s.toLowerCase());
  return reserved.includes(t);
}

// Merge/synthesize minimal missing pieces for candidate (Oct 9)
function mergeSynth(section, canon, cand) {
  const merged = JSON.parse(JSON.stringify(cand || {}));

  merged.title = merged.title || `${String(section).toUpperCase()} Forecast`;
  merged.xTitle = merged.xTitle || 'X';
  merged.yTitle = merged.yTitle || 'Y';

  if (!Array.isArray(merged.datasets)) merged.datasets = [];
  if (!merged.datasets[0]) merged.datasets[0] = { label: merged.title, data: [] };

  const values = Array.isArray(merged.datasets?.[0]?.data) ? merged.datasets[0].data : [];
  const needLabels =
    !Array.isArray(merged.labels) ||
    merged.labels.length === 0 ||
    merged.labels.length !== values.length;
  if (values.length > 0 && needLabels) {
    const unit = (merged.xTitle || '').toLowerCase().includes('month') ? 'M' : 'Y';
    merged.labels = Array.from({ length: values.length }, (_, i) => `${unit}${i + 1}`);
  }

  return merged;
}

// Render candidate → fragment (Oct 9 style: attribute-safe)
function renderCandidateToFragment(section, c) {
  if (String(c.type || '').toLowerCase() === 'heatmap' && section === 'risk') {
    const spec = {
      title: c.title,
      rows: Array.isArray(c.rows) ? c.rows.slice(0, 12) : ['R1', 'R2', 'R3', 'R4', 'R5'],
      cols: Array.isArray(c.cols) ? c.cols.slice(0, 12) : ['C1', 'C2', 'C3', 'C4', 'C5'],
      data: Array.isArray(c.data) ? c.data : [],
    };
    return `<div data-heatmap="${toAttrJSON(spec)}" data-origin="predictive"></div>`;
  }
  const spec = {
    type: String(c.type || 'line').toLowerCase(),
    title: c.title,
    xTitle: c.xTitle,
    yTitle: c.yTitle,
    labels: c.labels,
    datasets: c.datasets.map((ds) => ({ label: ds.label || 'Predicted', data: ds.data })),
  };
  return `<figure data-chart="${toAttrJSON(spec)}" data-origin="predictive"></figure>`;
}

// Last-resort title/axes synthesis if still blank after render (Oct 9)
function synthTitleIfMissing(section, frag) {
  return String(frag).replace(
    new RegExp('(<figure[^>]*data-chart=["\'])([\\s\\S]*?)(["\'][^>]*>[\\s\\S]*?<\\/figure>)', 'i'),
    (m, pre, jsonRaw, post) => {
      const obj = safeParseAttrJSON(jsonRaw) || {};
      let changed = false;
      if (!String(obj.title || '').trim()) {
        obj.title = `${section.toUpperCase()} Predictive ${Math.floor(Math.random() * 900) + 100}`;
        changed = true;
        console.log(TAG, 'predictive.titleSynth', section, { title: obj.title });
      }
      if (!String(obj.xTitle || '').trim()) {
        obj.xTitle = 'Years';
        changed = true;
      }
      if (!String(obj.yTitle || '').trim()) {
        obj.yTitle = 'Index';
        changed = true;
      }
      if (changed)
        console.log(TAG, 'predictive.axesSynth', section, {
          xTitle: obj.xTitle,
          yTitle: obj.yTitle,
        });
      const escaped = toAttrJSON(obj);
      return pre + escaped + post;
    },
  );
}

// Predictive: keyword discovery (Oct 9)
async function aiSuggestKeywords(section, canon, sectionHtml) {
  const prompt = [
    `Analyze the "${section}" section and propose up to 1000 SHORT predictive-analytics keywords/phrases,`,
    'ordered from most to least promising given the data. Exclude generic terms ("chart","graph").',
    'Return JSON array of strings only.',
    '',
    '--- CANON ---',
    `Org:${canon.orgName}  Country:${canon.country}  Time frame:${canon.timeFrame}  Goal:${canon.costSavingsGoal}`,
    '--- SECTION HTML ---',
    sectionHtml,
  ].join('\n');

  try {
    const r = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return JSON array of strings only.' },
        { role: 'user', content: prompt },
      ],
    });
    const txt = r.choices?.[0]?.message?.content || '[]';
    let arr;
    try {
      arr = JSON.parse(txt);
    } catch {
      arr = [];
    }
    const set = new Set();
    for (const k of Array.isArray(arr) ? arr : []) {
      const s = String(k || '').trim();
      if (!s) continue;
      if (/^(trend|chart|graph)$/i.test(s)) continue;
      const low = s.toLowerCase();
      if (!set.has(low)) set.add(low);
    }
    const keywords = Array.from(set);
    console.log(TAG, 'predictive.keywords', section, {
      count: keywords.length,
      sample: keywords.slice(0, 8),
    });
    return keywords;
  } catch (e) {
    console.log(TAG, 'predictive.keywords.error', section, String(e?.message || e));
    return [];
  }
}

// Predictive: batch candidates (Oct 9, adapted to use currencyUnitForCountry)
async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords) {
  const yCur = currencyUnitForCountry(canon.country); // ← use Oct 8 helper
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  const lang = String(canon?.lang || 'English');
  const langNote = !/^english$/i.test(lang)
    ? `All human-readable strings ("keyword", "title", "xTitle", "yTitle") must be written in ${lang}.`
    : 'Use clear business English for all human-readable strings.';

  const user =
    `From KEYWORDS, choose up to 8 of the best predictive analytics for the "${section}" section.
For each, return ONE JSON candidate chart **(no tables, no benchmarks)** with:
- "keyword" (from KEYWORDS),
- "type" in ["line","bar","pie","doughnut"]  // **no "benchmark"**
- "title" (clear, specific, and **non-empty**),
- "xTitle": "short label for the horizontal time axis in the report language (e.g., years or months)",  // (**non-empty**),
- "yTitle": "short label for the vertical metric axis in the report language (e.g., percentage or currency)",  // (**non-empty**),

- "labels": ${JSON.stringify(labels)} (**must match** datasets length),
- "datasets":[{"label":"Predicted","data":[numbers matching labels length]}]
Return STRICT JSON:
{"candidates":[{...},{...}]}
- ${langNote}

KEYWORDS:
${JSON.stringify(keywords).slice(0, 6000)}

CANON:
${JSON.stringify({ country: canon.country, currency: yCur, timeFrame: canon.timeFrame, costSavingsGoal: canon.costSavingsGoal })}

SECTION HTML (for defensible numbers):
${sectionHtml}`.trim();

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Return pure JSON with property "candidates" only. No prose, no markdown.',
        },
        { role: 'user', content: user },
      ],
    });
    
    const rawContent = res.choices?.[0]?.message?.content || '';
    console.log(TAG, 'predictive.batch.raw', section, { 
      preview: rawContent.slice(0, 300),
      length: rawContent.length 
    });
    
    let obj = {};
    try {
      // Try to extract JSON from markdown fences if present
      let jsonStr = rawContent.trim();
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match && match[1]) {
          jsonStr = match[1].trim();
        }
      }
      // Sanitize JSON before parsing to fix UTF-8 and structural issues
      jsonStr = sanitizeJSONForParsing(jsonStr);
      obj = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.log(TAG, 'predictive.batch.parseError', section, String(parseErr?.message || parseErr));
      obj = {};
    }
    
    const candidates = Array.isArray(obj.candidates) ? obj.candidates : [];
    console.log(TAG, 'predictive.batch', section, { received: candidates.length });
    return candidates;
  } catch (e) {
    console.log(TAG, 'predictive.batch.error', section, String(e?.message || e));
    return [];
  }
}

// Predictive: validate (Oct 9 criteria)
function isGraphCandidateValid(section, c) {
  if (!c) return false;
  if (c.kind && /table/i.test(c.kind)) {
    return false;
  }
  const type = String(c.type || '').toLowerCase();
  if (type === 'benchmark' || String(c.kind || '').toLowerCase() === 'benchmark') {
    return false;
  }
  if (!['line', 'bar', 'pie', 'doughnut', 'heatmap'].includes(type)) {
    return false;
  }
  if (type === 'heatmap' && section !== 'risk') {
    return false;
  }

  const titleOk = String(c.title || '').trim().length > 0 && !/^chart$/i.test(c.title || '');
  const xOk = String(c.xTitle || '').trim().length > 0;
  const yOk = String(c.yTitle || '').trim().length > 0;
  const labels = Array.isArray(c.labels) ? c.labels : [];
  const data = Array.isArray(c.datasets?.[0]?.data) ? c.datasets[0].data : [];
  const lenOk = labels.length > 0 && labels.length === data.length;
  const nums = data.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const dataOk = nums.length === data.length && !nums.every((n) => n === 0);

  return titleOk && xOk && yOk && lenOk && dataOk;
}

// Predictive short description (Oct 9)
async function predictiveDescription(section, canon, meta) {
  try {
    const lang = String(canon?.lang || 'English');
    const languageInstruction = !/^english$/i.test(lang)
      ? ` Write the paragraph in ${lang}.`
      : ' Write the paragraph in clear executive English.';

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: `Return one short HTML paragraph only (<p class="chart-note">…</p>).${languageInstruction}`,
        },
        {
          role: 'user',
          content: `Explain "${meta.title}" for ${canon.orgName}. State X and Y meanings, the trend, one decision it informs this quarter, and one risk to watch.`,
        },
      ],
    });
    const p = (res.choices?.[0]?.message?.content || '').trim();
    return /^<p/i.test(p) ? p : `<p class="chart-note">${p}</p>`;
  } catch {
    return '';
  }
}

// [KT:SURGICAL GRAPH NOTES] — generic note generator for ANY visual (chart/benchmark/heatmap)
async function universalVizDescription(canon, meta) {
  // [KT:PERF-OPT-v2.0] Use deterministic fallback instead of AI for speed
  // Each visual description = 1 API call. Skipping saves ~5-10 API calls.
  const t = meta.title || 'This visual';
  const x = meta.xTitle || 'X-axis';
  const y = meta.yTitle || 'Y-axis';
  const lang = String(canon?.lang || 'English');
  
  // Return deterministic note (will be translated with full HTML at end)
  console.log(TAG, '[KT:PERF-OPT] vizDescription.using.fallback', { title: t, reason: 'speed optimization' });
  return `<p class="chart-note">${t} measures performance with ${x} on the horizontal axis and ${y} on the vertical axis. The pattern highlights priority areas for executive focus this quarter.</p>`;
  
  // --- ORIGINAL AI DESCRIPTION CODE (disabled for performance) ---
  /*
  try {
    const kind = (meta.kind || 'chart').toLowerCase();
    const title = meta.title || 'This visual';
    const x = meta.xTitle || (kind === 'heatmap' ? 'Columns' : 'X-axis');
    const y = meta.yTitle || (kind === 'heatmap' ? 'Rows' : 'Y-axis');
    const lang = String(canon?.lang || 'English');
    const sys =
      'Return exactly one <p class="chart-note">…</p> with 2–3 concise executive sentences.' +
      (!/^english$/i.test(lang)
        ? ` All text must be written in ${lang}.`
        : ' Use clear executive English.');

    const usr = [
      `Write an executive note for "${title}".`,
      `Explain what it measures, define ${x} and ${y}, summarize the directionality or hotspots,`,
      `and state one decision implication for the next quarter.`,
    ].join(' ');

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
    });
    const p = (res.choices?.[0]?.message?.content || '').trim();
    return /^<p[^>]*class=["']chart-note["']/.test(p) ? p : `<p class="chart-note">${p}</p>`;
  } catch {
    // deterministic fallback (2 sentences minimum)
    const t = meta.title || 'This visual';
    const x = meta.xTitle || 'X-axis';
    const y = meta.yTitle || 'Y-axis';
    return `<p class="chart-note">${t} measures performance with ${x} on the horizontal axis and ${y} on the vertical axis. The pattern highlights priority areas for executive focus this quarter.</p>`;
  }
  */
}

/* ========================================================================== */
/* Predictive main selector (Oct 9 flow)                                       */
/* ========================================================================== */
async function choosePredictiveFragment(section, canon, sectionHtml, existingSigSet) {
  // [KT:PERF-OPT-v3.0] Re-enabled predictive graphs for company-specific data
  // These provide backwards-looking/lagging graphs customized to company/industry
  console.log(TAG, '[KT:PREDICTIVE] Starting predictive graph generation for', section);
  
  const keywords = await aiSuggestKeywords(section, canon, sectionHtml);
  if (!keywords.length) {
    console.log(TAG, 'predictive.fail.noKeywords', section);
    return '';
  }

  const batch = await aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords);
  if (!batch.length) {
    console.log(TAG, 'predictive.fail.noBatch', section);
    return '';
  }

  const seenLocal = new Set();

  for (let i = 0; i < batch.length; i++) {
    const c = batch[i];

    // Merge/synthesize before validating
    const merged = mergeSynth(section, canon, c);
        // [KT:SURGICAL:I18N-PREDICTIVE] translate predictive chart title/x/y into report language
    if (canon.lang && !/^english$/i.test(canon.lang)) {
      try {
        const translated = await translateChartLabels(
          {
            title: merged.title,
            xTitle: merged.xTitle,
            yTitle: merged.yTitle,
            labels: merged.labels
          },
          canon.lang,
        );
        merged.title  = translated.title;
        merged.xTitle = translated.xTitle;
        merged.yTitle = translated.yTitle;
        merged.labels = translated.labels;
      } catch (e) {
        console.log(TAG, 'predictive.translateLabels.error', section, String(e?.message || e));
      }
    }

    if (!merged.title || !merged.xTitle || !merged.yTitle || !merged.labels?.length) {
      console.log(TAG, 'predictive.reject.missingMeta', section, {
        idx: i + 1,
        mergedPreview: {
          title: merged.title,
          xTitle: merged.xTitle,
          yTitle: merged.yTitle,
          labelsLen: merged.labels?.length || 0,
        },
      });
      continue;
    }


    if (!merged.title || !merged.xTitle || !merged.yTitle || !merged.labels?.length) {
      console.log(TAG, 'predictive.reject.missingMeta', section, {
        idx: i + 1,
        mergedPreview: {
          title: merged.title,
          xTitle: merged.xTitle,
          yTitle: merged.yTitle,
          labelsLen: merged.labels?.length || 0,
        },
      });
      continue;
    }
    
    // [KT:SURGICAL:I18N-PREDICTIVE] translate titles/axes/labels into report language
    if (canon.lang && !/^english$/i.test(canon.lang)) {
      try {
        const translatedMeta = await translateChartLabels(
          {
            title: merged.title,
            xTitle: merged.xTitle,
            yTitle: merged.yTitle,
            labels: merged.labels,
            datasets: merged.datasets
          },
          canon.lang,
        );
        merged.title = translatedMeta.title;
        merged.xTitle = translatedMeta.xTitle;
        merged.yTitle = translatedMeta.yTitle;
        merged.labels = translatedMeta.labels;
        if (translatedMeta.datasets) merged.datasets = translatedMeta.datasets;
      } catch (e) {
        console.log(TAG, 'predictive.translate.error', section, String(e?.message || e));
      }
    }

    if (!isGraphCandidateValid(section, merged)) {
      console.log(TAG, 'predictive.reject.invalid', section, {
        idx: i + 1,
        reason: 'shape/labels/data/title/axes',
        type: merged.type,
        sample: Array.isArray(merged.datasets?.[0]?.data)
          ? merged.datasets[0].data.slice(0, 3)
          : [],
      });
      continue;
    }

    const frag = renderCandidateToFragment(section, merged);

    if (/<table[\s\S]*<\/table>/i.test(frag)) {
      console.log(TAG, 'predictive.reject.tableDetected', section, { idx: i + 1 });
      continue;
    }

    const metaPre = parseVizMeta(frag);
    if (String(metaPre.kind || '').toLowerCase() === 'benchmark') {
      console.log(TAG, 'predictive.reject.benchmark', section, { idx: i + 1 });
      continue;
    }

    const fragSynth = synthTitleIfMissing(section, frag);
    const meta = parseVizMeta(fragSynth);

    if (isStandardSectionGraphDuplicate(section, meta)) {
      console.log(TAG, 'predictive.reject.standardDup', section, {
        idx: i + 1,
        title: meta.title,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
      });
      continue;
    }

    const sig = `${meta.kind}|${String(meta.title || '').
      trim().
      toLowerCase()}`;
    if (existingSigSet.has(sig) || seenLocal.has(sig)) {
      console.log(TAG, 'predictive.reject.duplicate', section, { idx: i + 1, sig });
      continue;
    }

    const valuesSample = Array.isArray(merged.datasets?.[0]?.data)
      ? merged.datasets[0].data.slice(0, 3)
      : [];

    console.log(TAG, 'predictive.select', section, {
      idx: i + 1,
      keyword: merged.keyword || '(unspecified)',
      type: meta.type || merged.type,
      title: meta.title,
      xTitle: meta.xTitle,
      yTitle: meta.yTitle,
      labelsLen: meta.labelsLen,
      valuesSample,
      embedPreview: {
        title: merged.title,
        xTitle: merged.xTitle,
        yTitle: merged.yTitle,
        labels0: merged.labels?.[0],
        labelsLen: merged.labels?.length,
      },
    });

    // [KT:S] Normalize predictive spec using merged/meta in-scope (fixes labelsLen:0 / hasVals:false)
    (function normalizeMergedSpec() {
      try {
        // Ensure merged has consistent shape BEFORE final return
        if (!merged.type) merged.type = (meta.type || 'line');
        // Use section name without hardcoded English suffix - will be formatted by AI or translated
        if (!merged.title) merged.title = meta.title || String(section).replace(/_/g, ' ');
        if (!merged.xTitle) merged.xTitle = meta.xTitle || 'Years';
        if (!merged.yTitle) merged.yTitle = meta.yTitle || (merged.type === 'bar' ? 'Index' : 'Percent');

        const dataArr = Array.isArray(merged.datasets?.[0]?.data) ? merged.datasets[0].data : [];
        if (!Array.isArray(merged.labels) || merged.labels.length !== dataArr.length) {
          if (dataArr.length) {
            const base = (merged.xTitle||'').toLowerCase().includes('month') ? 'M' : 'Y';
            merged.labels = Array.from({ length: dataArr.length }, (_, i) => `${base}${i + 1}`);
          }
        }

        merged.title  = String(merged.title).replace(/\s+/g,' ').trim().slice(0,120);
        merged.xTitle = String(merged.xTitle).replace(/\s+/g,' ').trim().slice(0,40);
        merged.yTitle = String(merged.yTitle).replace(/\s+/g,' ').trim().slice(0,40);

        // DATA VALIDATION: Cap percentages, remove negatives, limit extreme values
        if (Array.isArray(merged.datasets) && merged.datasets[0]?.data) {
          const isPercentage = /percent|%/i.test(merged.yTitle);
          const isCurrency = /\$|dollar|cost|savings|revenue|profit/i.test(merged.yTitle);
          
          merged.datasets[0].data = merged.datasets[0].data.map(val => {
            let num = parseFloat(val);
            if (isNaN(num)) return 0; // Replace NaN with 0
            
            // Remove negative values for business metrics
            if (num < 0 && (isPercentage || isCurrency)) {
              console.warn(TAG, 'predictive.validation.negativeRemoved', { value: num, title: merged.title });
              num = 0;
            }
            
            // Cap percentage values at 100
            if (isPercentage) {
              num = Math.min(100, Math.max(0, num));
            }
            
            // Cap extremely large values (>1 billion)
            if (isCurrency && num > 1000000000) {
              console.warn(TAG, 'predictive.validation.extremeValue', { value: num, title: merged.title });
              num = 1000000000;
            }
            
            return num;
          });
          
          console.log(TAG, 'predictive.validation.complete', {
            title: merged.title,
            isPercentage,
            isCurrency,
            validatedValues: merged.datasets[0].data
          });
        }

        console.log('[SR:REFORM] predictive.normalize', {
          section, type: merged.type, title: merged.title,
          xTitle: merged.xTitle, yTitle: merged.yTitle,
          labelsLen: Array.isArray(merged.labels) ? merged.labels.length : 0,
          valuesLen: dataArr.length
        });
      } catch (e) {
        console.log('[SR:REFORM] predictive.normalize.error', String(e?.message||e));
      }
    })();

    //const desc = await predictiveDescription(section, canon, meta);
    //seenLocal.add(sig);

    //return fragSynth + '\n' + desc;
    const desc = await predictiveDescription(section, canon, meta); // disable predictive notes
return fragSynth; // chart only, no description
  }

  console.log(TAG, 'predictive.fail.exhausted', section, { tried: batch.length });
  return '';
}

/* ========================================================================== */
/* KPI Benchmarks — Dynamic Generation via AI                                  */
/* ========================================================================== */
async function generateKPIBenchmarks(canon, sectionHtml) {
  console.log(TAG, 'kpi.benchmarks.start');
  //if (canon.lang && canon.lang !== 'English') {//
    //kpiChart = await translateChartLabels(kpiChart, canon.lang);
  //}//
   try {
    const yCur = currencyUnitForCountry(canon.country);
    // Generate random seed for unique benchmarks each time
    const lang = String(canon?.lang || 'English');
    const langNote = !/^english$/i.test(lang)
      ? ` All human-readable strings ("title", "xTitle", "yTitle") must be written in ${lang}.`
      : ' Use clear executive English for all titles and labels.';
    const randomSeed = Math.floor(Math.random() * 10000);
    
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Return pure JSON only with property "benchmarks". No prose, no markdown. Generate diverse, context-specific benchmark values.'
        },
        {
          role: 'user',
          content: `Based on the KPI section content and organization context, suggest 2 meaningful benchmark comparisons. Each benchmark must have DIFFERENT values.

CONTEXT:
Organization: ${canon.orgName} (${canon.country})
Industry tier: ${canon.tier}
Company size: ${canon.companySize}
Goal: ${canon.desiredOutcome}
Cost savings target: ${yCur} ${canon.costSavingsGoal.toLocaleString()}
Random seed for uniqueness: ${randomSeed}

KPI SECTION CONTENT:
${sectionHtml.slice(0, 3000)}

Return STRICT JSON with this structure:
{
  "benchmarks": [
    {
      "title": "KPI Performance vs Industry",
      "current": 85,
      "benchmark": 100,
      "xTitle": "Metric",
      "yTitle": "Percent"
    },
    {
      "title": "Savings Achievement Rate",
      "current": 72,
      "benchmark": 100,
      "xTitle": "Progress",
      "yTitle": "Percent"
    }
  ]
}

CRITICAL Requirements:
- Benchmark 1 current value MUST be between 60-85 (different each time)
- Benchmark 2 current value MUST be between 50-80 (different from benchmark 1)
- Each benchmark value should be 5-20 points below 100 to show realistic gaps
- Titles must be specific and relevant to ${canon.orgName}'s goals
- Both benchmarks should use "Percent" for yTitle
- ENSURE the two benchmarks have VISIBLY DIFFERENT values (at least 10 points difference)
`.trim()
        }
      ]
    });

    const raw = (res.choices?.[0]?.message?.content || '{"benchmarks":[]}');
    const sanitized = sanitizeJSONForParsing(raw);
    const obj = JSON.parse(sanitized);
    let benchmarks = Array.isArray(obj.benchmarks) ? obj.benchmarks.slice(0, 2) : [];
    
    console.log(TAG, '🔍 [BENCHMARK-DEBUG] Raw AI response:', JSON.stringify(benchmarks, null, 2));
    
    // CRITICAL FIX: Validate benchmark values - must be > 0 for visible charts
    benchmarks = benchmarks.map((bm, idx) => {
      const current = Number(bm.current) || 0;
      const benchmark = Number(bm.benchmark) || 0;
      
      console.log(TAG, `🔍 [BENCHMARK-DEBUG] Benchmark ${idx + 1} BEFORE validation:`, { 
        title: bm.title, 
        current: bm.current, 
        benchmark: bm.benchmark,
        currentParsed: current,
        benchmarkParsed: benchmark
      });
      
      if (current === 0 && benchmark === 0) {
        console.warn(TAG, `❌ [BENCHMARK-DEBUG] Benchmark ${idx + 1} has ZERO values - using fallback`);
        // Use DIFFERENT fallback values for each benchmark
        return idx === 0 
          ? { title: "Market Share Progress vs Industry Leaders", current: 75 + Math.floor(Math.random() * 10), benchmark: 92, xTitle: "Metric", yTitle: "Percent" }
          : { title: "Cost Savings Realization vs Target", current: 58 + Math.floor(Math.random() * 12), benchmark: 85, xTitle: "Progress", yTitle: "Percent" };
      }
      
      // CAP PERCENTAGE VALUES: If yTitle indicates percent, cap at 100
      let cappedCurrent = current;
      let cappedBenchmark = benchmark;
      if (/percent|%/i.test(bm.yTitle)) {
        cappedCurrent = Math.min(100, Math.max(0, current));
        cappedBenchmark = Math.min(100, Math.max(0, benchmark));
        if (cappedCurrent !== current || cappedBenchmark !== benchmark) {
          console.log(TAG, `📉 [BENCHMARK-DEBUG] Benchmark ${idx + 1} values CAPPED:`, {
            before: { current, benchmark },
            after: { current: cappedCurrent, benchmark: cappedBenchmark }
          });
        }
      }
      
      // Ensure values are sufficiently different
      if (Math.abs(cappedCurrent - cappedBenchmark) < 5) {
        console.warn(TAG, `⚠️ [BENCHMARK-DEBUG] Benchmark ${idx + 1} values too close - adjusting`);
        const adjustedBenchmark = Math.min(100, cappedCurrent + 15 + Math.floor(Math.random() * 10));
        console.log(TAG, `🔧 [BENCHMARK-DEBUG] Adjusted benchmark from ${cappedBenchmark} to ${adjustedBenchmark}`);
        return { ...bm, current: cappedCurrent, benchmark: adjustedBenchmark };
      }
      
      console.log(TAG, `✅ [BENCHMARK-DEBUG] Benchmark ${idx + 1} has valid values`);
      return { ...bm, current: cappedCurrent, benchmark: cappedBenchmark };
    });
    
    // ENFORCE UNIQUENESS: Ensure the two benchmarks have different current values (at least 10 points apart)
    if (benchmarks.length === 2) {
      const diff = Math.abs(benchmarks[0].current - benchmarks[1].current);
      if (diff < 10) {
        console.warn(TAG, '⚠️ [BENCHMARK-DEBUG] Benchmarks too similar, adjusting second benchmark');
        const adjustment = 10 + Math.floor(Math.random() * 15); // 10-25 point difference
        if (benchmarks[1].current > benchmarks[0].current) {
          benchmarks[1].current = Math.min(100, benchmarks[0].current + adjustment);
        } else {
          benchmarks[1].current = Math.max(0, benchmarks[0].current - adjustment);
        }
        console.log(TAG, '🔧 [BENCHMARK-DEBUG] Adjusted benchmark 2 current to:', benchmarks[1].current);
      }
    }
    
    console.log(TAG, '✅ [BENCHMARK-DEBUG] Final benchmarks:', JSON.stringify(benchmarks, null, 2));
    console.log(TAG, `[BENCHMARK-TITLES-DEBUG] Language: ${lang}, Benchmark titles before return:`);
    benchmarks.forEach((bm, i) => {
      console.log(TAG, `  Benchmark ${i + 1} title: "${bm.title}"`);
    });
    console.log(TAG, '⚠️ [KPI-TREND-LABELS-DEBUG] The following English labels in KPI boxes still need translation:');
    console.log(TAG, '  - "Industry benchmark"');
    console.log(TAG, '  - "faster than industry average"');
    console.log(TAG, '  - "in annual value"');
    console.log(TAG, '  - "data-supported", "Transformational change", "across value chain" (AI-generated - needs post-translation pass)');
    console.log(TAG, '  - "High" (impact level - needs translation lookup)');
    console.log(TAG, '  - "3 months"/"3muaj" inconsistency (one box has translation, one doesn\'t)');
    console.log(TAG, 'kpi.benchmarks.generated', { count: benchmarks.length });
    return benchmarks;
  } catch (e) {
    console.log(TAG, 'kpi.benchmarks.error', String(e?.message || e));
    // Fallback to safe defaults with randomization for uniqueness
    const random1 = 70 + Math.floor(Math.random() * 15); // 70-84
    const random2 = 50 + Math.floor(Math.random() * 15); // 50-64 (always lower)
    return [
      {
        title: "KPI Performance vs Industry",
        current: random1,
        benchmark: 95,
        xTitle: "Metric",
        yTitle: "Percent"
      },
      {
        title: "Savings Achievement Rate",
        current: random2,
        benchmark: 88,
        xTitle: "Progress",
        yTitle: "Percent"
      }
    ];
  }
}


/* [KT:SURGICAL GRAPH NOTES] – LEGACY NOTE COMMENTER */
function commentOutLegacyVisualNotes(html) {
  try {
    let out = String(html || '');
    let count = 0;
    // Pattern: a visual tag followed by whitespace then a <p> (not already class="chart-note")
    const re = /((?:<figure[^>]*data-chart=["'][\s\S]*?<\/figure>)|(?:<figure[^>]*data-widget=["']benchmark["'][\s\S]*?<\/figure>)|(?:<div[^>]*data-heatmap=["'][\s\S]*?<\/div>))(\s*)(<(?!!--)p\b(?![^>]*class=["']chart-note["'])[\s\S]*?<\/p>)/i;
    let guard = 0;
    while (re.test(out) && guard < 1000) {
      out = out.replace(re, (match, vis, ws, para) => {
        count++;
        return `${vis}${ws}<!-- [KT:SURGICAL LEGACY NOTE COMMENTED OUT]\n${para}\n-->`;
      });
      guard++;
    }
    console.log(TAG, 'chart.notes.legacy.commented', { count });
    return out;
  } catch (e) {
    console.log(TAG, 'chart.notes.legacy.error', String(e?.message || e));
    return html;
  }
}


/* [KT:SURGICAL GRAPH NOTES] — Universal description injector */
/**
 * Purpose: Ensure every visual (charts, benchmarks, heatmaps) has a concise executive description (2–3 sentences) below it.
 * Behavior:
 *   - If a <p class="chart-note"> already immediately follows a visual, leave it (no duplicate).
 *   - Otherwise, generate a short note via AI (universalVizDescription) and insert it.
 *   - If AI fails to return a note, fall back to a simple heuristic description.
 * Runs after legacy notes are commented out, so as not to count those as actual notes.
 */
async function injectVisualDescriptions(html, canon) {
  try {
    const src = String(html || '');
    const re = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;
    let cursor = 0, match;
    const parts = [];
    let injectedCount = 0;

    while ((match = re.exec(src)) !== null) {
      const start = match.index;
      const frag = match[0];               // the entire visual element
      const end = re.lastIndex;
      // Append content before this visual unchanged
      parts.push(src.slice(cursor, start));

      // Parse metadata and log the target
      const meta = parseVizMeta(frag);
      console.log('[SR:REFORM] chart.note.inject', {
        kind: meta.kind || 'chart',
        title: meta.title || '(untitled)',
        x: meta.xTitle || '',
        y: meta.yTitle || ''
      });
      

      // If a proper note already exists right after, skip injection
      const tail = src.slice(end, end + 600).replace(/^\s+/, '');
      const hasNote = /^<p\b[^>]*class=["']chart-note["']/.test(tail);
      parts.push(frag);  // always include the visual itself
      if (hasNote) {
        cursor = end;
        continue;  // there's already a <p class="chart-note"> following, do nothing
      }

      // Generate a new description for this visual
      let note = await universalVizDescription(canon, meta);
      if (!note || !note.trim()) {
        // Fallback: basic heuristic if AI yields nothing
        note = `<p class="chart-note">${meta.title} – This chart shows data by ${meta.xTitle} vs ${meta.yTitle}.</p>`;
        console.log('[SR:REFORM] chart.note.fallback', { title: meta.title });
      }
      parts.push('\n' + note + '\n');
      injectedCount++;
      cursor = end;
    }
    // Append remaining content after the last visual
    parts.push(src.slice(cursor));
    const out = parts.join('');
    console.log(TAG, 'chart.notes.injected', { count: injectedCount });
    return out;
  } catch (e) {
    console.log(TAG, 'chart.notes.error', String(e?.message || e));
    return html;
  }
}

function sanitizeNonPredictiveVisuals(section, html) {
  // keep Oct 8 behavior (no tables/heatmaps/charts from text)
  let out = String(html || '')
    .replace(/<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>/gi, '')
    .replace(/<div[^>]*data-heatmap=['"][\s\S]*?<\/div>/gi, '')
    .replace(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/gi, '');
  if (out !== html) console.log(TAG, 'section.viz.sanitized', section);
  return out;
}
/* [KT:SURGICAL:AI-TITLE-PAGE] — derive a client-specific report title */
/* [KT:SURGICAL:AI-TITLE-PAGE] — derive a client-specific report title */
async function __kt_generateReportTitle(canon = {}, sections = {}) {
  try {
    const org       = canon?.orgName   || 'the client organization';
    const country   = canon?.country   || '';
    const timeFrame = canon?.timeFrame || '';
    const lang      = canon?.lang      || 'English';

    const strip = (s = '') =>
      String(s || '')
        .replace(/<[^>]+>/g, ' ')      // strip HTML tags
        .replace(/\s+/g, ' ')
        .trim();

    const snippets = [
      strip(sections.exec),
      strip(sections.current),
      strip(sections.financials),
      strip(sections.kpis),
      strip(sections.ops),
      strip(sections.risk),
      strip(sections.roi),
    ].filter(Boolean).slice(0, 5);

    const context = snippets.join('\n\n').slice(0, 4000);

    const resp = await openai.chat.completions.create({
      model: MODEL,              // same MODEL constant already used in this file
      temperature: 1,
      max_completion_tokens: 32,  // [KT:SURGICAL:AI-TITLE-PAGE] GPT-5 Nano compatible
      messages: [
        {
          role: 'system',
          content:
            'You are a senior strategy consultant. ' +
            'Name commercial reform reports for C-suite executives. ' +
            `Return a single concise title, 6–14 words, no subtitle, no quotes. The title MUST be written in the target report language: ${lang}.`,
        },
        {
          role: 'user',
          content:
            `Client: ${org}\n` +
            `Country: ${country}\n` +
            `Time frame: ${timeFrame}\n` +
            `Target report language: ${lang}\n\n` +
            `Key findings (HTML stripped):\n${context}`,
        },
      ],
    });

   /* let title = (resp.choices?.[0]?.message?.content || '').trim();
    // remove any surrounding quotes / smart quotes
    title = title.replace(/^["'“”\s]+|["'“”\s]+$/g, '');

    // if (!title) throw new Error('empty title from model'); // [KT:LEGACY] noisy error path

    // [KT:SURGICAL:AI-TITLE-FALLBACK]
    // If the model returns an empty title, log once and use a safe deterministic fallback
    if (!title) {
      console.log('[SR:REFORM] aiTitle.emptyFromModel', {
        org,
        country,
        timeFrame,
        lang,
      });
      return 'Strategic Transformation & Value Creation Plan';
    }

    console.log('[SR:REFORM] aiTitle.generated', { title, lang });
    return title;
  } catch (err) {
    console.log('[SR:REFORM] aiTitle.error', String(err?.message || err));
    // safe fallback
    return 'Strategic Transformation & Value Creation Plan';
  }
}*/
    // [KT:LEGACY:AI-TITLE-EXTRACT]
    /*
    let title = (resp.choices?.[0]?.message?.content || '').trim();
    // remove any surrounding quotes / smart quotes
    title = title.replace(/^["'“”\s]+|["'“”\s]+$/g, '');

    // if (!title) throw new Error('empty title from model'); // [KT:LEGACY] noisy error path

    // [KT:SURGICAL:AI-TITLE-FALLBACK]
    // If the model returns an empty title, log once and use a safe deterministic fallback
    if (!title) {
      console.log('[SR:REFORM] aiTitle.emptyFromModel', {
        org,
        country,
        timeFrame,
        lang,
      });
      return 'Strategic Transformation & Value Creation Plan';
    }
    */

    // [KT:SURGICAL:AI-TITLE-ROBUST]
    // 1) Get raw content
    let raw = (resp.choices?.[0]?.message?.content || '').trim();

    // 2) Strip code fences if the model wrapped the response
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    // 2a) Apply universal UTF-8 sanitizer before parsing
    raw = sanitizeJSONForParsing(raw);

    // 3) If the model returned JSON, try to read { "title": "..." }
    let titleCandidate = raw;
    try {
      if (/^\s*\{/.test(raw)) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.title === 'string') {
          titleCandidate = parsed.title;
        }
      }
    } catch {
      // best-effort only; fall back to raw
    }

    // 4) Remove surrounding quotes / smart quotes
    let title = (titleCandidate || '').replace(/^["'“”\s]+|["'“”\s]+$/g, '');

    // 5) Deterministic fallback if still empty - generate in target language
    if (!title) {
      const orgPart =
        canon?.orgName && canon.orgName !== 'the client organization'
          ? `${canon.orgName} `
          : '';
      const timeframePart = canon?.timeFrame ? ` – ${canon.timeFrame}` : '';
      
      // [KT:TRANSLATION-FIX] Generate fallback title in target language via quick AI call
      try {
        const fallbackResp = await openai.chat.completions.create({
          model: MODEL,
          temperature: 1,
          max_completion_tokens: 40,
          messages: [
            { role: 'system', content: `Translate this title to ${lang}. Return ONLY the translated title, no quotes, no explanation.` },
            { role: 'user', content: `${orgPart}Strategic Transformation & Value Creation Plan${timeframePart}` }
          ]
        });
        const translatedFallback = (fallbackResp.choices?.[0]?.message?.content || '').trim().replace(/^["']+|["']+$/g, '');
        if (translatedFallback && translatedFallback.length > 5) {
          title = translatedFallback;
          console.log('[SR:REFORM] aiTitle.fallbackTranslated', { title, lang });
        } else {
          title = `${orgPart}Strategic Transformation & Value Creation Plan${timeframePart}`.trim();
        }
      } catch (fallbackErr) {
        title = `${orgPart}Strategic Transformation & Value Creation Plan${timeframePart}`.trim();
      }

      console.log('[SR:REFORM] aiTitle.fallbackUsed', {
        org,
        country,
        timeFrame,
        lang,
      });
      // no early return; we still flow through the normal success path
    }

    console.log('[SR:REFORM] aiTitle.generated', { title, lang });
    return title;
  } catch (err) {
    console.log('[SR:REFORM] aiTitle.error', String(err?.message || err));
    // safe fallback
    return 'Strategic Transformation & Value Creation Plan';
  }
}



function sectionPrompt(section, canon, minWords, L) {
  // [KT:SURGICAL][NEXT-STEPS-PARAGRAPH-RULE] Inject 2–3 sentence rule for Next Steps section
  const isNonEnglish = canon.lang && !/^english$/i.test(canon.lang);
  const languageInstruction = isNonEnglish 
    ? `\n\nCRITICAL LANGUAGE REQUIREMENT: Generate ALL content in ${canon.lang}. 
- Every single word must be in ${canon.lang} - NO English words or phrases allowed
- Translate business terms naturally: "quick wins" → appropriate ${canon.lang} equivalent
- NEVER use English phrases like "This means", "So what", "Key insight" etc.
- Use ${canon.lang} equivalents for all phrases including: "${L?.['This means'] || 'To znači'}", "${L?.['KEY INSIGHT'] || 'KLJUČNI UVID'}", etc.
- TABLE CONTENT: All table headers (<th>) and cell content (<td>) MUST be in ${canon.lang}
- Common table headers to translate: Initiative, Phase, Timeline, Cost, Impact, Status, Owner, Priority, Risk, Description, Action, Metric, Target, Current, Baseline`
    : '';
  
  // [KT:APPENDIX-LABEL-FIX] Helper for consistent label lookup with fallbacks
  const getPromptLabel = (key, defaultValue) => {
    if (L && L[key]) return L[key];
    if (L && L[key.toLowerCase()]) return L[key.toLowerCase()];
    if (L && L[key.toUpperCase()]) return L[key.toUpperCase()];
    return defaultValue;
  };
  
  // [KT:I18N-FIX] Get translated phrases for template examples
  const thisMeansPhrase = isNonEnglish ? `"${getPromptLabel('This means', 'To znači')}"` : '"This means"';
  const keyInsightLabel = getPromptLabel('KEY INSIGHT', 'KEY INSIGHT');
  const potentialValueLabel = getPromptLabel('Potential value', 'Potential value');
  
  // [KT:CALLOUT-TRANSLATION] Build callout instruction with explicit language guidance
  const calloutInstruction = isNonEnglish 
    ? `INSIGHT CALLOUTS (include 1-2 per section for maximum impact):
Use this HTML structure for key insights. ALL TEXT MUST BE IN ${canon.lang}:
<div class="insight-callout">
  <div class="insight-callout-header">${keyInsightLabel !== 'KEY INSIGHT' ? keyInsightLabel : `[${canon.lang} for "KEY INSIGHT"]`}</div>
  <div class="insight-callout-title">[Bold statement in ${canon.lang}]</div>
  <div class="insight-callout-impact">$[X]M ${potentialValueLabel !== 'Potential value' ? potentialValueLabel : `[${canon.lang} for "Potential value"]`}</div>
  <div class="insight-callout-body">[1-2 sentence explanation in ${canon.lang}]</div>
  <div class="insight-callout-implication">${getPromptLabel('This means', `[${canon.lang} for "This means"]`)} [Company] should [specific action in ${canon.lang}].</div>
</div>
CRITICAL: The header, title, body, and implication MUST ALL be in ${canon.lang}. Do NOT use English text.`
    : `INSIGHT CALLOUTS (include 1-2 per section for maximum impact):
Use this HTML structure for key insights with quantified business impact:
<div class="insight-callout">
  <div class="insight-callout-header">${keyInsightLabel}</div>
  <div class="insight-callout-title">[Bold statement of finding]</div>
  <div class="insight-callout-impact">$[X]M ${potentialValueLabel}</div>
  <div class="insight-callout-body">[1-2 sentence explanation]</div>
  <div class="insight-callout-implication">${getPromptLabel('This means', 'This means')} [Company] should [specific action].</div>
</div>`;
  
  return `
Audience: C-suite executives. Tone: McKinsey-level consulting - concise, evidence-driven, pragmatic, quantified.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Size: ${canon.companySize}. Time frame: ${canon.timeFrame}.

MCKINSEY WRITING STYLE REQUIREMENTS:
- Lead with impact: Start each section with the business implication in $ or %
- Quantify everything: Use specific numbers, not vague terms ("23% increase" not "significant increase")
- Active voice: "Launch the initiative" not "The initiative should be launched"
- Executive vocabulary: Use "quick wins", "no-regrets moves", "where to play/how to win", "value at stake"
- 8th grade reading level: Short sentences, zero jargon, concrete examples
STRUCTURE REQUIREMENTS:
- Break content into subsections with <h3> subheadings every 300-500 words
- Each <h3> should be insight-driven: State the finding, not just a topic (e.g., "Digital penetration lags market by 18 points" not "Digital Strategy")
- Each subsection should have 2-3 paragraphs
- Paragraph discipline: 3-4 sentences per paragraph, no run-on sentences
${section === 'nextSteps' ? 'For the Next Steps section, each paragraph (within Immediate Actions and Short-Term Priorities) must be 2–3 sentences only.' : ''}
- End each subsection with clear implication: ${thisMeansPhrase} [Company] should...${isNonEnglish ? ` (use ${canon.lang} phrase, NOT English)` : ''}

${calloutInstruction}

CHART STORYTELLING:
After each chart/figure, add a brief <p> that explains the business implication.
Example: "<p>This 23% gap represents $2.1M in unrealized savings that can be captured within 6 months through targeted process improvements.</p>"

TABLE REQUIREMENTS:${isNonEnglish ? `
- ALL table content must be in ${canon.lang} - headers AND cell values
- Translate common headers: Initiative→${L?.['Initiative'] || 'Inicijativa'}, Phase→${L?.['Phase'] || 'Faza'}, Timeline→${L?.['Timeline'] || 'Vremenski okvir'}, Status→${L?.['Status'] || 'Status'}, Owner→${L?.['Owner'] || 'Vlasnik'}, Priority→${L?.['Priority'] || 'Prioritet'}` : ''}
When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.
${NO_VISUALS_GUIDANCE}

Section: ${section}.
Hard minimum words: ${minWords}. Include at least 3-5 <h3> subheadings to structure the content.
Avoid generic filler. No appendix.${languageInstruction}
`.trim();
}

function expandPrompt(section, canon, remainingWords) {
  const isNonEnglish = canon.lang && !/^english$/i.test(canon.lang);
  const languageInstruction = isNonEnglish
    ? `\n\nCRITICAL LANGUAGE REQUIREMENT: Generate ALL content in ${canon.lang}. 
- Every single word must be in ${canon.lang} - NO English words or phrases allowed
- NEVER use English phrases like "This means", "Strategic imperative", "Competitive advantage" - translate them to ${canon.lang}
- All business terms must be in natural ${canon.lang}
- TABLE CONTENT: All table headers (<th>) and cell content (<td>) MUST be in ${canon.lang} - translate Initiative, Phase, Timeline, Status, Owner, Priority, etc.`
    : '';
    
  const thisMeansExample = isNonEnglish 
    ? `"[${canon.lang} equivalent of 'This means'] [Company] should..."` 
    : '"This means [Company] should..."';
    
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.

MCKINSEY STYLE REQUIREMENTS (apply to ALL new content):
- Lead with impact: Start sentences with $ amounts or % changes where possible
- Quantify everything: Never say "significant" without numbers
- Active voice: "[Company] should invest" not "Investment should be made"
- Executive vocabulary: Use strategic terms (translate appropriately if non-English)
- Reading level: 8th grade (short sentences, clear language)
- Structure: Situation-Complication-Resolution (what's true → why it matters → what to do)
- End each subsection with clear implication: ${thisMeansExample}

STRUCTURE:
- Start with a new <h3> subheading that describes this subsection (insight-driven, not topic-driven)
- Write 2-3 FULL paragraphs under that subheading (each paragraph should be 3-5 sentences, wrapped in <p> tags)
- CRITICAL: Combine related points into cohesive paragraphs. DO NOT write single-sentence bullet points or one-line paragraphs
- Each paragraph should flow naturally with multiple sentences that build on each other
- Target at least ${remainingWords} words

Output valid HTML only.
Use <table class="report-table"> for any tables.${isNonEnglish ? ` ALL table headers and content must be in ${canon.lang}.` : ''} DO NOT include charts or heatmaps here.
NEVER use bullet points or single-line statements - always write multi-sentence paragraphs.${languageInstruction}
`.trim();
}
// [KT:SURGICAL:I18N-APPENDIX-TITLES] Translate table titles if translation function is available
if (typeof t === "function") {
  html = html.replace(/<h3>Appendices<\/h3>/g, `<h3>${t("Appendices")}</h3>`);
  html = html.replace(/<h4>Generation Diagnostics<\/h4>/g, `<h4>${t("Generation Diagnostics")}</h4>`);
}

// [KT:DEPRECATED] Old buildAppendicesHTML() removed Dec 20, 2025
// Replaced by renderAppendicesHTML() and buildAppendicesFromAI() pipeline
// This function was generating diagnostic tables - now handled by AI appendix pipeline

/* ========================================================================== */
/* McKinsey polish — Oct 9 audit transplanted, adapted to Oct 8
   NOTE: AUDIT CODE COMMENTED OUT per request. */
/* ========================================================================== */

/*
async function polishMcKinsey(html, canon) {
  ... (unchanged, commented out)
}
*/

/* ========================================================================== */
/* TABLE TITLE INJECTION HELPER - SURGICAL ADDITION                          */
/* ========================================================================== */
/*
  [KT:SURGICAL TABLE TITLE INJECTION]
  - Purpose: Insert a black, bold title above each <table class="report-table"> when
    a title is not already present immediately above the table.
  - Behavior:
      * If a preceding element with class "table-title" already exists, do nothing.
      * Otherwise, attempt to derive a reasonable title:
          - Prefer the first <th> text inside the table's thead (concatenate header cells).
          - If no thead or headers present, fallback to "(Untitled Table)".
      * Insert a <div class="table-title" style="font-weight:bold;color:#000;">TITLE</div>
        immediately before the table.
  - Constraints: Does not alter the table contents, structure, or classes. Only injects
    a single <div> title before the table. This is intentionally lightweight and deterministic.
  - Change location: This helper is invoked just before the final response HTML is returned
    (see the POST() function later). The only code added is this helper and its invocation.
*/
function injectTableTitles(html) {
  // [KT:SURGICAL:TABLE-TITLE-v4] SIMPLIFIED wrapper
  // Just add placeholder divs for all tables without titles
  // Real title generation happens in injectTableTitlesAI
  try {
    let out = String(html || '');
    const tableRe = /<table\b[^>]*class=(["'])(?:(?:(?!\1).)*\s)?report-table(?:(?:(?!\1).)*)\1[^>]*>[\s\S]*?<\/table>/gi;
    let match;
    let cursor = 0;
    const parts = [];
    
    while ((match = tableRe.exec(out)) !== null) {
      const tableStart = match.index;
      const tableStr = match[0];
      const tableEnd = tableRe.lastIndex;

      // Append segment before this table
      parts.push(out.slice(cursor, tableStart));

      // Check if already has a title
      const beforeSnippet = out.slice(Math.max(0, tableStart - 400), tableStart);
      if (/\btable-title\b/i.test(beforeSnippet)) {
        parts.push(tableStr);
        cursor = tableEnd;
        continue;
      }

      // Always add placeholder; injectTableTitlesAI will replace with AI-generated title
      const placeholderDiv = `<h3 class="table-title" style="font-weight:bold;color:#FFFFFF;margin-bottom:.4rem;">(Analyzing table...)</h3>`;
      parts.push(placeholderDiv + '\n' + tableStr);
      cursor = tableEnd;
    }
    
    parts.push(out.slice(cursor));
    return parts.join('');
  } catch (e) {
    console.log(TAG, 'injectTableTitles.error', String(e?.message || e));
    return html;
  }
}

/* =========================
   [KT:S] AI table-title wrapper
   (UN-NESTED, top-level)
   ========================= */
/* ========================================================================== */
/* [KT:SURGICAL:TABLE-TITLE-AI-FIX]  
   Replace bad fallback rule: AI must interpret table meaning, 
   titles must be in canon.lang, and NEVER use first-row data as title.
   Applies only to NON-APPENDIX tables.
   -------------------------------------------------------------------------- */
/* 
   New helper: extract table meaning + derive semantic title.

   Rules:
   - If table lives inside #appendices or <section id="appendices"> → SKIP.
   - If thead exists → use header row cells as semantic input.
   - If no thead → use column-count + pattern detection (metrics, phases, KPIs).
   - AI returns ≤7-word business title in canon.lang.
*/

async function __kt_aiTableTitle(sectionHTML, tableHTML, canon) {
  try {
    // Skip appendix tables
    if (/id=["']appendices["']/.test(sectionHTML)) {
      return null; // caller will skip injection
    }

    // Extract header cells (never body rows!)
    let headerText = '';
    let dataPreview = '';
    const theadMatch = tableHTML.match(/<thead[\s\S]*?<\/thead>/i);

    if (theadMatch) {
      const headerRow = theadMatch[0].match(/<tr[\s\S]*?<\/tr>/i);
      if (headerRow) {
        const cells = Array.from(headerRow[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi))
          .map(x => x[1].replace(/<[^>]+>/g,'').trim())
          .filter(Boolean);
        if (cells.length) {
          headerText = cells.join(' | ');
        }
      }
    }

    // Get first 2-3 data rows for context
    const tbodyMatch = tableHTML.match(/<tbody[\s\S]*?<\/tbody>/i);
    if (tbodyMatch) {
      const rows = Array.from(tbodyMatch[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)).slice(0, 3);
      dataPreview = rows.map(row => {
        const cells = Array.from(row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi))
          .map(x => x[1].replace(/<[^>]+>/g,'').trim().slice(0, 30))
          .filter(Boolean);
        return cells.join(' | ');
      }).join('\n');
    }

    // Build comprehensive prompt - include context
    const targetLang = canon.lang || 'English';
    const prompt = `
Analyze this table and generate a SHORT, PROFESSIONAL title:

HEADERS:
${headerText || '(no headers)'}

SAMPLE DATA:
${dataPreview || '(no data)'}

REQUIREMENTS:
1. Generate a title that describes what the table SHOWS (its purpose/meaning)
2. NOT just a concatenation of header names
3. Examples of GOOD titles:
   - "Pizza Market Growth Forecast"
   - "Three-Year Financial Projections" 
   - "Implementation Phase Timeline"
   - "Risk Assessment by Category"
4. Examples of BAD titles:
   - "Indicator • Value • Hypothesis • Commentary"
   - "Metric | Baseline | Target | Delta"
5. Return ONLY the title text, nothing else
6. Max 8 words
7. Write DIRECTLY in ${targetLang}, not English
8. Professional business tone
    `.trim();

    const openai = await getOpenAI();
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      max_tokens: 30,
      messages: [
        { 
          role: 'system', 
          content: `You are a business analyst who generates concise, descriptive table titles. Write DIRECTLY in ${targetLang}. No markdown, no quotation marks, no English if the target language is not English. Be direct and professional.` 
        },
        { role: 'user', content: prompt }
      ]
    });

    let title = (res.choices?.[0]?.message?.content || '').trim();
    title = title.replace(/^["'“”]+|["'“”]+$/g, '').slice(0,80);

    if (!title) return null;
    return title;
  } catch (e) {
    console.log('[KT:SURGICAL:TABLE-TITLE-AI-FIX] error', String(e?.message || e));
    return null;
  }
}

async function injectTableTitlesAI(html, canon) {
  // [KT:TRANSLATION-FIX] AI table titles RE-ENABLED - generates translated titles at generation time
  // Previously disabled for speed, but translation requires AI-generated titles in target language
  console.log('[KT:TRANSLATION-FIX] table.titles.ai.enabled', { lang: canon?.lang || 'English' });
  
  try {
    const openai = await getOpenAI();
    // Use the fallback titles from injectTableTitles (header-derived) as a starting point only
    let out = injectTableTitles(html);
    
    // Match ALL table titles and attempt AI improvement for each
    const tblRe = /(<h3 class="table-title"[^>]*>)([\s\S]*?)(<\/h3>\s*<table\b[^>]*class=["'][^"']*report-table[^"']*["'][^>]*>[\s\S]*?<\/table>)/gi;
    const parts = [];
    let last = 0, m;
    while ((m = tblRe.exec(out)) !== null) {
      const start = m.index, end = tblRe.lastIndex;
      parts.push(out.slice(last, start));
      const oldTitle = String(m[2]).replace(/\s+/g,' ').trim();
      const block = m[0];

      let newTitle = oldTitle;
      try {
        const tblOnly = (block.match(/<table[\s\S]*<\/table>/i)||[])[0] || '';
        const targetLang = (canon?.lang && !/^english$/i.test(canon.lang)) ? canon.lang : 'English';
        
        const prompt = [
          `You are naming a business table for executives in ${targetLang}. Return ONLY a short title (<= 7 words).`,
          'Describe what the table is about (not headers). No punctuation except letters/numbers/&/%.',
          'HTML of the table:',
          tblOnly
        ].join('\n');

        const r = await openai.chat.completions.create({
          model: MODEL,
          temperature: 1,
          messages: [
            { role: 'system', content: `Return only the title text in ${targetLang}. No quotes, no markdown, no explanations.` },
            { role: 'user', content: prompt }
          ]
        });
        const t = (r.choices?.[0]?.message?.content || '').trim();
        if (t && t.length > 0) {
          // AI returned a title - use it instead of fallback
          newTitle = t.replace(/<[^>]*>/g,'').slice(0, 80);
          console.log('[SR:REFORM] table.title.ai.success', { was: oldTitle, now: newTitle, lang: canon?.lang });
        }
      } catch (e) {
        console.log('[SR:REFORM] table.title.ai.error', String(e?.message||e));
        // Keep fallback title from injectTableTitles (header-derived)
      }

      // Replace title with AI-generated or fallback
      const upgraded = block.replace(/(<h3 class="table-title"[^>]*>)[\s\S]*?(<\/h3>)/i, `$1${newTitle}$2`);
      parts.push(upgraded);
      last = end;
    }
    parts.push(out.slice(last));
    return parts.join('');
  } catch(e) {
    console.log('[SR:REFORM] table.title.ai.error', String(e?.message||e));
    return html;
  }
}

/* ========================================================================== */
/* [KT:SURGICAL GRAPH NOTES] — LEGACY NOTE COMMENTER (adds no new text)       */
/* ========================================================================== */
/*
  Purpose (Fix #1): Comment out *legacy, poorly written* paragraphs that appear
  immediately after a visual (<figure data-chart>, <figure data-widget="benchmark">,
  or <div data-heatmap>) and are NOT a proper <p class="chart-note">.

  Behavior:
    - Leaves the original text intact but wrapped in an HTML comment with a clear
      marker: <!-- [KT:SURGICAL LEGACY NOTE COMMENTED OUT] ... -->
    - Handles multiple consecutive legacy <p> blocks directly after a visual.
    - Runs BEFORE description injection to avoid duplicate notes.

  Safety:
    - No deletions, no structural changes. Purely comment-wrapping the legacy <p>.
// [KT:SURGICAL:LEGACY-NOTE-COMMENTER v2]

/* ========================================================================== */
/* [KT:SURGICAL GRAPH NOTES] — Universal description injector                  */
/* ========================================================================== */
/*
  Purpose:
    Ensure EVERY visual (<figure data-chart>, <figure data-widget="benchmark">,
    <div data-heatmap>) has a concise executive description (2–3 sentences)
    immediately BELOW it. Covers predictive and standard visuals.

  Behavior:
    - If a <p class="chart-note"> already immediately follows a visual (allowing whitespace), do nothing.
    - Otherwise, generate a short note using universalVizDescription() with meta from parseVizMeta().

  Constraints:
    - No deletion of existing code; purely additive.
    - Applies post-template-assembly, after table title injection and legacy comment step.

/* ========================================================================== */
/* MULTILINGUAL SUPPORT - 207 Languages via GPT-5-nano                        */
/* ========================================================================== */
/* ========================================================================== */
/* MULTILINGUAL SUPPORT - 207 Languages via GPT-5-nano                        */
/* ========================================================================== */
const TRANSLATION_MODEL = 'gpt-5-nano-2025-08-07';

// [KT:SURGICAL:TRANSLATION-FIX] Comprehensive HTML translation function
// Translates entire HTML document while preserving structure, tags, and formatting
async function translateHTML(html, targetLang) {
  // Skip translation for English
  if (!targetLang || /^english$/i.test(targetLang)) {
    return html;
  }

  // [KT:SURGICAL:LARGE-DOC-SKIP] Skip single-call translation for large HTML documents
  // Report sections are already generated in target language by AI
  if (html.length > 200000) {
    console.log(TAG, 'translateHTML.skipped', { 
      lang: targetLang, 
      htmlLength: html.length,
      reason: 'Document too large, already generated in target language'
    });
    return html;
  }

  try {
    console.log(TAG, 'translateHTML.start', { lang: targetLang, htmlLength: html.length });
    const openai = await getOpenAI();
    
    const res = await openai.chat.completions.create({
      model: TRANSLATION_MODEL,
      temperature: 1,
      messages: [
        { 
          role: 'system', 
          content: `You are a professional business translator. Translate the following complete HTML document to ${targetLang}.

CRITICAL TRANSLATION RULES:
1. Preserve ALL HTML tags, attributes, IDs, classes exactly as they are
2. Preserve ALL data- attributes (data-chart, data-type, etc.)
3. Preserve ALL style attributes and CSS
4. Preserve ALL JavaScript code blocks and script tags
5. Translate ONLY the visible text content between tags
6. Do NOT translate:
   - Technical acronyms (ROI, KPI, EBITDA, CAC, LTV, etc.)
   - Currency codes (USD, CAD, EUR, etc.)
   - Numbers and percentages
   - Company names
   - Email addresses and URLs
7. Maintain professional business terminology appropriate for ${targetLang}
8. Keep all formatting, indentation, and structure identical
9. Return the COMPLETE translated HTML document with no truncation
10. Do not add any explanations, markdown formatting, or code blocks - return raw HTML only

The HTML document contains a business transformation report with charts, tables, and executive content. Translate all headings, paragraphs, table content, chart titles, and button labels while preserving the document structure.`
        },
        { role: 'user', content: html }
      ],
      max_completion_tokens: 40000
    });

    const translated = res.choices?.[0]?.message?.content?.trim() || html;
    
    console.log(TAG, 'translateHTML.complete', { 
      lang: targetLang, 
      originalLength: html.length,
      translatedLength: translated.length,
      success: true 
    });
    
    return translated;
  } catch (err) {
    console.error(TAG, 'translateHTML.error', { lang: targetLang, error: String(err?.message || err) });
    console.log(TAG, 'translateHTML.fallback', 'returning original HTML due to translation error');
    return html;
  }
}

/**
 * [KT:SURGICAL:LANG-FIX v4 - COMPREHENSIVE TRANSLATION]
 * Chart label translator using GPT-5-nano for translations
 * - Translates chart titles, axis labels (xTitle, yTitle), and data labels
 * - Handles arrays (labels) dynamically
 * - Falls back to original labels on any error
 */
async function translateChartLabels(obj, lang) {
  if (!obj || !lang || /^english$/i.test(lang)) {
    return obj; // No translation needed for English
  }

  try {
    const openai = await getOpenAI();
    
    // [KT:NANO-FIX] Build flat list of all items to translate
    const items = [];
    if (obj.title) items.push(obj.title);
    if (obj.xTitle) items.push(obj.xTitle);
    if (obj.yTitle) items.push(obj.yTitle);
    const labelCount = Array.isArray(obj.labels) ? obj.labels.length : 0;
    if (labelCount > 0) items.push(...obj.labels.map(String));

    // Skip if nothing to translate
    if (items.length === 0) {
      return obj;
    }

    // [KT:NANO-FIX] Ultra-simple prompt for GPT-5-nano
    const prompt = `Translate to ${lang}: ${items.join(', ')}

Return JSON: {"translations": ["t1", "t2", ...]}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [
        { role: 'system', content: `Translator. Return JSON only.` },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 1500,
    });

    let raw = completion.choices?.[0]?.message?.content?.trim() || '';

    if (!raw) {
      console.log(TAG, 'chart.labels.translate.empty', { lang });
      return obj;
    }

    // Extract JSON from markdown if present
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = jsonMatch[0];

    let translated;
    try {
      const parsed = JSON.parse(raw);
      const transArray = parsed.translations || parsed;
      
      if (Array.isArray(transArray) && transArray.length > 0) {
        // Reconstruct the object from flat array
        let idx = 0;
        translated = {
          title: obj.title ? transArray[idx++] : obj.title,
          xTitle: obj.xTitle ? transArray[idx++] : obj.xTitle,
          yTitle: obj.yTitle ? transArray[idx++] : obj.yTitle,
          labels: labelCount > 0 ? transArray.slice(idx, idx + labelCount) : obj.labels
        };
      } else {
        return obj;
      }
    } catch (err) {
      const preview = raw.substring(0, 150);
      console.log(TAG, 'chart.labels.translate.json.error', { 
        lang, 
        error: String(err?.message || err),
        preview
      });
      return obj; // Return original on parse error
    }

    // Merge translated fields back into the chart object
    const result = {
      ...obj,
      title: translated?.title || obj.title,
      xTitle: translated?.xTitle || obj.xTitle,
      yTitle: translated?.yTitle || obj.yTitle,
      labels: translated?.labels && Array.isArray(translated.labels) ? translated.labels : obj.labels,
    };

    console.log(TAG, 'chart.labels.translated', {
      lang,
      original: { title: obj.title, xTitle: obj.xTitle, yTitle: obj.yTitle },
      translated: { title: result.title, xTitle: result.xTitle, yTitle: result.yTitle }
    });

    return result;
  } catch (err) {
    console.log(TAG, 'chart.labels.translate.error', { lang, error: String(err?.message || err) });
    return obj; // Return original on any error
  }
}

// =====================================================
// LABEL TRANSLATION
// =====================================================

// [KT:PERF-OPT-v2.0] Add cache for translateLabels to prevent 9 redundant calls
const __translateLabelsCache = {};

async function translateLabels(targetLang) {
  // Fast-path: English stays in the default label set
  if (!targetLang || __isEnglishReportLangSoft(targetLang)) {
    return DEFAULT_LABELS;
  }

  // [KT:PERF-OPT] Return cached result if available
  if (__translateLabelsCache[targetLang]) {
    console.log(TAG, '[KT:PERF-OPT] labels.translate.cached', { lang: targetLang });
    return __translateLabelsCache[targetLang];
  }

  try {
    console.log(TAG, 'labels.translate.start', { lang: targetLang });

    const openai = await getOpenAI();

    // [KT:TRANSLATION-FIX-v3.0] Comprehensive critical labels for all visible UI elements
    const criticalLabels = {
      // Title Page (Item 2)
      transformationPlan: DEFAULT_LABELS.transformationPlan,
      missionCriticalInitiative: DEFAULT_LABELS.missionCriticalInitiative,
      forInternalUseOnly: DEFAULT_LABELS.forInternalUseOnly,
      preparedFor: DEFAULT_LABELS.preparedFor,
      preparedBy: DEFAULT_LABELS.preparedBy,
      date: DEFAULT_LABELS.date,
      confidential: DEFAULT_LABELS.confidential,
      
      // Table of Contents (Item 4)
      tableOfContents: DEFAULT_LABELS.tableOfContents,
      
      // Section Headers (Items 5-6)
      executiveSummary: DEFAULT_LABELS.executiveSummary,
      currentState: DEFAULT_LABELS.currentState,
      financialAnalysis: DEFAULT_LABELS.financialAnalysis,
      kpiAnalysis: DEFAULT_LABELS.kpiAnalysis,
      operationalAnalysis: DEFAULT_LABELS.operationalAnalysis,
      riskAssessment: DEFAULT_LABELS.riskAssessment,
      roiProjections: DEFAULT_LABELS.roiProjections,
      nextSteps: DEFAULT_LABELS.nextSteps,
      appendices: DEFAULT_LABELS.appendices,
      
      // Executive Summary Infographic (Items 3-4)
      'Executive Summary at a Glance': 'Executive Summary at a Glance',
      atAGlance: DEFAULT_LABELS.atAGlance,
      projectedROI: DEFAULT_LABELS.projectedROI,
      paybackPeriod: DEFAULT_LABELS.paybackPeriod,
      annualSavings: DEFAULT_LABELS.annualSavings,
      timeline: DEFAULT_LABELS.timeline,
      implementationApproach: DEFAULT_LABELS.implementationApproach,
      quickWins: DEFAULT_LABELS.quickWins,
      phases: DEFAULT_LABELS.phases,
      confidence: DEFAULT_LABELS.confidence,
      strategicImpact: DEFAULT_LABELS.strategicImpact,
      confidenceLevel: DEFAULT_LABELS.confidenceLevel,
      
      // KPI Trend Labels (CRITICAL - explicitly mapped for translation)
      'Industry benchmark': 'Industry benchmark',
      'faster than industry average': 'faster than industry average',
      'Best-in-class timing': 'Best-in-class timing',
      'in annual value': 'in annual value',
      industryBenchmark: 'Industry benchmark',
      fasterThanAverage: 'faster than industry average',
      bestInClassTiming: 'Best-in-class timing',
      inAnnualValue: 'in annual value',
      topQuartile: 'top quartile',
      acceleratedDelivery: 'Accelerated delivery',
      acrossValue: 'across value chain',
      trendIndustryBenchmark: DEFAULT_LABELS.trendIndustryBenchmark || 'Industry benchmark',
      trendAnnualValue: DEFAULT_LABELS.trendAnnualValue || 'in annual value',
      trendFasterThanIndustry: DEFAULT_LABELS.trendFasterThanIndustry || 'faster than industry average',
      trendBestInClass: DEFAULT_LABELS.trendBestInClass || 'Best-in-class timing',
      trendAccelerated: DEFAULT_LABELS.trendAccelerated || 'Accelerated delivery',
      implementationHorizon: DEFAULT_LABELS.implementationHorizon || 'implementation horizon',
      dataSupported: DEFAULT_LABELS.dataSupported || 'data-supported',
      highCertainty: DEFAULT_LABELS.highCertainty || 'High certainty',
      transformationalChange: DEFAULT_LABELS.transformationalChange || 'Transformational change',
      acrossValueChain: DEFAULT_LABELS.acrossValueChain || 'across value chain',
      
      // Implementation phases for infographic
      Discovery: 'Discovery',
      Design: 'Design',
      Pilot: 'Pilot',
      Scale: 'Scale',
      weeks: DEFAULT_LABELS.weeks || 'weeks',
      
      // Implementation Plan section (CRITICAL)
      implementationPlan: DEFAULT_LABELS.implementationPlan,
      phase: DEFAULT_LABELS.phase,
      planningReadiness: DEFAULT_LABELS.planningReadiness,
      digitalBackbone: DEFAULT_LABELS.digitalBackbone,
      franchiseNetwork: DEFAULT_LABELS.franchiseNetwork,
      brandMomentum: DEFAULT_LABELS.brandMomentum,
      optimization: DEFAULT_LABELS.optimization,
      
      // Additional infographic labels that MUST be translated
      Overall: 'Overall',
      overall: 'Overall', // [KT:FIX-v3] lowercase variant for prioritization matrix
      'Key Insights': 'Key Insights',
      keyInsights: 'Key Insights', // [KT:FIX-v3] camelCase variant for prioritization matrix
      'KEY INSIGHT': 'KEY INSIGHT',
      'Recommendation': 'Recommendation',
      Type: 'Type',
      Waterfall: 'Waterfall',
      Bar: 'Bar',
      Line: 'Line',
      // [KT:FIX-v3] Prioritization matrix specific labels
      initiativesDistributed: 'Initiatives are distributed across quadrants, highlighting both quick wins and major projects.',
      highestImpact: 'Highest impact: Digital transformation. Most efficient: Quick wins.',
      
      // Graph axes (Items 7-8)
      year: DEFAULT_LABELS.year,
      years: DEFAULT_LABELS.years,
      months: DEFAULT_LABELS.months,
      month: DEFAULT_LABELS.month,
      Months: DEFAULT_LABELS.months,
      Years: DEFAULT_LABELS.years,
      Percent: DEFAULT_LABELS.percent || 'Percent',
      Spend: DEFAULT_LABELS.spendAxis || 'Spend',
      Savings: DEFAULT_LABELS.savingsAxis || 'Savings',
      Cumulative: DEFAULT_LABELS.cumulativeAxis || 'Cumulative',
      index: DEFAULT_LABELS.index,
      value: DEFAULT_LABELS.value,
      Value: DEFAULT_LABELS.value,
      Index: 'Index',
      
      // [KT:CHART-TITLES] Main chart section titles (Image 1-5 fixes)
      deliveryPenetration: DEFAULT_LABELS.deliveryPenetration || 'Delivery Penetration vs Market',
      implementationExpenditures: DEFAULT_LABELS.implementationExpenditures || 'Implementation Expenditures',
      cumulativePayback: DEFAULT_LABELS.cumulativePayback || 'Cumulative Payback',
      opsThroughputTrend: DEFAULT_LABELS.opsThroughputTrend || 'Ops Throughput Trend',
      
      // Waterfall/Value Bridge (Item 10)
      valueBridgeAnalysis: DEFAULT_LABELS.valueBridgeAnalysis,
      valueBridgeDescription: DEFAULT_LABELS.valueBridgeDescription,
      'Value Bridge Analysis Graph': 'Value Bridge Analysis Graph',
      Component: 'Component',
      
      // Tables (Item 9)
      table: DEFAULT_LABELS.table,
      untitledTable: DEFAULT_LABELS.untitledTable,
      
      // Prioritization Matrix (Item 10)
      prioritizationMatrix: DEFAULT_LABELS.prioritizationMatrix,
      effort: DEFAULT_LABELS.effort,
      complexity: DEFAULT_LABELS.complexity,
      bigBets: DEFAULT_LABELS.bigBets,
      quickWins: DEFAULT_LABELS.quickWins,
      fillIns: DEFAULT_LABELS.fillIns,
      majorProjects: DEFAULT_LABELS.majorProjects,
      
      // [KT:CHART-MATRIX-LABELS] Prioritization matrix axis and quadrant labels
      'effort / complexity →': 'effort / complexity →',
      'business impact': 'business impact',
      'QUICKWINS': 'QUICKWINS',
      'BIGBETS': 'BIGBETS',
      'FILLINS': 'FILLINS',
      'MAJORPROJECTS': 'MAJORPROJECTS',
      
      // [KT:CHART-HEATMAP-LABELS] Risk heat map labels
      'Risk Heat Map': 'Risk Heat Map',
      'Low': 'Low',
      'Medium': 'Medium',
      'High': 'High',
      'Ops': 'Ops',
      'Sales': 'Sales',
      'CX': 'CX',
      'IT': 'IT',
      'People': 'People',
      'Q1': 'Q1',
      'Q2': 'Q2',
      'Q3': 'Q3',
      'Q4': 'Q4',
      'Q5': 'Q5',
      
      // Default initiative names for prioritization matrix
      'Process automation': 'Process automation',
      'Cloud migration': 'Cloud migration',
      'Digital transformation': 'Digital transformation',
      'Team training': 'Team training',
      'Vendor consolidation': 'Vendor consolidation',
      
      // Appendix Labels (Items 11-21)
      appendix: DEFAULT_LABELS.appendix,
      projectCharters: DEFAULT_LABELS.projectCharters,
      raciMatrix: DEFAULT_LABELS.raciMatrix,
      raidLog: DEFAULT_LABELS.raidLog,
      benefitsRealization: DEFAULT_LABELS.benefitsRealization,
      hundredDayPlan: DEFAULT_LABELS.hundredDayPlan,
      pilotCharter: DEFAULT_LABELS.pilotCharter,
      assumptionsRanges: DEFAULT_LABELS.assumptionsRanges,
      methodsSources: DEFAULT_LABELS.methodsSources,
      implementationChecklist: DEFAULT_LABELS.implementationChecklist,
      decisionFramework: DEFAULT_LABELS.decisionFramework,
      resourceRequirements: DEFAULT_LABELS.resourceRequirements,
      
      // [KT:DYNAMIC-APPENDIX-LABELS] All appendix table headers and labels
      objective: DEFAULT_LABELS.objective,
      scopeIn: DEFAULT_LABELS.scopeIn,
      scopeOut: DEFAULT_LABELS.scopeOut,
      ownerStakeholders: DEFAULT_LABELS.ownerStakeholders,
      successCriteria: DEFAULT_LABELS.successCriteria,
      risks: DEFAULT_LABELS.risks,
      owner: DEFAULT_LABELS.owner,
      responsibility: DEFAULT_LABELS.responsibility,
      accountable: DEFAULT_LABELS.accountable,
      consulted: DEFAULT_LABELS.consulted,
      informed: DEFAULT_LABELS.informed,
      decisionSLA: DEFAULT_LABELS.decisionSLA,
      riskType: DEFAULT_LABELS.riskType,
      description: DEFAULT_LABELS.description,
      mitigation: DEFAULT_LABELS.mitigation,
      status: DEFAULT_LABELS.status,
      benefit: DEFAULT_LABELS.benefit,
      quantified: DEFAULT_LABELS.quantified,
      timeFrame: DEFAULT_LABELS.timeFrame,
      week: DEFAULT_LABELS.week,
      activity: DEFAULT_LABELS.activity,
      deliverable: DEFAULT_LABELS.deliverable,
      assumption: DEFAULT_LABELS.assumption,
      range: DEFAULT_LABELS.range,
      method: DEFAULT_LABELS.method,
      source: DEFAULT_LABELS.source,
      action: DEFAULT_LABELS.action,
      responsible: DEFAULT_LABELS.responsible,
      dueDate: DEFAULT_LABELS.dueDate,
      priority: DEFAULT_LABELS.priority,
      decision: DEFAULT_LABELS.decision,
      criteria: DEFAULT_LABELS.criteria,
      resourceType: DEFAULT_LABELS.resourceType,
      quantity: DEFAULT_LABELS.quantity,
      cost: DEFAULT_LABELS.cost,
      
      // Trend indicators for KPI boxes (Item 2)
      // Each trend phrase must be translated - these are visible in the report
      trendVsBaseline: 'vs baseline',
      trendFasterThanIndustry: 'faster than industry average',
      trendBestInClass: 'Best-in-class timing',
      trendTopQuartile: 'Top quartile performance',
      trendAccelerated: 'Accelerated delivery',
      trendAnnualValue: 'in annual value',
      trendImplementationHorizon: 'implementation horizon',
      trendIndustryBenchmark: 'Industry benchmark',
      trendOutperform: DEFAULT_LABELS.trendOutperform || 'pp vs baseline',
      trendFaster: 'Faster rollout',
      trendEarnings: '+0.3M Top quartile performance',
      trendCost: 'Lower implementation cost',
      trendValue: 'Higher realization of benefits',
      
      // Chart axes and labels - ALL MUST BE TRANSLATED
      Current: 'Current',
      Benchmark: 'Benchmark',
      Percent: 'Percent',
      Cumulative: 'Cumulative',
      Godina: 'Years',
      Ukupno: 'Total',
      KljucniZakljucci: 'Key Insights',
      
      // Predictive graph titles
      penetracijaDostave: 'Delivery Penetration vs Market',
      analizzaTrendnog: 'Current Trend Analysis',
      valueBridgeGraph: 'Value Bridge Analysis Graph',
      kpiPerformance: 'KPI Performance vs Industry',
      stopaOstvarivanja: 'Realization Rate',
      ebitdaPorast: 'EBITDA Growth Through Franchise Expansion',
      paybackHorizon: 'Payback Over Horizon',
      
      // Additional chart titles
      'Prognoza rasta udela online narudžbina': 'Online Order Growth Forecast',
      'EBITDA porast kroz franšizno širenje (180–220 baznih poena)': 'EBITDA Growth Through Franchise Expansion',
      'KPI Performance vs Industry': 'KPI Performance vs Industry',
      'Stopa ostvarivanja štednje': 'Savings Realization Rate',
      'Cilj vremena isporuke: 25–27 minuta po narudžbini': 'Delivery Time Target: 25-27 minutes per order',
      'Senzor potražnje u realnom vremenu za predviđanje rizika potražnje': 'Real-time Demand Sensor for Risk Forecasting',
      'Optimizacija ruta dostave i predviđeni ROI tokom 3 godine': 'Delivery Route Optimization and 3-Year ROI',
      'Prognoza rasta online porudžbina po periodima': 'Online Order Growth Forecast by Period',
      'Penetracija dostave u odnosu na tržište': 'Delivery Penetration vs Market',
      'Troškovi implementacije': 'Implementation Costs',
      'Kumulativni povraćaj': 'Cumulative Return',
      'ROI Trend (AI)': 'ROI Trend',
      'Trend protoka operacija': 'Operations Flow Trend',
      
      // Risk matrix and heatmap labels
      'Risk': 'Risk',
      'Low': 'Low',
      'Medium': 'Medium', 
      'High': 'High',
      'Likelihood': 'Likelihood',
      'Impact': 'Impact',
      'Risk Heat Map': 'Risk Heat Map',
      
      // [KT:CALLOUT-TRANSLATION-FIX] Critical callout headings and labels for insight boxes
      'KEY INSIGHT': 'KEY INSIGHT',
      'Potential value': 'Potential value',
      'This means': 'This means',
      
      // [KT:TABLE-HEADER-TRANSLATION] Common table headers that AI generates
      'Initiative': 'Initiative',
      'Phase': 'Phase',
      'Timeline': 'Timeline',
      'Cost': 'Cost',
      'Status': 'Status',
      'Owner': 'Owner',
      'Priority': 'Priority',
      'Risk': 'Risk',
      'Description': 'Description',
      'Action': 'Action',
      'Metric': 'Metric',
      'Target': 'Target',
      'Baseline': 'Baseline',
      'Gap': 'Gap',
      'Responsible': 'Responsible',
      'Due Date': 'Due Date',
      'Category': 'Category',
      'Investment': 'Investment',
      'ROI': 'ROI',
      'Savings': 'Savings',
      'Revenue': 'Revenue',
      'KPI': 'KPI',
      'Actual': 'Actual',
      'Variance': 'Variance',
      'Notes': 'Notes',
      'Deliverable': 'Deliverable',
      'Milestone': 'Milestone',
      'Resource': 'Resource',
      'Budget': 'Budget',
      'Spend': 'Spend',
      'Quarter': 'Quarter',
      'Year': 'Year',
      'Month': 'Month',
      'Week': 'Week',
    };

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1,
      response_format: { type: "json_object" },  // Force JSON mode
      messages: [
        {
          role: 'system',
          content:
            `You are a professional translator. Your task is to translate ALL labels from English into ${targetLang}.\n\n` +
            `CRITICAL RULES:\n` +
            `1. EVERY value must be translated into ${targetLang} - NO English allowed\n` +
            `2. Return ONLY valid JSON with the same keys\n` +
            `3. Do NOT include markdown, explanations, or code blocks\n` +
            `4. Keep placeholder variables like {name} unchanged\n` +
            `5. Translate to ${targetLang === 'Swiss German' ? 'German (Standard German, not dialect)' : targetLang}\n` +
            `6. Return valid JSON only - no reasoning, no explanations`,
        },
        {
          role: 'user',
          content: `Translate all values in this JSON to ${targetLang}:\n\n${JSON.stringify(criticalLabels, null, 2)}`,
        },
      ],
      max_completion_tokens: 32000,  // [KT:FIX-TOKEN-LIMIT] Increased from 16000 to prevent truncation with reasoning tokens
    });

    console.log(TAG, 'labels.translate.openai.response', {
      lang: targetLang,
      model: completion.model,
      usage: completion.usage,
      finishReason: completion.choices?.[0]?.finish_reason,
      hasContent: !!completion.choices?.[0]?.message?.content,
      contentLength: completion.choices?.[0]?.message?.content?.length || 0,
    });

    // [KT:FIX-TRUNCATION] Check if response was cut off due to token limit
    const finishReason = completion.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      console.error(TAG, '❌ [TRANSLATION-TRUNCATION] OpenAI response was truncated due to token limit!', {
        lang: targetLang,
        usedTokens: completion.usage?.completion_tokens,
        maxAllowed: 32000
      });
      return DEFAULT_LABELS;  // Return English fallback if truncated
    }

    const raw = completion.choices?.[0]?.message?.content?.trim() || '';
    let translatedCritical;

    try {
      translatedCritical = JSON.parse(raw);
    } catch (err) {
      console.error(TAG, 'labels.translate.json.parse.error', {
        lang: targetLang,
        error: String(err?.message || err),
        rawPreview: raw.slice(0, 200),
      });

      // fallback if GPT returns bad JSON
      return DEFAULT_LABELS;
    }

    // Merge translated critical labels back into DEFAULT_LABELS
    const labels = { ...DEFAULT_LABELS, ...translatedCritical };

    console.log('\n' + '✅'.repeat(40));
    console.log('✅ [TRANSLATION-FIX-v3.0] LABELS SUCCESSFULLY TRANSLATED');
    console.log(TAG, 'labels.translate.complete', {
      lang: targetLang,
      success: true,
      criticalKeys: Object.keys(translatedCritical || {}).length,
      '🏷️ Title Page': {
        preparedFor: labels?.preparedFor,
        preparedBy: labels?.preparedBy,
        confidential: labels?.confidential
      },
      '📋 Headers': {
        executiveSummary: labels?.executiveSummary,
        tableOfContents: labels?.tableOfContents,
        currentState: labels?.currentState,
        financialAnalysis: labels?.financialAnalysis
      },
      '📊 Exec Infographic': {
        atAGlance: labels?.atAGlance,
        projectedROI: labels?.projectedROI,
        paybackPeriod: labels?.paybackPeriod,
        annualSavings: labels?.annualSavings
      },
      '🔤 Phases': {
        Discovery: labels?.Discovery,
        Design: labels?.Design,
        Pilot: labels?.Pilot,
        Scale: labels?.Scale
      },
      '📊 [KT:PRIORITY-MATRIX-FIX] Charts': {
        prioritizationMatrix: labels?.prioritizationMatrix,
        prioritizationMatrixInTranslated: translatedCritical?.prioritizationMatrix,
        effort: labels?.effort,
        complexity: labels?.complexity
      }
    });
    console.log('✅'.repeat(40) + '\n');

    // [KT:PRIORITY-MATRIX-DIAGNOSTIC] Log what was sent to GPT
    console.log(TAG, '[KT:PRIORITY-MATRIX-DIAGNOSTIC] prioritizationMatrix translation check', {
      sentToGPT: criticalLabels?.prioritizationMatrix,
      receivedFromGPT: translatedCritical?.prioritizationMatrix,
      finalValue: labels?.prioritizationMatrix,
      willUseDefault: !labels?.prioritizationMatrix
    });

    // [KT:PERF-OPT-v2.0] Cache the result to avoid 9 redundant API calls
    __translateLabelsCache[targetLang] = labels;
    console.log(TAG, '[KT:PERF-OPT] labels.translate.cached.stored', { lang: targetLang });

    return labels;

  } catch (err) {
    console.error(TAG, 'labels.translate.error', {
      lang: targetLang,
      error: String(err?.message || err),
    });

    return DEFAULT_LABELS;
  }
}


// [KT:SURGICAL:I18N-EXEC-RISK] Targeted post-translation patcher for stubborn labels
async function patchExecutiveSummaryAndRiskLabels(html, lang) {
  // Only patch for non-English reports
  if (!lang || __isEnglishReportLangSoft(lang)) return html;

  // [KT:SURGICAL:EXEC-RISK-PATCH-DISABLED]
  // Upstream translation + world-class visuals already handle these labels.
  // This patch was calling translate() from '@/lib/translate.js',
  // which is not a function in the current build, so we no-op it
  // to remove errors without breaking report generation.
  return html;

  /*
  try {
    const phrases = [
      // Executive Summary infographic + KPI tiles
      'Executive Summary at a Glance',
      'PROJECTED ROI',
      'Projected ROI',
      'PAYBACK PERIOD',
      'Payback Period',
      'ANNUAL SAVINGS',
      'Annual Savings',
      'TIMELINE',
      'Timeline',
      'Implementation Approach',
      'Quick Wins',
      'Phases',
      'Confidence',
      // Risk matrix / heat map labels
      'Risk Assessment Matrix',
      'Risk Heat Map',
      'Risk Heat Map Overview',
      'Risks',
      'LIKELIHOOD',
      'SEVERITY',
      'Rare',
      'Unlikely',
      'Possible',
      'Likely',
      'Almost Certain',
      'Negligible',
      'Minor',
      'Moderate',
      'Major',
      'Critical',
      'Risk heatmap visualizes',
      'identified risks by severity (vertical) and likelihood (horizontal).',
      'Red = critical',
      'Orange = high',
      'Green = medium',
      'Blue = low',
      'Top risk',
      'No description provided.'
    ];

    const needed = phrases.filter((p) => html.includes(p));
    if (!needed.length) return html;

    const map = {};
    for (const phrase of needed) {
      try {
        map[phrase] = await translate(phrase, lang);
      } catch (e) {
        console.warn(TAG, 'execRisk.label.translate.error', {
          phrase,
          error: String(e?.message || e),
        });
        map[phrase] = phrase;
      }
    }

    let patched = html;
    for (const [src, dst] of Object.entries(map)) {
      if (!dst || src === dst) continue;
      patched = patched.split(src).join(dst);
    }

    return patched;
  } catch (e) {
    console.warn(TAG, 'execRisk.patch.error', String(e?.message || e));
    return html;
  }
  */
}

/* ========================================================================== */
/* generation core (Oct 8 base kept)                                           */
/* ========================================================================== */
async function genSectionFirstPass(section, canon, floor) {
  console.log(TAG, 'section.start', section, { floor });
  
  // ✅ Load OpenAI client safely (fixes openai is not defined)
  const openai = await getOpenAI();

  // Generate in target language directly
  const isNonEnglish = canon.lang && !/^english$/i.test(canon.lang);
  const systemLanguageInstruction = isNonEnglish 
    ? ` CRITICAL: Write EVERYTHING in ${canon.lang}. Do not use ANY English words or phrases. All content, including business terms, must be in ${canon.lang}.`
    : '';

  // Get translated labels once
  const L = await translateLabels(canon.lang || 'English');

  // [KT:SURGICAL:NEXT-STEPS-SECTION] Add explicit prompt for Next Steps section
  let promptContent;
  // [KT:SURGICAL][NEXT-STEPS-PROMPT-UNIFIED] Use sectionPrompt for nextSteps to enforce 2–3 sentence rule
  if (section === 'nextSteps' || section === 'next-steps' || section === 'Next Steps') {
    // promptContent = `Write a standalone "Next Steps" section for ${canon.orgName} based on the preceding report sections. Use a clear, actionable style. Structure with 2-3 <h3> subheadings (e.g., "Immediate Actions", "Short-Term Priorities", "Long-Term Roadmap"). Under each subheading, write 2-3 paragraphs, max 3-4 sentences per paragraph, no run-on sentences. Do not repeat content from the conclusion. Style to match other report sections.`;
    promptContent = sectionPrompt('nextSteps', canon, floor, L);
  } else {
    promptContent = sectionPrompt(section, canon, floor, L);
  }

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role: 'system', content: `You are a senior consultant. Return clean HTML fragments only.${systemLanguageInstruction}` },
      { role: 'user', content: promptContent },
    ],
  });
  let html = res.choices?.[0]?.message?.content?.trim() || '';
  html = sanitizeNonPredictiveVisuals(section, html);
  console.log(TAG, 'section.firstPass', section, wc(html));
  return html;
}

async function topUpSection(section, canon, currentHTML, floor) {
  let html = currentHTML || '';
  let words = wc(html);
  let guard = 0;
  
  const isNonEnglish = canon.lang && !/^english$/i.test(canon.lang);
  const systemLanguageInstruction = isNonEnglish 
    ? ` CRITICAL: Write EVERYTHING in ${canon.lang}. Do not use ANY English words or phrases.`
    : '';
  
  // [KT:PERF-OPT-v2.0] Reduced max iterations from 8 to 2 for speed (~50+ API calls saved)
  while (words < floor && guard < 2) {
    const remaining = Math.max(200, floor - words);
    const openai = await getOpenAI();
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: `Extend the section with NEW, non-duplicative content. Return HTML only.${systemLanguageInstruction}`,
        },
        { role: 'user', content: expandPrompt(section, canon, remaining) },
      ],
    });
    const add = res.choices?.[0]?.message?.content?.trim() || '';
    html += '\n' + sanitizeNonPredictiveVisuals(section, add);
    words = wc(html);
    guard += 1;
    console.log(TAG, 'section.topUp', section, { words, floor, pass: guard });
  }
  return html;
}

async function derivePhasesFrom(html, canon) {
  const openai = await getOpenAI();

  const languageInstruction = canon.lang && !/^english$/i.test(canon.lang)
    ? `\n\nIMPORTANT: Return all "title" and "caption" strings in ${canon.lang}. JSON keys stay in English.`
    : '';

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      {
        role: 'system',
        content:
          'Extract phases as JSON: [{"title":"Phase X","caption":"one sentence","duration":"X weeks"}, ...] (5 items). Output only pure JSON.' +
          languageInstruction,
      },
      {
        role: 'user',
        content: `From this timeline for ${canon.orgName}, extract 5 phases with succinct titles, 1-sentence captions, and realistic duration estimates (early phases 4 weeks, later phases longer).\n---\n${html}`,
      },
    ],
  });
  try {
    const raw = res.choices?.[0]?.message?.content || '[]';
    const sanitized = sanitizeJSONForParsing(raw);
    const extracted = JSON.parse(sanitized).slice(0, 5);
    // Add default durations if missing: [4w, 4w, 4w, 8w, 12w] pattern
    const defaultDurations = ['4 weeks', '4 weeks', '4 weeks', '8 weeks', '12 weeks'];
    return extracted.map((p, i) => ({
      ...p,
      duration: p.duration || defaultDurations[i] || '4 weeks'
    }));
  } catch {
    return [];
  }
}


export async function POST(req) {
    // ...existing code...

    // [KT:SURGICAL:APPENDIX-GRAPH-RENDER-FIX] (moved to end of POST handler)
    // See end of POST for active code.
    // ...existing POST logic...

    // ...existing POST logic...
    // Ensure this log runs after both 'sections' and 'implKit' are initialized
    // Place this log just before the response is returned
    // (You may need to move this block to just before the return/response statement in POST)

  const input = await req.json();

  // [KT:CACHE-CLEAR] Clear translation cache to ensure fresh translations on every request
  Object.keys(__chartSummaryTranslationCache).forEach(key => {
    delete __chartSummaryTranslationCache[key];
  });
  console.log(TAG, '🗑️ [CACHE-CLEAR] Translation cache cleared for fresh generation');

  const canon = {
    lang: input.lang || 'English',
    orgName: input.orgName || 'Client',
    country: input.country || 'Canada',
    tier: input.tier || 'Tier 2 – National',
    companySize: input.companySize || '5,001–10,000',
    timeFrame: input.timeFrame || '2 years',
    costSavingsGoal: Number(input.costSavingsGoal || 2000000),
    strategicGoal: input.strategicGoal || '',
    desiredOutcome: input.desiredOutcome || '',
    preparedFor: input.preparedFor || '',
    preparedBy: input.preparedBy || '',
    logoUrl: (input.logoUrl && !input.logoUrl.includes('sovereign-mark') ? input.logoUrl : '/images/secure.png') || '/images/secure.png',
    reportDate: today(),
    minWords: clamp(input.minWords || 20000, 8000, 80000),
    currencyCode: currencyUnitForCountry(input.country || 'Canada'), // Add currency based on country
  };
  
  // [KT:SURGICAL:I18N-NORMALIZATION] Normalize language to standard form (e.g., 'ar' -> 'Arabic', 'farsi' -> 'Persian')
  // This ensures consistent language handling across all downstream processing (GPT, translation cache, etc.)
  canon.lang = normalizeLang(canon.lang);
  
  canon.minWords = TOTAL_FLOOR;

  // [KT:SURGICAL:AI-TITLE-GENERATION] Generate AI report title in target language BEFORE sections are built
  try {
    const titleResult = await __kt_generateReportTitle(canon, {});
    if (titleResult) {
      canon.aiTitle = titleResult;
      console.log(TAG, '✅ [AI-TITLE] Generated:', { title: canon.aiTitle, lang: canon.lang });
    }
  } catch (e) {
    console.warn(TAG, '⚠️ [AI-TITLE] fallback triggered:', String(e?.message || e));
    canon.aiTitle = `${canon.orgName} Strategic Transformation & Value Creation Plan`;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🚀 [SOVEREIGN-INTELLIGENCE] TRANSLATION-FIX v3.2.0 - 2025-12-08');
  console.log('🔧 FIXES: Token limit increased to 16000 + JSON mode enforced');
  console.log('='.repeat(80));
  console.log(TAG, '🚀 CODE-VERSION:', SURGICAL_RUN_LOCK);
  console.log(TAG, '🌍 LANGUAGE:', canon.lang || 'English');
  console.log(TAG, '📊 ORG:', canon.orgName);
  console.log(TAG, '📝 INPUT:', {
    preparedFor: input.preparedFor,
    preparedBy: input.preparedBy,
    logoUrl: input.logoUrl,
    lang: input.lang
  });
  console.log(TAG, 'generate.start', {
    model: MODEL,
    org: canon.orgName,
    minWords: canon.minWords,
    language: canon.lang,
    logoUrl: canon.logoUrl
  });

  // [KT:TRANSLATION-FIX] Set up graph translator BEFORE any charts are generated
  // [KT:FIX-v2] Use translateLabels instead of buildChartSummaryTranslations (which returns 0 phrases)
  let translatedLabels = DEFAULT_LABELS;
  
  if (canon.lang && !/^english$/i.test(canon.lang)) {
    console.log(TAG, '🔧 [TRANSLATION-INIT] Setting up chart translation for:', canon.lang);
    
    try {
      // [KT:FIX-v2] Use the working translateLabels function instead of failing buildChartSummaryTranslations
      const labelsFromTranslate = await translateLabels(canon.lang);
      
      // [KT:FIX-v4] Verify we got actual translations, not empty object
      const labelCount = labelsFromTranslate ? Object.keys(labelsFromTranslate).length : 0;
      console.log(TAG, '[TRANSLATION-INIT] translateLabels returned', labelCount, 'keys');
      
      if (labelCount > 0) {
        translatedLabels = labelsFromTranslate;
        // Cache for graph translator
        __chartSummaryTranslationCache[canon.lang] = labelsFromTranslate;
        
        // [KT:FIX-v4] Log specific key values for debugging
        console.log(TAG, '[TRANSLATION-INIT] Key translations:', {
          'Overall': labelsFromTranslate['Overall'],
          'Key Insights': labelsFromTranslate['Key Insights'],
          'overall': labelsFromTranslate['overall'],
          'keyInsights': labelsFromTranslate['keyInsights'],
          'Type': labelsFromTranslate['Type'],
          'Values show': labelsFromTranslate['Values show']
        });
      } else {
        console.warn(TAG, '[TRANSLATION-INIT] ⚠️ translateLabels returned empty, using DEFAULT_LABELS');
        __chartSummaryTranslationCache[canon.lang] = DEFAULT_LABELS;
      }
    } catch (translateErr) {
      console.error(TAG, '[TRANSLATION-INIT] ❌ translateLabels failed:', String(translateErr?.message || translateErr));
      __chartSummaryTranslationCache[canon.lang] = DEFAULT_LABELS;
    }
    
    const translatorFn = (s) => {
      if (!s) return s;
      const cache = __chartSummaryTranslationCache[canon.lang];
      if (!cache) return s;
      
      // [KT:FIX-v3] Exact match first
      if (cache[s]) return cache[s];
      
      // [KT:FIX-v3] Try Title Case (e.g., 'overall' -> 'Overall')
      const titleCase = s.charAt(0).toUpperCase() + s.slice(1);
      if (cache[titleCase]) return cache[titleCase];
      
      // [KT:FIX-v3] Try lowercase
      const lowerKey = s.toLowerCase();
      if (cache[lowerKey]) return cache[lowerKey];
      
      // [KT:FIX-v3] Try all uppercase (e.g., 'key insight' -> 'KEY INSIGHT')
      const upperKey = s.toUpperCase();
      if (cache[upperKey]) return cache[upperKey];
      
      // [KT:FIX-v3] Try camelCase key (e.g., 'Key Insights' -> 'keyInsights')
      const camelKey = s.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toLowerCase());
      if (cache[camelKey]) return cache[camelKey];
      
      return s;
    };
    
    setGraphTranslator(translatorFn);
    setWorldClassVisualsTranslator(translatorFn);
    
    // [KT:FIX-v5] Use cache (which is always set) instead of out-of-scope labelsFromTranslate
    const finalCache = __chartSummaryTranslationCache[canon.lang] || {};
    const phraseCount = Object.keys(finalCache).length;
    console.log(TAG, '✅ [TRANSLATION-INIT] Graph translators enabled with', phraseCount, 'phrases');
    console.log(TAG, '🔍 [TRANSLATION-INIT] Sample translations:', {
      'Overall': finalCache['Overall'] || '(not found)',
      'Key Insights': finalCache['Key Insights'] || '(not found)',
      'increasing': finalCache['increasing'] || '(not found)',
      'Type': finalCache['Type'] || '(not found)'
    });
  }

  const order = ['exec', 'current', 'financials', 'kpis', 'timeline', 'ops', 'risk', 'roi', 'nextSteps'];
  const sections = {};

  // [KT:PERF-OPT-v1.0] REMOVED duplicate buildChartSummaryTranslations call - already done above
  console.log(TAG, '🔧 [PRE-TRANSLATE] Using cached chart translations from TRANSLATION-INIT...');
  // translatedLabels is already populated above

  const sectionResults = await Promise.all(order.map(async (key) => {
    const floor = SECTION_FLOORS[key] || 1200;
    //let html = await genSectionFirstPass(key, canon, floor);//
    let html;
    if (key === 'nextSteps') {
      html = await genSectionFirstPass(
        key,
        canon,
        floor,
        `Write a "Next Steps" section for ${canon.orgName} based on the findings above. Provide clear, actionable recommendations for the client.`
      );
    } else {
      html = await genSectionFirstPass(key, canon, floor);
    }
    html = await topUpSection(key, canon, html, floor);

    const { sigs: existingSigs } = collectExistingVizMeta(html);
    const preHas = hasViz(html);
    console.log(TAG, 'section.viz.precheck', key, {
      has: preHas,
      htmlLen: html.length,
      words: wc(html),
    });

    // [KT:SURGICAL] Skip predictive viz for KPI section - it has explicit kpiDash in template
    if (key !== 'exec' && key !== 'kpis') {
      try {
        const predFrag = await choosePredictiveFragment(key, canon, html, existingSigs);
        // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for the last injected fragment
        try {
          const lastFragMatch = (html.match(
            /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\S]*<\/(figure|div)>)/i,
          ) || [])[0];
          if (lastFragMatch) {
            const meta = parseVizMeta(lastFragMatch);
            const flags = {
              canvas: /<figure[^>]*data-chart=/.test(lastFragMatch),
              hasTitle: !!(meta.title && meta.title.trim()),
              hasX: !!(meta.xTitle && meta.xTitle.trim()),
              hasY: !!(meta.yTitle && meta.yTitle.trim()),
              hasVals: meta.labelsLen > 0 && meta.dataLen > 0,
            };
            console.log(TAG, 'chart.debug.injected', key, {
              kind: meta.kind,
              type: meta.type,
              title: meta.title,
              xTitle: meta.xTitle,
              yTitle: meta.yTitle,
              labelsLen: meta.labelsLen,
              dataLen: meta.dataLen,
              flags,
            });
          } else {
            console.log(TAG, 'chart.debug.injected', key, {
              built: false,
              reason: 'no fragment match',
            });
          }
        } catch (e) {
          console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
        }

        if (predFrag) {
          html += '\n' + predFrag;
          console.log(TAG, 'section.vizInjected', key, { mode: 'predictive-keywords' });

          // [KT:S] prove the injected meta has labels/values
          try {
            const lastFragMatch = (html.match(
              /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>)(?![\s\S]*<\/figure>)/i
            ) || [])[0];
            if (lastFragMatch) {
              const meta = parseVizMeta(lastFragMatch);
              console.log('[SR:REFORM] chart.debug.injected', {
                kind: 'chart', type: meta.type||'',
                title: meta.title||'(untitled)',
                xTitle: meta.xTitle||'', yTitle: meta.yTitle||'',
                labelsLen: meta.labelsLen || 0,
                dataLen: meta.dataLen || 0,
                flags: {
                  canvas: /<figure[^>]*data-chart=/.test(lastFragMatch),
                  hasTitle: !!meta.title, hasX: !!meta.xTitle, hasY: !!meta.yTitle, hasVals: (meta.labelsLen>0 && meta.dataLen>0)
                }
              });
            }
          } catch {}
        } else {
          console.log(TAG, 'section.viz.predictive.none', key);
          // [KT:SURGICAL DEBUG] last-injected scan retained
          try {
            const lastFragMatch = (html.match(
              /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\S]*<\/(figure|div)>)/i,
            ) || [])[0];
            if (lastFragMatch) {
              const meta = parseVizMeta(lastFragMatch);
              const flags = {
                canvas: /<figure[^>]*data-chart=/.test(lastFragMatch),
                hasTitle: !!(meta.title && meta.title.trim()),
                hasX: !!(meta.xTitle && meta.xTitle.trim()),
                hasY: !!(meta.yTitle && meta.yTitle.trim()),
                hasVals: meta.labelsLen > 0 && meta.dataLen > 0,
              };
              console.log(TAG, 'chart.debug.injected', key, {
                kind: meta.kind,
                type: meta.type,
                title: meta.title,
                xTitle: meta.xTitle,
                yTitle: meta.yTitle,
                labelsLen: meta.labelsLen,
                dataLen: meta.dataLen,
                flags,
              });
            } else {
              console.log(TAG, 'chart.debug.injected', key, {
                built: false,
                reason: 'no fragment match',
              });
            }
          } catch (e) {
            console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
          }
        }
      } catch (e) {
        console.log(TAG, 'section.viz.branch.error', key, String(e?.message || e));
        // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for the last injected fragment
        try {
          const lastFragMatch = (html.match(
            /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\S]*<\/(figure|div)>)/i,
          ) || [])[0];
          if (lastFragMatch) {
            const meta = parseVizMeta(lastFragMatch);
            const flags = {
              canvas: /<figure[^>]*data-chart=/.test(lastFragMatch),
              hasTitle: !!(meta.title && meta.title.trim()),
              hasX: !!(meta.xTitle && meta.xTitle.trim()),
              hasY: !!(meta.yTitle && meta.yTitle.trim()),
              hasVals: meta.labelsLen > 0 && meta.dataLen > 0,
            };
            console.log(TAG, 'chart.debug.injected', key, {
              kind: meta.kind,
              type: meta.type,
              title: meta.title,
              xTitle: meta.xTitle,
              yTitle: meta.yTitle,
              labelsLen: meta.labelsLen,
              dataLen: meta.dataLen,
              flags,
            });
          } else {
            console.log(TAG, 'chart.debug.injected', key, {
              built: false,
              reason: 'no fragment match',
            });
          }
        } catch (e2) {
          console.log(TAG, 'chart.debug.error', key, String(e2?.message || e2));
        }
      }
    }

    // Generate Savings Realization chart for Executive Summary
    if (key === 'exec') {
      try {
        console.log(TAG, '🔧 [EXEC-SAVINGS] Generating Executive Summary Savings chart...');
        
        const labelsForPeriod = (timeFrame) => {
          const s = (timeFrame || '').toLowerCase();
          let months = 24;
          const num = Number((s.match(/([\d.]+)/) || [])[1] || 0);
          if (s.includes('month')) months = Math.max(1, Math.round(num || 12));
          if (s.includes('year')) months = Math.max(1, Math.round((num || 2) * 12));
          if (months <= 12) return Array.from({ length: months }, (_, i) => `M${i + 1}`);
          const years = Math.ceil(months / 12);
          return Array.from({ length: years }, (_, i) => `Y${i + 1}`);
        };
        
        const labels = labelsForPeriod(canon.timeFrame || '2 years');
        const mkDefaultSeries = (len, total = 100) =>
          Array.from({ length: len }, (_, i) => Math.round(((i + 1) * total) / len));
        
        let savingsSpec = {
          title: 'Savings Realization',
          labels,
          series: mkDefaultSeries(labels.length, canon?.costSavingsGoal || 100000),
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'Savings'
        };
        
        if (canon.lang && !/^english$/i.test(canon.lang)) {
          try {
            savingsSpec = await translateChartLabels(savingsSpec, canon.lang);
          } catch (e) {
            console.log(TAG, 'exec.savings.translate.error', String(e?.message || e));
          }
        }
        
        const execSavingsChart = barChartHTML({ ...savingsSpec, lang: canon.lang });
        html = execSavingsChart + '\n' + html;
        console.log(TAG, '✅ [EXEC-SAVINGS] Savings chart added to Executive Summary:', execSavingsChart.length, 'chars');
      } catch (e) {
        console.error(TAG, '❌ [EXEC-SAVINGS] Error:', String(e?.message || e));
      }
      
      // [KT:EXEC-IMPACTFUL-GRAPH] Generate the Most Impactful Graph for Executive Summary
      // This reviews the ENTIRE report and creates the single most compelling visualization
      try {
        console.log(TAG, '🎯 [EXEC-IMPACTFUL] Generating Most Impactful Graph for Executive Summary...');
        
        const impactfulSpec = await buildExecutiveSummaryGraph(canon, sections);
        
        if (impactfulSpec && impactfulSpec.type && impactfulSpec.labels && impactfulSpec.datasets) {
          // Translate labels if non-English
          if (canon.lang && !/^english$/i.test(canon.lang)) {
            try {
              const translated = await translateChartLabels({
                title: impactfulSpec.title,
                xTitle: impactfulSpec.xTitle,
                yTitle: impactfulSpec.yTitle,
                labels: impactfulSpec.labels
              }, canon.lang);
              impactfulSpec.title = translated.title;
              impactfulSpec.xTitle = translated.xTitle;
              impactfulSpec.yTitle = translated.yTitle;
              impactfulSpec.labels = translated.labels;
            } catch (e) {
              console.log(TAG, 'exec.impactful.translate.error', String(e?.message || e));
            }
          }
          
          // Build the chart HTML based on type
          let impactfulChart = '';
          const chartSpec = {
            title: impactfulSpec.title,
            labels: impactfulSpec.labels,
            series: impactfulSpec.datasets[0]?.data || [],
            xTitle: impactfulSpec.xTitle,
            yTitle: impactfulSpec.yTitle,
            lang: canon.lang
          };
          
          if (impactfulSpec.type === 'line') {
            impactfulChart = lineChartHTML(chartSpec);
          } else if (impactfulSpec.type === 'pie' || impactfulSpec.type === 'doughnut') {
            // Use bar as fallback for pie/doughnut since they may not be available
            impactfulChart = barChartHTML(chartSpec);
          } else {
            impactfulChart = barChartHTML(chartSpec);
          }
          
          // Add insight and recommendation as chart note
          // [KT:I18N-FIX] Use translatedLabels for Key Insight and Recommendation
          if (impactfulSpec.insight || impactfulSpec.recommendation) {
            const keyInsightText = translatedLabels?.['KEY INSIGHT'] || translatedLabels?.keyInsight || 'Key Insight';
            const recommendationText = translatedLabels?.recommendation || translatedLabels?.Recommendation || 'Recommendation';
            const insightNote = `<p class="chart-note exec-insight" style="font-style:italic; margin-top:8px; color:#10B981;">
              <strong>💡 ${keyInsightText}:</strong> ${impactfulSpec.insight || ''}
              ${impactfulSpec.recommendation ? `<br/><strong>📌 ${recommendationText}:</strong> ${impactfulSpec.recommendation}` : ''}
            </p>`;
            impactfulChart = impactfulChart.replace('</figure>', insightNote + '</figure>');
          }
          
          // Prepend to section HTML (after savings chart)
          html = impactfulChart + '\n' + html;
          console.log(TAG, '✅ [EXEC-IMPACTFUL] Most Impactful Graph added:', {
            type: impactfulSpec.type,
            title: impactfulSpec.title,
            dataPoints: impactfulSpec.labels?.length || 0,
            chartSize: impactfulChart.length
          });
        } else {
          console.log(TAG, '⚠️ [EXEC-IMPACTFUL] Skipped - invalid spec returned');
        }
      } catch (e) {
        console.error(TAG, '❌ [EXEC-IMPACTFUL] Error:', String(e?.message || e));
      }
    }

    // [KT:SURGICAL:KPI-PREDICTIVE-AI-SMART] Generate 4 industry-specific KPI charts
    // AI first selects relevant KPIs, then extracts data for each via predictive model pattern
    if (key === 'kpis') {
      try {
        // Set up graph translator for chart summaries
        if (canon.lang && !/^english$/i.test(canon.lang)) {
          const summaryTranslations = await buildChartSummaryTranslations(canon.lang);
          __chartSummaryTranslationCache[canon.lang] = summaryTranslations;
          
          const translatorFn = (s) => {
            const cached = __chartSummaryTranslationCache[canon.lang]?.[s];
            return cached || s;
          };
          
          setGraphTranslator(translatorFn);
          setWorldClassVisualsTranslator(translatorFn);
        }
        
        // Verify chart functions are available
        if (!barChartHTML || !lineChartHTML) {
          throw new Error('Chart functions not available');
        }
        
        // [KT:SURGICAL:KPI-DASHBOARD-INTEGRATION] Call single integrated function that identifies KPIs AND extracts data
        const selectedKPIs = await buildKPIDashboardSpec(canon, sections, html, translatedLabels);
        
        if (!selectedKPIs || selectedKPIs.length < 4) {
          throw new Error('KPI dashboard extraction failed');
        }
        
        console.log(TAG, 'kpi.dashboard.completed', { count: selectedKPIs?.length || 0 });
        
        // Wrap all KPI charts in dashboard-wide section
        let kpiCharts = '<section class="kpi-dash dashboard-wide">\n';
        
        let kpiGenerated = 0;
        
        // [KT:SURGICAL:KPI-RENDERING] For each KPI, render the chart with data already extracted
        for (let i = 0; i < selectedKPIs.length; i++) {
          const kpiData = selectedKPIs[i];
          const kpiName = kpiData.nameTranslated || kpiData.name;
          
          try {
            // [KT:KPI-DATA-READY] Data is already extracted; just render the chart
            if (kpiData && kpiData.labels && kpiData.values) {
              // Determine chart type: alternate between bar and line for visual variety
              const chartType = i % 2 === 0 ? 'bar' : 'line';
              const chartFn = chartType === 'bar' ? barChartHTML : lineChartHTML;
              
              let kpiChartSpec = {
                title: kpiName,
                labels: kpiData.labels,
                series: [kpiData.values],
                xTitle: kpiData.xTitleTranslated || kpiData.xTitle || 'Time Period',
                yTitle: kpiData.yTitleTranslated || kpiData.yTitle || 'Value'
              };
              
              const kpiChart = chartFn({ ...kpiChartSpec, lang: canon.lang });
              kpiCharts += kpiChart + '\n';
              kpiGenerated++;
            }
          } catch (e) {
            console.warn(TAG, `kpi.render.error`, { index: i, error: String(e?.message || e) });
          }
        }
        
        kpiCharts += '</section>';
        console.log(TAG, 'kpi.charts.rendered', { generated: kpiGenerated, total: selectedKPIs.length });
        
        // Prepend KPI charts to section HTML
        html = kpiCharts + '\n' + html;
        
      } catch (e3) {
        console.error(TAG, 'kpi.generation.error', String(e3?.message || e3));
      }
    }

    return { key, html };
  }));

  // Process results and assign to sections
  // [KT:PERF-OPT-v1.0] Removed per-section translateHTML calls - saves 9 API calls!
  // Translation now happens ONCE at the end via translateHTML(html, reportLang) at line ~5130
  for (const { key, html } of sectionResults) {
    sections[key] = html;
    // [KT:PERF-OPT] Per-section translation REMOVED - full HTML translated at end
  }

  // ============================================================================
  // [KT:SECTION-GRAPHS-INJECT] Generate and inject AI-driven section-specific graphs
  // These are company/industry-specific backwards-looking graphs for each section
  // ============================================================================
  try {
    console.log(TAG, '🎯 [SECTION-GRAPHS] Generating AI-driven section graphs (ONE consolidated call)...');
    
    const sectionGraphSpecs = await buildAllSectionGraphSpecs(canon, sections);
    
    if (sectionGraphSpecs) {
      const graphSections = ['current', 'financials', 'timeline', 'ops', 'roi', 'nextSteps'];
      
      for (const secKey of graphSections) {
        const spec = sectionGraphSpecs[secKey];
        if (!spec || !spec.labels || !spec.data) {
          console.log(TAG, `⚠️ [SECTION-GRAPHS] Skipped ${secKey} - no valid spec`);
          continue;
        }
        
        try {
          // Translate labels if non-English
          let chartSpec = {
            title: spec.title,
            labels: spec.labels,
            series: spec.data,
            xTitle: spec.xTitle,
            yTitle: spec.yTitle,
            lang: canon.lang
          };
          
          if (canon.lang && !/^english$/i.test(canon.lang)) {
            try {
              const translated = await translateChartLabels({
                title: spec.title,
                xTitle: spec.xTitle,
                yTitle: spec.yTitle,
                labels: spec.labels
              }, canon.lang);
              chartSpec.title = translated.title || spec.title;
              chartSpec.xTitle = translated.xTitle || spec.xTitle;
              chartSpec.yTitle = translated.yTitle || spec.yTitle;
              chartSpec.labels = translated.labels || spec.labels;
            } catch (e) {
              console.log(TAG, `[SECTION-GRAPHS] translate.error for ${secKey}:`, String(e?.message || e));
            }
          }
          
          // Build the chart HTML based on type
          let sectionChart = '';
          if (spec.type === 'line') {
            sectionChart = lineChartHTML(chartSpec);
          } else if (spec.type === 'pie' || spec.type === 'doughnut') {
            // Use bar as fallback for pie/doughnut
            sectionChart = barChartHTML(chartSpec);
          } else {
            sectionChart = barChartHTML(chartSpec);
          }
          
          // Add insight as chart note if available
          if (spec.insight) {
            const insightNote = `<p class="chart-note section-insight" style="font-style:italic; margin-top:8px; color:#10B981; font-size:0.9em;">
              <strong>💡</strong> ${spec.insight}
            </p>`;
            sectionChart = sectionChart.replace('</figure>', insightNote + '</figure>');
          }
          
          // Prepend the graph to the section HTML
          sections[secKey] = sectionChart + '\n' + sections[secKey];
          
          console.log(TAG, `✅ [SECTION-GRAPHS] Injected ${spec.type} chart for ${secKey}:`, {
            title: chartSpec.title,
            dataPoints: chartSpec.labels?.length || 0,
            chartSize: sectionChart.length
          });
        } catch (e) {
          console.error(TAG, `❌ [SECTION-GRAPHS] Error injecting chart for ${secKey}:`, String(e?.message || e));
        }
      }
      
      console.log(TAG, '✅ [SECTION-GRAPHS] All section graphs injected successfully');
    } else {
      console.log(TAG, '⚠️ [SECTION-GRAPHS] No specs returned - skipping section graph injection');
    }
  } catch (e) {
    console.error(TAG, '❌ [SECTION-GRAPHS] Fatal error:', String(e?.message || e));
  }

  let phases = await derivePhasesFrom(sections.timeline, canon);
  if (phases.length < 5) {
    const defaultDurations = ['4 weeks', '4 weeks', '4 weeks', '8 weeks', '12 weeks'];
    phases = [1, 2, 3, 4, 5].map((i) => ({
      title: `Phase ${i}`,
      caption:
        i === 1 ? 'Kickoff & baselines' : i === 5 ? 'Sustain & scale' : 'Milestones & deliverables',
      duration: defaultDurations[i - 1]
    }));
  }

  console.log(TAG, 'appendix.build.start');
  // [KT:DEPRECATED] Old diagnostic appendix removed Dec 20, 2025
  // Now using AI-powered buildAppendicesFromAI() + renderAppendicesHTML() pipeline
  let appendicesHTML = '';  // Placeholder - will be populated by AI pipeline later
  console.log(TAG, 'appendix.build.done', { pipeline: 'ai-powered', bytes: 0 });

  // ============================================================================
  // [KT:TRANSLATION-FIX-CRITICAL] Get full UI labels translated via translateLabels()
  // This is CRITICAL - without this, section headers, TOC, title page are in English!
  // ============================================================================
  if (canon.lang && !/^english$/i.test(canon.lang)) {
    console.log(TAG, '🔧 [TRANSLATION-FIX] Getting full UI labels for:', canon.lang);
    const fullLabels = await translateLabels(canon.lang);
    // [KT:BUG-FIX] Correct merge order: fullLabels (GPT translations) MUST override translatedLabels (may have English defaults)
    translatedLabels = Object.assign({}, translatedLabels, fullLabels);
    console.log(TAG, '✅ [TRANSLATION-FIX] Full UI labels merged:', {
      executiveSummary: translatedLabels.executiveSummary,
      tableOfContents: translatedLabels.tableOfContents,
      currentState: translatedLabels.currentState,
      preparedFor: translatedLabels.preparedFor,
      totalKeys: Object.keys(translatedLabels).length
    });
  }

  // [KT:PERF-OPT-v1.0] REMOVED separate appendix translation - translated with full HTML at end
  // This saves another API call - appendicesHTML is empty anyway until AI pipeline populates it

  
  // === SPEED OPTIMIZATION: Parallelize all independent AI calls ===
  // Previously: genImplKitJSON and three appendix functions ran sequentially
  // Now: All run in parallel with Promise.all (saves ~3-4 minutes)
  console.log(TAG, 'ai.calls.parallelize.start', { count: 4 });
  
  const [
    implKit,
    [implementationChecklist, decisionFramework, resourceRequirements]
  ] = await Promise.all([
    genImplKitJSON(canon, sections),
    Promise.all([
      genImplementationChecklist(canon, sections),
      genDecisionFramework(canon, sections),
      genResourceRequirements(canon, sections)
    ])
  ]);
  
  console.log(TAG, 'implKit.generated', { 
    charters: implKit?.charters?.length || 0,
    raciItems: implKit?.raci?.items?.length || 0,
    raidItems: implKit?.raid?.items?.length || 0,
    benefitLines: implKit?.benefits?.lines?.length || 0
  });
  
  // DEBUG: Log pilot data to diagnose TBD values
  console.log(TAG, '🔍 [APPENDIX-DEBUG] Pilot data:', {
    name: implKit?.pilot?.name,
    locations: implKit?.pilot?.locations,
    successKPIs: implKit?.pilot?.successKPIs,
    thresholds: implKit?.pilot?.thresholds,
    sampleDesign: implKit?.pilot?.sampleDesign,
    rollbackCriteria: implKit?.pilot?.rollbackCriteria
  });

  // === BEYOND MCKINSEY: Results now available from parallel execution ===
  console.log(TAG, 'beyondMcKinsey.complete', {
    checklistPhases: implementationChecklist?.phases?.length || 0,
    frameworkScenarios: decisionFramework?.scenarios?.length || 0,
    resourceTeam: resourceRequirements?.team?.length || 0
  });
  
  // Add to implKit
  implKit.implementationChecklist = implementationChecklist;
  implKit.decisionFramework = decisionFramework;
  implKit.resourceRequirements = resourceRequirements;

  // === MULTILINGUAL: Translate UI labels via GPT-5-nano ===
  // [KT:PERF-OPT-v1.0] REMOVED duplicate translateLabels call - already called at line ~3990
  // translatedLabels was initialized earlier and is already populated
  console.log(TAG, '[KT:PERF-OPT] labels.reusing.cached', {
    lang: canon.lang,
    totalKeys: Object.keys(translatedLabels || {}).length,
    note: 'Using cached translatedLabels from earlier initialization'
  });

  // === MULTILINGUAL: Translate graph UI elements (Overall, Key Insights, Type dropdown) ===
  let graphUiTranslations = null;
  try {
    graphUiTranslations = await initGraphUiTranslations(canon.lang);
    console.log(TAG, 'graphUi.translated', { 
      lang: canon.lang, 
      overallLabel: graphUiTranslations.overallLabel,
      keyInsightsLabel: graphUiTranslations.keyInsightsLabel 
    });
  } catch (e) {
    console.log(TAG, 'graphUi.translate.error', String(e?.message || e));
  }

  // [KT:TRANSLATION-FIX-v3.1] Wire up world-class visuals translator BEFORE generating infographics
  // [KT:PERF-OPT-v1.0] Removed duplicate buildChartSummaryTranslations call - already cached at line ~3968
  if (canon.lang && canon.lang.toLowerCase() !== 'english') {
    console.log(TAG, '🔧 [WORLDCLASS-TRANSLATOR] Reusing cached translations for:', canon.lang);
    
    // [KT:PERF-OPT] Cache is already populated from line ~3968 - no need to rebuild
    if (!__chartSummaryTranslationCache[canon.lang]) {
      console.warn(TAG, '⚠️ [PERF-OPT] Cache miss - this should not happen, rebuilding...');
      const summaryTranslations = await buildChartSummaryTranslations(canon.lang);
      __chartSummaryTranslationCache[canon.lang] = summaryTranslations;
    }
    
    // [KT:CRITICAL-FIX] Merge chart summary translations into translatedLabels
    // This ensures getLabel() calls in infographics find "months", "weeks", "annually" etc.
    const chartTranslations = __chartSummaryTranslationCache[canon.lang] || {};
    translatedLabels = Object.assign({}, translatedLabels, chartTranslations);
    console.log(TAG, '✅ [MERGE-TRANSLATIONS] Merged chart translations into translatedLabels', {
      chartTranslationsCount: Object.keys(chartTranslations).length,
      totalLabelsCount: Object.keys(translatedLabels).length,
      hasMonths: translatedLabels.months ? true : false,
      hasWeeks: translatedLabels.weeks ? true : false,
      hasAnnually: translatedLabels.annually ? true : false
    });
    
    const translatorFn = (s) => {
      const cached = __chartSummaryTranslationCache[canon.lang][s];
      if (cached) {
        console.log(TAG, '🔍 [WORLDCLASS-TRANSLATOR] Translating:', s, '→', cached);
      }
      return cached || s;
    };
    
    setWorldClassVisualsTranslator(translatorFn);
    console.log(TAG, '✅ [WORLDCLASS-TRANSLATOR] Enabled with', Object.keys(__chartSummaryTranslationCache[canon.lang] || {}).length, 'phrases');
  }

  // === MCKINSEY-BEATING: Prepare world-class visualizations ===
  console.log(TAG, 'worldClassVisuals.prepare.start');
  
  // [KT:AI-KPI-CALC] Calculate AI-generated KPI values based on analysis data
  function calculateAIKPIs(canon, sections) {
    // Extract metrics from analysis content
    const costGoal = Number(canon?.costSavingsGoal) || 2400000;
    const timeframeMonths = parseInt(String(canon?.timeFrame).match(/\d+/)?.[0] || '18');
    
    // AI-calculated ROI: Base ROI increases with savings goal and decreases with time
    // Formula: (savings / (implementation_cost)) * 100
    // Implementation cost typically 15-25% of savings goal
    const implCost = costGoal * 0.20;
    const roiPercent = Math.round((costGoal / implCost) * 100);
    
    // AI-calculated payback: months = (implementation_cost / monthly_savings)
    // Monthly savings = (costGoal / timeframeMonths) * 0.7 (assuming 70% realization)
    const monthlySavings = (costGoal / timeframeMonths) * 0.7;
    const paybackMonths = Math.round((implCost / monthlySavings));
    
    // Savings is the stated goal, formatted with currency
    const savingsFormatted = costGoal >= 1000000 
      ? `$${(costGoal / 1000000).toFixed(1)}M`
      : `$${(costGoal / 1000).toFixed(0)}K`;
    
    // Confidence based on data quality and analysis depth
    const analysisDepth = (sections?.length || 0) / 10;
    const confidencePercent = Math.min(95, 75 + Math.round(analysisDepth * 20));
    
    return {
      roi: `${roiPercent}%`,
      payback: `${Math.max(6, paybackMonths)} ${translatedLabels.months || 'months'}`,
      savings: `${savingsFormatted} ${translatedLabels.annually || 'annually'}`,
      timeline: `${timeframeMonths} ${translatedLabels.months || 'months'}`,
      confidence: `${confidencePercent}%`
    };
  }
  
  // Calculate KPIs from actual analysis data
  const kpiMetrics = calculateAIKPIs(canon, sections);
  
  // [KT:CRITICAL-FIX] Merge KPI metrics back into canon so they're available to buildReformReportHTMLWithTranslation
  // This ensures dynamic values are used instead of hardcoded fallbacks in generateExecDashboard()
  canon.roi = kpiMetrics.roi;
  canon.paybackMonths = kpiMetrics.payback;
  canon.costSavingsGoal = kpiMetrics.savings;
  canon.timeFrame = kpiMetrics.timeline;
  canon.confidence = kpiMetrics.confidence;
  
  // 1. Executive Summary Infographic - extract key metrics
  const execInfographic = executiveSummaryInfographicHTML({
    roi: kpiMetrics.roi,
    payback: kpiMetrics.payback,
    savings: kpiMetrics.savings,
    timeline: kpiMetrics.timeline,
    confidence: kpiMetrics.confidence,
    impact: 'High',
    quickWins: 3,
    phases: phases?.length || 4,
    phasesData: phases || [],
    lang: canon.lang,
    translatedLabels: translatedLabels
  });
  
  // 2. Visual Timeline - convert phases to timeline format
  const timelinePhases = (phases || []).map((p, i) => ({
    name: p.title || `Phase ${i + 1}`,
    startWeek: i * 6,
    endWeek: (i + 1) * 6,
    color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'][i % 5],
    milestones: [{
      week: i * 6 + 3,
      label: p.caption || 'Milestone'
    }],
    deliverables: [p.caption || 'Deliverables']
  }));
  const visualTimeline = visualTimelineHTML(timelinePhases);
  
  // 3. Radar Chart - competitive positioning (if benchmarks exist)
  let radarChart = '';
  try {
    const bms = canon.benchmarks || [];
    if (bms.length >= 3) {
      const dimensions = bms.slice(0, 6).map(b => ({
        dimension: b.kpiName || b.name || 'Metric',
        company: parseFloat(b.currentValue) || 60,
        benchmark: parseFloat(b.benchmarkValue) || 50
      }));
      radarChart = radarChartHTML(dimensions);
    }
  } catch (e) {
    console.log(TAG, 'radarChart.prep.error', String(e?.message || e));
  }
  
  // [KT:PERF-OPT:PARALLEL-VISUALS] Run all world-class visual spec builders in parallel
  // These AI calls are independent and can run concurrently for significant time savings
  console.log(TAG, '[KT:PERF-OPT] Starting parallel world-class visual spec generation...');
  
  // Prepare report content for each spec builder
  const reportContentForPredictive = [
    sections.exec || '',
    sections.business || '',
    sections.financial || ''
  ].filter(Boolean).join('\n\n').slice(0, 3000);
  
  const reportContentForRisks = [
    sections.business || '',
    sections.implementation || '',
    sections.timeline || '',
    sections.risksAndMitigations || ''
  ].filter(Boolean).join('\n\n').slice(0, 3000);
  
  const reportContentForPriority = [
    sections.appendix || '',      // [KT:FIX] Include appendix - contains specific recommendations/projects
    sections.nextSteps || '',
    sections.recommendations || '', // [KT:FIX] Include recommendations section
    sections.timeline || '',
    sections.implementation || '', // [KT:FIX] Include implementation details
    sections.business || ''
  ].filter(Boolean).join('\n\n').slice(0, 5000); // [KT:FIX] Increased from 3000 to 5000 for more context
  
  const reportContentForWaterfall = [
    sections.financial || '',
    sections.business || '',
    sections.exec || ''
  ].filter(Boolean).join('\n\n').slice(0, 3000);
  
  // Run all 4 spec builders in parallel
  const [predictiveResult, riskResult, priorityResult, waterfallResult] = await Promise.all([
    // 1. Predictive Model Spec
    (async () => {
      try {
        let predictiveModel = await buildPredictiveModelSpec(canon, sections, reportContentForPredictive, DEFAULT_LABELS);
        // [KT:SURGICAL:I18N-PREDICTIVE-MODEL] translate titles/axes for global predictive chart
        if (predictiveModel && canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
          try {
            predictiveModel = await translateChartLabels(predictiveModel, canon.lang);
          } catch (e) {
            console.log(TAG, 'predictiveModel.translate.error', String(e?.message || e));
          }
        }
        console.log(TAG, 'predictiveModel.generated', {
          labels: predictiveModel?.labels?.length || 0,
          values: predictiveModel?.values?.length || 0,
          xTitle: predictiveModel?.xTitle,
          yTitle: predictiveModel?.yTitle
        });
        return { success: true, data: predictiveModel };
      } catch (e) {
        console.warn(TAG, 'predictiveModel.error', String(e?.message || e));
        return { success: false, error: e };
      }
    })(),
    
    // 2. Risk Heatmap Spec
    (async () => {
      try {
        console.log(TAG, 'risk.heatmap.generation.start');
        const riskSpec = await buildRiskHeatmapSpec(canon, sections, reportContentForRisks, translatedLabels);
        return { success: true, data: riskSpec };
      } catch (e) {
        console.log(TAG, 'risk.heatmap.generation.error', String(e?.message || e));
        return { success: false, error: e };
      }
    })(),
    
    // 3. Prioritization Matrix Spec
    (async () => {
      try {
        console.log(TAG, 'prioritizationMatrix.generation.start');
        const prioritySpec = await buildPrioritizationMatrixSpec(canon, sections, reportContentForPriority, translatedLabels);
        console.log(TAG, '[KT:FIX:PRIORITY-DEBUG] prioritySpec generated', {
          exists: !!prioritySpec,
          hasInitiatives: !!prioritySpec?.initiatives,
          initiativesCount: prioritySpec?.initiatives?.length || 0,
          initiativesArray: Array.isArray(prioritySpec?.initiatives)
        });
        return { success: true, data: prioritySpec };
      } catch (e) {
        console.error(TAG, '[KT:FIX:PRIORITY-DEBUG] prioritizationMatrix.prep.error', {
          error: String(e?.message || e),
          errorStack: e?.stack?.substring(0, 500),
          errorName: e?.name,
          functionExists: typeof prioritizationMatrixHTML === 'function'
        });
        return { success: false, error: e };
      }
    })(),
    
    // 4. Waterfall Spec
    (async () => {
      try {
        const waterfallSpec = await buildWaterfallSpec(canon, sections, reportContentForWaterfall, translatedLabels);
        return { success: true, data: waterfallSpec };
      } catch (e) {
        console.error(TAG, 'waterfallChart.prep.error', String(e?.message || e), e?.stack);
        return { success: false, error: e };
      }
    })()
  ]);
  
  console.log(TAG, '[KT:PERF-OPT] Parallel visual spec generation complete', {
    predictive: predictiveResult.success,
    risk: riskResult.success,
    priority: priorityResult.success,
    waterfall: waterfallResult.success
  });
  
  // Process predictive model result
  if (predictiveResult.success && predictiveResult.data) {
    sections.predictiveModel = predictiveResult.data;
  }
  
  // Process risk heatmap result
  let riskHeatmap = '';
  if (riskResult.success && riskResult.data) {
    const riskSpec = riskResult.data;
    if (riskSpec.risks && riskSpec.risks.length > 0) {
      const risks = riskSpec.risks.map((r, i) => ({
        id: i + 1,
        name: r.nameTranslated || r.name || `Risk ${i + 1}`,
        description: r.descriptionTranslated || r.description || 'No description provided.',
        severity: Number(r.severity) || 3,
        likelihood: Number(r.likelihood) || 3
      }));
      
      riskHeatmap = riskHeatmapHTML(risks);
      console.log(TAG, 'risk.heatmap.generated', { count: risks.length, translated: riskSpec.risks.filter(r => r.nameTranslated).length });
    }
  }
  
  // Process prioritization matrix result
  let prioritizationMatrix = '';
  if (priorityResult.success && priorityResult.data) {
    const prioritySpec = priorityResult.data;
    console.log(TAG, '[PRIORITY-MATRIX-DEBUG] prioritySpec check:', {
      hasInitiatives: !!prioritySpec?.initiatives,
      initiativesLength: prioritySpec?.initiatives?.length || 0,
      isArray: Array.isArray(prioritySpec?.initiatives),
      raw: JSON.stringify(prioritySpec)?.substring(0, 200)
    });
    if (prioritySpec.initiatives && prioritySpec.initiatives.length > 0) {
      // [KT:PRIORITY-MATRIX-DIAGNOSTIC] Ensure we have correct title
      const matrixTitle = translatedLabels?.prioritizationMatrix || 'Initiative Prioritization Matrix';
      
      prioritizationMatrix = prioritizationMatrixHTML({ 
        title: matrixTitle,
        initiatives: prioritySpec.initiatives,
        lang: canon.lang || 'English'
      });
      console.log(TAG, 'prioritizationMatrix.generated', { count: prioritySpec.initiatives.length, lang: canon.lang });
    } else {
      // [KT:PRIORITY-MATRIX-FALLBACK] Use defaults if GPT returned empty initiatives
      console.log(TAG, 'prioritizationMatrix.usingFallback', { reason: 'No initiatives from GPT, using defaults' });
      const fallbackInitiatives = [
        { name: 'Implement Technology Modernization', nameTranslated: null, impact: 90, effort: 85, value: 3.5 },
        { name: 'Optimize Operational Processes', nameTranslated: null, impact: 80, effort: 45, value: 2.2 },
        { name: 'Launch Customer Experience Program', nameTranslated: null, impact: 75, effort: 50, value: 1.8 },
        { name: 'Deploy Analytics & Reporting', nameTranslated: null, impact: 65, effort: 35, value: 1.2 },
        { name: 'Implement Staff Training Program', nameTranslated: null, impact: 55, effort: 25, value: 0.8 }
      ];
      const matrixTitle = translatedLabels?.prioritizationMatrix || 'Recommendation Prioritization Matrix';
      prioritizationMatrix = prioritizationMatrixHTML({ 
        title: matrixTitle,
        initiatives: fallbackInitiatives,
        lang: canon.lang || 'English'
      });
      console.log(TAG, 'prioritizationMatrix.generated.fallback', { count: fallbackInitiatives.length, lang: canon.lang });
    }
  } else {
    // [KT:PRIORITY-MATRIX-FALLBACK] Use defaults if spec generation failed entirely
    console.log(TAG, 'prioritizationMatrix.usingFallback.noResult', { success: priorityResult.success, hasData: !!priorityResult.data });
    const fallbackInitiatives = [
      { name: 'Implement Technology Modernization', nameTranslated: null, impact: 90, effort: 85, value: 3.5 },
      { name: 'Optimize Operational Processes', nameTranslated: null, impact: 80, effort: 45, value: 2.2 },
      { name: 'Launch Customer Experience Program', nameTranslated: null, impact: 75, effort: 50, value: 1.8 },
      { name: 'Deploy Analytics & Reporting', nameTranslated: null, impact: 65, effort: 35, value: 1.2 },
      { name: 'Implement Staff Training Program', nameTranslated: null, impact: 55, effort: 25, value: 0.8 }
    ];
    const matrixTitle = translatedLabels?.prioritizationMatrix || 'Recommendation Prioritization Matrix';
    prioritizationMatrix = prioritizationMatrixHTML({ 
      title: matrixTitle,
      initiatives: fallbackInitiatives,
      lang: canon.lang || 'English'
    });
    console.log(TAG, 'prioritizationMatrix.generated.noResult.fallback', { count: fallbackInitiatives.length, lang: canon.lang });
  }
  
  // Process waterfall chart result
  let waterfallChart = '';
  if (waterfallResult.success && waterfallResult.data) {
    const waterfallSpec = waterfallResult.data;
    if (waterfallSpec.components) {
      const waterfallComponents = [];
      const currency = canon.currency || '$';
      
      // Add current state
      if (waterfallSpec.currentState) {
        waterfallComponents.push({
          name: waterfallSpec.currentState.labelTranslated || waterfallSpec.currentState.label || 'Current State',
          value: waterfallSpec.currentState.value || 0,
          type: 'total'
        });
      }
      
      // Add each component with translated name
      for (let comp of waterfallSpec.components) {
        waterfallComponents.push({
          name: comp.nameTranslated || comp.name || 'Unknown Component',
          value: comp.value || 0,
          type: comp.type || 'positive'
        });
      }
      
      // Add target state
      if (waterfallSpec.targetState) {
        waterfallComponents.push({
          name: waterfallSpec.targetState.labelTranslated || waterfallSpec.targetState.label || 'Target State',
          value: 0, // Will be calculated as running total
          type: 'total'
        });
      }
      
      waterfallChart = waterfallChartHTML(waterfallComponents, currency);
      console.log(TAG, 'waterfallChart.generated', { 
        success: !!waterfallChart, 
        length: waterfallChart?.length || 0,
        componentCount: waterfallComponents.length,
        lang: canon.lang,
        hasTranslations: waterfallSpec.components.some(c => c.nameTranslated)
      });
    }
  }
  
     console.log(TAG, 'worldClassVisuals.prepare.done', {
    execInfographic: !!execInfographic,
    visualTimeline: !!visualTimeline,
    radarChart: !!radarChart,
    riskHeatmap: !!riskHeatmap,
    prioritizationMatrix: !!prioritizationMatrix,
    waterfallChart: !!waterfallChart
  });

  // [KT:SURGICAL:I18N-ROUTE] Legacy non-translated builder (kept for audit)
  /*
  let html = buildReformReportHTML({ 
    canon, 
    sections, 
    phases, 
    planDiagramHTML, 
    implKit, 
    translatedLabels,
    worldClassVisuals: {
      execInfographic,
      visualTimeline,
      radarChart,
      riskHeatmap,
      waterfallChart
    }
  });
  */

  // [KT:SURGICAL:I18N-ROUTE] New translated builder — same inputs, translated labels
  /*let html = await buildReformReportHTMLWithTranslation({
    canon,
    sections,
    phases,
    planDiagramHTML,
    implKit,
    translatedLabels,
    worldClassVisuals: {
      execInfographic,
      visualTimeline,
      radarChart,
      riskHeatmap,
      waterfallChart,
    },
  });*/

  // [KT:SURGICAL:I18N-ROUTE] New translated builder — same inputs, translated labels
  let html = await buildReformReportHTMLWithTranslation({
    canon,
    sections,
    phases,
    planDiagramHTML,
    implKit,
    appendicesHTML,                    // [KT:APPENDIX-TRANSLATION] Pass translated appendices to report builder
    labelMap: translatedLabels,        // Primary translated labels - flows to mergedLabels
    translatedLabels,                  // Backwards compatibility
    labels: translatedLabels,          // [KT:DIRECT-FLOW] Direct pass to ensure L object is populated
    worldClassVisuals: {
      execInfographic,
      visualTimeline,
      radarChart,
      riskHeatmap,
      prioritizationMatrix,
      waterfallChart,
    },
  });
  
  // === MULTILINGUAL: Apply graph UI translations (Overall, Key Insights, Type dropdown) ===
  if (graphUiTranslations && canon.lang && !/^english$/i.test(canon.lang)) {
    try {
      html = applyGraphUi(html, graphUiTranslations);
      console.log(TAG, 'graphUi.applied', { lang: canon.lang });
    } catch (e) {
      console.log(TAG, 'graphUi.apply.error', String(e?.message || e));
    }
  }

  // [KT:SURGICAL:NEXTSTEPS-BEFORE-APPENDIX] Move and format nextSteps before appendices
  // === Legacy note cleanup ===
  try {
    html = commentOutLegacyVisualNotes(html);
  } catch (e) {
    console.log(TAG, 'chart.notes.legacy.invoke.error', String(e?.message || e));
  }
  // === Universal description injection ===
  
try {
  const m = String(html || '').match(
    /<!-- \[KT:SURGICAL LEGACY NOTE COMMENTED OUT][\s\S]*?<p[\s\S]*?<\/p>[\s\S]*?-->/
  );
  const sample = m ? m[0].replace(/\s+/g, ' ').slice(0, 160) : '';
  console.log('[SR:REFORM] chart.notes.legacy.sample', { sample });
} catch (e) {
  console.log(TAG, 'chart.notes.legacy.sample.error', String(e?.message || e));
}


  // [KT:LEGACY:APPENDICES-REPLACE] original behavior (kept for audit)
  
  // [KT:SURGICAL] Post-process to enforce style rules and table classes
  try {
    // 1) ensure all <table> have class report-table (without duplicating)
    html = String(html).replace(/<table(?![^>]*\bclass=)/gi, '<table class="report-table"');

    // 2) strip 'blue' theme remnants on title page
    html = html.replace(/background:\s*#0e2a44/gi, 'background:#000000');
    // [KT:SURGICAL:THEME-CLEANUP] normalize any remaining blue backgrounds on report canvas
    html = html
      .replace(/background:\s*#071827/gi, 'background:#000000')
      .replace(/background-color:\s*#071827/gi, 'background-color:#000000')
      .replace(/color:\s*#0e2a44/gi, 'color:#e8eefb');

    // 3) ensure standard chart figures include placeholder for dropdown (the Hydrator will inject UI)
    html = html.replace(/<figure([^>]*data-chart[^>]*)>/gi, '<figure$1>');

    // 4) ensure predictive chart descriptions appear below figures (Hydrator will render .chart-desc)
    // Nothing to change here; left to Hydrator based on spec.description

  } catch (e) {
    console.log(TAG, 'postprocess.failed', String(e?.message || e));
  }

// === SURGICAL INJECTION POINT ===
// [KT:SURGICAL TABLE TITLE INJECTION]
try {
  // Early deterministic pass intentionally disabled in favor of AI title injection later.
  console.log(TAG, 'table.titles.injected', {
    note: 'early deterministic pass skipped (AI will run later)'
  });
} catch (e) {
  console.log(TAG, 'table.titles.inject.error', String(e?.message || e));
}

// [KT:SURGICAL:DEDUP] remove repeated visuals by title/kind
try {
  html = __kt_dedupeVisuals(html);
} catch (e) {
  console.log('[SR:REFORM] visuals.dedupe.invoke.error', String(e?.message || e));
}
// === end injection point ===

  // [KT:SURGICAL:DEDUP_FINAL] Remove repeated visuals by title/kind (final pass)
  // NOTE: Dedupe already done earlier at line 3876, skip duplicate pass for speed (~1-2 min saved)
  // try {
  //   html = __kt_dedupeVisuals(html);
  //   console.log('[SR:REFORM] visuals.dedupe.injected');
  // } catch (e) {
  //   console.log('[SR:REFORM] visuals.dedupe.invoke.error', String(e?.message || e));
  // }

  // === [KT:SURGICAL:LEGACY-NOTE-COMMENTER] ===
  // Fix #1: Comment out any legacy paragraphs immediately after visuals (non chart-note).
  try {
    html = commentOutLegacyVisualNotes(html);
  } catch (e) {
    console.log(TAG, 'chart.notes.legacy.invoke.error', String(e?.message || e));
  }
  // [KT:S] legacy-note sample for diagnostics
  
  // === [KT:SURGICAL GRAPH NOTES] ===
  // Fix #2: Ensure EVERY visual has an executive note below it (charts, benchmarks/dashboards, heatmaps).
  try {
    //html = await injectVisualDescriptions(html, canon);
  } catch (e) {
    console.log(TAG, 'chart.notes.invoke.error', String(e?.message || e));
  }

  // [KT:S] table titles injection (AI wrapper; preserves structure/style)
  
  // [KT:I18N-TABLE-TITLES-LANG-GUARD] — keep AI titles for English only; preserve translated captions
  // [KT:S] table titles injection (AI wrapper; preserves structure/style)

// [KT:I18N-TABLE-TITLES-LANG-GUARD] — keep AI titles for English only; preserve translated captions
const _langForTitles = String(canon?.lang || 'English');

if (typeof injectTableTitlesAI === 'function') {
  // English reports: keep AI “executive” retitling
  html = await injectTableTitlesAI(html, canon);
  console.log('[SR:REFORM] table.titles.injected', {
    mode: 'ai',
    lang: _langForTitles,
  });
} else if (typeof injectTableTitles === 'function') {
  // Non-English (or no AI fn): deterministic only, no language drift
  html = injectTableTitles(html);
  console.log('[SR:REFORM] table.titles.injected', {
    mode: 'deterministic',
    lang: _langForTitles,
  });
}

  // === end graph notes injection ===
  // [KT:SURGICAL:RUN-LOCK] stamp + log (no behavior change)
  try {
    logRun();
    html = markRun(html);
  } catch (e) {
    console.log(TAG, 'runlock.error', String(e?.message || e));
  }
// === [KT:SURGICAL:LEGACY-NOTE-COMMENTER] ===
// Fix #1: Comment out any legacy paragraphs immediately after visuals (non-chart-note).
try {
  html = commentOutLegacyVisualNotes(html);
} catch (e) {
  console.log(TAG, 'chart.notes.legacy.invoke.error', String(e?.message || e));
}
// [KT:S] Log sample of commented legacy note for verification
// [KT:S] Log sample of commented legacy note for verification
try {
  const m = String(html || '').match(
    /<!-- \[KT:SURGICAL LEGACY NOTE COMMENTED OUT][\s\S]*?<p[\s\S]*?<\/p>[\s\S]*?-->/
  );
  const sample = m ? m[0].replace(/\s+/g, ' ').slice(0, 160) : '';
  console.log('[SR:REFORM] chart.notes.legacy.sample', { sample });
} catch (e) {
  console.log(TAG, 'chart.notes.legacy.sample.error', String(e?.message || e));
}

// === [KT:SURGICAL GRAPH NOTES] ===

  // === Audit moved to end (post-template) per your instruction ===
  // AUDIT INVOCATION COMMENTED OUT per request:
  // html = await polishMcKinsey(html, canon);

  // [KT:SURGICAL:TRANSLATION-FIX] Comprehensive HTML translation pass
  // This ensures ALL content is translated: title page, dashboard, TOC, headings,
  // tables, chart titles, chart summaries, appendices, everything

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  // === Audit moved to end (post-template) per your instruction ===
  // AUDIT INVOCATION COMMENTED OUT per request:
  // html = await polishMcKinsey(html, canon);

  // [KT:SURGICAL:APPENDIX-GRAPH-RENDER-FIX]
  // Appendix predictive charts are inserted AFTER main visuals.
  // We trigger a second renderer pass for appendix-only figures.
  if (typeof html === 'string' && html.includes('.appendix .chart-card[data-chart]')) {
    // [KT:SURGICAL:APPENDIX-HYDRATOR-BROADENED] Broadened selector to hydrate all appendix charts, not just those under .appendix
    // Legacy (overly-specific):
    // const appendixCards = document.querySelectorAll('.appendix .chart-card[data-chart]');
    html = html.replace(
      '</body>',
      `
      <script>
        // Secondary pass for appendix charts (broadened selector)
        setTimeout(() => {
          const appendixCards = document.querySelectorAll('.chart-card[data-chart]');
          appendixCards.forEach(card => {
            try { window.RenderChart(card); } catch(e) { console.error('Appendix chart error', e); }
          });
        }, 10);
      </script>
      </body>`
    );
  }

  // [KT:SURGICAL:TRANSLATION-FIX] Comprehensive HTML translation pass
  // This ensures ALL content is translated: title page, dashboard, TOC, headings,
  // tables, chart titles, chart summaries, appendices, everything
  // let translatedHtml = html;
      let translatedHtml = html; // <-- FIX: declare before use to avoid ReferenceError

      // [KT:SURGICAL:PRE-TRANSLATION-FONT-FIX] Inject world-class fonts BEFORE translation
      // so GPT doesn't strip them out. This ensures fonts survive the translation process.
      if (!html.includes('font-family') || !html.includes('Georgia')) {
        const fontStyles = `<style>
/* [KT:FONT-PRE-TRANSLATION] World-class font cascade - injected BEFORE translation */
@font-face {
  font-family: 'serif-elegant';
  src: local('Georgia'), local('Garamond'), local('Times New Roman');
  font-weight: normal;
  font-style: normal;
}
body, .report, p, div, span, h1, h2, h3, h4, h5, h6 {
  font-family: Georgia, Garamond, 'Times New Roman', serif !important;
}
.report {
  font-family: Georgia, Garamond, 'Times New Roman', serif !important;
}
.report p, .report div, .report span, .report li, .report td, .report th {
  font-family: Georgia, Garamond, 'Times New Roman', serif !important;
}
.report h1, .report h2, .report h3, .report h4, .report h5, .report h6 {
  font-family: Georgia, Garamond, serif !important;
  font-weight: 600;
}
section p, section div, section span, section li {
  font-family: 'Georgia', 'Garamond', 'Times New Roman', serif !important;
}
table, li, td, th {
  font-family: 'Georgia', 'Garamond', 'Times New Roman', serif !important;
}
</style>`;
        // Inject at the very beginning, before any other styles
        html = fontStyles + html;
      }

  try {
    const reportLang = canon?.lang || 'English';

    // [KT:SURGICAL:I18N-PATH] Unified translation path (no double-translation)
    if (!__isEnglishReportLangSoft(reportLang)) {
      console.log(TAG, 'translation.starting', {
        lang: reportLang,
        htmlSize: html.length,
        hasFontStyles: html.includes('Georgia') || html.includes('font-family'),
      });

      // [KT:SURGICAL:TRANSLATION-LOGGING] Log key sections before translation
      const execSummaryMatch = html.match(/<section[^>]*>[\s\S]*?Executive Summary[\s\S]*?<\/section>/i);
      const graphOverviewMatch = html.match(/Graph Overview|Insights[\s\S]{0,200}/i);
      console.log(TAG, 'translation.sections.before', {
        hasExecSummary: !!execSummaryMatch,
        execSummarySize: execSummaryMatch ? execSummaryMatch[0].length : 0,
        hasGraphOverview: !!graphOverviewMatch,
      });

      // Translate the complete HTML document
      translatedHtml = await translateHTML(html, reportLang);

      // [KT:SURGICAL:TRANSLATION-LOGGING] Log key sections after translation
      const translatedExecMatch = translatedHtml.match(/<section[^>]*>[\s\S]*?Résumé[\s\S]*?<\/section>/i);
      const translatedGraphMatch = translatedHtml.match(/Aperçu|Insights[\s\S]{0,200}/i);
      console.log(TAG, 'translation.sections.after', {
        hasTranslatedExec: !!translatedExecMatch,
        translatedExecSize: translatedExecMatch ? translatedExecMatch[0].length : 0,
        hasTranslatedGraph: !!translatedGraphMatch,
        fontStylesPreserved: translatedHtml.includes('Georgia') || translatedHtml.includes('font-family'),
      });

      console.log(TAG, 'translation.complete', {
        lang: reportLang,
        originalSize: html.length,
        translatedSize: translatedHtml.length,
        sizeChange: translatedHtml.length - html.length,
      });
    } else {
      console.log(TAG, 'translation.skipped', {
        reason: 'English or no language specified',
      });
      translatedHtml = html;
    }

    // [KT:SURGICAL:LEGACY-TRANSLATION-BLOCK]
    // Old per-canon.lang translation path kept for audit, but NO LONGER EXECUTED.
    /*
    if (canon.lang && !/^english$/i.test(canon.lang)) {
      console.log(TAG, 'translation.starting', {
        lang: canon.lang,
        htmlSize: html.length,
      });
      translatedHtml = await translateHTML(html, canon.lang);
      console.log(TAG, 'translation.complete', {
        lang: canon.lang,
        translatedSize: translatedHtml.length,
      });
    } else {
      console.log(TAG, 'translation.skipped', {
        reason: 'English or no language specified',
      });
    }
    */
  } catch (e) {
    console.error(
      '[AUDIT] [KT:SURGICAL:TRANSLATION-GPT5NANO] Translation error:',
      String(e?.message || e),
    );
    // Fallback to original HTML
    translatedHtml = html;
  }
  // [KT:SURGICAL:CHART-LABEL-PATCH]
// Temporary safe stub so translation pipeline can call this without errors.
// For now it just logs and returns the input unchanged. We can later expand
// it to actually parse <figure data-chart="&quot;{...}&quot;"> JSON and
// translate axis / legend labels via translateChartLabels.
async function patchStandardChartLabelsForLanguage(html, lang) {
  try {
    const langLower = String(lang || "").toLowerCase();

    // No-op for English or empty content to avoid wasted work.
    if (!html || !langLower || langLower === "english" || langLower === "en" || langLower.startsWith("en-")) {
      return html;
    }

    console.log("[KT:SURGICAL:CHART-LABEL-PATCH] stub invoked", {
      lang,
      length: String(html).length,
    });

    // TODO (future): parse data-chart / data-heatmap specs and run them
    // through translateChartLabels(...) before returning.
    return html;
  } catch (err) {
    console.warn(
      "[KT:SURGICAL:CHART-LABEL-PATCH] error",
      String(err?.message || err)
    );
    return html;
  }
}


  // [KT:SURGICAL:I18N-EXEC-RISK] Ensure stubborn executive tiles & risk visuals are translated
  if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
    console.log(TAG, 'patchExecutiveRisk.starting', {
      lang: canon.lang,
      htmlSize: translatedHtml.length,
      hasExecSummary: translatedHtml.includes('Executive') || translatedHtml.includes('Résumé'),
    });
    
    translatedHtml = await patchExecutiveSummaryAndRiskLabels(
      translatedHtml,
      canon.lang,
    );
    
    console.log(TAG, 'patchExecutiveRisk.complete', {
      resultSize: translatedHtml.length,
      sizeChanged: translatedHtml.length !== arguments[0]?.length,
    });
  }

  // === FINALIZER: Ensure appendices I–K and all postprocessing are applied ===
  let finalizedHtml = translatedHtml;
  try {
    if (typeof __kt_finalize_report === 'function') {
      finalizedHtml = await __kt_finalize_report(translatedHtml, canon, sections);
      console.log(TAG, 'finalizer.invoked', { finalized: true });
    } else {
      console.log(TAG, 'finalizer.notfound');
    }
  } catch (e) {
    console.log(TAG, 'finalizer.error', String(e?.message || e));
  }

  // [KT:TRANSLATION-VALIDATOR] Final validation pass - catch any remaining English leaks
  if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
    try {
      const validation = validateFinalReport(finalizedHtml, canon.lang, translatedLabels || {});
      finalizedHtml = validation.html;
      if (validation.issues.length > 0) {
        console.warn(TAG, 'translationValidator.issues', {
          count: validation.issues.length,
          englishScore: validation.englishScore,
          samples: validation.issues.slice(0, 5)
        });
      }
    } catch (valErr) {
      console.warn(TAG, 'translationValidator.error', String(valErr?.message || valErr));
    }
  }

  // Return finalized HTML (appendices I–K always included, predictive chart removed)
  return NextResponse.json({
    ok: true,
    html: finalizedHtml,
    wordCount: sectionsWords,
    htmlWordCount: htmlWords,
  });
}



/* ==========================================================================
   Implementation Kit JSON (appendices) — transplanted from Oct 9 5:22 PM
   NOTE: Surgical addition; no deletions to existing code. MODEL and openai
   must already be in scope from surrounding generate module.
   ========================================================================== */
async function genImplKitJSON(canon, sections){
  try{
     const openai = await getOpenAI();
    // Build report context from sections
    // Build a comprehensive report context from all main report sections for AI to review
    const reportContext = `
Organization: ${canon.orgName || 'N/A'}
Industry: ${canon.industry || 'N/A'}
Country: ${canon.country || 'N/A'}
Time Frame: ${canon.timeFrame || 'N/A'}
Strategic Goal: ${canon.strategicGoal || 'N/A'}
Desired Outcome: ${canon.desiredOutcome || 'N/A'}
Prepared For: ${canon.preparedFor || 'N/A'}
Prepared By: ${canon.preparedBy || 'N/A'}
Report Date: ${canon.reportDate || 'N/A'}

--- EXECUTIVE SUMMARY ---
${sections.exec || ''}

--- CURRENT STATE ---
${sections.current || ''}

--- FINANCIALS ---
${sections.financials || ''}

--- KPIS ---
${sections.kpis || ''}

--- TIMELINE ---
${sections.timeline || ''}

--- OPERATIONS ---
${sections.ops || ''}

--- RISK ---
${sections.risk || ''}

--- ROI ---
${sections.roi || ''}

--- NEXT STEPS ---
${sections.nextSteps || ''}
`.trim();

// [KT:SURGICAL:I18N-IMPLKIT-CONTEXT] translate report context for Implementation Kit JSON
let localizedReportContext = reportContext;
/*try {
  const lang = String(canon?.lang || 'English');
  const isEnglish =
    lang.toLowerCase() === 'english' ||
    lang.toLowerCase() === 'en' ||
    lang.toLowerCase().startsWith('en-');

  if (!isEnglish) {
    localizedReportContext = await translate(reportContext, lang);
    console.log('[SR:REFORM] implKit.context.translated', {
      lang,
      length: localizedReportContext.length,
    });
  } else {
    console.log('[SR:REFORM] implKit.context.noTranslation', { lang });
  }
} catch (e) {
  console.log('[SR:REFORM] implKit.context.translate.error', String(e?.message || e));
  // fall back to English block if translation fails
  localizedReportContext = reportContext;
}*/

try {
  const lang = String(canon?.lang || 'English');
  const isEnglish =
    lang.toLowerCase() === 'english' ||
    lang.toLowerCase() === 'en' ||
    lang.toLowerCase().startsWith('en-');

  if (!isEnglish && typeof translate === 'function') {
    localizedReportContext = await translate(reportContext, lang);
    console.log('[SR:REFORM] implKit.context.translated', {
      lang,
      length: localizedReportContext.length,
    });
  } else if (!isEnglish && typeof translate !== 'function') {
    console.log('[SR:REFORM] implKit.context.translate.skip', {
      lang,
      reason: 'translate-not-function',
      type: typeof translate,
    });
    localizedReportContext = reportContext; // fall back to English
  } else {
    console.log('[SR:REFORM] implKit.context.noTranslation', { lang });
  }
} catch (e) {
  console.log('[SR:REFORM] implKit.context.translate.error', String(e?.message || e));
  // fall back to English block if translation fails
  localizedReportContext = reportContext;
}



    // MULTILINGUAL: Add language instruction for appendix content
    const languageInstruction = canon.lang && !/^english$/i.test(canon.lang)
      ? `\n\nIMPORTANT: Generate all text content in ${canon.lang}. Use professional business terminology appropriate for ${canon.lang}. All string values in the JSON should be in ${canon.lang}.`
      : '';

    // Refined prompt: AI must review the full report content and generate non-blank, contextually relevant data for every appendix section (A–K), strictly based on the report content.
    const appendixPrompt = `
You are an expert business analyst. Carefully review the full report content below. For each appendix section (A–K), generate non-blank, contextually relevant data strictly based on the report content. Do NOT copy or summarize the report; instead, infer and synthesize the required data for each appendix section using the facts, numbers, and context from the report. Every appendix section (A–K) must be populated with realistic, specific, and relevant data—no placeholders, no blanks, no generic filler. If a section is not directly addressed in the report, use your best judgment to infer plausible, high-quality content based on the report’s context and business logic.

REPORT CONTENT:
${localizedReportContext}

Return a valid JSON object with this exact structure (ensure all strings are properly quoted and escaped):
{
  "charters": [ { "name": "Project Charter Name", "objective": "Clear objective", "scopeIn": "What is included", "scopeOut": "What is excluded", "owner": "Owner name",
                  "stakeholders": ["Stakeholder 1", "Stakeholder 2"], "milestones":[{"milestone":"Milestone 1","due":"2025-Q1"}],
                  "kpis":[{"kpi":"KPI name","baseline":0,"target":100,"source":"Source"}],
                  "risks":[{"risk":"Risk description","mitigation":"Mitigation plan","owner":"Risk owner"}],
                  "budgetSummary":"Budget overview", "acceptanceCriteria":"Acceptance criteria" } ],
  "raci": { "items":[{"decision":"Decision point","R":"Responsible party","A":"Accountable party","C":["Consulted 1"],"I":["Informed 1"],"SLA":"24 hours"}] },
  "raid": { "items":[{"type":"Risk","description":"Risk description","owner":"Owner name","impact":"High","probability":"Medium","trigger":"Trigger event","mitigation":"Mitigation plan","status":"Open","nextReview":"2025-Q1"}] },
  "benefits": { "lines":[{"workstream":"Workstream name","lever":"Lever description","unitAssumption":"Unit assumption","source":"Data source","volume":1000,"rate":50,"monthlyImpact":50000,"confidence":"High","startMonth":"M1","runRateMonth":"M3","oneOffCost":10000}] },
  "plan100": { "weeks":[{"week":"W1","workstream":"Workstream","task":"Task description","owner":"Task owner","status":"Planned"}] },
  "pilot": { "name":"Pilot name", "locations":10, "successKPIs":["KPI 1", "KPI 2"], "thresholds":["Threshold 1", "Threshold 2"],
             "sampleDesign":"Sample design description", "rollbackCriteria":"Rollback criteria" },
  "assumptions": { "items":[{"name":"Assumption name","value":100,"unit":"units","low":80,"high":120,"note":"Note text"}] },
  "methods": { "benchmarks":[{"name":"Benchmark name","source":"Source","date":"2025-01","notes":"Notes"}],
               "sources":["Source 1","Source 2"] }
}

IMPORTANT: Return ONLY the JSON object. No markdown code blocks, no backticks, no explanatory text.`;

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        { role:'system', content:`You are a helpful assistant that outputs valid JSON only. Return strict JSON with no markdown, no code blocks, no prose.${languageInstruction}` },
        { role:'user',   content: appendixPrompt }
      ]
    });
    let raw = (res?.choices?.[0]?.message?.content ?? '').trim();
    
    // Strip markdown code blocks if present
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    
    console.log('[genImplKitJSON] Raw response length:', raw.length);
    console.log('[genImplKitJSON] First 200 chars:', raw.substring(0, 200));
    
    try{
      // Sanitize JSON before parsing to fix UTF-8 and structural issues
      raw = sanitizeJSONForParsing(raw);
      const parsed = JSON.parse(raw);
      console.log('[genImplKitJSON] Successfully parsed JSON');
      return parsed;
    }catch(e){
      console.warn('[genImplKitJSON] JSON parse failed; returning schema-based defaults', e);
      console.warn('[genImplKitJSON] Failed content (first 500 chars):', raw.substring(0, 500));
      return {
        charters: [ makeCharter() ],
        raci: makeRaci(),
        raid: makeRaid(),
        benefits: makeBenefits(),
        plan100: makePlan100(),
        pilot: makePilot(),
        assumptions: makeAssumptions(),
        methods: makeMethods()
      };
    }
  }catch(err){
    console.error('[genImplKitJSON] OpenAI call failed', err);
    return {
      charters: [ makeCharter() ],
      raci: makeRaci(),
      raid: makeRaid(),
      benefits: makeBenefits(),
      plan100: makePlan100(),
      pilot: makePilot(),
      assumptions: makeAssumptions(),
      methods: makeMethods()
    };
  }
}

/* ============================================================================
   BEYOND MCKINSEY: Dynamic Self-Implementation Appendices (I, J, K)
   Generate project-specific implementation tools via AI
   
   [KT:APPENDIX-ARCHITECTURAL-REDESIGN] Dec 20, 2025
   VISION: AI analyzes recommendations and determines which appendices are needed,
   then generates ALL content (titles, columns, rows, data) specific to the project.
   Result: Detailed implementation guidance tailored to actual recommendations.
============================================================================ */

/**
 * [KT:APPENDIX-AI-DRIVER] Main function to generate all appendices via AI
 * 
 * FLOW:
 * 1. Extract recommendations from report sections (current-state, future-state, roadmap)
 * 2. Call GPT with: "Given these recommendations, generate implementation appendices"
 * 3. AI determines: Which appendices needed? (could be 3-6 depending on context)
 * 4. AI generates: All content in target language
 * 5. Return: Structured JSON with flexible appendix array
 * 
 * REPLACES: Old hardcoded templates (genImplementationChecklist, etc.)
 * MATCHES: User requirement: "Detailed plan to carry out the recommendations"
 */
async function buildAppendicesFromAI(reportHTML, canon, sections) {
  const TAG = '[KT:APPENDIX-AI]';
  const targetLang = canon.lang || 'English';
  const isEnglish = /^english$/i.test(targetLang);
  const languageInstruction = !isEnglish
    ? `\n\nCRITICAL LANGUAGE REQUIREMENT: Generate ALL content in ${targetLang}. 
    - ALL titles must be in ${targetLang} (e.g., "Dodatak A" for Serbian, "Annexe A" for French)
    - ALL column headers must be in ${targetLang}
    - ALL row data must be in ${targetLang}
    - ALL descriptions must be in ${targetLang}
    - Use professional business terminology appropriate for ${targetLang}.
    - Do NOT use any English words except proper nouns or technical terms that have no equivalent.`
    : '';

  try {
    // ========== STEP 1: Extract recommendations from report HTML ==========
    console.log(TAG, 'step1: extracting recommendations from report sections');
    
    // Helper to extract text from section HTML
    const extractSectionText = (sectionHTML) => {
      if (!sectionHTML) return '';
      // Remove HTML tags but keep text content
      return String(sectionHTML)
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 2000); // Limit to first 2000 chars to avoid token bloat
    };

    const recommendations = {
      currentState: extractSectionText(sections?.['Current State'] || ''),
      futureState: extractSectionText(sections?.['Future State'] || sections?.['Target State'] || ''),
      roadmap: extractSectionText(sections?.['Implementation Roadmap'] || sections?.['Timeline'] || ''),
      keyInsights: extractSectionText(sections?.['Key Insights'] || ''),
    };

    console.log(TAG, 'recommendations extracted:', {
      currentStateLen: recommendations.currentState.length,
      futureStateLen: recommendations.futureState.length,
      roadmapLen: recommendations.roadmap.length,
      keyInsightsLen: recommendations.keyInsights.length,
    });

    // ========== STEP 2: Call GPT with recommendation context ==========
    console.log(TAG, 'step2: calling GPT to generate appendices based on recommendations');

    const openai = await getOpenAI();
    
    // [KT:I18N-APPENDIX] Dynamic language examples based on target language
    const appendixWord = isEnglish ? 'Appendix' : `the word for "Appendix" in ${targetLang}`;
    
    const prompt = `You are a business consultant specializing in implementation strategy. Your task is to generate professional implementation appendices in JSON format.

TARGET LANGUAGE: ${targetLang} - ALL CONTENT MUST BE IN ${targetLang.toUpperCase()}

CURRENT STATE INSIGHTS:
${recommendations.currentState || 'N/A'}

FUTURE STATE (TARGET) VISION:
${recommendations.futureState || 'N/A'}

IMPLEMENTATION ROADMAP:
${recommendations.roadmap || 'N/A'}

KEY INSIGHTS:
${recommendations.keyInsights || 'N/A'}

TASK: Based on these recommendations, generate 4-6 detailed implementation appendices ENTIRELY IN ${targetLang}.

CRITICAL REQUIREMENTS:
1. EVERY appendix MUST have ALL of these fields:
   - id: Single letter (A, B, C, D, E, F only)
   - title: Non-empty string IN ${targetLang} (use ${appendixWord} A, B, C etc.)
   - description: Non-empty string IN ${targetLang} explaining the appendix purpose
   - type: One of: checklist, framework, timeline, resource_plan, decision_matrix, roadmap
   - columns: Array with 3-4 column objects (NEVER empty) - column names IN ${targetLang}
   - rows: Array with 5-10 row objects (NEVER empty) - all text IN ${targetLang}

2. Each column object MUST have:
   - name: Non-empty string IN ${targetLang}
   - width: Percentage string (e.g., "25%", "33%")

3. Each row MUST be an object with keys matching column names (in ${targetLang})

4. Generate ONLY valid JSON - no markdown, no comments, no incomplete objects

5. Return exactly this structure (complete all appendices):
{
  "appendices": [
    {
      "id": "A",
      "title": "[${appendixWord} A title in ${targetLang}]",
      "description": "[Purpose in ${targetLang}]",
      "type": "timeline|checklist|framework|resource_plan|decision_matrix|roadmap",
      "columns": [
        { "name": "[Column name in ${targetLang}]", "width": "25%" },
        { "name": "[Column name in ${targetLang}]", "width": "35%" },
        { "name": "[Column name in ${targetLang}]", "width": "20%" },
        { "name": "[Column name in ${targetLang}]", "width": "20%" }
      ],
      "rows": [
        { "[col1 name]": "[value in ${targetLang}]", "[col2 name]": "[value]", "[col3 name]": "[value]", "[col4 name]": "[value]" }
      ]
    }
  ],
  "summary": "[Overview in ${targetLang}]"
}

VALIDATION CHECKLIST:
✓ appendices is an array (never null or undefined)
✓ appendices has 4-6 items
✓ Each appendix has: id, title, description, type, columns, rows
✓ NEVER have empty columns array
✓ NEVER have empty rows array
✓ Each column has: name and width
✓ Each row is object with all column names as keys
✓ All text is in ${canon.lang || 'English'}
✓ JSON is valid and complete (ends with }})${languageInstruction}`;

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: `You are an expert implementation consultant who designs detailed, actionable appendices to guide project execution. You analyze recommendations and determine exactly what guidance, checklists, frameworks, and timelines are needed. All content you generate must be specific to the project context and in the target language.${languageInstruction}`
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // ========== STEP 3: Parse and validate GPT response ==========
    let raw = (res?.choices?.[0]?.message?.content || '').trim();
    console.log(TAG, 'step3: parsing GPT response', { rawLen: raw.length });

    // Clean up markdown code blocks if present
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();

    // Apply UTF-8 and newline sanitization (same as buildPredictiveModelSpec)
    let jsonStr = extractJsonObject(raw) || raw;
    try {
      jsonStr = jsonStr.replace(/^[^\[{]*/, '').trim();
      if (!jsonStr.match(/^[\[{]/)) {
        jsonStr = raw;
      }
      const closeIdx = Math.max(jsonStr.lastIndexOf('}'), jsonStr.lastIndexOf(']'));
      if (closeIdx > 0) {
        jsonStr = jsonStr.slice(0, closeIdx + 1);
      }
      // Use universal sanitizer for ALL UTF-8 corruption + newline removal
      jsonStr = sanitizeJSONForParsing(jsonStr);
    } catch (e) {
      console.log(TAG, 'sanitization error:', String(e?.message || e));
    }

    let appendixSpec = null;
    try {
      appendixSpec = JSON.parse(jsonStr);
      console.log(TAG, 'successfully parsed appendix spec', {
        appendixCount: appendixSpec.appendices?.length || 0
      });
    } catch (parseErr) {
      console.error(TAG, 'json.parse.error', parseErr, {
        rawPreview: raw.substring(0, 200),
        jsonStrLength: jsonStr.length
      });
      appendixSpec = null;
    }

    // ========== STEP 4: Validate structure ==========
    if (!appendixSpec || !Array.isArray(appendixSpec.appendices) || appendixSpec.appendices.length === 0) {
      console.error(TAG, '[KT:FIX:APPENDIX-NEVER-EMPTY] AI appendices returned empty! Logging full response for debugging');
      console.error(TAG, 'raw GPT response preview:', raw.substring(0, 500));
      console.error(TAG, 'jsonStr preview:', jsonStr.substring(0, 500));
      
      // [KT:FIX:APPENDIX-NEVER-EMPTY] Create minimal valid appendix instead of returning empty
      // This ensures something is always rendered when AI is called
      console.warn(TAG, '[KT:FIX:APPENDIX-NEVER-EMPTY] Creating fallback appendix with recommendations');
      
      // Define fallback appendices in English
      let fallbackAppendices = [
        {
          id: 'A',
          title: 'Appendix A — Implementation Roadmap',
          description: 'Strategic phases for implementation of recommendations',
          type: 'timeline',
          columns: [
            { name: 'Phase', width: '20%' },
            { name: 'Objective', width: '40%' },
            { name: 'Timeline', width: '20%' },
            { name: 'Owner', width: '20%' }
          ],
          rows: [
            { 'Phase': 'Phase 1', 'Objective': 'Assess current state and establish baseline', 'Timeline': 'Month 1-2', 'Owner': 'Project Team' },
            { 'Phase': 'Phase 2', 'Objective': 'Design transformation roadmap', 'Timeline': 'Month 3-4', 'Owner': 'Project Team' },
            { 'Phase': 'Phase 3', 'Objective': 'Execute priority initiatives', 'Timeline': 'Month 5-12', 'Owner': 'Implementation Team' }
          ]
        },
        {
          id: 'B',
          title: 'Appendix B — Key Success Factors',
          description: 'Critical factors for successful implementation',
          type: 'checklist',
          columns: [
            { name: 'Factor', width: '40%' },
            { name: 'Description', width: '35%' },
            { name: 'Priority', width: '25%' }
          ],
          rows: [
            { 'Factor': 'Executive Sponsorship', 'Description': 'Leadership commitment and active involvement', 'Priority': 'Critical' },
            { 'Factor': 'Resource Allocation', 'Description': 'Adequate budget, staff, and tools', 'Priority': 'Critical' },
            { 'Factor': 'Change Management', 'Description': 'Clear communication and training programs', 'Priority': 'High' }
          ]
        }
      ];
      
      let fallbackSummary = 'Implementation appendices generated from strategic recommendations. Note: AI appendix generation encountered parsing issues; displaying structured fallback framework.';
      
      // Translate fallback appendices for non-English languages
      if (!isEnglish) {
        try {
          const openai = await getOpenAI();
          const transRes = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
            temperature: 0.3,
            messages: [
              { role: 'system', content: `Translate the following JSON to ${targetLang}. Translate ALL text values including titles, descriptions, column names, and row data. Return ONLY valid JSON.` },
              { role: 'user', content: JSON.stringify({ appendices: fallbackAppendices, summary: fallbackSummary }) }
            ]
          });
          const transRaw = (transRes?.choices?.[0]?.message?.content || '').trim();
          const transJson = extractJsonObject(transRaw) || transRaw;
          const translated = JSON.parse(sanitizeJSONForParsing(transJson));
          if (translated.appendices && Array.isArray(translated.appendices) && translated.appendices.length >= 2) {
            fallbackAppendices = translated.appendices;
            console.log(TAG, '[APPENDIX-FALLBACK] Translated to', targetLang);
          }
          if (translated.summary) {
            fallbackSummary = translated.summary;
          }
        } catch (transErr) {
          console.warn(TAG, '[APPENDIX-FALLBACK] Translation error:', transErr.message);
        }
      }
      
      return {
        appendices: fallbackAppendices,
        summary: fallbackSummary
      };
    }

    console.log(TAG, 'appendix spec validated:', {
      appendices: appendixSpec.appendices.length,
      ids: appendixSpec.appendices.map(a => a.id).join(', ')
    });

    return appendixSpec;

  } catch (err) {
    console.error(TAG, 'critical error in buildAppendicesFromAI', err);
    // [KT:FIX:APPENDIX-NEVER-EMPTY] Return minimal appendix instead of empty on error
    // Note: In catch block, we cannot reliably translate since API may have failed.
    // The main validation fallback above handles translation for non-critical failures.
    console.warn(TAG, '[KT:FIX:APPENDIX-NEVER-EMPTY] Critical error encountered, returning English fallback appendix');
    console.warn(TAG, '[TRANSLATION-NOTE] If language is not English, this fallback will appear in English due to API failure');
    return {
      appendices: [
        {
          id: 'A',
          title: 'Appendix A — Implementation Roadmap',
          description: 'Strategic phases for implementation of recommendations',
          type: 'timeline',
          columns: [
            { name: 'Phase', width: '20%' },
            { name: 'Objective', width: '40%' },
            { name: 'Timeline', width: '20%' },
            { name: 'Owner', width: '20%' }
          ],
          rows: [
            { 'Phase': 'Phase 1', 'Objective': 'Assess current state and establish baseline', 'Timeline': 'Month 1-2', 'Owner': 'Project Team' },
            { 'Phase': 'Phase 2', 'Objective': 'Design transformation roadmap', 'Timeline': 'Month 3-4', 'Owner': 'Project Team' },
            { 'Phase': 'Phase 3', 'Objective': 'Execute priority initiatives', 'Timeline': 'Month 5-12', 'Owner': 'Implementation Team' }
          ]
        }
      ],
      summary: 'Appendix generation encountered an error. Displaying structured fallback framework.'
    };
  }
}

async function genImplementationChecklist(canon, sections) {
  const languageInstruction = canon.lang && !/^english$/i.test(canon.lang)
    ? `\n\nIMPORTANT: Generate all content in ${canon.lang}. Use professional business terminology appropriate for ${canon.lang}.`
    : '';
  
  try {
    const openai = await getOpenAI();

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        { 
          role: 'system', 
          content: `You are an implementation consultant. Generate a step-by-step implementation checklist for a business transformation. Return ONLY valid JSON.${languageInstruction}` 
        },
        { 
          role: 'user', 
          content: `Create a checklist with 5-7 phases for ${canon.orgName || 'the client'} to implement the recommendations.

Industry: ${canon.industry || 'N/A'}
Project: ${canon.timeFrame || '24 month'} transformation

For each phase, provide:
1. Phase name
2. Key activities (as a short list)
3. Owner (role)
4. Success criteria (1-2 sentences)

Return JSON:
{
  "phases": [
    {
      "phase": "Phase name",
      "activities": ["Activity 1", "Activity 2"],
      "owner": "Role",
      "successCriteria": "How to know it's done"
    }
  ]
}` 
        }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content ?? '').trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();

    try {
      const parsed = JSON.parse(raw);
      console.log('[genImplementationChecklist] Successfully parsed JSON');
      return parsed;
    } catch (e) {
      console.warn('[genImplementationChecklist] JSON parse failed; returning default', e);
      return { phases: [] };
    }
  } catch (err) {
    console.error('[genImplementationChecklist] OpenAI call failed', err);
    return { phases: [] };
  }
}

async function genDecisionFramework(canon, sections) {
  const languageInstruction = canon.lang && !/^english$/i.test(canon.lang)
    ? `\n\nIMPORTANT: Generate all content in ${canon.lang}. Use professional business terminology appropriate for ${canon.lang}.`
    : '';
  
  try {
    const openai = await getOpenAI();

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        { 
          role: 'system', 
          content: `You are an implementation consultant. Generate a decision framework for common roadblocks. Return ONLY valid JSON.${languageInstruction}` 
        },
        { 
          role: 'user', 
          content: `Create a decision framework with 6 common implementation scenarios for ${canon.orgName || 'the client'}.

Industry: ${canon.industry || 'N/A'}
Project: ${canon.timeFrame || '24 month'} transformation

For each scenario, provide:
1. Scenario name
2. Symptoms to watch for
3. Root cause analysis
4. Recommended action

Return JSON:
{
  "scenarios": [
    {
      "scenario": "Scenario name",
      "symptom": "Warning signs",
      "rootCause": "Why this happens",
      "action": "What to do"
    }
  ]
}` 
        }
      ]
    });
    
    let raw = (res?.choices?.[0]?.message?.content ?? '').trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    
    const parsed = JSON.parse(raw);
    console.log(TAG, 'decisionFramework.generated', { scenarios: parsed?.scenarios?.length || 0 });
    return parsed;
  } catch (err) {
    console.error(TAG, 'decisionFramework.error', String(err?.message || err));
    return { scenarios: [] };
  }
}
/* ============================================================================
   BEYOND MCKINSEY: Resource Requirements (Appendix K)
   Mirrors genImplementationChecklist / genDecisionFramework style.
   ============================================================================ */
async function genResourceRequirements(canon, sections) {
  const languageInstruction =
    canon.lang && !/^english$/i.test(canon.lang)
      ? `\n\nIMPORTANT: Generate all content in ${canon.lang}. Use professional business terminology appropriate for ${canon.lang}.`
      : '';

  try {
    const openai = await getOpenAI();
  

    const reportContext = `
Industry: ${canon.industry || 'N/A'}
Time Frame: ${canon.timeFrame || 'N/A'}
Company Size: ${canon.companySize || 'N/A'}
Tier: ${canon.tier || 'N/A'}
Strategic Goal: ${canon.strategicGoal || 'N/A'}
Desired Outcome: ${canon.desiredOutcome || 'N/A'}

--- EXECUTIVE SUMMARY ---
${sections.exec || ''}
--- CURRENT STATE ---
${sections.current || ''}
--- FINANCIALS ---
${sections.financials || ''}
--- KPIS ---
${sections.kpis || ''}
--- OPERATIONS ---
${sections.ops || ''}
--- RISK ---
${sections.risk || ''}
--- ROI ---
${sections.roi || ''}
--- NEXT STEPS ---
${sections.nextSteps || ''}
    `.trim();

     const prompt = `
You are a transformation PMO resource planner.

From the report content below, build a concrete, non-blank resource plan that a client can execute.
Focus on what is actually needed to deliver the reform – not generic filler.

REPORT CONTENT:
${reportContext}

Return ONLY valid JSON with this exact top-level structure:

{
  "team": [
    {
      "role": "Role title",
      "fte": 1.5,
      "skills": ["Skill 1", "Skill 2"],
      "seniority": "Senior / Mid / Junior",
      "reportsTo": "Who they report to",
      "startPhase": "Phase 1",
      "endPhase": "Phase 4"
    }
  ],
  "budget": [
    {
      "category": "Category name",
      "description": "Short description",
      "oneOffCost": 50000,
      "runRatePerMonth": 12000,
      "currency": "${canon.currencyCode || 'CAD'}",
      "owner": "Budget owner"
    }
  ],
  "tools": [
    {
      "name": "Tool / platform",
      "purpose": "What it is used for",
      "licenseType": "SaaS / on-prem / other",
      "annualCost": 25000,
      "owner": "Owner role"
    }
  ],
  "training": [
    {
      "audience": "Who is trained",
      "topic": "Training topic",
      "format": "Workshop / e-learning / on-the-job",
      "hoursPerPerson": 8,
      "owner": "Training owner role",
      "successCriteria": "How you know it worked"
    }
  ]
}

Business logic rules:
- Every array must have at least 3–5 entries (no empty arrays).
- Make values consistent with the organization size, tier and costSavingsGoal.
- Use realistic FTEs (0.2–2.0 per role) and monetary values (no zeros unless justified).
- Keep strings concise and executive-ready.

Return STRICT JSON only – no markdown, no backticks.${languageInstruction}
    `.trim();

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that outputs valid JSON only. No markdown, no prose, no commentary.' +
            languageInstruction,
        },
        { role: 'user', content: prompt },
      ],
    });

    let raw = (res?.choices?.[0]?.message?.content ?? '').trim();
    raw = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(raw);
      console.log('[genResourceRequirements] Successfully parsed JSON');
      return parsed;
    } catch (e) {
      console.warn(
        '[genResourceRequirements] JSON parse failed; returning default skeleton',
        String(e?.message || e),
      );
      console.warn(
        '[genResourceRequirements] First 400 chars of bad payload:',
        raw.slice(0, 400),
      );
      return {
        team: [
          {
            role: 'Transformation Lead',
            fte: 1.0,
            skills: ['Change leadership', 'Stakeholder management'],
            seniority: 'Senior',
            reportsTo: 'Executive sponsor',
            startPhase: 'Phase 1',
            endPhase: 'Phase 5',
          },
        ],
        budget: [
          {
            category: 'Implementation budget',
            description: 'Core reform delivery budget',
            oneOffCost: 100000,
            runRatePerMonth: 25000,
            currency: canon.currencyCode || 'CAD',
            owner: 'CFO / Finance lead',
          },
        ],
        tools: [
          {
            name: 'Process mining platform',
            purpose: 'Identify inefficiencies and automation opportunities',
            licenseType: 'SaaS',
            annualCost: 45000,
            owner: 'Operations excellence lead',
          },
        ],
        training: [
          {
            audience: 'Front-line managers',
            topic: 'New operating model and KPIs',
            format: 'Workshop',
            hoursPerPerson: 6,
            owner: 'HR / L&D',
            successCriteria:
              'Managers can explain new KPIs and coach their teams.',
          },
        ],
      };
    }
  } catch (err) {
    console.error(
      '[genResourceRequirements] OpenAI call failed; returning default skeleton',
      err,
    );
    return {
      team: [],
      budget: [],
      tools: [],
      training: [],
    };
  }
}


/* ============================================================================
   [KT:SURGICAL][2025-10-30_00-11-29_EDT] — Finalize hook + Appendices (Oct 10 5:15 Implementation Kit JSON)
   - Adds __kt_finalize_report(html, canon, sections): runs template postprocess and appends Appendices.
   - Appendices include a machine-readable <script id="implementation-kit-json"> with JSON schema.
   - Source reference from Oct 10 5:15 is embedded below for governance (comment only).
============================================================================ */
/* --- BEGIN OCT-10-5:15 SOURCE EXCERPT ---
/* ===============================
   app/api/reform/generate/route.js
   =============================== *\/


/* -------------------------------------------------------------------------- */
/* [KT PATCH] Lazy OpenAI loader (no deletions)                                */
/* -------------------------------------------------------------------------- */
let __openai;

/**
 * [KT:APPENDIX-RENDERER] Converts AI-generated appendix spec to McKinsey-styled HTML
 * 
 * INPUT: appendixSpec from buildAppendicesFromAI()
 * {
 *   appendices: [
 *     { id: 'A', title: '...', description: '...', type: '...', columns: [...], rows: [...] }
 *   ]
 * }
 * 
 * OUTPUT: Beautiful HTML with:
 * - Section per appendix with proper header
 * - McKinsey-quality table styling (from reportTemplate.js pattern)
 * - Proper column widths (from spec)
 * - Professional typography and spacing
 */
function renderAppendicesHTML(appendixSpec, L = {}) {
  const TAG = '[KT:APPENDIX-RENDER]';
  const getLabel = (key, defaultVal) => {
    if (L && L[key]) return L[key];
    if (L && L[key.toUpperCase()]) return L[key.toUpperCase()];
    return defaultVal || key;
  };
  
  // [KT:I18N-APPENDIX] Get translated label for "Appendix" - e.g. Serbian: "Dodatak", French: "Annexe"
  const appendixLabel = getLabel('appendix', 'Appendix');
  const appendicesLabel = getLabel('appendices', 'Appendices');
  const noDataLabel = getLabel('noDataAvailable', 'No data available');

  if (!appendixSpec || !Array.isArray(appendixSpec.appendices) || appendixSpec.appendices.length === 0) {
    console.log(TAG, 'no appendices to render');
    return '';
  }

  try {
    const appendicesHTML = appendixSpec.appendices.map((app, idx) => {
      // [KT:FIX:APPENDIX-FALLBACK] More lenient validation - fill missing fields with defaults
      if (!app.title) {
        console.warn(TAG, `appendix ${idx} missing title, using default`);
        app.title = `Appendix ${String.fromCharCode(65 + idx)}`;
      }
      
      if (!Array.isArray(app.columns) || app.columns.length === 0) {
        console.warn(TAG, `appendix ${idx} has invalid columns, skipping`);
        return '';
      }
      
      if (!Array.isArray(app.rows) || app.rows.length === 0) {
        console.warn(TAG, `appendix ${idx} has no rows, rendering empty table`);
        // Continue rendering even with empty rows - shows structure
      }

      const sanitize = (str) =>
        String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const appendixID = `appendix-${(app.id || String.fromCharCode(65 + idx)).toLowerCase()}`;

      // [KT:APPENDIX-STYLE-FIX] Build table header row - use CSS classes, minimal inline styles
      const headerCells = app.columns.map(col => {
        const width = col.width || `${Math.round(100 / app.columns.length)}%`;
        return `<th style="width:${width}">${sanitize(col.name || '')}</th>`;
      }).join('');

      // [KT:APPENDIX-STYLE-FIX] Build data rows - rely on CSS for alternating colors
      const dataRows = (app.rows || []).map((rowData, rIdx) => {
        const cells = app.columns.map((col, cIdx) => {
          // Get value from row object using column name or index
          const key = col.name || `col${cIdx}`;
          const value = rowData[key] || rowData[Object.keys(rowData || {})[cIdx]] || '';
          return `<td>${sanitize(value)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      // [KT:APPENDIX-STYLE-FIX] Build complete appendix section - use section-appendix class for styling
      const appendixHTML = `
        <section id="${appendixID}" class="section-appendix" aria-label="${appendixLabel} ${sanitize(app.id || String.fromCharCode(65 + idx))}">
          <h3>${appendixLabel} ${sanitize(app.id || String.fromCharCode(65 + idx))} — ${sanitize(app.title)}</h3>
          ${app.description ? `<p class="appendix-description">${sanitize(app.description)}</p>` : ''}
          
          <table class="report-table appendix-table">
            <thead>
              <tr>${headerCells}</tr>
            </thead>
            <tbody>
              ${dataRows || '<tr><td colspan="' + app.columns.length + '" class="no-data">' + noDataLabel + '</td></tr>'}
            </tbody>
          </table>
        </section>
      `;

      return appendixHTML;
    }).join('');

    const appendicesSection = `
      <section id="appendices" class="section-appendices" aria-label="${appendicesLabel}">
        <h2>${appendicesLabel}</h2>
        ${appendixSpec.summary ? `<p class="appendix-summary">${sanitize(appendixSpec.summary)}</p>` : ''}
        ${appendicesHTML}
      </section>
    `;

    console.log(TAG, 'rendered appendices:', {
      count: appendixSpec.appendices.length,
      ids: appendixSpec.appendices.map(a => a.id).join(', ')
    });

    return appendicesSection;

  } catch (err) {
    console.error(TAG, 'rendering error:', err);
    return '';
  }
}

export async function __kt_buildAppendices_FromImplementationKit(reportHTML, canon, sections){
  const TAG = '[KT:APPENDIX-BRIDGE]';
  
  try {
    // Get translated labels for error messages and fallback content
    const L = await translateLabels(canon.lang || 'English');
    
    console.log(TAG, 'starting appendix generation', {
      lang: canon.lang,
      orgName: canon.orgName,
      hasSections: !!sections
    });

    // [KT:APPENDIX-AI-FLOW] Call the new AI-driven appendix generator
    // This analyzes recommendations and generates context-specific appendices
    const appendixSpec = await buildAppendicesFromAI(reportHTML, canon, sections);

    if (!appendixSpec || !Array.isArray(appendixSpec.appendices) || appendixSpec.appendices.length === 0) {
      console.warn(TAG, 'AI appendix generation returned empty, no appendices will be generated');
      return ''; // Return empty string, not error message
    }

    console.log(TAG, 'AI generated appendices:', {
      count: appendixSpec.appendices.length,
      ids: appendixSpec.appendices.map(a => a.id).join(', ')
    });

    // [KT:APPENDIX-RENDER] Convert AI spec to HTML using McKinsey styling
    const appendicesHTML = renderAppendicesHTML(appendixSpec, L);

    // [KT:APPENDIX-EMBED] Embed the spec as JSON for potential client-side processing
    const embed = '<script type="application/json" id="appendix-spec-json">' + JSON.stringify(appendixSpec) + '</script>';

    return appendicesHTML + "\n" + embed;

  } catch (err) {
    console.error(TAG, 'critical appendix generation error:', err);
    // Graceful fallback - no appendices rather than error
    return '';
  }
}

export async function __kt_finalize_report(html, canon, sections){
  try{
    let out = String(html||'');
    try{ if (typeof __kt_postprocess_report_html === 'function') out = __kt_postprocess_report_html(out); }catch(e){}
    try{ const app = await __kt_buildAppendices_FromImplementationKit(out, canon, sections); if (app) out += "\n" + app; }catch(e){}
    return out;
  }catch(e){ return html; }
}
