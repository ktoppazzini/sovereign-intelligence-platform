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
      // const json = JSON.parse(chart[1]); // [KT:OLD]
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
      // const json = JSON.parse(bench[1]); // [KT:OLD]
      const json = safeParseAttrJSON(bench[1]); // [KT:FIX]
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
      // const json = JSON.parse(heat[1]); // [KT:OLD]
      const json = safeParseAttrJSON(heat[1]); // [KT:FIX]
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
/* Predictive analytics — keywords-first (your required flow)                  */
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

// [KT:ADD] Ask AI for predictive keywords (up to ~1000)
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

// [KT:ADD] Ask AI for a batch of candidate charts generated from those keywords
async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords) {
  const yCur = currencyUnitForCountry(canon.country);
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  const user = `
From KEYWORDS, choose up to 12 of the best predictive analytics for the "${section}" section.
For each, return ONE JSON candidate chart (no tables) with:
- "keyword" (from KEYWORDS),
- "type" in ["line","bar","pie","doughnut"], or "heatmap" ONLY if section === "risk",
- "title" (clear and specific; if you omit it, that's fine — the system will synthesize),
- "xTitle" ("${years ? 'Years' : 'Months'}"),
- "yTitle" ("${section === 'financials' || section === 'exec' ? yCur : section === 'kpis' || section === 'roi' || section === 'current' ? 'Percent' : 'Index'}"),
- "labels": ${JSON.stringify(labels)},
- "datasets":[{"label":"Predicted","data":[numbers with same length as labels]}]
If you truly need a benchmark, include fields "current" and "benchmark" and set kind="benchmark".
Return STRICT JSON:
{"candidates":[{...},{...}]}

KEYWORDS:
${JSON.stringify(keywords).slice(0, 6000)}

CANON:
${JSON.stringify({ country: canon.country, currency: yCur, timeFrame: canon.timeFrame, costSavingsGoal: canon.costSavingsGoal })}

SECTION HTML (source for defensible numbers):
${sectionHtml}
`.trim();

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

// [KT:ADD] Validate a candidate shape (and that it is a CHART, not a TABLE)
function isGraphCandidateValid(section, c) {
  if (!c) return false;
  if (c.kind && /table/i.test(c.kind)) return false;
  const type = String(c.type || '').toLowerCase();
  if (
    !['line', 'bar', 'pie', 'doughnut', 'heatmap', 'benchmark'].includes(type) &&
    c.kind !== 'benchmark'
  )
    return false;
  if (type === 'heatmap' && section !== 'risk') return false;
  const labels = Array.isArray(c.labels) ? c.labels : [];
  const data = Array.isArray(c.datasets?.[0]?.data) ? c.datasets[0].data : [];
  if (!labels.length || !data.length || labels.length !== data.length) return false;
  // [KT:STRICT] require some numeric signal (not all zeros/NaN)
  const nums = data.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  if (!nums.length || nums.every((n) => n === 0)) return false;
  return true;
}

// [KT:ADD] Render a candidate to HTML fragment
function renderCandidateToFragment(section, c) {
  if (c.kind === 'benchmark' || c.type === 'benchmark') {
    const spec = {
      title: c.title || 'Benchmark Comparison',
      current: Number(c.current || 0),
      benchmark: Number(c.benchmark || 0),
      yTitle: c.yTitle || 'Index',
    };
    return `<figure data-widget="benchmark" data-spec='${JSON.stringify(spec)}'></figure>`;
  }
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

// [KT:ADD] Synthesize missing title/axes (and log)
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

// [KT:ADD] Short description (not hints)
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

// [KT:ADD] Choose predictive fragment from keyword-driven batch
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

// [KT] build list (unchanged except for surgical guards later)
function buildPredictiveStrategyList(section = '') {
  // const base = [
  let base = [
    { id: 'trend', titleHint: 'Trend Forecast', type: 'line' },
    { id: 'benchmark', titleHint: 'Current vs Benchmark', type: 'benchmark' },
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

  // [KT:FIX] (OLD misplaced block commented out)
  /*
  try {
    if (section !== 'risk') base = base.filter(v => v.type !== 'heatmap');
    const hasStandardGraph = ['executiveSummary','financials','kpis'].includes(section);
    if (hasStandardGraph) base = base.filter(v => v.id !== 'generic');
  } catch (err) {
    console.error('[KT:FIX] predictive strategy guard failed:', err);
  }
  */

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

  // [KT:FIX] --- Section-specific visual guardrails (moved here, just before return) ---
  try {
    if (section === 'risk') {
      // heatmaps allowed (already present)
    } else {
      base = base.filter((v) => v.type !== 'heatmap');
    }
    const hasStandardGraph = ['exec', 'financials', 'kpis'].includes(section);
    if (hasStandardGraph) {
      base = base.filter((v) => v.id !== 'generic');
    }
  } catch (err) {
    console.error('[KT:FIX] predictive strategy guard failed:', err);
  }
  // [KT:END-FIX]

  return base;

  // [KT:FIX] (DUPLICATE unreachable block previously here — commented)
  /*
  if (section === 'risk') {
    base.unshift({ id:'risk-heatmap', titleHint:'Risk Exposure Heat Map', type:'heatmap' });
  } else {
    base = base.filter(v => v.type !== 'heatmap');
  }
  const hasStandardGraph2 = ['executiveSummary','financials','kpis'].includes(section);
  if (hasStandardGraph2) base = base.filter(v => v.id !== 'generic');
  */
}

// [KT] PROMPT kept as-is for legacy iterative path (not used)
function predictiveStrategyPrompt(section, canon, sectionHtml, strategy) {
  const yCur = currencyUnitForCountry(canon.country);
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labelsJSON = JSON.stringify(
    years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
  );

  const shape =
    strategy.type === 'benchmark'
      ? `
Return exactly:
<figure data-widget="benchmark" data-spec='{
  "title":"${strategy.titleHint} (${section})",
  "current": <number>,
  "benchmark": <number>,
  "yTitle": "<Percent or ${yCur}>"
}'></figure>`
      : strategy.type === 'heatmap'
        ? `
Return exactly:
<div data-heatmap='{
  "title":"${strategy.titleHint} (${section})",
  "rows":["R1","R2","R3","R4","R5"],
  "cols":["C1","C2","C3","C4","C5"],
  "data":[[<1-5 ints>],[<…>],[<…>],[<…>],[<…>]]
}'></div>`
        : `
Return exactly:
<figure data-chart='{
  "type":"${strategy.type}",
  "title":"${strategy.titleHint} (${section})",
  "xTitle":"${years ? 'Years' : 'Months'}",
  "yTitle":"${section === 'financials' ? yCur : section === 'kpis' || section === 'roi' || section === 'current' ? 'Percent' : 'Index'}",
  "labels": ${labelsJSON},
  "datasets":[{"label":"Predicted","data":[<numbers matching labels length>]}]
}'></figure>`;

  return `
You will propose ONE predictive analytic relevant to the "${section}" section and generate a visualization fragment
ONLY if numbers exist in the section HTML below OR can be defensibly derived from canon (no fabrication).
Strategy to use now: ${strategy.id} (${strategy.type}).

Rules:
- Use local currency "${yCur}" for money; use "Percent" for ratios.
- Titles must include the section name and the specific analytic (e.g., "${strategy.titleHint} (${section})").
- Arrays must be consistent (labels length == data length).
- Do NOT return a generic title like "Chart"; use the provided title.
- Return the fragment ONLY (no prose, no markdown).

${DATA_BACKED_VIZ_GUIDANCE}

--- CANON ---
Org:${canon.orgName} Country:${canon.country} Time frame:${canon.timeFrame} Goal:${canon.costSavingsGoal}

--- SECTION HTML (numeric source) ---
${sectionHtml}
`.trim();
}

// [KT:ITER] legacy function retained (not used in POST anymore)
async function tryPredictiveStrategies(section, canon, sectionHtml, existingSigSet) {
  const list = buildPredictiveStrategyList(section);
  const max = Math.min(MAX_PREDICTIVE_ATTEMPTS, list.length);
  const seenNow = new Set();

  for (let i = 0; i < max; i++) {
    const strat = list[i];
    console.log(TAG, 'predictive.try', section, {
      attempt: `${i + 1}/${max}`,
      strategy: strat.id,
      type: strat.type,
    });
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'Return ONE visualization fragment as specified or nothing. No prose.',
          },
          { role: 'user', content: predictiveStrategyPrompt(section, canon, sectionHtml, strat) },
        ],
      });
      const raw = res.choices?.[0]?.message?.content || '';
      let frag = extractVizFragment(raw);
      if (!frag) {
        console.log(TAG, 'predictive.miss', section, { attempt: i + 1, strategy: strat.id });
        continue;
      }

      frag = synthTitleIfMissing(section, frag);

      const meta = parseVizMeta(frag);
      if (!meta.title || !meta.kind) {
        console.log(TAG, 'predictive.miss.meta', section, { attempt: i + 1, strategy: strat.id });
        continue;
      }
      const signature = `${meta.kind}|${(meta.title || '').trim().toLowerCase()}`;

      if (existingSigSet.has(signature) || seenNow.has(signature)) {
        console.log(TAG, 'predictive.duplicate', section, {
          attempt: i + 1,
          strategy: strat.id,
          signature,
        });
        continue;
      }

      console.log(TAG, 'predictive.select', section, {
        attempt: i + 1,
        strategy: strat.id,
        type: meta.type,
        title: meta.title,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
        labelsLen: meta.labelsLen,
        valuesSample: (() => {
          const m = String(frag).match(
            /"datasets"\s*:\s*\[\s*\{[^}]*"data"\s*:\s*\[([^\]]{0,120})\]/i,
          );
          return m ? m[1] : '';
        })(),
      });

      return frag;
    } catch (e) {
      console.log(TAG, 'predictive.error', section, {
        attempt: i + 1,
        strategy: strat.id,
        err: String(e?.message || e),
      });
    }
  }

  console.log(TAG, 'predictive.fail', section, { attempts: max });
  return '';
}

