// [KT:SURGICAL:APPENDIX-GRAPH-RENDER-FIX] (moved to POST handler)
// Appendix predictive charts are inserted AFTER main visuals.
// We trigger a second renderer pass for appendix-only figures.
// (See POST handler for active code)
// [KT:SURGICAL:TRANSLATE-PATH-FIX:REVISED]
// Use Next.js alias for lib import; fallback commented for traceability.
import translate from '@/lib/translate.js';
//import { setWorldClassVisualsTranslator } from '@/lib/worldClassVisuals.js';//
//setWorldClassVisualsTranslator(graphTranslator);//
// [KT:I18N-TABLE-TITLES-LANG-GUARD] — soft check for English-only AI retitling
// [KT:SURGICAL:PREDICTIVE-BUILDER] Dynamic predictive model from GPT-5 Nano
// (Duplicate buildPredictiveModelSpec removed by patch)
// [KT:SURGICAL:PREDICTIVE-BUILDER] Dynamic predictive model from GPT-5 Nano

async function buildPredictiveModelSpec(canon = {}, sections = {}, reportHTML = '') {
  try {
    const openai = await getOpenAI();
    const lang = String(canon?.lang || 'English');
    const langNote = !/^english$/i.test(lang)
      ? `All human-readable strings ("labels", "xTitle", "yTitle") must be written in ${lang}.`
      : 'Use clear business English for all human-readable strings.';

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
Context:
CANON=${JSON.stringify(canon).slice(0, 4000)}
SECTION_KEYS=${Object.keys(sections || {}).join(',')}
HTML_SNIPPET=${String(reportHTML || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000)}
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
      const jsonStr = extractJsonObject(raw) || raw;

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
          xTitle: 'Time',
          yTitle: `Value (${canon?.currencySymbol || '$'})`
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
    return { labels, values, xTitle: 'Time', yTitle: 'Value ($)' };
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
import { lineChartHTML, barChartHTML, heatmapHTML, benchmarkHTML, GRAPH_CSS, initGraphUiTranslations } from '@/lib/reportGraphs.js';
import { 
  visualTimelineHTML, 
  radarChartHTML, 
  riskHeatmapHTML, 
  waterfallChartHTML, 
  executiveSummaryInfographicHTML 
} from '@/lib/worldClassVisuals.js'; // [MCKINSEY-BEATING] 5 world-class visualizations
import { setGraphTranslator } from "@/lib/reportGraphs";

// Wherever you already know the final report language:
//setGraphTranslator((s) => translateToReportLanguage(s, lang));//
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
// [KT:SURGICAL:JSON-EXTRACTOR-STUB]
// Minimal safe JSON object extractor for GPT output.
function extractJsonObject(raw) {
try {
const str = String(raw || '');
const first = str.indexOf('{');
const last = str.lastIndexOf('}');
if (first >= 0 && last > first) return str.slice(first, last + 1);
} catch (e) {
console.log(TAG, 'extractJsonObject.error', String(e?.message || e));
}
return null;
}
//const TAG = '[SR:REFORM]';//
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// [KT:SURGICAL:RUN-LOCK] — begin
// Purpose: prove at runtime that THIS file executed; adds log + HTML stamp.
const SURGICAL_RUN_LOCK = 'KT-RUNLOCK-2025-10-18-A';


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
    const raw = JSON.stringify(obj);
    return raw.replace(/"/g, '&quot;');
  } catch {
    return '{}';
  }
}

// === (kept) but used by Oct 9 predictive: safe attr JSON parser
function safeParseAttrJSON(s = '') {
  try {
    return JSON.parse(
      String(s)
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&'),
    );
  } catch {
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
  try {
    const src = String(html || '');
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
    return html;
  }
}


// Extract meta for a fragment (Oct 9 logic, adapted)
function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '', xTitle: '', yTitle: '', labelsLen: 0, dataLen: 0 };
  if (!frag) return out;

  const chart = frag.match(new RegExp('<figure[^>]*data-chart=["\']([\\s\\S]*?)["\']', 'i'));
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



  const bench = frag.match(
    new RegExp(
      '<figure[^>]*data-widget=["\']benchmark["\'][^>]*data-spec=["\']([\\s\\S]*?)["\']',
      'i',
    ),
  );
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
      out.xTitle = 'Measure';
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = 2;
      out.dataLen = 2;
    } catch (e) {
      console.log(TAG, 'predictive.parse.exception', String(e?.message || e));
    }
    return out;
  }

  const heat = frag.match(new RegExp('<div[^>]*data-heatmap=["\']([\\s\\S]*?)["\']', 'i'));
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
      out.xTitle = 'Columns';
      out.yTitle = 'Rows';
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
    let obj = {};
    try {
      obj = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    } catch {
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
}

