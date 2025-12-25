/* ===============================
   app/api/reform/generate/route.js
   =============================== */
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate';
import { planDiagramHTML } from '@/lib/implPlan';
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js';

const TAG = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  current: 3000, // [KT:RAISE] you said current came out short
  financials: 2800,
  kpis: 2400,
  timeline: 2400,
  ops: 3000,
  risk: 2200,
  roi: 2000,
  conclusion: 1400, // [KT:ADD]
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

// [KT:NEW] safe JSON attr parser (handles &quot; &amp;)
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

// Extract a single viz fragment
const extractVizFragment = (s = '') => {
  const str = String(s || '');
  const m1 = str.match(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/i);
  if (m1) return m1[0];
  const m2 = str.match(/<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>/i);
  if (m2) return m2[0];
  const m3 = str.match(/<div[^>]*data-heatmap=['"][\s\S]*?<\/div>/i);
  if (m3) return m3[0];
  return '';
};

// Pull meta for de-dupe + logging
function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '', xTitle: '', yTitle: '', labelsLen: 0, dataLen: 0 };
  if (!frag) return out;
  const chart = frag.match(/<figure[^>]*data-chart=['"]([\s\S]*?)['"]/i);
  if (chart) {
    out.kind = 'chart';
    try {
      const json = safeParseAttrJSON(chart[1]);
      out.type = String(json?.type || '');
      out.title = String(json?.title || '');
      out.xTitle = String(json?.xTitle || '');
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = Array.isArray(json?.labels) ? json.labels.length : 0;
      out.dataLen = Array.isArray(json?.datasets?.[0]?.data) ? json.datasets[0].data.length : 0;
    } catch {}
    return out;
  }
  const bench = frag.match(
    /<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([\s\S]*?)['"]/i,
  );
  if (bench) {
    out.kind = 'benchmark';
    try {
      const json = safeParseAttrJSON(bench[1]);
      out.type = 'benchmark';
      out.title = String(json?.title || '');
      out.xTitle = 'Measure';
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = 2;
      out.dataLen = 2;
    } catch {}
    return out;
  }
  const heat = frag.match(/<div[^>]*data-heatmap=['"]([\s\S]*?)['"]/i);
  if (heat) {
    out.kind = 'heatmap';
    try {
      const json = safeParseAttrJSON(heat[1]);
      out.type = 'heatmap';
      out.title = String(json?.title || '');
      out.xTitle = 'Columns';
      out.yTitle = 'Rows';
      out.labelsLen = Array.isArray(json?.cols) ? json.cols.length : 0;
      out.dataLen = Array.isArray(json?.data) ? json.data.length : 0;
    } catch {}
    return out;
  }
  return out;
}

// Collect existing viz titles/kinds in a section (for de-dupe)
function collectExistingVizMeta(html = '') {
  const titles = new Set();
  const sigs = new Set(); // kind|title
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

// [KT:NO-VISUALS] keep writers from injecting generic figures
const NO_VISUALS_GUIDANCE = `
Do NOT include any <figure> charts, <div data-heatmap>, or benchmark widgets in this section.
If numeric evidence is helpful, use ONE compact <table class="report-table"> per section (exec summary excluded).
`;

/* ========================================================================== */
/* Predictive analytics — keywords-first                                       */
/* ========================================================================== */

// Avoid duplicating mandated visuals
function isStandardSectionGraphDuplicate(section, meta) {
  if (!meta || !meta.title) return false;
  const t = meta.title.toLowerCase();
  if (section === 'exec' && /(saving|savings).*(month|year)|over time|by (month|year)/i.test(t))
    return true;
  if (section === 'financials' && /(payback|expenditure|expenditures|capex|opex)/i.test(t))
    return true;
  if (section === 'kpis' && /(savings|payback|benchmark)/i.test(t)) return true;
  return false;
}

// Keywords (up to ~1000)
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

// Candidate charts from keywords (no tables/benchmarks)
async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords) {
  const yCur = currencyUnitForCountry(canon.country);
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  const user =
    `From KEYWORDS, choose up to 12 of the best predictive analytics for the "${section}" section.
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

// Validate candidate (chart only; no benchmark/table; heatmap risk-only)
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

/* ========================================================================== */
/* 🔁 NEW: mergeSynth — fills title/axes/dataset shell and synthesizes labels  */
/* ========================================================================== */
function mergeSynth(section, canon, cand) {
  const titleSynth = section?._predictive?.titleSynth || {}; // { title }
  const axesSynth = section?._predictive?.axesSynth || {}; // { xTitle, yTitle }

  // clone to avoid mutating batch input
  const merged = JSON.parse(JSON.stringify(cand || {}));

  // Titles/axes fallback
  merged.title = merged.title || titleSynth.title || `${String(section).toUpperCase()} Forecast`;
  merged.xTitle = merged.xTitle || axesSynth.xTitle || 'X';
  merged.yTitle = merged.yTitle || axesSynth.yTitle || 'Y';

  // Ensure dataset structure exists
  if (!Array.isArray(merged.datasets)) merged.datasets = [];
  if (!merged.datasets[0]) merged.datasets[0] = { label: merged.title, data: [] };

  // Label synthesis: if values exist but labels don’t
  const values = merged.datasets?.[0]?.data || [];
  if ((!Array.isArray(merged.labels) || merged.labels.length === 0) && values.length > 0) {
    const unit = (merged.xTitle || '').toLowerCase().includes('month') ? 'M' : 'Y';
    merged.labels = Array.from({ length: values.length }, (_, i) => `${unit}${i + 1}`);
  }

  return merged;
}

/* ========================================================================== */
/* Renderers / synth                                                           */
/* ========================================================================== */

// Render candidate to fragment (NO DEFAULTING — if it’s not complete, we reject earlier)
function renderCandidateToFragment(section, c) {
  if (String(c.type || '').toLowerCase() === 'heatmap' && section === 'risk') {
    const spec = {
      title: c.title,
      rows: Array.isArray(c.rows) ? c.rows.slice(0, 12) : ['R1', 'R2', 'R3', 'R4', 'R5'],
      cols: Array.isArray(c.cols) ? c.cols.slice(0, 12) : ['C1', 'C2', 'C3', 'C4', 'C5'],
      data: Array.isArray(c.data) ? c.data : [],
    };
    return `<div data-heatmap='${JSON.stringify(spec)}'></div>`;
  }
  const spec = {
    type: String(c.type || 'line').toLowerCase(),
    title: c.title,
    xTitle: c.xTitle,
    yTitle: c.yTitle,
    labels: c.labels,
    datasets: c.datasets.map((ds) => ({ label: ds.label || 'Predicted', data: ds.data })),
  };
  return `<figure data-chart='${JSON.stringify(spec)}'></figure>`;
}

// Synthesize missing title/axes (and log) — will rarely run now, because we reject blanks
function synthTitleIfMissing(section, frag) {
  return String(frag).replace(
    /(<figure[^>]*data-chart=['"])([\s\S]*?)(['"][^>]*>[\s\S]*?<\/figure>)/i,
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
      return pre + JSON.stringify(obj) + post;
    },
  );
}

// One-sentence description
async function predictiveDescription(section, canon, meta) {
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Return one short HTML paragraph only (<p>…</p>), no lists, no headings.',
        },
        {
          role: 'user',
          content: `Write a crisp 1–2 sentence description of the predictive chart for "${section}" titled "${meta.title}".
Mention the X and Y meanings and the executive decision it informs. Keep it factual and concise.`,
        },
      ],
    });
    const p = (res.choices?.[0]?.message?.content || '').trim();
    return /^<p[\s>]/i.test(p) ? p : `<p>${p}</p>`;
  } catch {
    return '';
  }
}

/* ========================================================================== */
/* Choose predictive fragment                                                  */
/* ========================================================================== */
async function choosePredictiveFragment(section, canon, sectionHtml, existingSigSet) {
  // ⚠️ Commenting out the misplaced pre-batch loop that referenced `batch` before declaration.
  // for (let i = 0; i < batch.length; i++) {
  //   const merged = mergeSynth(section, canon, batch[i]);
  //   if (!isGraphCandidateValid(section, merged)) { /* ... */ continue; }
  //   const frag = renderCandidateToFragment(section, merged);
  //   const meta = parseVizMeta(frag);
  //   console.log(TAG, 'predictive.select', section, { /* ... */ });
  //   return { html: frag, meta };
  // }

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

    // ✅ Merge/synthesize FIRST
    const merged = mergeSynth(section, canon, c);

    // ✅ Optional guard to avoid generic fallback charts (reject if still incomplete)
    if (!merged.title || !merged.xTitle || !merged.yTitle || !merged.labels?.length) {
      console.log(TAG, 'predictive.reject.missingMeta', section, { idx: i + 1 });
      continue;
    }

    // ✅ Validate the *merged* spec (not raw)
    if (!isGraphCandidateValid(section, merged)) {
      console.log(TAG, 'predictive.reject.invalid', section, {
        idx: i + 1,
        reason: 'shape/labels/data/title/axes',
        type: merged.type,
        // ✅ exact optional-chaining expression required:
        sample: Array.isArray(merged.datasets?.[0]?.data)
          ? merged.datasets[0].data.slice(0, 3)
          : [],
      });
      continue;
    }

    // ✅ Render from the merged spec (never from raw `c`)
    const frag = renderCandidateToFragment(section, merged);

    // Secondary guard: block any table that might slip through
    if (/<table[\s\S]*<\/table>/i.test(frag)) {
      console.log(TAG, 'predictive.reject.tableDetected', section, { idx: i + 1 });
      continue;
    }

    // Secondary guard: block any benchmark that might slip through
    const metaPre = parseVizMeta(frag);
    if (String(metaPre.kind || '').toLowerCase() === 'benchmark') {
      console.log(TAG, 'predictive.reject.benchmark', section, { idx: i + 1 });
      continue;
    }

    // Last resort synth (should rarely trigger now)
    const fragSynth = synthTitleIfMissing(section, frag);
    const meta = parseVizMeta(fragSynth);

    if (isStandardSectionGraphDuplicate(section, meta)) {
      console.log(TAG, 'predictive.reject.standardDup', section, { idx: i + 1, title: meta.title });
      continue;
    }

    const sig = `${meta.kind}|${String(meta.title || '')
      .trim()
      .toLowerCase()}`;
    if (existingSigSet.has(sig) || seenLocal.has(sig)) {
      console.log(TAG, 'predictive.reject.duplicate', section, { idx: i + 1, sig });
      continue;
    }

    // ✅ Logging using merged (not raw) and with exact optional chaining
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
    });

    const desc = await predictiveDescription(section, canon, meta);
    seenLocal.add(sig);

    // ✅ Return the merged-rendered fragment (plus description)
    return fragSynth + '\n' + desc;
  }

  console.log(TAG, 'predictive.fail.exhausted', section, { tried: batch.length });
  return '';
}

/* ========================================================================== */
/* mining / derived / advice (disabled)                                        */
/* ========================================================================== */
function vizOnlyPrompt(section, canon, sectionHtml) {
  return '';
}
async function addVizIfData(section, canon, sectionHtml) {
  return '';
}
async function addDerivedVizIfNeeded(section, canon) {
  return '';
}
function advicePrompt(section, canon, sectionHtml) {
  return '';
}
async function addDataAdviceParagraph(section, canon, sectionHtml) {
  return '';
}

/* ========================================================================== */
/* [KT:T3] Section text prompts                                                */
/* ========================================================================== */
function sectionPrompt(section, canon, minWords) {
  return `
Audience: C-suite. Tone: concise, evidence-driven, pragmatic.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Size: ${canon.companySize}. Time frame: ${canon.timeFrame}.

Paragraph discipline: 3–4 sentences per paragraph (≈4–6 lines). Split any longer blocks. Avoid run-ons.

When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.
${NO_VISUALS_GUIDANCE}

Section: ${section}.
Hard minimum words: ${minWords}. Avoid generic filler. No appendix.
`.trim();
}

function expandPrompt(section, canon, remainingWords) {
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Write 2–3 short paragraphs (3–4 sentences each). Avoid repetition and filler.
Target at least ${remainingWords} words. Output valid HTML only.
Use <table class="report-table"> for any tables. Do NOT include charts or heatmaps here.
`.trim();
}

/* ========================================================================== */
/* Implementation Kit JSON (appendices only)                                   */
/* ========================================================================== */
// (Restored from your appendix code)
async function genImplKitJSON(canon, sections) {
  const body = `
You are producing JSON only (no prose). Build an Implementation Kit from the report content.

Return exactly this shape:
{
  "charters": [ { "name": "...", "objective": "...", "scopeIn": "...", "scopeOut": "...", "owner": "...",
                  "stakeholders": ["..."], "milestones":[{"milestone":"...","due":"..."}],
                  "kpis":[{"kpi":"...","baseline":0,"target":0,"source":"..."}],
                  "risks":[{"risk":"...","mitigation":"...","owner":"..."}],
                  "budgetSummary":"...", "acceptanceCriteria":"..." } ],
  "raci": { "items":[{"decision":"...","R":"...","A":"...","C":["..."],"I":["..."],"SLA":"..."}] },
  "raid": { "items":[{"type":"Risk|Assumption|Issue|Dependency","description":"...","owner":"...",
                      "impact":"...","probability":"...","trigger":"...","mitigation":"...",
                      "status":"...","nextReview":"..."}] },
  "benefits": { "lines":[{"workstream":"...","lever":"...","unitAssumption":"...",
                          "source":"...","volume":0,"rate":0,"monthlyImpact":0,
                          "confidence":"Low|Medium|High","startMonth":"M1","runRateMonth":"M3","oneOffCost":0}] },
  "plan100": { "weeks":[{"week":"W1","workstream":"...","task":"...","owner":"...","status":"Planned"}] },
  "pilot": { "name":"...", "locations":10, "successKPIs":["..."], "thresholds":["..."],
             "sampleDesign":"...", "rollbackCriteria":"..." },
  "assumptions": { "items":[{"name":"...","value":0,"unit":"...","low":0,"high":0,"note":"..."}] },
  "methods": { "benchmarks":[{"name":"...","source":"...","date":"YYYY-MM","notes":"..."}],
               "sources":["...","..."] }
}
`.trim();

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return strict JSON only. No prose.' },
        {
          role: 'user',
          content:
            body +
            `\n\n--- CONTEXT (EXCERPTS) ---\nEXEC:\n${sections.exec}\n\nCURRENT:\n${sections.current}\n\nFINANCIALS:\n${sections.financials}\n\nKPIS:\n${sections.kpis}\n\nTIMELINE:\n${sections.timeline}\n\nOPS:\n${sections.ops}\n\nRISK:\n${sections.risk}\n\nROI:\n${sections.roi}\n\nCONCLUSION:\n${sections.conclusion || ''}`,
        },
      ],
    });
    const txt = res.choices?.[0]?.message?.content || '{}';
    let json = {};
    try {
      json = JSON.parse(txt);
    } catch {
      json = {};
    }
    if (json && typeof json === 'object') return json;
    return {};
  } catch (e) {
    console.log(TAG, 'appendix.implKit.error', String(e?.message || e));
    return {};
  }
}

/* ========================================================================== */
/* [KT:AUDIT] McKinsey polish (structure/length-safe)                          */
/* ========================================================================== */
async function polishMcKinsey(html, canon) {
  console.log(TAG, '[KT:AUDIT] start', { org: canon.orgName });

  const prompt = `
POLISH THE HTML REPORT for ${canon.orgName}.

Benchmark & objective:
- Benchmark against McKinsey, BCG, and Bain.
- The result must be **equal or better than McKinsey** in readability, visual hierarchy, and professional finish —
  WITHOUT changing document structure or total length beyond ±5%.

Hard constraints (must not break):
- DO NOT remove sections or anchors (ids: "exec","current","financials","kpis","timeline","ops","risk","roi","conclusion").
- DO NOT change total length by more than ±5%.
- DO NOT add or remove charts/figures/tables; re-style only (class names, spacing, alignment).
- Keep all numeric content and labels intact.

Allowed improvements:
- Paragraph discipline: limit to 3–4 sentences per paragraph; split long blocks; avoid orphans/widows.
- Typography: consistent <h3>/<h4>, tighter leading, improved spacing before/after tables and figures.
- Tables: ensure <table class="report-table">, concise headers, aligned numerals, units in headers.
- Figures: keep fragments intact but align captions; standardize axis label capitalization.
- Layout: consistent margins; remove double spaces and stray <br>.
- Microcopy: de-jargonize while preserving facts.

Return STRICT JSON:
{
  "applied": true,
  "notes": ["bullet phrases describing improvements (max 10)"],
  "html": "<FULL POLISHED HTML>"
}
`.trim();

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return JSON only with keys "applied","notes","html".' },
        { role: 'user', content: prompt + `\n\n--- HTML ---\n${html}` },
      ],
    });
    let obj = {};
    try {
      obj = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    } catch {
      obj = {};
    }
    const newHtml = String(obj.html || '').trim();
    if (!obj.applied || !newHtml) {
      console.log(TAG, '[KT:AUDIT] skipped', { reason: 'no html/applied flag' });
      return html;
    }
    const keyIds = [
      'exec',
      'current',
      'financials',
      'kpis',
      'timeline',
      'ops',
      'risk',
      'roi',
      'conclusion',
    ];
    const okIds = keyIds.every((id) => new RegExp(`id=["']${id}["']`).test(newHtml));
    const oldW = wc(html),
      newW = wc(newHtml);
    const driftPct = ((newW - oldW) / Math.max(1, oldW)) * 100;
    const lengthOK = Math.abs(driftPct) <= 5;

    if (okIds && lengthOK) {
      console.log(TAG, '[KT:AUDIT] applied', {
        typography: true,
        tableStyle: true,
        paragraphDiscipline: true,
        wordDeltaPct: +driftPct.toFixed(1),
        notes: obj.notes?.slice?.(0, 6) || [],
      });
      return newHtml;
    } else {
      console.log(TAG, '[KT:AUDIT] rejected', {
        okIds,
        lengthOK,
        wordDeltaPct: +driftPct.toFixed(1),
      });
      return html;
    }
  } catch (e) {
    console.log(TAG, '[KT:AUDIT] error', String(e?.message || e));
    return html;
  }
}

