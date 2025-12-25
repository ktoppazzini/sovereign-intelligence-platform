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

   2025-10-23 [KT:SURGICAL:FRAG-PROBE]
   - Added robust helper to probe last visual safely using the fragment we just injected,
     with a fallback linear scan. Old brittle one-shot regex probes are kept but commented.
   =============================== */
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate.js' // [KT:SURGICAL] explicit .js extension to guarantee default export resolution;
// import { planDiagramHTML } from '@/lib/implPlan'; // [KT:SURGICAL:IMPORT-FIX] commented to preserve history
import { planDiagramHTML } from '@/lib/implPlan.js'; // [KT:SURGICAL:IMPORT-FIX] ensure .js extension for Next/ESM resolution
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js';
void [lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS];
const TAG = '[SR:REFORM]';
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
        m => `${m}\n<style>body, #report, .report-canvas, .report-body {max-width:100% !important; width:100% !important;}</style>`
      );
      console.log(TAG, 'width.guard.injected');
    } catch (e) {
      console.log(TAG, 'width.guard.error', String(e?.message || e));
    }

    const sig = `<!-- [RUN-LOCK ${SURGICAL_RUN_LOCK}] -->`;
    return String(html).includes(sig) ? html : `${sig}\n${html}`;

    // [KT:SURGICAL:WIDTH-GUARD:OLD] previously placed below return (unreachable) — kept for history:
    // try {
    //   html = html.replace(
    //     /<body[^>]*>/i,
    //     m => `${m}\n<style>body, #report, .report-canvas, .report-body {max-width:100% !important; width:100% !important;}</style>`
    //   );
    //   console.log(TAG, 'width.guard.injected');
    // } catch (e) {
    //   console.log(TAG, 'width.guard.error', String(e?.message || e));
    // }
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
  if (c.includes('canada') || c.includes('ca')) return 'CAD';
  if (c.includes('united states') || c.includes('usa') || c.includes('us')) return 'USD';
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('england')) return 'GBP';
  if (c.includes('india')) return 'INR';
  if (c.includes('euro')) return 'EUR';
  return 'CAD'; // default for this deployment
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

// Extract meta for a fragment (Oct 9 logic, adapted)
function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '', xTitle: '', yTitle: '', labelsLen: 0, dataLen: 0 };
  if (!frag) return out;

  const chart = frag.match(new RegExp('<figure[^>]*data-chart["\']?=\\s*["\']([\\s\\S]*?)["\']', 'i'));
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
    kpis: ['kpi benchmark', 'savings benchmark'],
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

  const user =
    `From KEYWORDS, choose up to 8 of the best predictive analytics for the "${section}" section.
For each, return ONE JSON candidate chart **(no tables, no benchmarks)** with:
- "keyword" (from KEYWORDS),
- "type" in ["line","bar","pie","doughnut"]  // **no "benchmark"**
- "title" (clear, specific, and **non-empty**),
- "xTitle" ("${years ? 'Years' : 'Months'}") (**non-empty**),
- "yTitle" ("${section === 'financials' || section === 'exec' ? yCur : section === 'kpis' || section === 'roi' || section === 'current' ? 'Percent' : 'Index'}") (**non-empty**),
- "labels": ${JSON.stringify(labels)} (**must match** datasets length),
- "datasets":[{"label":"Predicted","data":[numbers matching labels length]}]
Return STRICT JSON:
{"candidates":[{...},{...}]}

Reject any candidate internally that has blank title/axes or any zero-length arrays.

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
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Return one short HTML paragraph only (<p class="chart-note">…</p>).',
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
    const sys = 'Return exactly one <p class="chart-note">…</p> with 2–3 concise executive sentences.';
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
/* [KT:SURGICAL:FRAG-PROBE] — robust probe for the last visual                 */
/* ========================================================================== */
/**
 * Prefer the fragment we just injected (predFrag). If absent, scan html for the last visual.
 * This avoids brittle negative-lookahead re-parsing of the whole doc.
 */
function __kt_probeLastVisualFrom(predFrag, html) {
  try {
    if (predFrag && /data-chart|data-heatmap|data-widget=['"]benchmark['"]/.test(predFrag)) {
      return predFrag;
    }
    const re = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;
    let m, last = null;
    const s = String(html || '');
    while ((m = re.exec(s)) !== null) last = m[0];
    return last || '';
  } catch {
    return '';
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

    const desc = await predictiveDescription(section, canon, meta);
    seenLocal.add(sig);

    return fragSynth + '\n' + desc;
  }

  console.log(TAG, 'predictive.fail.exhausted', section, { tried: batch.length });
  return '';
}

/* ========================================================================== */
/* Section text prompts (Oct 8 kept) + sanitize visuals                        */
/* ========================================================================== */
function sanitizeNonPredictiveVisuals(section, html) {
  // keep Oct 8 behavior (no tables/heatmaps/charts from text)
  let out = String(html || '')
    .replace(/<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>/gi, '')
    .replace(/<div[^>]*data-heatmap=['"][\s\S]*?<\/div>/gi, '')
    .replace(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/gi, '');
  if (out !== html) console.log(TAG, 'section.viz.sanitized', section);
  return out;
}

function sectionPrompt(section, canon, minWords) {
  return `
