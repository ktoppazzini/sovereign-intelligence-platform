// ===============================
// app/api/reform/generate/route.js
// ===============================
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

// [KT:PARSE] Extract a single viz fragment from model output
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

// [KT:PARSE] Pull meta (kind, type, title, axes, lens) for de-dupe + logging
function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '', xTitle: '', yTitle: '', labelsLen: 0, dataLen: 0 };
  if (!frag) return out;
  const chart = frag.match(/<figure[^>]*data-chart=['"]([\s\S]*?)['"]/i);
  if (chart) {
    out.kind = 'chart';
    try {
      const json = safeParseAttrJSON(chart[1]); // [KT:FIX] entity-unescape
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

// [KT:PARSE] Collect existing viz titles/kinds in a section (for de-dupe)
function collectExistingVizMeta(html = '') {
  const titles = new Set();
  const sigs = new Set(); // kind|title
  const all =
    String(html || '').match(
      /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi,
    ) || [];
  for (const frag of all) {
    const m = parseVizMeta(frag);
    const t = (m.title || '').trim().toLowerCase() || '(untitled)'; // [KT] track untitled too
    titles.add(t);
    sigs.add(`${m.kind}|${t}`);
  }
  return { titles, sigs };
}

/* ========================================================================== */
/* Guidance for numeric, standardized visuals                                  */
/* ========================================================================== */
const DATA_BACKED_VIZ_GUIDANCE = `
Return EXACTLY ONE fragment if numbers exist or can be defensibly derived from canon (time frame, costSavingsGoal, size).
Use local currency for money; include title, xTitle, yTitle, labels, datasets. No prose around it.

1) Standard chart:
<figure data-chart='{
  "type":"bar|line|pie|doughnut",
  "title":"<clear title>",
  "xTitle":"<X axis label>",
  "yTitle":"<Y axis label (units: CAD/USD/GBP/EUR/INR or Percent)>",
  "labels":[<labels>],
  "datasets":[{"label":"<series>","data":[<numbers>]}]
}'></figure>

2) Benchmark:
<figure data-widget="benchmark" data-spec='{
  "title":"<clear title>",
  "current":<number>,
  "benchmark":<number>,
  "yTitle":"<units>"
}'></figure>

3) Heat map:
<div data-heatmap='{
  "title":"<clear title>",
  "rows":[<row labels>],
  "cols":[<column labels>],
  "data":[[<numbers>],[...]]
}'></div>
`;

/* ========================================================================== */
/* Predictive analytics — keywords-first                                       */
/* ========================================================================== */

// [KT:ADD] standard-visual collision guard (predictive must avoid duplicating them)
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

// Ask AI for predictive keywords (up to ~1000)
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

// Ask AI for a batch of candidate charts generated from those keywords
async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords) {
  const yCur = currencyUnitForCountry(canon.country);
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  const user =
    `From KEYWORDS, choose up to 12 of the best predictive analytics for the "${section}" section.
For each, return ONE JSON candidate chart **(no tables, no benchmarks)** with:
- "keyword" (from KEYWORDS),
- "type" in ["line","bar","pie","doughnut"]  // [KT:BLOCK] no "benchmark" allowed
- "title" (clear and specific; if you omit it, that's fine — the system will synthesize),
- "xTitle" ("${years ? 'Years' : 'Months'}"),
- "yTitle" ("${section === 'financials' || section === 'exec' ? yCur : section === 'kpis' || section === 'roi' || section === 'current' ? 'Percent' : 'Index'}"),
- "labels": ${JSON.stringify(labels)},
- "datasets":[{"label":"Predicted","data":[numbers with same length as labels]}]
Return STRICT JSON:
{"candidates":[{...},{...}]}

KEYWORDS:
${JSON.stringify(keywords).slice(0, 6000)}

CANON:
${JSON.stringify({ country: canon.country, currency: yCur, timeFrame: canon.timeFrame, costSavingsGoal: canon.costSavingsGoal })}

SECTION HTML (source for defensible numbers):
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

// Validate a candidate shape (must be a CHART, not a TABLE, not a BENCHMARK)
function isGraphCandidateValid(section, c) {
  if (!c) return false;
  if (c.kind && /table/i.test(c.kind)) return false;
  const type = String(c.type || '').toLowerCase();
  // [KT:BLOCK] benchmark never allowed in predictive
  if (type === 'benchmark' || String(c.kind || '').toLowerCase() === 'benchmark') return false;
  if (!['line', 'bar', 'pie', 'doughnut', 'heatmap'].includes(type)) return false;
  if (type === 'heatmap' && section !== 'risk') return false;
  const labels = Array.isArray(c.labels) ? c.labels : [];
  const data = Array.isArray(c.datasets?.[0]?.data) ? c.datasets[0].data : [];
  if (!labels.length || !data.length || labels.length !== data.length) return false;
  const nums = data.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  if (!nums.length || nums.every((n) => n === 0)) return false;
  return true;
}

// Render a candidate to HTML fragment
function renderCandidateToFragment(section, c) {
  // [KT:BLOCKED] benchmark rendering disabled
  /*
  if (c.kind==='benchmark' || c.type==='benchmark'){
    const spec = {
      title: c.title || 'Benchmark Comparison',
      current: Number(c.current||0),
      benchmark: Number(c.benchmark||0),
      yTitle: c.yTitle || 'Index'
    };
    return `<figure data-widget="benchmark" data-spec='${JSON.stringify(spec)}'></figure>`;
  }
  */

  if (String(c.type || '').toLowerCase() === 'heatmap' && section === 'risk') {
    const spec = {
      title: c.title || 'Risk Heat Map',
      rows: Array.isArray(c.rows) ? c.rows.slice(0, 12) : ['R1', 'R2', 'R3', 'R4', 'R5'],
      cols: Array.isArray(c.cols) ? c.cols.slice(0, 12) : ['C1', 'C2', 'C3', 'C4', 'C5'],
      data: Array.isArray(c.data)
        ? c.data
        : [
            [1, 2, 3, 4, 5],
            [2, 3, 4, 3, 2],
            [1, 2, 3, 2, 1],
            [2, 3, 4, 3, 2],
            [3, 2, 2, 3, 4],
          ],
    };
    return `<div data-heatmap='${JSON.stringify(spec)}'></div>`;
  }
  const spec = {
    type: String(c.type || 'line').toLowerCase(),
    title: c.title || 'Forecast',
    xTitle: c.xTitle || 'Periods',
    yTitle: c.yTitle || 'Index',
    labels: Array.isArray(c.labels) ? c.labels : ['P1', 'P2', 'P3'],
    datasets: Array.isArray(c.datasets) ? c.datasets : [{ label: 'Predicted', data: [1, 2, 3] }],
  };
  // align lengths
  spec.datasets = spec.datasets.map((ds) => ({
    label: ds.label || 'Predicted',
    data: (Array.isArray(ds.data) ? ds.data : []).slice(0, spec.labels.length),
  }));
  return `<figure data-chart='${JSON.stringify(spec)}'></figure>`;
}

// Synthesize missing title/axes (and log)
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

// Short description (not hints)
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
Mention the X and Y meanings and the executive decision it informs. Keep it factual and concise.
`,
        },
      ],
    });
    const p = (res.choices?.[0]?.message?.content || '').trim();
    return /^<p[\s>]/i.test(p) ? p : `<p>${p}</p>`;
  } catch {
    return '';
  }
}