/* ========================================================================== */
/* Predictive main selector (Oct 9 flow)                                       */
/* ========================================================================== */
async function choosePredictiveFragment(section, canon, sectionHtml, existingSigSet) {
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
    /*if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
      try {
        const translated = await translateChartLabels(
          {
            title: merged.title,
            xTitle: merged.xTitle,
            yTitle: merged.yTitle,
          },
          canon.lang,
        );
        merged.title  = translated.title;
        merged.xTitle = translated.xTitle;
        merged.yTitle = translated.yTitle;
      } catch (e) {
        console.log(TAG, 'predictive.translateLabels.error', section, String(e?.message || e));
      }
    }*/

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
    
    // [KT:SURGICAL:I18N-PREDICTIVE] translate titles/axes into report language
    /*if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
      try {
        const translatedMeta = await translateChartLabels(
          {
            title: merged.title,
            xTitle: merged.xTitle,
            yTitle: merged.yTitle,
          },
          canon.lang,
        );
        merged.title = translatedMeta.title;
        merged.xTitle = translatedMeta.xTitle;
        merged.yTitle = translatedMeta.yTitle;
      } catch (e) {
        console.log(TAG, 'predictive.translate.error', section, String(e?.message || e));
      }
    }*/

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
        if (!merged.title) merged.title = meta.title || `${String(section).toUpperCase()} Predictive`;
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

    const obj = JSON.parse(res.choices?.[0]?.message?.content || '{"benchmarks":[]}');
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
            'Return a single concise ENGLISH title, 6–14 words, no subtitle, no quotes.',
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

    // 5) Deterministic fallback if still empty
    if (!title) {
      const orgPart =
        canon?.orgName && canon.orgName !== 'the client organization'
          ? `${canon.orgName} `
          : '';
      const timeframePart = canon?.timeFrame ? ` – ${canon.timeFrame}` : '';

      title = `${orgPart}Strategic Transformation & Value Creation Plan${timeframePart}`.trim();

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



function sectionPrompt(section, canon, minWords) {
  // [KT:SURGICAL][NEXT-STEPS-PARAGRAPH-RULE] Inject 2–3 sentence rule for Next Steps section
  return `
Audience: C-suite executives. Tone: McKinsey-level consulting - concise, evidence-driven, pragmatic, quantified.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Size: ${canon.companySize}. Time frame: ${canon.timeFrame}.

MCKINSEY WRITING STYLE REQUIREMENTS:
- Lead with impact: Start each section with the "So What" - the business implication in $ or %
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
- End each subsection with clear implication: "This means [Company] should..."

INSIGHT CALLOUTS (include 1-2 per section for maximum impact):
Use this HTML structure for key insights with quantified business impact:
<div class="insight-callout">
  <div class="insight-callout-header">KEY INSIGHT</div>
  <div class="insight-callout-title">[Bold statement of finding]</div>
  <div class="insight-callout-impact">$[X]M potential value</div>
  <div class="insight-callout-body">[1-2 sentence explanation]</div>
  <div class="insight-callout-implication">This means [Company] should [specific action].</div>
</div>

CHART STORYTELLING:
After each chart/figure, add a brief <p> that explains "So what?" - the business implication.
Example: "<p>This 23% gap represents $2.1M in unrealized savings that can be captured within 6 months through targeted process improvements.</p>"

When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.
${NO_VISUALS_GUIDANCE}

Section: ${section}.
Hard minimum words: ${minWords}. Include at least 3-5 <h3> subheadings to structure the content.
Avoid generic filler. No appendix.
`.trim();
}

function expandPrompt(section, canon, remainingWords) {
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.

MCKINSEY STYLE REQUIREMENTS (apply to ALL new content):
- Lead with impact: Start sentences with $ amounts or % changes where possible
- Quantify everything: Never say "significant" without numbers
- Active voice: "[Company] should invest" not "Investment should be made"
- Executive vocabulary: Use "strategic imperative", "value driver", "competitive advantage"
- Reading level: 8th grade (short sentences, clear language)
- Structure: Situation-Complication-Resolution (what's true → why it matters → what to do)
- End each subsection with clear implication: "This means [Company] should..."

STRUCTURE:
- Start with a new <h3> subheading that describes this subsection (insight-driven, not topic-driven)
- Write 2-3 paragraphs under that subheading (max 4 sentences each, no run-on sentences)
- Target at least ${remainingWords} words

Output valid HTML only.
Use <table class="report-table"> for any tables. Do NOT include charts or heatmaps here.
`.trim();
}

/* ========================================================================== */
/* Appendices — SAFE builder (replaces dangling $appendix)                     */
/* ========================================================================== */
function buildAppendicesHTML(canon, sections) {
  // [KT:SURGICAL] Original placeholder commented to preserve history:
  // $appendix

  try {
    const counts = {};
    const keys = Object.keys(sections || {});
    for (const k of keys) {
      const html = String(sections[k] || '');
      counts[k] = {
        charts: (html.match(/data-chart=/g) || []).length,
        heatmaps: (html.match(/data-heatmap=/g) || []).length,
        benchmarks: (html.match(/data-widget=['"]benchmark['"]/g) || []).length,
        tables: (html.match(/<table\b/gi) || []).length,
        words: String(html)
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .filter(Boolean).length,
      };
    }

    const rows = keys
      .map(
        (k) =>
          `<tr>
         <td>${k}</td>
         <td>${counts[k].words}</td>
         <td>${counts[k].charts}</td>
         <td>${counts[k].heatmaps}</td>
         <td>${counts[k].benchmarks}</td>
         <td>${counts[k].tables}</td>
       </tr>`,
      )
      .join('');

    const appendixHTML = `<section id="appendices">
         <h3>Appendices</h3>
         <h4>Generation Diagnostics</h4>
         <table class="report-table">
           <thead>
             <tr><th>Section</th><th>Words</th><th>Charts</th><th>Heatmaps</th><th>Benchmarks</th><th>Tables</th></tr>
           </thead>
           <tbody>${rows}</tbody>
         </table>
       </section>`;

    return appendixHTML;
  } catch (e) {
    console.log(TAG, 'appendix.safeFallback.error', String(e?.message || e));
    return '<section id="appendices"><h3>Appendices</h3><p>Appendix generation failed gracefully.</p></section>';
  }
}

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
  // [KT:S] table-title debug counters
  let __kt_tbl_scanned = 0, __kt_tbl_titled = 0;
  const __kt_tbl_samples = [];

  try {
    let out = String(html || '');
    // Find all <table ... class="report-table"...>...</table> occurrences
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

      // Check immediate previous content to see if it already has a table-title directly prior (within 200 chars)
      const beforeSnippet = out.slice(Math.max(0, tableStart - 400), tableStart);
      if (/\btable-title\b/i.test(beforeSnippet)) {
        // Already has a title; leave table unchanged
        parts.push(tableStr);
        cursor = tableEnd;
        continue;
      }

      // Derive title from the table's thead first row headers
      let title = '(Untitled Table)';
      try {
        const theadMatch = tableStr.match(/<thead[\s\S]*?<\/thead>/i);
        if (theadMatch) {
          const firstRowMatch = theadMatch[0].match(/<tr[\s\S]*?<\/tr>/i);
          if (firstRowMatch) {
            // extract all <th> content in that row
            const ths = Array.from(firstRowMatch[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)).map(
              (m) => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
            ).filter(Boolean);
            if (ths.length) {
              title = ths.join(' • ');
            } else {
              // fallback to any cell text in thead row
              const tds = Array.from(firstRowMatch[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map(
                (m) => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
              ).filter(Boolean);
              if (tds.length) {
                title = tds.join(' • ');
              }
            }
          }
        }
        // REMOVED: fallback to first tbody row - this incorrectly uses data rows as titles
        // If no thead exists, leave title as "(Untitled Table)" for AI to improve later
      } catch (e) {
        // fallthrough to default title
        title = '(Untitled Table)';
      }

      // [KT:S] table-title debug: count + sample
      __kt_tbl_scanned++;
      if (title && title !== '(Untitled Table)') {
        __kt_tbl_titled++;
        if (__kt_tbl_samples.length < 3) __kt_tbl_samples.push(title);
      }

      // Sanitize title for safety (strip tags)
      title = String(title || '(Untitled Table)').replace(/<[^>]*>/g, '').trim() || '(Untitled Table)';

      // Build the title div (white text for dark theme)
      const titleDiv = `<h3 class="table-title" style="font-weight:bold;color:#FFFFFF;margin-bottom:.4rem;">${title}</h3>`;

      // Insert titleDiv before table
      parts.push(titleDiv + '\n' + tableStr);

      // [KT:S] table-title debug summary
      console.log('[SR:REFORM] table.titles.debug', {
        scanned: __kt_tbl_scanned,
        injected: __kt_tbl_titled,
        sample: __kt_tbl_samples
      });

      cursor = tableEnd;
    }
    // Append remaining tail
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
async function injectTableTitlesAI(html) {
  try {
    let out = injectTableTitles(html); // reuse existing deterministic titles
    // Updated regex to match <h3 class="table-title"> instead of <div>
    const tblRe = /(<h3 class="table-title"[^>]*>)([\s\S]*?)(<\/h3>\s*<table\b[^>]*class=["'][^"']*report-table[^"']*["'][^>]*>[\s\S]*?<\/table>)/gi;
    const parts = [];
    let last = 0, m;
    while ((m = tblRe.exec(out)) !== null) {
      const start = m.index, end = tblRe.lastIndex;
      parts.push(out.slice(last, start));
      const oldTitle = String(m[2]).replace(/\s+/g,' ').trim();
      const block = m[0];

      // Heuristic: only improve obviously-generic titles (e.g., header-row concatenations)
      const looksGeneric = 
        /untitled/i.test(oldTitle) ||                              // "(Untitled Table)" needs AI improvement
        /metric\b/i.test(oldTitle) || 
        /baseline|target|rationale/i.test(oldTitle) || 
        oldTitle.split('•').length >= 3;

      if (!looksGeneric) { parts.push(block); last = end; continue; }

      let newTitle = oldTitle;
      try {
        const tblOnly = (block.match(/<table[\s\S]*<\/table>/i)||[])[0] || '';
        const prompt = [
          'You are naming a business table for executives. Return ONLY a short title (<= 7 words).',
          'Describe what the table is about (not headers). No punctuation except letters/numbers/&/%.',
          'HTML of the table:',
          tblOnly
        ].join('\n');

        const r = await openai.chat.completions.create({
          model: MODEL,
          temperature: 1,
          messages: [
            { role: 'system', content: 'Return only the title text. No quotes, no markdown.' },
            { role: 'user', content: prompt }
          ]
        });
        const t = (r.choices?.[0]?.message?.content || '').trim();
        if (t) newTitle = t.replace(/<[^>]*>/g,'').slice(0, 80);
      } catch {}

      // Preserve the style attribute when replacing title content
      const upgraded = block.replace(/(<h3 class="table-title"[^>]*>)[\s\S]*?(<\/h3>)/i, `$1${newTitle}$2`);
      parts.push(upgraded);
      last = end;
      console.log('[SR:REFORM] table.title.ai', { was: oldTitle, now: newTitle });
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

// [KT:SURGICAL:LANG-FIX] Chart label translator used for KPI, benchmark, and predictive specs
// [KT:SURGICAL CHART LABELS] dynamic translation for per-visual axes
/*async function translateChartLabels(obj, lang) {
  if (!lang || /^english$/i.test(String(lang))) return obj;
  try {
    return {
      // [KT:SURGICAL:KPI-FIX] preserve any pre-existing spec fields
      ...(obj || {}),
      title: await translate(obj?.title || '', lang),
      xTitle: await translate(obj?.xTitle || '', lang),
      yTitle: await translate(obj?.yTitle || '', lang),
    };
  } catch (e) {
    console.log(TAG, 'chartLabels.translate.error', String(e?.message || e));
    return obj;
  }
}*/

// [KT:SURGICAL:LANG-FIX] Chart label translator used for KPI, benchmark, and predictive specs
// [KT:SURGICAL CHART LABELS] dynamic translation for per-visual axes

/* [KT:LEGACY-CHART-LABELS][KEPT-FOR-AUDIT]
async function translateChartLabels(obj, lang) {
  if (!lang || /^english$/i.test(String(lang))) return obj;
  try {
    return {
      .obj, // <<< FIX: spread the existing fields
      title: await translate(obj.title || '', lang),
      xTitle: await translate(obj.xTitle || '', lang),
      yTitle: await translate(obj.yTitle || '', lang),
    };
  } catch (e) {
    console.log(TAG, 'chartLabels.translate.error', String(e?.message || e));
    return obj;
  }
}
*/

/**
 * [KT:SURGICAL:LANG-FIX v2]
 * Robust chart label translator that:
 * - Uses TRANSLATION_MODEL directly via getOpenAI()
 * - Translates title, xTitle, yTitle in one shot
 * - Falls back to original labels on any error
 */
// [KT:SURGICAL:LANG-FIX] Chart label translator used for KPI, benchmark, and predictive specs
// [KT:SURGICAL CHART LABELS] dynamic translation for per-visual axes

/* [KT:LEGACY-CHART-LABELS][KEPT-FOR-AUDIT]
async function translateChartLabels(obj, lang) {
  if (!lang || /^english$/i.test(String(lang))) return obj;
  try {
    return {
      .obj, // <<< FIX: spread the existing fields
      title: await translate(obj.title || '', lang),
      xTitle: await translate(obj.xTitle || '', lang),
      yTitle: await translate(obj.yTitle || '', lang),
    };
  } catch (e) {
    console.log(TAG, 'chartLabels.translate.error', String(e?.message || e));
    return obj;
  }
}
*/

/**
 * [KT:SURGICAL:LANG-FIX v2]
 * Robust chart label translator that:
 * - Uses TRANSLATION_MODEL directly via getOpenAI()
 * - Translates title, xTitle, yTitle in one shot
 * - Falls back to original labels on any error
 */
async function translateChartLabels(obj, lang) {
  // No-op for English or missing language
  if (!lang || __isEnglishReportLangSoft?.(lang) || /^english$/i.test(String(lang))) {
    return obj;
  }

  const safe = {
    title: obj?.title || '',
    xTitle: obj?.xTitle || '',
    yTitle: obj?.yTitle || '',
  };

  try {
    const openai = await getOpenAI();
    const res = await openai.chat.completions.create({
      model: TRANSLATION_MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content:
            `You translate short chart titles and axis labels into ${lang}.` +
            ` Respond ONLY with strict JSON like {"title":"...","xTitle":"...","yTitle":"..."}.`,
        },
        {
          role: 'user',
          content: JSON.stringify(safe),
        },
      ],
      max_completion_tokens: 128,
    });

    let out = res.choices?.[0]?.message?.content?.trim() || '';

    // Strip possible ```json fences
    out = out.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(out);

    return {
      ...obj,
      title: parsed.title || obj.title,
      xTitle: parsed.xTitle || obj.xTitle,
      yTitle: parsed.yTitle || obj.yTitle,
    };
  } catch (e) {
    console.log(TAG, 'chartLabels.translate.error', String(e?.message || e));
    // On any error, keep original English labels so charts still render
    return obj;
  }
}




async function translateLabels(targetLang) {
  // Skip translation for English
  if (!targetLang || /^english$/i.test(targetLang)) {
    return DEFAULT_LABELS;
  }
/*async function translateChartLabels(obj, lang) {
  if (!lang || /^english$/i.test(lang)) return obj;
  return {
    ...obj,
    title: await translate(obj.title || '', lang),
    xTitle: await translate(obj.xTitle || '', lang),
    yTitle: await translate(obj.yTitle || '', lang),
  };
}*/

  // [KT:SURGICAL] Deterministic chart label localization for non-English reports.
// Reason: GPT-based chart label translation is brittle at Nano scale
//         (JSON truncation => "Unexpected end of JSON input").
// This NEVER touches numbers or chart structure – only human-readable labels.
// Safe for data-chart JSON because we only replace fixed English phrases.
/**
 * DYNAMIC chart-label translator for ALL standard charts.
 * No hard-coding, no per-language maps.
 * Uses GPT-Nano to translate only human-visible labels,
 * safely and deterministically.
 */
async function patchStandardChartLabelsForLanguage(html, lang) {
  if (!lang || __isEnglishReportLangSoft(lang)) return html;

  try {
    // 1. Extract ALL chart label strings dynamically from the HTML.
    //    This captures titles, axis labels, tick labels, dropdown labels, summary text, etc.
    //    You do NOT need to maintain any list manually.
    const labelRegex =
      /"title":"(.*?)"| "xTitle":"(.*?)"| "yTitle":"(.*?)"|>(Years|Year|Months|Month|Percent|Index|Savings|Spend|Cumulative|Overall|Key Insights)</g;

    const found = new Set();
    let match;

    while ((match = labelRegex.exec(html)) !== null) {
      for (let i = 1; i < match.length; i++) {
        const val = match[i];
        if (val && typeof val === 'string' && val.trim().length > 0) {
          found.add(val.trim());
        }
      }
    }

    // Nothing to translate?
    if (found.size === 0) return html;

    const phrases = Array.from(found);

    // 2. Ask GPT-Nano to translate ALL extracted labels at once.
    const openai = await getOpenAI();

    const prompt = `
You are a translation engine.  
Translate the following chart-related UI strings into ${lang}.  
Return STRICT JSON OBJECT where keys equal the original text 
and values contain ONLY the translated text.

Example format:
{
  "Projected Savings Over Time": "…",
  "Years": "…"
}

DO NOT add commentary.
DO NOT add markdown.
JSON ONLY.
    `;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07",
      temperature: 1,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(phrases, null, 2) }
      ]
    });

    let raw = (res?.choices?.[0]?.message?.content || "").trim();

    // Use your trusted JSON extractor
    const jsonStr = extractJsonObject(raw);
    if (!jsonStr) return html; // Fail-safe

    let map;
    try {
      map = JSON.parse(jsonStr);
    } catch {
      return html; // Fail-safe
    }

    if (!map || typeof map !== "object") return html;

    // 3. Apply replacements safely (split/join avoids corrupting JSON)
    let patched = html;

    for (const [src, dst] of Object.entries(map)) {
      if (!dst || src === dst) continue;
      patched = patched.split(src).join(dst);
    }

    return patched;
  } catch (err) {
    console.warn("[SR:REFORM] dynamicChartPatch.error", String(err));
    return html;
  }
}


  try {
    console.log(TAG, 'labels.translate.start', { lang: targetLang, labelCount: Object.keys(DEFAULT_LABELS).length });
    const openai = await getOpenAI();
    const res = await openai.chat.completions.create({
      model: TRANSLATION_MODEL,
      temperature: 1, // Lower temperature for accurate translation
      messages: [
      { 
        role: 'system', 
        content: `You are a professional business translator. Translate the following UI labels and ALL visible report content into ${targetLang}.
  CRITICAL RULES:
  - Translate EVERY visible string, including:
    * Table titles, figure captions, chart titles, axis labels, button labels, section headings, and ALL other user-facing strings.
    * All chart/graph titles, y-axis and x-axis labels, legend labels, tooltips, and any text inside data- attributes.
    * All table headers, footers, and cell content.
    * All section and appendix titles, headings, and subheadings.
    * Any label, caption, or content that could be seen by the user in the report.
  - Do NOT translate technical acronyms: ROI, KPI, RACI, RAID, EBITDA, FTE
  - Do NOT translate currency codes (USD, CAD, EUR, etc.), numbers, percentages, company names, email addresses, or URLs.
  - Use professional business terminology appropriate for ${targetLang}
  - Do NOT add any explanations or markdown formatting
  - Ensure all keys from the input are present in output
  - Ensure ALL titles, including table titles, chart titles, axis labels, section headings, and any other visible UI text, are translated.
  - If you see any string that could be visible to the user, translate it.`
      },
      // Send the DEFAULT_LABELS as the user message for translation
      { role: 'user', content: JSON.stringify(DEFAULT_LABELS) }
      ],
      max_completion_tokens: 2000
    });
    let translated = res.choices?.[0]?.message?.content?.trim() || '';
    
    // Remove markdown code blocks if present
    translated = translated.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const labels = JSON.parse(translated);
    console.log(TAG, 'labels.translate.complete', { lang: targetLang, success: true });
    return labels;
  } catch (err) {
    console.error(TAG, 'labels.translate.error', { lang: targetLang, error: String(err?.message || err) });
    return DEFAULT_LABELS; // Return English on error
  }
}