Audience: C-suite. Tone: concise, evidence-driven, pragmatic.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Size: ${canon.companySize}. Time frame: ${canon.timeFrame}.

Paragraph discipline: 3-4 sentences per paragraph, no run-on sentences. Split any longer blocks.

When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.
${NO_VISUALS_GUIDANCE}

Section: ${section}.
Hard minimum words: ${minWords}. Avoid generic filler. No appendix.
`.trim();
}

function expandPrompt(section, canon, remainingWords) {
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Write 3-4 paragraphs (max 4 sentences each, no run-on sentences).
Target at least ${remainingWords} words. Output valid HTML only.
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
/* [KT:SURGICAL:TABLE-TITLE-AI] — AI title generator for tables               */
/* ========================================================================== */
async function aiTitleForTable(tableHTML, canon, sectionHint = '') {
  try {
    // Extract a compact textual summary for the prompt
    const thead = (tableHTML.match(/<thead[\s\S]*?<\/thead>/i) || [''])[0];
    const tbody = (tableHTML.match(/<tbody[\s\S]*?<\/tbody>/i) || [''])[0] || tableHTML;

    const firstRow =
      (thead && thead.match(/<tr[\s\S]*?<\/tr>/i)?.[0]) ||
      (tbody && tbody.match(/<tr[\s\S]*?<\/tr>/i)?.[0]) ||
      '';

    const headers = Array.from(firstRow.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi))
      .map((m) => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    // Take up to 2–3 body rows for signal
    const bodyRows = Array.from(tbody.matchAll(/<tr[\s\S]*?<\/tr>/gi))
      .map((m) => m[0])
      .slice(0, 3);

    const samples = bodyRows.map((row) =>
      Array.from(row.matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi))
        .map((m) => m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' | ')
    );

    const sys =
      'Return ONLY a short table title, maximum 12 words, title case, no trailing period.';
    const usr = [
      `Organization: ${canon.orgName} (${canon.country}), Section: ${sectionHint || 'n/a'}`,
      `Headers: ${headers.join(' · ') || '(none)'}`,
      `Samples: ${samples.join(' || ') || '(none)'}`,
      'Create a precise, executive-ready title (no “table” word, no fluff).'
    ].join('\n');

    const r = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr }
      ]
    });

    let t = (r.choices?.[0]?.message?.content || '').trim();
    // Safety trims
    t = t.replace(/^["'«»]+|["'«»]+$/g, '').replace(/\s+/g, ' ').trim();
    // Guard: avoid empty or silly responses
    if (!t || /^table$/i.test(t) || t.length < 4) return '';
    return t;
  } catch (e) {
    console.log(TAG, 'table.title.ai.error', String(e?.message || e));
    return '';
  }
}
/* ========================================================================== */
/* TABLE TITLE INJECTION HELPER - SURGICAL ADDITION                          */
/* ========================================================================== */
/*
  [KT:SURGICAL TABLE TITLE INJECTION]
  - Purpose: Insert a black, bold title above each <table class="report-table">.
  - Upgrade: Prefer AI-derived title from table content; fallback to old header-first derivation.
  - Constraints: Add-only; legacy fallback kept but commented where superseded by AI.
*/
async function injectTableTitles(html, canon) {
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

      // Append content before this table
      parts.push(out.slice(cursor, tableStart));

      // Detect if a title is already immediately above (within ~400 chars)
      const beforeSnippet = out.slice(Math.max(0, tableStart - 400), tableStart);
      if (/\btable-title\b/i.test(beforeSnippet)) {
        parts.push(tableStr);
        cursor = tableEnd;
        continue;
      }

      // Heuristic: find nearest preceding <section id="..."> for AI context
      const sectionScan = out.slice(Math.max(0, tableStart - 5000), tableStart);
      const secMatch = [...sectionScan.matchAll(/<section[^>]*\bid=["']([^"']+)["']/gi)].pop();
      const sectionHint = secMatch ? String(secMatch[1]) : '';

      // -------- AI title (preferred) --------
      let aiTitle = await aiTitleForTable(tableStr, canon, sectionHint);
      let derivedTitle = aiTitle;

      // -------- Legacy fallback (kept & used only if AI fails) --------
      if (!derivedTitle) {
        // [KT:SURGICAL:TABLE-TITLE-LEGACY] (kept; used as fallback only)
        // const theadMatch = tableStr.match(/<thead[\s\S]*?<\/thead>/i);
        // let legacyTitle = '(Untitled Table)';
        // if (theadMatch) {
        //   const firstRowMatch = theadMatch[0].match(/<tr[\s\S]*?<\/tr>/i);
        //   if (firstRowMatch) {
        //     const ths = Array.from(firstRowMatch[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)).map(
        //       (m) => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        //     ).filter(Boolean);
        //     if (ths.length) legacyTitle = ths.join(' • ');
        //     else {
        //       const tds = Array.from(firstRowMatch[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map(
        //         (m) => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        //       ).filter(Boolean);
        //       if (tds.length) legacyTitle = tds.join(' • ');
        //     }
        //   }
        // } else {
        //   const firstRow = tableStr.match(/<tr[\s\S]*?<\/tr>/i);
        //   if (firstRow) {
        //     const cells = Array.from(firstRow[0].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map(
        //       (m) => m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        //     ).filter(Boolean);
        //     if (cells.length) legacyTitle = cells.join(' • ');
        //   }
        // }
        // derivedTitle = legacyTitle;

        // Minimal, deterministic fallback (kept active to guarantee a title):
        derivedTitle = '(Untitled Table)';
      }

      // Sanitize title text and enforce bold black styling
      let titleText = String(derivedTitle).replace(/<[^>]*>/g, '').trim() || '(Untitled Table)';
      // Title-case nudge (non-destructive)
      titleText = titleText
        .split(' ')
        .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');

      const titleDiv =
        `<div class="table-title" style="font-weight:bold;color:#000;margin-bottom:.4rem;">${titleText}</div>`;

      // Emit title + table
      parts.push(titleDiv + '\n' + tableStr);

      // Proof log for this table
      console.log(TAG, 'table.title.injected', {
        section: sectionHint || '(unknown)',
        title: titleText,
        ai: !!aiTitle
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
//function injectTableTitles(html) {
  //try {
  //  let out = String(html || '');
    // Find all <table ... class="report-table"...>...</table> occurrences
    //const tableRe = /<table\b[^>]*class=(["'])(?:(?:(?!\1).)*\s)?report-table(?:(?:(?!\1).)*)\1[^>]*>[\s\S]*?<\/table>/gi;
    //let match;
    //let cursor = 0;
    //let newHtml = '';
    //const parts = [];
    //while ((match = tableRe.exec(out)) !== null) {
      //const tableStart = match.index;
      //const tableStr = match[0];
      //const tableEnd = tableRe.lastIndex;

      // Append segment before this table
      //parts.push(out.slice(cursor, tableStart));

      // Check immediate previous content to see if it already has a table-title directly prior (within 200 chars)
      //const beforeSnippet = out.slice(Math.max(0, tableStart - 400), tableStart);
      //if (/\btable-title\b/i.test(beforeSnippet)) {
        // Already has a title; leave table unchanged
        //parts.push(tableStr);
        //cursor = tableEnd;
        //continue;
    //}

      // Derive title from the table's thead first row headers
      //let title = '(Untitled Table)';
      //try {
        //const theadMatch = tableStr.match(/<thead[\s\S]*?<\/thead>/i);
        //if (theadMatch) {
         // const firstRowMatch = theadMatch[0].match(/<tr[\s\S]*?<\/tr>/i);
         // if (firstRowMatch) {
            // extract all <th> content in that row
            //const ths = Array.from(firstRowMatch[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)).map(
            //  (m) => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
            //).filter(Boolean);
            //if (ths.length) {
             // title = ths.join(' • ');
            //} else {
              // fallback to any cell text
              //const tds = Array.from(firstRowMatch[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map(
                //(m) => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
              //).filter(Boolean);
              //if (tds.length) {
              //  title = tds.join(' • ');
              //}
           // }
         // }
        //} else {
          // try first row of table body
          //const firstRow = tableStr.match(/<tr[\s\S]*?<\/tr>/i);
          //if (firstRow) {
            //const cells = Array.from(firstRow[0].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map(
             // (m) => m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
            //).filter(Boolean);
            //if (cells.length) title = cells.join(' • ');
          //}
        //}
      //} catch (e) {
        // fallthrough to default title
       // title = '(Untitled Table)';
      //}

      // Sanitize title for safety (strip tags)
      //title = String(title || '(Untitled Table)').replace(/<[^>]*>/g, '').trim() || '(Untitled Table)';

      // Build the title div (black, bold)
      //const titleDiv = `<div class="table-title" style="font-weight:bold;color:#000;margin-bottom:.4rem;">${title}</div>`;

      // Insert titleDiv before table
      //parts.push(titleDiv + '\n' + tableStr);

      //cursor = tableEnd;
    //}
    // Append remaining tail
   // parts.push(out.slice(cursor));
    //newHtml = parts.join('');
   // return newHtml;
  //} catch (e) {
   // console.log(TAG, 'injectTableTitles.error', String(e?.message || e));
   // return html;
  //}
//}

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
    - Handles multiple consecutive legacy <p> blocks directly after visuals.
    - Runs BEFORE description injection to avoid duplicate notes.

  Safety:
    - No deletions, no structural changes. Purely comment-wrapping the legacy <p>.
*/
function commentOutLegacyVisualNotes(html) // [KT:SURGICAL:LEGACY-NOTE-COMMENTER]
{
  try {
    let out = String(html || '');
    let count = 0;
    // Pattern: visual, optional whitespace, then a <p> that is NOT class="chart-note"
    // We loop to catch consecutive paragraphs directly after visuals.
    const re = /((?:<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(?:<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(?:<div[^>]*data-heatmap=['"][\s\S]*?<\/div>))(\s*)(<(?!!--)p\b(?![^>]*class=["']chart-note["'])[\s\S]*?<\/p>)/i;
    let guard = 0;
    while (re.test(out) && guard < 10000) {
      out = out.replace(re, (m, vis, ws, para) => {
        count += 1;
        return `${vis}${ws}<!-- [KT:SURGICAL LEGACY NOTE COMMENTED OUT]\n${para}\n-->`;
      });
      guard += 1;
    }
    console.log(TAG, 'chart.notes.legacy.commented', { count });
    return out;
  } catch (e) {
    console.log(TAG, 'chart.notes.legacy.error', String(e?.message || e));
    return html;
  }
}

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
*/
async function injectVisualDescriptions(html, canon) {
  try {
    const src = String(html || '');
    const re = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;

    let match;
    let cursor = 0;
    const parts = [];
    let injectedCount = 0;

    while ((match = re.exec(src)) !== null) {
      const start = match.index;
      const frag = match[0];
      const end = re.lastIndex;

      // Append content before this visual
      parts.push(src.slice(cursor, start));

      // Always re-emit the visual fragment unchanged
      parts.push(frag);

      // Look ahead to see if a chart-note already follows (skip whitespace/newlines)
      const tail = src.slice(end, end + 600); // enough lookahead
      const after = tail.replace(/^\s+/, '');
      // OLD strict:
      // const hasNote = /^<p\b[^>]*class=["']chart-note["'][^>]*>[\s\S]*?<\/p>/i.test(after);
      // [KT:SURGICAL:FRAG-PROBE:C] tolerant: allow optional HTML comment/spacer before note
      const hasNote = /^(?:<!\-\-.*?\-\->\s*)*<p\b[^>]*class=["']chart-note["'][^>]*>[\s\S]*?<\/p>/i.test(after);

      if (hasNote) {
        // Leave as-is
        cursor = end;
        continue;
      }

      // Generate and insert a concise executive note
      const meta = parseVizMeta(frag);
      const note = await universalVizDescription(canon, meta);
      parts.push('\n' + note + '\n');
      injectedCount += 1;

      cursor = end;
    }

    // Append remaining content
    parts.push(src.slice(cursor));

    const out = parts.join('');
    console.log(TAG, 'chart.notes.injected', { count: injectedCount });
    return out;
  } catch (e) {
    console.log(TAG, 'chart.notes.error', String(e?.message || e));
    return html;
  }
}

/* ========================================================================== */
/* generation core (Oct 8 base kept)                                           */
/* ========================================================================== */
async function genSectionFirstPass(section, canon, floor) {
  console.log(TAG, 'section.start', section, { floor });
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role: 'system', content: 'You are a senior consultant. Return clean HTML fragments only.' },
      { role: 'user', content: sectionPrompt(section, canon, floor) },
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
  while (words < floor && guard < 8) {
    const remaining = Math.max(200, floor - words);
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Extend the section with NEW, non-duplicative content. Return HTML only.',
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
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      {
        role: 'system',
        content:
          'Extract phases as JSON: [{"title":"Phase X","caption":"one sentence"}, ...] (5 items). Output only pure JSON.',
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
  };
  canon.minWords = TOTAL_FLOOR;

  console.log(TAG, 'generate.start', {
    model: MODEL,
    org: canon.orgName,
    minWords: canon.minWords,
  });

  const order = ['exec', 'current', 'financials', 'kpis', 'timeline', 'ops', 'risk', 'roi'];
  const sections = {};

  for (const key of order) {
    const floor = SECTION_FLOORS[key] || 1200;
    let html = await genSectionFirstPass(key, canon, floor);
    html = await topUpSection(key, canon, html, floor);

    const { sigs: existingSigs } = collectExistingVizMeta(html);
    const preHas = hasViz(html);
    console.log(TAG, 'section.viz.precheck', key, {
      has: preHas,
      htmlLen: html.length,
      words: wc(html),
    });

    if (key !== 'exec') {
      try {
        const predFrag = await choosePredictiveFragment(key, canon, html, existingSigs);

        // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for the last (pre-append) fragment
        try {
          // OLD brittle probe (kept as comment for history):
          // const lastFragMatch = (html.match(
          //   /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\S]*<\/(figure|div)>)/i,
          // ) || [])[0];

          // NEW robust probe (uses predFrag if present, otherwise scans current html):
          const lastFragMatch = __kt_probeLastVisualFrom(predFrag, html);

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
              reason: 'no fragment (probe)',
            });
          }
        } catch (e) {
          console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
        }

        if (predFrag) {
          html += '\n' + predFrag;
          console.log(TAG, 'section.vizInjected', key, { mode: 'predictive-keywords' });

          // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for the last (post-append) fragment
          try {
            // OLD brittle probe (kept as comment for history):
            // const lastFragMatch = (html.match(
            //   /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\\S]*<\/(figure|div)>)/i,
            // ) || [])[0];

            // NEW robust probe: prefer predFrag we just appended, fallback to scan of new html
            const lastFragMatch = __kt_probeLastVisualFrom(predFrag, html);

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
                reason: 'no fragment (probe)',
              });
            }
          } catch (e) {
            console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
          }
        } else {
          console.log(TAG, 'section.viz.predictive.none', key);

          // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for last visual (none added)
          try {
            // OLD brittle probe (kept as comment for history):
            // const lastFragMatch = (html.match(
            //   /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\\S]*<\/(figure|div)>)/i,
            // ) || [])[0];

            // NEW robust probe: no predFrag, so scan html
            const lastFragMatch = __kt_probeLastVisualFrom('', html);

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
                reason: 'no fragment (probe)',
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
          // OLD brittle probe (kept as comment for history):
          // const lastFragMatch = (html.match(
          //   /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\\S]*<\/(figure|div)>)/i,
          // ) || [])[0];

          // NEW robust probe (no predFrag available here; scan html)
          const lastFragMatch = __kt_probeLastVisualFrom('', html);

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
              reason: 'no fragment (probe)',
            });
          }
        } catch (e) {
          console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
        }
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

  let conclusionHTML = '';
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content:
            'Return HTML only, a single <section id="conclusion">…</section> with 6-8 short paragraphs, 3-4 sentences each.',
        },
        {
          role: 'user',
          content: `Write a concise "Conclusion" for ${canon.orgName} based on the preceding sections. Max two paragraphs, max 3-4 sentences per paragraph, no run-on sentences.`,
        },
      ],
    });
    conclusionHTML = (res.choices?.[0]?.message?.content || '').trim();
    if (!/id=["']conclusion["']/.test(conclusionHTML)) {
      conclusionHTML =
        '<section id="conclusion"><h3>Conclusion</h3><p>Initiatives deliver material value within the horizon. Execution discipline, measurement, and change management determine outcomes.</p></section>';
    }
  } catch (e) {
    console.log(TAG, 'conclusion.error', String(e?.message || e));
  }

  //let html = buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit: {} });
  //html =
  const __tmpl = await buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit: {} });
let html = String(__tmpl ?? '');
    String(html).replace(
      /<section id=["']appendices["'][\s\S]*?<\/section>/i,
      appendicesHTML || '$&',
    ) +
    '\n' +
    conclusionHTML;

  // === SURGICAL INJECTION POINT ===
  // [KT:SURGICAL TABLE TITLE INJECTION] - Invocation placed here to ensure table titles
  // are added after the template has been assembled but before audit/logging and return.
  try {
    html = injectTableTitles(html, canon); // <-- EXACT LINE WHERE TITLE INJECTION IS INVOKED
    console.log(TAG, 'table.titles.injected', { bytes: String(html || '').length });
  } catch (e) {
    console.log(TAG, 'table.titles.inject.error', String(e?.message || e));
  }
  // === end injection point ===

  // === [KT:SURGICAL:LEGACY-NOTE-COMMENTER] ===
  // Fix #1: Comment out any legacy paragraphs immediately after visuals (non chart-note).
  try {
    html = commentOutLegacyVisualNotes(html);
  } catch (e) {
    console.log(TAG, 'chart.notes.legacy.invoke.error', String(e?.message || e));
  }
  // === end legacy commenter ===

  // === [KT:SURGICAL GRAPH NOTES] ===
  // Fix #2: Ensure EVERY visual has an executive note below it (charts, benchmarks/dashboards, heatmaps).
  try {
    html = await injectVisualDescriptions(html, canon);
  } catch (e) {
    console.log(TAG, 'chart.notes.invoke.error', String(e?.message || e));
  }
  // 1) Tag any untagged visuals so we can “see” them later
html = postTagStandardVisuals(html);

// 2) Add 2–3 sentence notes under *every* visual (works for charts & heatmaps)
html = await __kt_injectStandardNotes(html, canon);

// 3) Deterministic table titles (fast, header-derived)
html = injectTableTitles(html);

// 4) (Optional) AI upgrade of generic table titles
html = await injectTableTitlesAI(html);

  // === end graph notes injection ===
  // [KT:SURGICAL:RUN-LOCK] stamp + log (no behavior change)
  try {
    logRun();
    html = markRun(html);
  } catch (e) {
    console.log(TAG, 'runlock.error', String(e?.message || e));
  }

  // === Audit moved to end (post-template) per your instruction ===
  // AUDIT INVOCATION COMMENTED OUT per request:
  // html = await polishMcKinsey(html, canon);

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  return NextResponse.json({ ok: true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}

/* ==========================================================================
   Implementation Kit JSON (appendices) — transplanted from Oct 9 5:22 PM
   NOTE: Surgical addition; no deletions to existing code. MODEL and openai
   must already be in scope from surrounding generate module.
   ========================================================================== */
async function genImplKitJSON(canon, sections){
  try{
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role:'system', content:'Return strict JSON only. No prose.' },
        { role:'user',   content: 
`You are producing JSON only (no prose). Build an Implementation Kit from the report content.