// Choose predictive fragment from keyword-driven batch
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
    const kind = String(c.kind || c.type || 'chart').toLowerCase();

    if (!isGraphCandidateValid(section, c)) {
      console.log(TAG, 'predictive.reject.invalid', section, {
        idx: i + 1,
        reason: 'shape/labels/data',
        type: c.type,
        kind,
      });
      continue;
    }

    let frag = renderCandidateToFragment(section, c);
    // tables in any disguise are not allowed for predictive graphs
    if (/<table[\s\S]*<\/table>/i.test(frag)) {
      console.log(TAG, 'predictive.reject.tableDetected', section, { idx: i + 1 });
      continue;
    }

    // [KT:BLOCK] if something came through as benchmark after rendering, skip
    const metaPre = parseVizMeta(frag);
    if (String(metaPre.kind || '').toLowerCase() === 'benchmark') {
      console.log(TAG, 'predictive.reject.benchmark', section, { idx: i + 1 });
      continue;
    }

    frag = synthTitleIfMissing(section, frag);
    const meta = parseVizMeta(frag);

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

    const sample = Array.isArray(c.datasets?.[0]?.data) ? c.datasets[0].data.slice(0, 3) : [];
    console.log(TAG, 'predictive.select', section, {
      idx: i + 1,
      keyword: c.keyword || '(unspecified)',
      type: meta.type || kind,
      title: meta.title,
      xTitle: meta.xTitle,
      yTitle: meta.yTitle,
      labelsLen: meta.labelsLen,
      valuesSample: sample,
    });

    const desc = await predictiveDescription(section, canon, meta);
    seenLocal.add(sig);
    return frag + '\n' + desc;
  }

  console.log(TAG, 'predictive.fail.exhausted', section, { tried: batch.length });
  return '';
}