/* ========================================================================== */
/* mining / derived / advice (helpers retained; left disabled in main loop)    */
/* ========================================================================== */
function vizOnlyPrompt(section, canon, sectionHtml) {
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? '["Y1","Y2","Y3"]' : '["M1","M2","M3","M4","M5","M6"]';

  const titleHints = {
    exec: 'Projected Savings Over Time',
    current: 'Delivery Penetration vs Market',
    financials: 'Implementation Expenditures',
    kpis: 'Savings (Bar)',
    timeline: 'Milestone Throughput',
    ops: 'Ops Throughput Trend',
    risk: 'Risk Heat Map',
    roi: 'ROI Trend',
  };

  const yCur = currencyUnitForCountry(canon.country);
  const yHint =
    section === 'financials' || section === 'exec'
      ? yCur
      : section === 'current' || section === 'roi' || section === 'kpis'
        ? 'Percent'
        : section === 'ops'
          ? 'Index'
          : 'Value';

  return `
Generate a single visualization for "${section}" using numbers from the HTML below
or a minimal, defensible derivation from canon when the section lacks explicit numbers.
Prefer title "${titleHints[section] || 'Chart'}"; use yTitle "${yHint}". Labels like ${labels}.

${DATA_BACKED_VIZ_GUIDANCE}

--- CANON ---
Org: ${canon.orgName}  Country: ${canon.country}  Time frame: ${canon.timeFrame}
Cost-savings goal: ${canon.costSavingsGoal}

--- SECTION HTML (numeric source of truth) ---
${sectionHtml}
`.trim();
}