Return exactly this shape:
{
  "charters": [ { "name": "...", "objective": "...", "scopeIn": "...", "scopeOut": "...", "owner": "...",
                  "stakeholders": ["..."], "milestones":[{"milestone":"...","due":"..."}],
                  "kpis":[{"kpi":"...","baseline":0,"target":0,"source":"..."}],
                  "risks":[{"risk":"...","mitigation":"...","owner":"..."}],
                  "budgetSummary":"...", "acceptanceCriteria":"..." } ],
  "raci": { "items":[{"decision":"...","R":"...","A":"...","C":["..."],"I":["..."],"SLA":"..."}] },
  "raid": { "items":[{"type":"Risk|Assumption|Issue|Dependency","description":"...","owner":"...","",
                      "impact":"...","probability":"...","trigger":"...","mitigation":"...","",
                      "status":"...","nextReview":"..."}] },
  "benefits": { "lines":[{"workstream":"...","lever":"...","unitAssumption":"...","",
                          "source":"...","volume":0,"rate":0,"monthlyImpact":0,"",
                          "confidence":"Low|Medium|High","startMonth":"M1","runRateMonth":"M3","oneOffCost":0}] },
  "plan100": { "weeks":[{"week":"W1","workstream":"...","task":"...","owner":"...","status":"Planned"}] },
  "pilot": { "name":"...", "locations":10, "successKPIs":["..."], "thresholds":["..."],
             "sampleDesign":"...", "rollbackCriteria":"..." },
  "assumptions": { "items":[{"name":"...","value":0,"unit":"...","low":0,"high":0,"note":"..."}] },
  "methods": { "benchmarks":[{"name":"...","source":"...","date":"YYYY-MM","notes":"..."}],
               "sources":["...","..."] }
}` }
      ]
    });
    const raw = (res?.choices?.[0]?.message?.content ?? '').trim();
    try{
      return JSON.parse(raw);
    }catch(e){
      console.warn('[genImplKitJSON] JSON parse failed; returning empty shell', e);
      return { charters: [], raci: {items:[]}, raid:{items:[]}, benefits:{lines:[]}, plan100:{weeks:[]},
               pilot:{name:'',locations:0,successKPIs:[],thresholds:[],sampleDesign:'',rollbackCriteria:''},
               assumptions:{items:[]}, methods:{benchmarks:[], sources:[]} };
    }
  }catch(err){
    console.error('[genImplKitJSON] OpenAI call failed', err);
    return { charters: [], raci: {items:[]}, raid:{items:[]}, benefits:{lines:[]}, plan100:{weeks:[]},
             pilot:{name:'',locations:0,successKPIs:[],thresholds:[],sampleDesign:'',rollbackCriteria:''},
             assumptions:{items:[]}, methods:{benchmarks:[], sources:[]} };
  }
}