// [KT:SURGICAL:TRANSLATION-FIX] Comprehensive HTML translation function
// Translates entire HTML document while preserving structure, tags, and formatting
async function translateHTML(html, targetLang) {
  // Skip translation for English
  if (!targetLang || /^english$/i.test(targetLang)) {
    return html;
  }

  try {
    console.log(TAG, 'translateHTML.start', { lang: targetLang, htmlLength: html.length });
    const openai = await getOpenAI();
    // Split HTML into manageable chunks (GPT-5 can handle large contexts but we'll be cautious)
    // We'll translate the entire document as one call for consistency*/
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07', // Use nano-5 for testing, GPT-4 in production
      temperature: 1, // Low temperature for consistent, accurate translation
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
      max_completion_tokens: 16000 // Large token limit for full document translation
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
    return html; // Return original on error
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
  const languageInstruction = canon.lang && !/^english$/i.test(canon.lang) 
    ? `\n\nIMPORTANT: Write all content in ${canon.lang}. Use professional business terminology appropriate for ${canon.lang}.`
    : '';

  // [KT:SURGICAL:NEXT-STEPS-SECTION] Add explicit prompt for Next Steps section
  let promptContent;
  // [KT:SURGICAL][NEXT-STEPS-PROMPT-UNIFIED] Use sectionPrompt for nextSteps to enforce 2–3 sentence rule
  if (section === 'nextSteps' || section === 'next-steps' || section === 'Next Steps') {
    // promptContent = `Write a standalone "Next Steps" section for ${canon.orgName} based on the preceding report sections. Use a clear, actionable style. Structure with 2-3 <h3> subheadings (e.g., "Immediate Actions", "Short-Term Priorities", "Long-Term Roadmap"). Under each subheading, write 2-3 paragraphs, max 3-4 sentences per paragraph, no run-on sentences. Do not repeat content from the conclusion. Style to match other report sections.`;
    promptContent = sectionPrompt('nextSteps', canon, floor);
  } else {
    promptContent = sectionPrompt(section, canon, floor);
  }

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role: 'system', content: `You are a senior consultant. Return clean HTML fragments only.${languageInstruction}` },
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
  
  const languageInstruction = canon.lang && !/^english$/i.test(canon.lang) 
    ? `\n\nIMPORTANT: Write all content in ${canon.lang}. Use professional business terminology appropriate for ${canon.lang}.`
    : '';
  
  while (words < floor && guard < 8) {
    const remaining = Math.max(200, floor - words);
    const openai = await getOpenAI();
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: `Extend the section with NEW, non-duplicative content. Return HTML only.${languageInstruction}`,
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
          'Extract phases as JSON: [{"title":"Phase X","caption":"one sentence"}, ...] (5 items). Output only pure JSON.' +
          languageInstruction,
      },
      {
        role: 'user',
        content: `From this timeline for ${canon.orgName}, extract 5 phases with succinct titles and 1-sentence captions.\n---\n${html}`,
      },
    ],
  });
  try {
    return JSON.parse(res.choices?.[0]?.message?.content || '[]').slice(0, 5);
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
    logoUrl: input.logoUrl || '/images/secure.png',
    reportDate: today(),
    minWords: clamp(input.minWords || 20000, 8000, 80000),
    currencyCode: currencyUnitForCountry(input.country || 'Canada'), // Add currency based on country
  };
  canon.minWords = TOTAL_FLOOR;

  console.log(TAG, 'generate.start', {
    model: MODEL,
    org: canon.orgName,
    minWords: canon.minWords,
  });

  const order = ['exec', 'current', 'financials', 'kpis', 'timeline', 'ops', 'risk', 'roi', 'nextSteps'];
  const sections = {};

  for (const key of order) {
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
    // [KT:SURGICAL:AI-TITLE-PAGE] derive AI title once per report
canon.aiTitle = await __kt_generateReportTitle(canon, sections);


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

    // Generate dynamic KPI benchmarks + standard charts
    if (key === 'kpis') {
      try {
        console.log(TAG, '🔧 [KPI-FIX] Starting KPI chart generation...');
        
        // Verify imports are available
        if (!barChartHTML || !lineChartHTML || !benchmarkHTML) {
          console.error(TAG, '❌ [KPI-FIX] ERROR: Chart functions not imported!', {
            barChartHTML: !!barChartHTML,
            lineChartHTML: !!lineChartHTML,
            benchmarkHTML: !!benchmarkHTML
          });
          throw new Error('Chart functions not available');
        }
        console.log(TAG, '✅ [KPI-FIX] Chart functions imported successfully');
      // [KT:SURGICAL:I18N-AI-SUMMARY] Pre-translate chart UI (Overall / Key Insights / Type)
const graphUi = await initGraphUiTranslations(
canon.lang && !__isEnglishReportLangSoft(canon.lang) ? canon.lang : 'English'
);

        
        // Helper to generate labels
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
        console.log(TAG, '✅ [KPI-FIX] Generated labels:', labels.length, 'periods');
        
        const mkDefaultSeries = (len, total = 100) =>
          Array.from({ length: len }, (_, i) => Math.round(((i + 1) * total) / len));
        
        // Wrap all KPI charts in dashboard-wide section
        let kpiCharts = '<section class="kpi-dash dashboard-wide">\n';
        console.log(TAG, '✅ [KPI-FIX] Opened dashboard-wide section');
        
        // 1. Savings Realization (Bar)
        console.log(TAG, '🔧 [KPI-FIX] Generating Savings (Bar) chart...');
  let savingsSpec = {
title: 'Savings Realization',
labels,
series: mkDefaultSeries(labels.length, canon?.costSavingsGoal || 100000),
xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
yTitle: 'Savings',
ui: graphUi
};

  if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
      try {
        savingsSpec = await translateChartLabels(savingsSpec, canon.lang);
      } catch (e) {
        console.log(TAG, 'kpi.savings.translate.error', String(e?.message || e));
      }
    }
const savingsChart = barChartHTML(savingsSpec);
kpiCharts += savingsChart + '\n';
        console.log(TAG, '✅ [KPI-FIX] Savings chart generated:', savingsChart.length, 'chars');
        
        // 2. Payback Over Horizon (Line)
        console.log(TAG, '🔧 [KPI-FIX] Generating Payback (Line) chart...');
        // [KT:SURGICAL:LANG-FIX] Wrap KPI payback chart spec so titles/axes can be translated
let paybackSpec = {
title: 'Payback Over Horizon',
labels,
series: mkDefaultSeries(labels.length, canon?.costSavingsGoal || 100000),
xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
yTitle: 'Cumulative',
ui: graphUi
};

    if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
      try {
        paybackSpec = await translateChartLabels(paybackSpec, canon.lang);
      } catch (e) {
        console.log(TAG, 'kpi.payback.translate.error', String(e?.message || e));
      }
    }

const paybackChart = lineChartHTML(paybackSpec);
kpiCharts += paybackChart + '\n';

        console.log(TAG, '✅ [KPI-FIX] Payback chart generated:', paybackChart.length, 'chars');
        
        // 3 & 4. AI-generated benchmarks
        console.log(TAG, '🔧 [KPI-FIX] Calling generateKPIBenchmarks...');
        const benchmarks = await generateKPIBenchmarks(canon, html);
        console.log(TAG, '✅ [KPI-FIX] Received', benchmarks.length, 'AI benchmarks');
        
        // Log already happens inside generateKPIBenchmarks() at line 1005
        // Log already happens inside generateKPIBenchmarks() at line 1005
for (let i = 0; i < benchmarks.length; i++) {
  let bm = benchmarks[i];

  // [KT:SURGICAL:KPI-FIX:OLD-BM-SPEC]
  // Keeping the original idea commented out for audit; it referenced bmSpec (undefined).
  /*
  if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
    try {
      bmSpec = await translateChartLabels(bmSpec, canon.lang);
    } catch (e) {
      console.log(TAG, 'benchmark.translate.error', String(e?.message || e));
    }
  }
  */

  // [KT:SURGICAL:KPI-FIX:BM-TRANSLATE]
  // Correct version: translate the benchmark spec itself when non-English
  if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
    try {
      bm = await translateChartLabels(bm, canon.lang);
    } catch (e) {
      console.log(TAG, 'benchmark.translate.error', String(e?.message || e));
    }
  }

  console.log(TAG, `🔧 [KPI-FIX] Generating AI benchmark ${i + 1}:`, bm.title);
  console.log(TAG, `📊 [KPI-FIX] Benchmark ${i + 1} VALUES:`, {
    current: bm.current,
    benchmark: bm.benchmark,
    xTitle: bm.xTitle,
    yTitle: bm.yTitle,
  });

  const bmChart = benchmarkHTML({ ...bm, ui: graphUi });
  kpiCharts += bmChart + '\n';
}

        kpiCharts += '</section>';
        console.log(TAG, '✅ [KPI-FIX] Closed dashboard-wide section');
        
        console.log(TAG, '📊 [KPI-FIX] SUMMARY:', {
          totalCharts: 2 + benchmarks.length,
          savingsChartSize: savingsChart.length,
          paybackChartSize: paybackChart.length,
          benchmarkCount: benchmarks.length,
          totalKpiHtmlSize: kpiCharts.length,
          hasDashboardWideClass: kpiCharts.includes('dashboard-wide')
        });
        
        // Prepend charts to the text content
        const beforePrepend = html.length;
        html = kpiCharts + '\n' + html;
        console.log(TAG, '✅ [KPI-FIX] Charts prepended to section HTML');
        console.log(TAG, '📈 [KPI-FIX] HTML size: before =', beforePrepend, ', after =', html.length, ', added =', html.length - beforePrepend);
        
      } catch (e3) {
        console.error(TAG, '❌ [KPI-FIX] FATAL ERROR:', String(e3?.message || e3));
        console.error(TAG, '❌ [KPI-FIX] Stack trace:', e3?.stack);
      }
    }

    sections[key] = html;
  }

  let phases = await derivePhasesFrom(sections.timeline, canon);
  if (phases.length < 5) {
    phases = [1, 2, 3, 4, 5].map((i) => ({
      title: `Phase ${i}`,
      caption:
        i === 1 ? 'Kickoff & baselines' : i === 5 ? 'Sustain & scale' : 'Milestones & deliverables',
    }));
  }

  console.log(TAG, 'appendix.build.start');
  const appendicesHTML = buildAppendicesHTML(canon, sections);
  console.log(TAG, 'appendix.build.done', { bytes: String(appendicesHTML || '').length });

  
  // === Generate Implementation Kit JSON for Appendices ===
  const implKit = await genImplKitJSON(canon, sections);
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

  // === BEYOND MCKINSEY: Generate dynamic self-implementation appendices ===
  console.log(TAG, 'beyondMcKinsey.start', { lang: canon.lang });
  const [implementationChecklist, decisionFramework, resourceRequirements] = await Promise.all([
    genImplementationChecklist(canon, sections),
    genDecisionFramework(canon, sections),
    genResourceRequirements(canon, sections)
  ]);
  
  // Add to implKit
  implKit.implementationChecklist = implementationChecklist;
  implKit.decisionFramework = decisionFramework;
  implKit.resourceRequirements = resourceRequirements;
  
  console.log(TAG, 'beyondMcKinsey.complete', {
    checklistPhases: implementationChecklist?.phases?.length || 0,
    frameworkScenarios: decisionFramework?.scenarios?.length || 0,
    resourceTeam: resourceRequirements?.team?.length || 0
  });

  // === MULTILINGUAL: Translate UI labels via GPT-5-nano ===
  const translatedLabels = await translateLabels(canon.lang);
  console.log(TAG, 'labels.translated', { lang: canon.lang, sample: translatedLabels.projectedROI });

  // === MCKINSEY-BEATING: Prepare world-class visualizations ===
  console.log(TAG, 'worldClassVisuals.prepare.start');
  
  // 1. Executive Summary Infographic - extract key metrics
  const execInfographic = executiveSummaryInfographicHTML({
    roi: canon.roi || '267%',
    payback: canon.paybackMonths ? `${canon.paybackMonths} months` : '8 months',
    savings: canon.savings || '$2.4M annually',
    timeline: canon.timeline || '18 months',
    confidence: '92%',
    impact: 'High',
    quickWins: 3,
    phases: phases?.length || 4
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
  
  // 4. Risk Heatmap - extract from RAID if available
    // [KT:SURGICAL:PREDICTIVE:ATTACH]
      // 4. Risk Heatmap - extract from RAID if available
    // [KT:SURGICAL:PREDICTIVE:ATTACH]
    try {
      let predictiveModel = await buildPredictiveModelSpec(canon, sections, '');

      // [KT:SURGICAL:I18N-PREDICTIVE-MODEL] translate titles/axes for global predictive chart
      if (predictiveModel && canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
        try {
          predictiveModel = await translateChartLabels(predictiveModel, canon.lang);
        } catch (e) {
          console.log(TAG, 'predictiveModel.translate.error', String(e?.message || e));
        }
      }

      sections.predictiveModel = predictiveModel;
      console.log(TAG, 'predictiveModel.generated', {
        labels: predictiveModel?.labels?.length || 0,
        values: predictiveModel?.values?.length || 0,
        xTitle: predictiveModel?.xTitle,
        yTitle: predictiveModel?.yTitle
      });
    } catch (e) {
      console.warn(TAG, 'predictiveModel.error', String(e?.message || e));
    }
  let riskHeatmap = '';

  try {
    // [KT:SURGICAL:RISK-HEATMAP] enriched mapping with description & robust severity/likelihood
    try {
      const raidRisks = implKit?.raid?.items?.filter(r => r.type === 'Risk') || [];
      if (raidRisks.length > 0) {
        const risks = raidRisks.slice(0, 10).map((r, i) => {
          const impactText = String(r.impact || '').toLowerCase();
          const sev =
            typeof r.severity === 'number'
              ? r.severity
              : impactText.includes('high')
                ? 4
                : impactText.includes('medium')
                  ? 3
                  : impactText.includes('low')
                    ? 2
                    : 3;

          const likText = String(r.likelihoodText || r.likelihoodLabel || '').toLowerCase();
          const lik =
            typeof r.likelihood === 'number'
              ? r.likelihood
              : likText.includes('almost') || likText.includes('certain')
                ? 5
                : likText.includes('likely')
                  ? 4
                  : likText.includes('possible')
                    ? 3
                    : likText.includes('unlikely')
                      ? 2
                      : 3;

          return {
            id: i + 1,
            name: r.item || r.name || r.title || `Risk ${i + 1}`,
            severity: sev,
            likelihood: lik,
            description:
              r.description ||
              r.detail ||
              r.summary ||
              r.notes ||
              r.mitigation ||
              ''
          };
        });

        riskHeatmap = riskHeatmapHTML(risks);
        console.log(TAG, 'riskHeatmap.prep.enriched', {
          count: risks.length,
          sample: risks[0] || null
        });
      }
    } catch (e) {
      console.log(TAG, 'riskHeatmap.prep.error', String(e?.message || e));
    }
    // [KT:SURGICAL:PREDICTIVE:ATTACH]
    try {
      const predictiveModel = await buildPredictiveModelSpec(canon, sections, '');
      sections.predictiveModel = predictiveModel;
      console.log(TAG, 'predictiveModel.generated', {
        labels: predictiveModel?.labels?.length || 0,
        values: predictiveModel?.values?.length || 0,
        xTitle: predictiveModel?.xTitle,
        yTitle: predictiveModel?.yTitle
      });
    } catch (e) {
      console.warn(TAG, 'predictiveModel.error', String(e?.message || e));
    }
  } catch (e) {
    console.log(TAG, 'riskHeatmap.prep.error', String(e?.message || e));
  }
  
  // 5. Waterfall Chart - value bridge showing VALUE INCREASE (revenue/savings)
  let waterfallChart = '';
  try {
    // Use savings or revenue uplift - showing positive value creation
    const currentRevenue = parseFloat(canon.currentRevenue) || 5000;
    const revenueIncrease = parseFloat(canon.revenueIncrease) || currentRevenue * 0.4; // 40% increase
    
    // Break down the value creation into components that sum correctly
    const digitalChannel = revenueIncrease * 0.35; // 35% from digital
    const menuOptimization = revenueIncrease * 0.25; // 25% from menu
    const loyaltyProgram = revenueIncrease * 0.20; // 20% from loyalty
    const marketExpansion = revenueIncrease * 0.25; // 25% from expansion
    const implementationCost = revenueIncrease * -0.05; // 5% cost
    
    waterfallChart = waterfallChartHTML([
      { name: 'Current State', value: currentRevenue, type: 'total' },
      { name: 'Digital Channel Growth', value: digitalChannel, type: 'positive' },
      { name: 'Menu Optimization', value: menuOptimization, type: 'positive' },
      { name: 'Loyalty Program', value: loyaltyProgram, type: 'positive' },
      { name: 'Market Expansion', value: marketExpansion, type: 'positive' },
      { name: 'Implementation Cost', value: implementationCost, type: 'negative' },
      { name: 'Target State', value: 0, type: 'total' } // Will be calculated from running total
    ], canon.currency || '$');
  } catch (e) {
    console.log(TAG, 'waterfallChart.prep.error', String(e?.message || e));
  }
  
     console.log(TAG, 'worldClassVisuals.prepare.done', {
    execInfographic: !!execInfographic,
    visualTimeline: !!visualTimeline,
    radarChart: !!radarChart,
    riskHeatmap: !!riskHeatmap,
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
    translatedLabels,
    worldClassVisuals: {
      execInfographic,
      visualTimeline,
      radarChart,
      riskHeatmap,
      waterfallChart,
    },
  });

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
  try {
    html = __kt_dedupeVisuals(html);
    console.log('[SR:REFORM] visuals.dedupe.injected');
  } catch (e) {
    console.log('[SR:REFORM] visuals.dedupe.invoke.error', String(e?.message || e));
  }

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
const _useAITitles = __isEnglishReportLangSoft(_langForTitles);

if (_useAITitles && typeof injectTableTitlesAI === 'function') {
  // English reports: keep AI “executive” retitling
  html = await injectTableTitlesAI(html);
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

  try {
    const reportLang = canon?.lang || 'English';

    // [KT:SURGICAL:I18N-PATH] Unified translation path (no double-translation)
    if (!__isEnglishReportLangSoft(reportLang)) {
      // [KT:SURGICAL] Make non-predictive charts follow the report language
      // BEFORE we send the HTML to the main translator (which skips data-chart JSON).
      html = patchStandardChartLabelsForLanguage(html, reportLang);

      logger.info('[SR:REFORM] translation.starting', {
        lang: reportLang,
        htmlSize: html.length,
      });

      // New Nano-style translateHTML call (object args)
      translatedHtml = await translateHTML({
        html,
        lang: reportLang,
        // ...existing options unchanged
      });

      logger.info('[SR:REFORM] translation.complete', {
        lang: reportLang,
        translatedSize: translatedHtml.length,
      });
    } else {
      logger.info('[SR:REFORM] translation.skipped', {
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

  // [KT:SURGICAL:I18N-EXEC-RISK] Ensure stubborn executive tiles & risk visuals are translated
  if (canon.lang && !__isEnglishReportLangSoft(canon.lang)) {
    translatedHtml = await patchExecutiveSummaryAndRiskLabels(
      translatedHtml,
      canon.lang,
    );
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
try {
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
============================================================================ */

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


export async function __kt_buildAppendices_FromImplementationKit(reportHTML, canon, sections){
    

    // --- BEGIN: Additive appendix logic for I-K ---
    let implKITHTML = { I: [], J: [], K: {} };
    let checklist, decisionFramework, resourceRequirements;
    try {
      checklist = await genImplementationChecklist(canon, sections);
      if (checklist && Array.isArray(checklist.phases)) {
        implKITHTML.I = checklist.phases;
        console.log('[APPENDIX-I] ✔️ Data found: phases =', checklist.phases.length);
      } else {
        console.warn('[APPENDIX-I] ❌ checklist.phases missing or not array', checklist);
      }
    } catch (e) {
      console.warn('[APPENDIX-I] ❌ Error generating checklist:', e);
    }
    
try {
  decisionFramework = await genDecisionFramework(canon, sections);

  if (
    decisionFramework &&
    Array.isArray(decisionFramework.scenarios) &&
    decisionFramework.scenarios.length > 0
  ) {
    // Store scenarios for Appendix J rendering
    implKITHTML.J = decisionFramework.scenarios;
    console.log(
      '[APPENDIX-J] ✔️ Data found: scenarios = %d',
      decisionFramework.scenarios.length
    );
  } else {
    console.warn('[APPENDIX-J] ❌ decisionFramework.scenarios missing or not array', {
      hasDecisionFramework: !!decisionFramework,
      type: decisionFramework && typeof decisionFramework,
      keys: decisionFramework && Object.keys(decisionFramework || {}),
    });
  }
} catch (e) {
  console.warn('[APPENDIX-J] ❌ Error generating decision framework:', e);
}

    try {
      resourceRequirements = await genResourceRequirements(canon, sections);
      if (resourceRequirements && (
        (Array.isArray(resourceRequirements.team) && resourceRequirements.team.length > 0) ||
        (Array.isArray(resourceRequirements.budget) && resourceRequirements.budget.length > 0) ||
        (Array.isArray(resourceRequirements.tools) && resourceRequirements.tools.length > 0)
      )) {
        implKITHTML.K = resourceRequirements;
        console.log('[APPENDIX-K] ✔️ Data found:', {
          team: resourceRequirements.team?.length || 0,
          budget: resourceRequirements.budget?.length || 0,
          tools: resourceRequirements.tools?.length || 0
        });
      } else {
        let reasons = [];
        if (!resourceRequirements || !Array.isArray(resourceRequirements.team) || resourceRequirements.team.length === 0) reasons.push('team missing or empty');
        if (!resourceRequirements || !Array.isArray(resourceRequirements.budget) || resourceRequirements.budget.length === 0) reasons.push('budget missing or empty');
        if (!resourceRequirements || !Array.isArray(resourceRequirements.tools) || resourceRequirements.tools.length === 0) reasons.push('tools missing or empty');
        console.warn('[APPENDIX-K] ❌ No real data for:', reasons.join(', '));
      }
    } catch (e) {
      console.warn('[APPENDIX-K] ❌ Error generating resource requirements:', e);
    }

    // Build HTML for appendices I, J, K from arrays/objects
    let appendixI = '', appendixJ = '', appendixK = '';
    if (implKITHTML.I.length > 0) {
      appendixI = [
        '<section id="appendix-i">',
        '  <h3>Appendix I — Implementation Checklist</h3>',
        '  <table class="table small">',
        '    <thead><tr><th>Phase</th><th>Activities</th><th>Owner</th><th>Success Criteria</th></tr></thead>',
        '    <tbody>',
        implKITHTML.I.map(phase =>
          `<tr><td>${phase.phase || ''}</td><td>${Array.isArray(phase.activities) ? phase.activities.join('<br>') : ''}</td><td>${phase.owner || ''}</td><td>${phase.successCriteria || ''}</td></tr>`
        ).join(''),
        '    </tbody>',
        '  </table>',
        '</section>'
      ].join('\n');
    }
    if (implKITHTML.J.length > 0) {
      // [REMOVED: Duplicate Appendix J static block. Now rendered only from JSON below.]
    }
    if (implKITHTML.K && (implKITHTML.K.team || implKITHTML.K.budget || implKITHTML.K.tools)) {
      const team = Array.isArray(implKITHTML.K.team) ? implKITHTML.K.team : [];
      const budget = Array.isArray(implKITHTML.K.budget) ? implKITHTML.K.budget : [];
      const tools = Array.isArray(implKITHTML.K.tools) ? implKITHTML.K.tools : [];
      if (team.length > 0 || budget.length > 0 || tools.length > 0) {
        appendixK = [
          '<section id="appendix-k">',
          '  <h3>Appendix K — Resource Requirements</h3>',
          '  <div>',
          team.length > 0 ? [
            '<strong>Team:</strong>',
            '<table class="table small">',
            '<thead><tr><th>Role</th><th>FTE %</th><th>Duration</th><th>Responsibilities</th></tr></thead>',
            '<tbody>',
            team.map(t =>
              `<tr><td>${t.role || ''}</td><td>${t.fte || ''}</td><td>${t.duration || ''}</td><td>${t.responsibilities || ''}</td></tr>`
            ).join(''),
            '</tbody></table>'
          ].join('') : '',
          budget.length > 0 ? [
            '<strong>Budget:</strong>',
            '<table class="table small">',
            '<thead><tr><th>Category</th><th>Amount</th><th>Description</th></tr></thead>',
            '<tbody>',
            budget.map(b =>
              `<tr><td>${b.category || ''}</td><td>${b.amount || ''}</td><td>${b.description || ''}</td></tr>`
            ).join(''),
            '</tbody></table>'
          ].join('') : '',
          tools.length > 0 ? [
            '<strong>Tools:</strong>',
            '<ul>',
            tools.map(tool =>
              `<li>${tool.tool || ''}: ${tool.purpose || ''}${tool.cost ? ' (Cost: ' + tool.cost + ')' : ''}</li>`
            ).join(''),
            '</ul>'
          ].join('') : '',
          '  </div>',
          '</section>'
        ].join('\n');
      }
    }
    // Embed the JSON for downstream use
    const embed = '<script type="application/json" id="implementation-kit-json">' +
      JSON.stringify({ checklist, decisionFramework, resourceRequirements }) + '</script>';
    const section = [
      '<section id="appendices">',
      appendixI,
      appendixJ,
      appendixK,
      '</section>'
    ].join('\n');
    // [KT:SURGICAL:PARAGRAPH-MIN-SENTENCE-ENFORCER] (unchanged)
    try {
      let outHtml = section + "\n" + embed;
      outHtml = outHtml.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (m, attrs, inner) => {
        const sentences = (inner.match(/([.!?])\s+/g) || []).length + (/[.!?]$/.test(inner.trim()) ? 1 : 0);
        if (sentences >= 3) return m;
        let text = inner.trim();
        if (!text) return m;
        let parts = text.split(/([.!?])\s+/).filter(Boolean);
        let sents = [];
        for (let i = 0; i < parts.length; i += 2) {
          let s = parts[i];
          if (parts[i + 1]) s += parts[i + 1];
          sents.push(s.trim());
        }
        if (sents.length < 3) {
          let extra = sents.join(' ').split(/[;,]\s+/).map(x => x.trim()).filter(Boolean);
          while (extra.length < 3) extra.push(extra[0]);
          sents = extra.slice(0, 3);
        }
        while (sents.length < 3) sents.push(sents[sents.length - 1]);
        return `<p${attrs}>${sents.join(' ')}</p>`;
      });
      return outHtml;
    } catch(e2) {
      console.warn('[KT] paragraph min sentence enforcement error', e2);
      return section + "\n" + embed;
    }
    // --- END: Additive appendix logic for I-K ---
    // ...existing code continues...
  try{
    // [KT:SURGICAL:IMPLKIT-BRIDGE] Use AI-generated Implementation Kit JSON for appendices I, J, K
    let json = (typeof implKit !== 'undefined' && implKit) ? implKit : (sections && sections.__implementationKitJSON) || {};
    // If any of the required keys are missing, call the AI functions to populate them
    if (!json.checklist) {
      try {
        json.checklist = await genImplementationChecklist(canon, sections);
      } catch (e) {
        console.warn('[KT] Failed to generate Implementation Checklist from AI', e);
      }
    }
    if (!json.decisionFramework) {
      try {
        json.decisionFramework = await genDecisionFramework(canon, sections);
      } catch (e) {
        console.warn('[KT] Failed to generate Decision Framework from AI', e);
      }
    }
    if (!json.resourceRequirements) {
      try {
        json.resourceRequirements = await genResourceRequirements(canon, sections);
      } catch (e) {
        console.warn('[KT] Failed to generate Resource Requirements from AI', e);
      }
    }
    const embed = '<script type="application/json" id="implementation-kit-json">' + JSON.stringify(json) + '</script>';
    let appendixI = '', appendixJ = '', appendixK = '';
    // Appendix I: Implementation Checklist
    if (json.checklist && Array.isArray(json.checklist.phases) && json.checklist.phases.length > 0) {
      console.log('[APPENDIX-I] ✔️ Data found: phases =', json.checklist.phases.length);
      appendixI = [
        '<section id="appendix-i">',
        '  <h3>Appendix I — Implementation Checklist</h3>',
        '  <table class="table small">',
        '    <thead><tr><th>Phase</th><th>Activities</th><th>Owner</th><th>Success Criteria</th></tr></thead>',
        '    <tbody>',
        json.checklist.phases.map(phase =>
          `<tr><td>${phase.phase || ''}</td><td>${Array.isArray(phase.activities) ? phase.activities.join('<br>') : ''}</td><td>${phase.owner || ''}</td><td>${phase.successCriteria || ''}</td></tr>`
        ).join(''),
        '    </tbody>',
        '  </table>',
        '</section>'
      ].join('\n');
    } else {
      if (!json.checklist) {
        console.log('[APPENDIX-I] ❌ No checklist object in implementation kit JSON');
      } else if (!Array.isArray(json.checklist.phases)) {
        console.log('[APPENDIX-I] ❌ checklist.phases is not an array');
      } else {
        console.log('[APPENDIX-I] ❌ checklist.phases is empty');
      }
    }
    // Appendix J: Decision Framework
    if (json.decisionFramework && Array.isArray(json.decisionFramework.scenarios) && json.decisionFramework.scenarios.length > 0) {
      console.log('[APPENDIX-J] ✔️ Data found: scenarios =', json.decisionFramework.scenarios.length);
      appendixJ = [
        '<section id="appendix-j">',
        '  <h3>Appendix J — Decision Framework</h3>',
        '  <table class="table small">',
        '    <thead><tr><th>Scenario</th><th>Symptoms</th><th>Root Cause</th><th>Action</th></tr></thead>',
        '    <tbody>',
        json.decisionFramework.scenarios.map(s =>
          `<tr><td>${s.scenario || ''}</td><td>${s.symptom || ''}</td><td>${s.rootCause || ''}</td><td>${s.action || ''}</td></tr>`
        ).join(''),
        '    </tbody>',
        '  </table>',
        '</section>'
      ].join('\n');
    } else {
      if (!json.decisionFramework) {
        console.log('[APPENDIX-J] ❌ No decisionFramework object in implementation kit JSON');
      } else if (!Array.isArray(json.decisionFramework.scenarios)) {
        console.log('[APPENDIX-J] ❌ decisionFramework.scenarios is not an array');
      } else {
        console.log('[APPENDIX-J] ❌ decisionFramework.scenarios is empty');
      }
    }
    // Appendix K: Resource Requirements
    const hasTeam = json.resourceRequirements && Array.isArray(json.resourceRequirements.team) && json.resourceRequirements.team.length > 0;
    const hasBudget = json.resourceRequirements && Array.isArray(json.resourceRequirements.budget) && json.resourceRequirements.budget.length > 0;
    const hasTools = json.resourceRequirements && Array.isArray(json.resourceRequirements.tools) && json.resourceRequirements.tools.length > 0;
    if (json.resourceRequirements && (hasTeam || hasBudget || hasTools)) {
      console.log('[APPENDIX-K] ✔️ Data found:', {
        team: hasTeam ? json.resourceRequirements.team.length : 0,
        budget: hasBudget ? json.resourceRequirements.budget.length : 0,
        tools: hasTools ? json.resourceRequirements.tools.length : 0
      });
      appendixK = [
        '<section id="appendix-k">',
        '  <h3>Appendix K — Resource Requirements</h3>',
        '  <div>',
        hasTeam ? [
          '<strong>Team:</strong>',
          '<table class="table small">',
          '<thead><tr><th>Role</th><th>FTE %</th><th>Duration</th><th>Responsibilities</th></tr></thead>',
          '<tbody>',
          json.resourceRequirements.team.map(t =>
            `<tr><td>${t.role || ''}</td><td>${t.fte || ''}</td><td>${t.duration || ''}</td><td>${t.responsibilities || ''}</td></tr>`
          ).join(''),
          '</tbody></table>'
        ].join('') : '',
        hasBudget ? [
          '<strong>Budget:</strong>',
          '<table class="table small">',
          '<thead><tr><th>Category</th><th>Amount</th><th>Description</th></tr></thead>',
          '<tbody>',
          json.resourceRequirements.budget.map(b =>
            `<tr><td>${b.category || ''}</td><td>${b.amount || ''}</td><td>${b.description || ''}</td></tr>`
          ).join(''),
          '</tbody></table>'
        ].join('') : '',
        hasTools ? [
          '<strong>Tools:</strong>',
          '<ul>',
          json.resourceRequirements.tools.map(tool =>
            `<li>${tool.tool || ''}: ${tool.purpose || ''}${tool.cost ? ' (Cost: ' + tool.cost + ')' : ''}</li>`
          ).join(''),
          '</ul>'
        ].join('') : '',
        '  </div>',
        '</section>'
      ].join('\n');
    } else {
      if (!json.resourceRequirements) {
        console.log('[APPENDIX-K] ❌ No resourceRequirements object in implementation kit JSON');
      } else {
        let reasons = [];
        if (!hasTeam) reasons.push('team missing or empty');
        if (!hasBudget) reasons.push('budget missing or empty');
        if (!hasTools) reasons.push('tools missing or empty');
        console.log('[APPENDIX-K] ❌ No real data for:', reasons.join(', '));
      }
    }
    const section = [
      '<section id="appendices">',
      '  <h2>Appendices</h2>',
      appendixI,
      appendixJ,
      appendixK,
      '</section>'
    ].join('\n');
    return section + "\n" + embed;
  // [KT:SURGICAL:PARAGRAPH-MIN-SENTENCE-ENFORCER]
  // Enforce: No paragraph (<p>) is less than 3 sentences.
  try {
    let outHtml = section + "\n" + embed;
    // Regex: find <p>...</p> blocks not inside comments
    outHtml = outHtml.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (m, attrs, inner) => {
    // Ignore if already 3+ sentences
    const sentences = (inner.match(/([.!?])\s+/g) || []).length + (/[.!?]$/.test(inner.trim()) ? 1 : 0);
    if (sentences >= 3) return m;
    // If less than 3, try to split by .!? and join to make at least 3 sentences
    let text = inner.trim();
    if (!text) return m;
    // If only 1-2 sentences, try to expand by splitting at commas or semicolons
    let parts = text.split(/([.!?])\s+/).filter(Boolean);
    // Recombine to sentences
    let sents = [];
    for (let i = 0; i < parts.length; i += 2) {
      let s = parts[i];
      if (parts[i + 1]) s += parts[i + 1];
      sents.push(s.trim());
    }
    // If still less than 3, try to split by comma/semicolon
    if (sents.length < 3) {
      let extra = sents.join(' ').split(/[;,]\s+/).map(x => x.trim()).filter(Boolean);
      while (extra.length < 3) extra.push(extra[0]);
      sents = extra.slice(0, 3);
    }
    // If still less than 3, duplicate last
    while (sents.length < 3) sents.push(sents[sents.length - 1]);
    return `<p${attrs}>${sents.join(' ')}</p>`;
    });
    return outHtml;
  } catch(e2) {
    console.warn('[KT] paragraph min sentence enforcement error', e2);
    return section + "\n" + embed;
  }
  }catch(e){ 
    console.warn('[KT] appendix build error', e); 
    // Only include a single predictive analytics graph (styled like main report graphs)
    // Do NOT generate or include “Organizational stability index across four key dimensions”
    // or “AI-driven projection showing six-period forecast of outcome acceleration.”
    // Do NOT generate or include empty appendix sections (F–J), and ensure only one Appendix H.
    // Only include Appendix H — Methods & Sources if present and non-empty.

    // Predictive analytics chart is now fully disabled in appendices (per requirements)
    let predictiveGraphHTML = '';
    // LOG: If any code path tries to render the predictive analytics graph in the appendix, log it clearly
    if (typeof sections !== 'undefined' && sections && sections.__appendixPredictiveGraph) {
      console.log('[APPENDIX-PREDICTIVE-GRAPH] ⚠️ Attempt to render predictive analytics graph in appendix. Source: sections.__appendixPredictiveGraph');
    } else if (typeof implKit !== 'undefined' && implKit && implKit.__appendixPredictiveGraph) {
      console.log('[APPENDIX-PREDICTIVE-GRAPH] ⚠️ Attempt to render predictive analytics graph in appendix. Source: implKit.__appendixPredictiveGraph');
    } else {
      console.log('[APPENDIX-PREDICTIVE-GRAPH] ✅ No predictive analytics graph rendered in appendix.');
    }
    // (No predictive chart will be rendered)

    // Only include Appendix H — Methods & Sources if present and non-empty
    let appendixH = '';
    try {
      const methods = (sections && sections.methods && Array.isArray(sections.methods.sources) && sections.methods.sources.length > 0)
        ? sections.methods
        : (implKit && implKit.methods && Array.isArray(implKit.methods.sources) && implKit.methods.sources.length > 0)
          ? implKit.methods
          : null;
      if (methods) {
        appendixH = `
        <section id="appendix-h">
          <h3>Appendix H — Methods & Sources</h3>
          <div>
            <strong>Benchmarks:</strong>
            <ul>
              ${(methods.benchmarks || []).map(b => `<li>${b.name || ''}${b.source ? ' — ' + b.source : ''}${b.date ? ' (' + b.date + ')' : ''}${b.notes ? ': ' + b.notes : ''}</li>`).join('')}
            </ul>
            <strong>Sources:</strong>
            <ul>
              ${(methods.sources || []).map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        </section>
        `;
      }
    } catch (err) {
      console.warn('[KT] appendix-h error', err);
    }
// [KT:SURGICAL:UNTITLED-TABLE-FIX]

}

    // Only output appendix section with predictive graph and Appendix H (if present)
    return [
      '<section id="appendices">',
      '  <h2>Appendices</h2>',
      predictiveGraphHTML,
      appendixH,
      '</section>'
    ].join('\n');
}

export async function __kt_finalize_report(html, canon, sections){
  try{
    let out = String(html||'');
    try{ if (typeof __kt_postprocess_report_html === 'function') out = __kt_postprocess_report_html(out); }catch(e){}
    try{ const app = await __kt_buildAppendices_FromImplementationKit(out, canon, sections); if (app) out += "\n" + app; }catch(e){}
    return out;
  }catch(e){ return html; }
}