async function addVizIfData(section, canon, sectionHtml) {
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Return ONE visualization fragment or nothing. No prose.' },
        { role: 'user', content: vizOnlyPrompt(section, canon, sectionHtml) },
      ],
    });
    const raw = res.choices?.[0]?.message?.content || '';
    const frag = extractVizFragment(raw);
    if (frag) console.log(TAG, 'viz.modelFragment', section, { len: frag.length });
    return frag || '';
  } catch (e) {
    console.log(TAG, 'viz.mined.error', section, String(e?.message || e));
    return '';
  }
}

async function addDerivedVizIfNeeded(section, canon) {
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  const base = Math.max(1, Number(canon.costSavingsGoal || 100000));
  const step = Math.round(base / labels.length);
  const series = labels.map((_, i) => step * (i + 1));

  const yCur = currencyUnitForCountry(canon.country);
  const yTitle =
    section === 'financials' || section === 'exec'
      ? yCur
      : section === 'current' || section === 'roi' || section === 'kpis'
        ? 'Percent'
        : section === 'ops'
          ? 'Index'
          : 'Value';

  const title =
    {
      current: 'Forecasted Delivery Time per Week',
      financials: `Systemwide Revenue Forecast (${yCur} millions)`,
      kpis: 'Target KPI Improvement Forecast',
      timeline: 'Milestone Throughput Forecast',
      ops: 'Ops Throughput Forecast',
      risk: 'Risk Exposure Index (Predicted)',
      roi: 'ROI Forecast',
    }[section] || 'Forecast';

  const fragment = `
<figure data-chart='{
  "type":"line",
  "title": ${JSON.stringify(title)},
  "xTitle": ${JSON.stringify(years ? 'Years' : 'Months')},
  "yTitle": ${JSON.stringify(yTitle)},
  "labels": ${JSON.stringify(labels)},
  "datasets": [{"label":"Predicted","data": ${JSON.stringify(series)} }]
}'></figure>`.trim();

  console.log(TAG, 'viz.derivedFragment', section, { labels, seriesLen: series.length });
  return fragment;
}