/* ========================================================================== */
/* [KT:ITER] Iterative predictive strategies (kept but no longer used)         */
/* ========================================================================== */

const MAX_PREDICTIVE_ATTEMPTS = 20;

// build list (unchanged except for surgical guards later)
function buildPredictiveStrategyList(section = '') {
  // const base = [
  let base = [
    { id: 'trend', titleHint: 'Trend Forecast', type: 'line' },
    { id: 'benchmark', titleHint: 'Current vs Benchmark', type: 'benchmark' }, // [KT:WILL-FILTER]
    { id: 'seasonality', titleHint: 'Seasonality Projection', type: 'bar' },
    { id: 'throughput', titleHint: 'Throughput Projection', type: 'line' },
    { id: 'risk-heatmap', titleHint: 'Risk Exposure Heat Map', type: 'heatmap' },
    { id: 'growth', titleHint: 'Growth Trajectory', type: 'line' },
    { id: 'sensitivity', titleHint: 'Sensitivity by Lever', type: 'bar' },
    { id: 'mix', titleHint: 'Channel Mix Shift', type: 'pie' },
    { id: 'mix2', titleHint: 'Category Mix Outlook', type: 'doughnut' },
    { id: 'productivity', titleHint: 'Productivity Uplift Forecast', type: 'line' },
    { id: 'quality', titleHint: 'Quality Defect Reduction', type: 'bar' },
    { id: 'cycle', titleHint: 'Cycle Time Outlook', type: 'line' },
    { id: 'capacity', titleHint: 'Capacity Utilization', type: 'bar' },
    { id: 'adoption', titleHint: 'Digital Adoption Forecast', type: 'line' },
    { id: 'penetration', titleHint: 'Market Penetration Forecast', type: 'line' },
    { id: 'conversion', titleHint: 'Conversion Rate Outlook', type: 'bar' },
    { id: 'cost', titleHint: 'Unit Cost Trajectory', type: 'line' },
    { id: 'ebitda', titleHint: 'EBITDA Margin Outlook', type: 'line' },
    { id: 'cash', titleHint: 'Cash Flow Outlook', type: 'line' },
    { id: 'retention', titleHint: 'Customer Retention Outlook', type: 'bar' },
    { id: 'absenteeism', titleHint: 'Absenteeism Outlook', type: 'bar' },
    { id: 'safety', titleHint: 'Safety Incident Outlook', type: 'line' },
    { id: 'supply', titleHint: 'Supply Reliability Forecast', type: 'line' },
    { id: 'service', titleHint: 'Service Level Forecast', type: 'line' },
    { id: 'backlog', titleHint: 'Backlog Burn-down', type: 'line' },
  ];

  if (section === 'financials') {
    base.unshift(
      { id: 'revenue', titleHint: 'Revenue Forecast', type: 'line' },
      { id: 'margin', titleHint: 'Gross Margin Outlook', type: 'line' },
      { id: 'payback', titleHint: 'Payback Curve', type: 'line' },
    );
  } else if (section === 'kpis') {
    base.unshift({ id: 'kpi-uplift', titleHint: 'Target KPI Uplift', type: 'bar' });
  } else if (section === 'ops') {
    base.unshift(
      { id: 'throughput2', titleHint: 'Operational Throughput', type: 'line' },
      { id: 'util', titleHint: 'Resource Utilization', type: 'bar' },
    );
  } else if (section === 'risk') {
    base.unshift({ id: 'risk-hm2', titleHint: 'Top Risks Heat Map', type: 'heatmap' });
  }

  // [KT:FIX] guardrails just before return:
  try {
    // Heatmap only in Risk
    if (section !== 'risk') base = base.filter((v) => v.type !== 'heatmap');

    // [KT:BLOCK] drop benchmarks from predictive everywhere
    base = base.filter((v) => v.type !== 'benchmark' && v.id !== 'benchmark');

    // Also remove generic option in sections with predetermined visuals
    const hasStandardGraph = ['exec', 'financials', 'kpis'].includes(section);
    if (hasStandardGraph) base = base.filter((v) => v.id !== 'generic');
  } catch (err) {
    console.error('[KT:FIX] predictive strategy guard failed:', err);
  }

  return base;
}

// Legacy prompt + function retained (unused)
function predictiveStrategyPrompt(section, canon, sectionHtml, strategy) {
  /* unchanged in this patch */ return '';
}
async function tryPredictiveStrategies(section, canon, sectionHtml, existingSigSet) {
  /* unchanged, kept for audit */ return '';
}

