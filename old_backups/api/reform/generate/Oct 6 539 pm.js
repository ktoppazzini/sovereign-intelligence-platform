// ===============================
// app/api/reform/generate/route.js
// Rev: Oct 6 – AI keyword pool (1K) + JSON-first best-match viz (chart-only),
//               heatmap allowed only in risk, benchmark coerced to chart.
// ===============================
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate';
import { planDiagramHTML } from '@/lib/implPlan';
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js';

const TAG = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------
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
  return 'CAD'; // deployment default
}

/* ========================================================================== */
/* [KT:VIZ] detection + extraction helpers                                     */
/* ========================================================================== */
const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const hasViz = (html = '') => HAS_VIZ_RE.test(String(html || ''));

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

function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '' };
  if (!frag) return out;
  const chart = frag.match(/<figure[^>]*data-chart=['"]([\s\S]*?)['"]/i);
  if (chart) {
    out.kind = 'chart';
    try {
      const json = JSON.parse(chart[1]);
      out.type = json.type || '';
      out.title = json.title || '';
    } catch {}
    return out;
  }
  const bench = frag.match(
    /<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([\s\S]*?)['"]/i,
  );
  if (bench) {
    out.kind = 'benchmark';
    try {
      const json = JSON.parse(bench[1]);
      out.type = 'benchmark';
      out.title = json.title || '';
    } catch {}
    return out;
  }
  const heat = frag.match(/<div[^>]*data-heatmap=['"]([\s\S]*?)['"]/i);
  if (heat) {
    out.kind = 'heatmap';
    try {
      const json = JSON.parse(heat[1]);
      out.type = 'heatmap';
      out.title = json.title || '';
    } catch {}
    return out;
  }
  return out;
}

function collectExistingVizMeta(html = '') {
  const titles = new Set();
  const sigs = new Set(); // kind|title
  const all =
    String(html || '').match(
      /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi,
    ) || [];
  for (const frag of all) {
    const m = parseVizMeta(frag);
    if (m.title) {
      titles.add(m.title.trim().toLowerCase());
      sigs.add(`${m.kind}|${m.title.trim().toLowerCase()}`);
    }
  }
  return { titles, sigs };
}

/* ========================================================================== */
/* Guidance used in prompts for standardized visuals                           */
/* ========================================================================== */
const DATA_BACKED_VIZ_GUIDANCE = `
Return EXACTLY ONE fragment if numbers exist or can be defensibly derived from canon (time frame, costSavingsGoal, size).
Use local currency for money; include title, xTitle, yTitle, labels, datasets. No prose.

1) Chart:
<figure data-chart='{
  "type":"bar|line|pie|doughnut",
  "title":"<content-derived title>",
  "xTitle":"<Months|Years>",
  "yTitle":"<CAD|USD|GBP|EUR|INR|Percent|Index>",
  "labels":[<labels>],
  "datasets":[{"label":"Predicted","data":[<numbers>]}]
}'></figure>

2) Heat map (only valid for risk):
<div data-heatmap='{
  "title":"<content-derived title>",
  "rows":[<row labels>],
  "cols":[<column labels>],
  "data":[[<ints 1..5>],[...]]
}'></div>
`;

/* ========================================================================== */
/* [KT:AIKEYS v2] — One-call keyword pool (up to 1000) + one-call best-match   */
/* ========================================================================== */
async function aiSuggestKeywords(section, canon, sectionHtml) {
  const prompt = [
    `Analyze the "${section}" section and propose up to 1000 SHORT predictive-analytics keywords/phrases,`,
    'ordered from most to least promising given the data. Exclude "trend" and generic terms ("chart","graph").',
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
      temperature: 1, // [KT:GRAPH-ONLY] keep Nano creative
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
      if (/^trend$/i.test(s)) continue;
      if (!set.has(s.toLowerCase())) set.add(s.toLowerCase());
    }
    const keywords = Array.from(set);
    console.log(TAG, 'keywords.pool', section, { suggested: keywords.length });
    return keywords;
  } catch (e) {
    console.log(TAG, 'keywords.error', section, String(e?.message || e));
    return [];
  }
}

// [KT:JSON-FIRST] mineNumbers — pull defensible numbers out of the section HTML
function mineNumbers(sectionHtml = '') {
  const text = String(sectionHtml || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const findings = {
    amounts: [], // {value, unit, ctx}
    percents: [], // {value, ctx}
    counts: [], // {value, ctx}
    tables: [], // arrays-of-numbers if any
    hints: { years: false, months: false },
  };

  // currency
  const moneyRe =
    /(?:(?:USD|CAD|GBP|EUR|INR)\s*)?\$?\s?([0-9]{1,3}(?:,[0-9]{3})*|\d+)(?:\.\d+)?\s*(million|m|thousand|k)?/gi;
  let m;
  while ((m = moneyRe.exec(text))) {
    const raw = m[0];
    const val = Number(String(m[1]).replace(/,/g, ''));
    const mag = (m[2] || '').toLowerCase();
    let value = val;
    if (mag === 'million' || mag === 'm') value = val * 1_000_000;
    if (mag === 'thousand' || mag === 'k') value = val * 1_000;
    const ctx = text.slice(
      Math.max(0, m.index - 30),
      Math.min(text.length, m.index + raw.length + 30),
    );
    findings.amounts.push({ value, unit: 'money', ctx });
  }

  // percents
  const pctRe = /(\d{1,3}(?:\.\d+)?)\s*%/g;
  while ((m = pctRe.exec(text))) {
    const value = Number(m[1]);
    const ctx = text.slice(
      Math.max(0, m.index - 20),
      Math.min(text.length, m.index + m[0].length + 20),
    );
    findings.percents.push({ value, ctx });
  }

  // counts
  const countRe =
    /\b(\d{1,4})(?:\s+(?:units|sites|stores|orders|agents|tickets|assets|machines|cities|countries|weeks))\b/gi;
  while ((m = countRe.exec(text))) {
    const value = Number(m[1]);
    const ctx = text.slice(
      Math.max(0, m.index - 20),
      Math.min(text.length, m.index + m[0].length + 20),
    );
    findings.counts.push({ value, ctx });
  }

  // crude table sniff (rows like "123, 456, 789")
  const rowRe = /\b(\d{2,3}(?:\s*,\s*\d{2,3}){2,})\b/g;
  while ((m = rowRe.exec(text))) {
    const row = m[1]
      .split(/\s*,\s*/)
      .map((n) => Number(n))
      .filter((n) => !Number.isNaN(n));
    if (row.length >= 3) findings.tables.push(row);
  }

  const lc = text.toLowerCase();
  findings.hints.years = /\by[1-6]\b|\byear\b|\byrs?\b/.test(lc);
  findings.hints.months = /\bm[1-9]\b|\bmonths?\b|\bweeks?\b/.test(lc);

  return findings;
}

/* ========================================================================== */
/* RENDERER: JSON candidate → fragment                                         */
/* ========================================================================== */
function renderVizFromJSON(section, json) {
  if (!json || json.feasible !== true) return '';

  // [KT:GRAPH-ONLY] Coerce benchmark to a chart (two bars) so we always insert a graph.
  if (json.kind === 'benchmark') {
    const spec = {
      type: 'bar',
      title: json.title || 'Benchmark Comparison',
      xTitle: 'Measure',
      yTitle: json.yTitle || 'Index',
      labels: ['Current', 'Benchmark'],
      datasets: [
        { label: 'Value', data: [Number(json.current || 0), Number(json.benchmark || 0)] },
      ],
    };
    return `<figure data-chart='${JSON.stringify(spec)}'></figure>`;
  }

  // heatmap only in risk (still considered a "graph" visual)
  if (json.kind === 'heatmap' && section === 'risk') {
    const spec = {
      title: json.title,
      rows: Array.isArray(json.rows) ? json.rows.slice(0, 12) : ['R1', 'R2', 'R3', 'R4', 'R5'],
      cols: Array.isArray(json.cols) ? json.cols.slice(0, 12) : ['C1', 'C2', 'C3', 'C4', 'C5'],
      data: Array.isArray(json.data)
        ? json.data
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

  // default: chart
  const spec = {
    type: json.type || 'line',
    title: json.title || 'Forecast',
    xTitle: json.xTitle || 'Periods',
    yTitle: json.yTitle || 'Index',
    labels: Array.isArray(json.labels) ? json.labels : ['P1', 'P2', 'P3'],
    datasets: Array.isArray(json.datasets)
      ? json.datasets
      : [{ label: 'Predicted', data: [1, 2, 3] }],
  };
  // sanity: align dataset lengths to labels
  spec.datasets = spec.datasets.map((ds) => ({
    label: ds.label || 'Predicted',
    data: (Array.isArray(ds.data) ? ds.data : []).slice(0, spec.labels.length),
  }));
  return `<figure data-chart='${JSON.stringify(spec)}'></figure>`;
}

/* ========================================================================== */
/* JSON-first best-match viz (chart-only; heatmap allowed in risk)             */
/* ========================================================================== */
async function oneShotBestViz(section, canon, sectionHtml, existingSigSet) {
  // Call #1: keyword pool
  const keywords = await aiSuggestKeywords(section, canon, sectionHtml);
  if (!keywords.length) {
    console.log(TAG, 'keywords.empty', section);
    return '';
  }

  // Numbers the model can reuse
  const mined = mineNumbers(sectionHtml);
  console.log(TAG, 'numbers.mined', section, {
    amounts: mined.amounts.length,
    percents: mined.percents.length,
    counts: mined.counts.length,
    tables: mined.tables.length,
    hints: mined.hints,
  });

  // Canon → labels & units
  const yCur = currencyUnitForCountry(canon.country);
  const tf = String(canon.timeFrame || '').toLowerCase();
  const isYears = /year/.test(tf) || mined.hints.years;
  const labels = isYears ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
  const xTitle = isYears ? 'Years' : 'Months';
  const yTitle =
    section === 'financials' || section === 'exec'
      ? yCur
      : section === 'kpis' || section === 'roi' || section === 'current'
        ? 'Percent'
        : 'Index';
  const allowHeat = section === 'risk';

  // Call #2: ask for JSON candidates (chart-only; heatmap allowed in risk). No tables.
  const prompt = `
You will pick ONE best predictive analytic keyword from KEYWORDS that you can support with numbers found in NUMERIC_FINDINGS or defensibly derived from CANON.
Return JSON ONLY in this exact shape:
{
  "candidates":[
    {
      "keyword": "…",
      "feasible": true,
      "kind": "chart${allowHeat ? '|heatmap' : ''}",   // [KT:GRAPH-ONLY]
      "type": "line|bar|pie|doughnut",
      "title": "<specific 3-8 word title> (${section})",
      "xTitle": "${xTitle}",
      "yTitle": "${yTitle}",
      "labels": ${JSON.stringify(labels)},
      "datasets": [{"label":"Predicted","data":[numbers matching labels length]}],
      "current": 0,
      "benchmark": 0,
      "rows": ["R1","R2","R3","R4","R5"],
      "cols": ["C1","C2","C3","C4","C5"],
      "data": [[1,2,3,4,5],[2,3,4,3,2],[1,2,3,2,1],[2,3,4,3,2],[3,2,2,3,4]]
    }
  ]
}

Rules:
- Output pure JSON only (no prose, no markdown).
- Select the first feasible candidate and keep titles specific (avoid "Chart", "Value", "Trend").
- NO tables. NO benchmark widget. If you consider a benchmark, express it as a chart using two categories.
- Heatmap is allowed ONLY if section is "risk".
- Numeric arrays MUST match labels length.
- If no defensible numbers exist for ANY keyword, return {"candidates":[]}.

KEYWORDS:
${JSON.stringify(keywords).slice(0, 6000)}

NUMERIC_FINDINGS:
${JSON.stringify(mined).slice(0, 8000)}

CANON:
${JSON.stringify({ country: canon.country, currency: yCur, timeFrame: canon.timeFrame, costSavingsGoal: canon.costSavingsGoal })}
`.trim();

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1, // [KT:GRAPH-ONLY] keep creative variety
      messages: [
        {
          role: 'system',
          content: 'Return VALID JSON only (no markdown) following the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
    });

    let obj = {};
    try {
      obj = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    } catch (e) {
      console.log(TAG, 'json.parse.error', section, String(e?.message || e));
      return '';
    }

    const cand = Array.isArray(obj.candidates)
      ? obj.candidates.find((c) => c && c.feasible === true)
      : null;
    if (!cand) {
      console.log(TAG, 'json.best.miss', section);
      return '';
    }

    // de-dupe against existing title/kind
    const sig = `${cand.kind || 'chart'}|${String(cand.title || '')
      .trim()
      .toLowerCase()}`;
    if (existingSigSet.has(sig)) {
      console.log(TAG, 'json.best.duplicate', section, { sig });
      return '';
    }

    const frag = renderVizFromJSON(section, cand);
    if (!frag) {
      console.log(TAG, 'json.render.fail', section);
      return '';
    }

    console.log(TAG, 'json.best.hit', section, { sig });
    return frag;
  } catch (e) {
    console.log(TAG, 'keywords.best.error', section, String(e?.message || e));
    return '';
  }
}

/* [KT:LEGACY-BEST-FRAGMENT — kept for audit; superseded by JSON-FIRST oneShotBestViz()]
// (legacy HTML-fragment path retained here but commented out)
*/

/* ========================================================================== */
/* mining/derived/advice helpers (kept for audit; unused in main path)         */
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
    'When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.'; // (kept)

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
/* Implementation Kit JSON                                                     */
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
/* generation core                                                             */
/* ========================================================================== */
async function genSectionFirstPass(section, canon, floor) {
  console.log(TAG, 'section.start', section, { floor });
  const res = await openai.chat.completions.create({
    model: MODEL,
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

  // Keep your existing defaults (unchanged here for backward-compat).
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

    if (key !== 'exec' && key !== 'current') {
      try {
        const frag = await oneShotBestViz(key, canon, html, existingSigs);
        if (frag) {
          html += '\n' + frag;
          console.log(TAG, 'section.vizInjected', key, { mode: 'ai-keywords-best' });
        } else {
          console.log(TAG, 'section.viz.predictive.failNoInsert', key);
        }
      } catch (e) {
        console.log(TAG, 'section.viz.branch.error', key, String(e?.message || e));
      }
    } // exec/current: intentionally skip predictive

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

  const implKit = await genImplKitJSON(canon, sections);

  const html = buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit });

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  return NextResponse.json({ ok: true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}