function advicePrompt(section, canon, sectionHtml) {
  return `
Write ONE short HTML paragraph (<p>) advising what data to capture to enable a predictive indicator for "${section}".
Include fields (units), sources/owners, cadence/sample size, formula, and the best chart type once data exists.
No lists, no headings—return a single <p>…</p>.

Context:
${sectionHtml}
`.trim();
}
async function addDataAdviceParagraph(section, canon, sectionHtml) {
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Return one short <p>…</p> with how to instrument the data. No lists, no headings.',
        },
        { role: 'user', content: advicePrompt(section, canon, sectionHtml) },
      ],
    });
    return (res.choices?.[0]?.message?.content || '').trim();
  } catch (e) {
    console.log(TAG, 'viz.advice.error', section, String(e?.message || e));
    return '';
  }
}

/* ========================================================================== */
/* [KT:T3] Section text prompts                                                */
/* ========================================================================== */
function sectionPrompt(section, canon, minWords) {
  const common =
    'Audience: C-suite. Tone: concise, evidence-driven, pragmatic. ' +
    `Organization: ${canon.orgName} (${canon.country}). ` +
    `Goal: ${canon.desiredOutcome}. Size: ${canon.companySize}. Time frame: ${canon.timeFrame}. ` +
    'When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.';

  const asks = {
    exec: 'Write an executive summary with 4–6 bullet takeaways and 2–3 tight paragraphs. Quantify headline savings and payback.',
    current:
      'Describe current state, constraints, and pain points with concrete examples. Include a compact comparative table if useful.',
    financials:
      'Lay out baseline costs, implementation costs, savings by lever, and payback. Make trade-offs explicit. Keep tables compact.',
    kpis: 'Define 6–10 KPIs with baselines and realistic targets. Explain why each matters. Prefer short paragraphs + compact tables.',
    timeline:
      'Describe a plan grouped into exactly five phases with milestones and owners. The horizon is dynamic (1 month to 10 years).',
    ops: 'Detail the operating model across people, process, data, and technology. Include change-management, training, and governance.',
    risk: 'List key risks with mitigation, triggers, and accountable owner. Prefer bullets + a concise risk table.',
    roi: 'Explain ROI and non-financial benefits; close with a clear executive call-to-action and next steps.',
  };

  return `${common}
Section: ${section}.
${asks[section]}

HARD RULES (Grouping/No-dup for T3):
- Do NOT repeat ideas you already wrote earlier in this section; add new content only.
- Stay strictly within this section’s scope; do NOT include other sections.
- Do NOT insert any <h1> or <h2>; renderer supplies those. If you use headings, only <h3>/<h4>.
- Do NOT title a heading the same as the section name.

Hard minimum words: ${minWords}. Avoid generic filler. No appendix.

${DATA_BACKED_VIZ_GUIDANCE}
`;
}