/* ========================================================================== */
/* mining / derived / advice (helpers retained; left disabled in main loop)    */
/* ========================================================================== */
function vizOnlyPrompt(section, canon, sectionHtml) {
  /* unchanged */ return '';
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
  /* unchanged main generation prompt */ return `
Audience: C-suite. Tone: concise, evidence-driven, pragmatic.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Size: ${canon.companySize}. Time frame: ${canon.timeFrame}.
When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.

Section: ${section}.
Hard minimum words: ${minWords}. Avoid generic filler. No appendix.

${DATA_BACKED_VIZ_GUIDANCE}
`;
}
function expandPrompt(section, canon, remainingWords) {
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Write 2–3 short paragraphs (no headings above <h3>). Avoid repetition.
Target at least ${remainingWords} words. Output valid HTML only.
Use <table class="report-table"> for any tables.
`;
}

/* ========================================================================== */
/* Implementation Kit JSON (appendices only)                                   */
/* ========================================================================== */
async function genImplKitJSON(canon, sections) {
  /* unchanged */ return {};
}

/* ========================================================================== */
/* [KT:AUDIT] McKinsey polish (structure/length-safe)                          */
/* ========================================================================== */
async function polishMcKinsey(html, canon) {
  console.log(TAG, '[KT:AUDIT] start', { org: canon.orgName });

  // [KT:AUDIT-BENCH] supersede prior audit prompt to exceed McKinsey quality
  const prompt = `
POLISH THE HTML REPORT for ${canon.orgName}.

Benchmark & objective:
- Benchmark against McKinsey, BCG, and Bain flagship reports (clarity, executive flow, typographic discipline, information density).
- The result must be **equal or better than McKinsey** in readability, visual hierarchy, and professional finish —
  WITHOUT changing document structure or total length beyond ±5%.

Hard constraints (must not break):
- DO NOT remove sections or anchors (ids: "exec","current","financials","kpis","timeline","ops","risk","roi").
- DO NOT change total length by more than ±5%.
- DO NOT add or remove charts/figures/tables; re-style only (class names, spacing, alignment).
- Keep all numeric content and labels intact.

Allowed improvements:
- Typography system: consistent heading levels (<h3>/<h4> only), tighter leading, improved spacing before/after tables and figures.
- Executive readability: merge choppy sentences; reduce redundancy; strengthen topic sentences; convert weak phrasing to assertive, evidence-led tone.
- Tables: ensure <table class="report-table"> everywhere, concise headers, aligned numerals, units in headers not cells.
- Figures: keep fragments intact but align captions, harmonize title case, standardize axis label capitalization.
- Layout: enforce consistentw margins between sections; pull short orphan lines up; avoid double spaces and stray <br>.
- Microcopy: de-jargonize and clarify hile preserving facts; prefer active voice.
- Make adjustments to graphs to be readable, break down pararaphs into 3-4 lines, apply better colour coordination and style hen Mckinsly

Return STRICT JSON:
{
  "applied": true,
  "notes": ["bullet phrases describing improvements you made (max 10)"],
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
    const keyIds = ['exec', 'current', 'financials', 'kpis', 'timeline', 'ops', 'risk', 'roi'];
    const okIds = keyIds.every((id) => new RegExp(`id=["']${id}["']`).test(newHtml));
    const oldW = wc(html),
      newW = wc(newHtml);
    const driftPct = ((newW - oldW) / Math.max(1, oldW)) * 100;
    const lengthOK = Math.abs(driftPct) <= 5;

    if (okIds && lengthOK) {
      console.log(TAG, '[KT:AUDIT] applied', {
        typography: true,
        tableStyle: true,
        headingTighten: true,
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
  const html = res.choices?.[0]?.message?.content?.trim() || '';
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
    html += '\n' + add;
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
  // lock total per-section floors to 20,000 and keep growth in-place
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

    // Predictive analytics (keywords-first). Skip exec & current.
    if (key !== 'exec' && key !== 'current') {
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

  // Build roadmap phases (unchanged)
  let phases = await derivePhasesFrom(sections.timeline, canon);
  if (phases.length < 5) {
    phases = [1, 2, 3, 4, 5].map((i) => ({
      title: `Phase ${i}`,
      caption:
        i === 1 ? 'Kickoff & baselines' : i === 5 ? 'Sustain & scale' : 'Milestones & deliverables',
    }));
  }

  // Appendices: Implementation Kit JSON derived from sections
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