/* ========================================================================== */
/* generation core                                                             */
/* ========================================================================== */

// [KT:SANITIZE] remove any visuals the section writer tried to add
function sanitizeNonPredictiveVisuals(section, html) {
  // Remove generic charts, benchmarks, heatmaps produced inside section text
  let out = String(html || '')
    .replace(/<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>/gi, '')
    .replace(/<div[^>]*data-heatmap=['"][\s\S]*?<\/div>/gi, '')
    .replace(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/gi, '');
  if (out !== html) console.log(TAG, 'section.viz.sanitized', section);
  return out;
}

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

// Simple conclusion generator
async function genConclusion(canon, sections) {
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      {
        role: 'system',
        content: 'Return clean HTML only. Two short paragraphs, 3–4 sentences each.',
      },
      {
        role: 'user',
        content: `Write the Conclusion for a transformation report for ${canon.orgName} (${canon.country}).
Summarize exec-ready takeaways, decision asks, and the next 90-day focus. Keep it crisp.
Avoid new figures/tables and avoid repeating headings.`,
      },
    ],
  });
  return (res.choices?.[0]?.message?.content || '').trim();
}

// ---------------- API route ----------------
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
  // lock total per-section floors to target total
  canon.minWords = TOTAL_FLOOR;

  console.log(TAG, 'generate.start', {
    model: MODEL,
    org: canon.orgName,
    minWords: canon.minWords,
  });

  const order = [
    'exec',
    'current',
    'financials',
    'kpis',
    'timeline',
    'ops',
    'risk',
    'roi',
    'conclusion',
  ]; // [KT:ADD conclusion]
  const sections = {};

  for (const key of order) {
    if (key === 'conclusion') {
      sections.conclusion = await genConclusion(canon, sections);
      continue;
    }

    const floor = SECTION_FLOORS[key] || 1200;

    // Generate and TOP-UP the SAME section until its floor is met before moving on.
    let html = await genSectionFirstPass(key, canon, floor);
    html = await topUpSection(key, canon, html, floor);

    // Collect existing viz signatures in the section (artifacts already present)
    const { sigs: existingSigs } = collectExistingVizMeta(html);

    const preHas = hasViz(html);
    console.log(TAG, 'section.viz.precheck', key, {
      has: preHas,
      htmlLen: html.length,
      words: wc(html),
    });

    // Predictive analytics (keywords-first). Skip ONLY exec. (Current now allowed)
    if (key !== 'exec') {
      try {
        const predFrag = await choosePredictiveFragment(key, canon, html, existingSigs);
        if (predFrag) {
          html += '\n' + predFrag;
          console.log(TAG, 'section.vizInjected', key, { mode: 'predictive-keywords' });
        } else {
          console.log(TAG, 'section.viz.predictive.none', key);
        }
      } catch (e) {
        console.log(TAG, 'section.viz.branch.error', key, String(e?.message || e));
      }
    }

    sections[key] = html;
  }

  // Build roadmap phases
  let phases = await derivePhasesFrom(sections.timeline, canon);
  if (phases.length < 5) {
    phases = [1, 2, 3, 4, 5].map((i) => ({
      title: `Phase ${i}`,
      caption:
        i === 1 ? 'Kickoff & baselines' : i === 5 ? 'Sustain & scale' : 'Milestones & deliverables',
    }));
  }

  // Appendices: Implementation Kit JSON derived from sections (RESTORED)
  const implKit = await genImplKitJSON(canon, sections);

  // Final HTML (pre-audit)
  let html = buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit });

  // McKinsey-style polish (structure & length guards)
  html = await polishMcKinsey(html, canon);

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  return NextResponse.json({ ok: true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}