function expandPrompt(section, canon, remainingWords) {
  return `Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Write 2–3 short paragraphs (no headings above <h3>). Avoid repeating earlier text.
Stay strictly within "${section}". Target at least ${remainingWords} words. Output valid HTML only.
Use <table class="report-table"> for any tables.
`;
}

/* ========================================================================== */
/* Implementation Kit JSON (appendices only)                                   */
/* ========================================================================== */
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

Constraints:
- Derive entries from the report sections below (Current, Financials, Timeline, Ops, Risk, ROI, KPIs).
- Keep counts tight: 3–6 charters, 6–12 RAID items, 10–20 benefits lines, 12–16 week rows.
- Use units consistently (CAD or Percent) and ranges that appear or are implied by the text.
- Output PURE JSON only.

--- CANON ---
Org: ${canon.orgName} (${canon.country})  Size: ${canon.companySize}  Time frame: ${canon.timeFrame}

--- SECTIONS (HTML) ---
CURRENT:
${sections.current}
FINANCIALS:
${sections.financials}
TIMELINE:
${sections.timeline}
OPS:
${sections.ops}
RISK:
${sections.risk}
ROI:
${sections.roi}
KPIS:
${sections.kpis}
`.trim();

  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'Return valid JSON only. No markdown, no prose.' },
      { role: 'user', content: body },
    ],
  });

  try {
    return JSON.parse(res.choices?.[0]?.message?.content || '{}');
  } catch {
    return {};
  }
}

/* ========================================================================== */
/* [KT:AUDIT] McKinsey polish (structure/length-safe)                          */
/* ========================================================================== */
async function polishMcKinsey(html, canon) {
  console.log(TAG, '[KT:AUDIT] start', { org: canon.orgName });

  // Ask for a JSON summary of changes + polished HTML returned separately

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
    // Safety rails: preserve ids & size
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

    // [KT:DEDUP] collect existing viz signatures in the section (artifacts already present)
    const { sigs: existingSigs } = collectExistingVizMeta(html);

    // Always log whether we already saw a fragment
    const preHas = hasViz(html);
    console.log(TAG, 'section.viz.precheck', key, {
      has: preHas,
      htmlLen: html.length,
      words: wc(html),
    });

    // [KT] Predictive analytics (keywords-first). Skip exec & current.
    if (key !== 'exec' && key !== 'current') {
      try {
        // // [KT:SWAP-OUT] legacy iterative strategy path (kept but disabled)
        // const iterFrag = await tryPredictiveStrategies(key, canon, html, existingSigs);
        // if (iterFrag) { html += '\n' + iterFrag; console.log(TAG, 'section.vizInjected', key, { mode: 'iterative' }); }
        // else { console.log(TAG, 'section.viz.predictive.failNoInsert', key); }

        // [KT:ADD] keywords-first predictive pipeline
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

    // [KT:ITER:DISABLED] Mined/derived/advice paths retained for audit, but disabled to avoid double-injection.
    /*
      … (unchanged; leave disabled) …
    */

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

  // [KT:AUDIT] McKinsey-style polish (structure & length guards)

  html = await polishMcKinsey(html, canon);

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  return NextResponse.json({ ok: true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}
