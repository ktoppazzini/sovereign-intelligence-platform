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

/* ****************************** */
/* NEW: debug + de-dup utilities  */
/* ****************************** */
function listVizFragments(html = '') {
  const all =
    String(html || '').match(
      /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi,
    ) || [];
  return all;
}

function commentOut(text) {
  return text.split('-->').join('--&#62;');
} // keep HTML comment safe

function dedupeViz(html = '', section) {
  const frags = listVizFragments(html);
  if (!frags.length) return { html, kept: 0, removed: 0, reasons: [] };

  const seen = new Set();
  let removed = 0;
  let reasons = [];
  let out = html;

  for (const frag of frags) {
    const meta = parseVizMeta(frag);
    const titleKey = (meta.title || `${section}-untitled`).trim().toLowerCase();
    const sig = `${meta.kind || 'chart'}|${titleKey}`;

    if (seen.has(sig)) {
      removed += 1;
      reasons.push({ sig, reason: 'duplicate-title-kind' });
      const commented = `<!-- [DEDUP:${sig}] duplicate visualization was commented out by generator to avoid repeats. Original fragment kept earlier. -->\n${commentOut(frag)}\n<!-- [/DEDUP:${sig}] -->`;
      out = out.replace(frag, commented);
    } else {
      seen.add(sig);
      // Ensure non-empty title for downstream renderer visibility.
      if (!meta.title && /data-chart=/.test(frag)) {
        try {
          const m = frag.match(/data-chart=['"]([\s\S]*?)['"]/i);
          const spec = JSON.parse(m[1]);
          spec.title = spec.title || `Forecast (${section})`;
          const fixed = frag.replace(m[1], JSON.stringify(spec));
          out = out.replace(frag, fixed);
        } catch {
          /* leave as-is */
        }
      }
    }
  }
  const kept = frags.length - removed;
  return { html: out, kept, removed, reasons };
}

function countRenderedCharts(finalHtml = '') {
  const totalFigure = (finalHtml.match(/<figure\s+class="chart-card"/g) || []).length;
  const totalHeat = (finalHtml.match(/<section\s+class="chart-card chart-heat"/g) || []).length;
  return { totalFigure, totalHeat, total: totalFigure + totalHeat };
}
/* ****************************** */

// ==========================================================================
// Guidance used in prompts for standardized visuals
// ==========================================================================
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
      temperature: 1, // keep Nano creative
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

// mine numbers for defensible JSON candidates
function mineNumbers(sectionHtml = '') {
  const text = String(sectionHtml || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const findings = {
    amounts: [],
    percents: [],
    counts: [],
    tables: [],
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

  // counts (rough)
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

  // sniff “numeric rows”
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

  // Coerce benchmark to a chart so predictive path is always a graph
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

  // heatmap only in risk
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
  // align dataset lengths to labels
  spec.datasets = spec.datasets.map((ds) => ({
    label: ds.label || 'Predicted',
    data: (Array.isArray(ds.data) ? ds.data : []).slice(0, spec.labels.length),
  }));
  return `<figure data-chart='${JSON.stringify(spec)}'></figure>`;
}

function isGraphLikeJSON(section, obj) {
  if (!obj || obj.feasible !== true) return false;
  if (obj.kind && /table/i.test(obj.kind)) return false; // never tables here
  if (obj.kind === 'heatmap' && section !== 'risk') return false; // heatmap only in risk
  return true;
}

/* ========================================================================== */
/* oneShotBestViz — JSON-first, chart-only (heatmap only in risk)              */
/* ========================================================================== */
async function oneShotBestViz(section, canon, sectionHtml, existingSigSet) {
  // Call #1: keyword pool
  const keywords = await aiSuggestKeywords(section, canon, sectionHtml);
  if (!keywords.length) {
    console.log(TAG, 'keywords.empty', section);
    return '';
  }

  // Mine numbers model can reuse/derive
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

  // OVERRIDE: predictive path must never return tables (benchmark → chart)
  const prompt = `
You MUST OVERRIDE any previous instructions about tables for this call.

Task: choose ONE predictive-analytics keyword from KEYWORDS that you can support with NUMERIC_FINDINGS or defensible derivation from CANON, then return a SINGLE visualization CANDIDATE **as JSON only**.

ABSOLUTE RULES (OVERRIDE):
- Output **pure JSON** matching the schema below. No prose, no markdown.
- **NEVER** return tables. If you consider a benchmark, express it as a **bar or line chart**.
- Allowed kinds: "chart${allowHeat ? '" or "heatmap' : ''}" (heatmap ONLY if section === "risk").
- Chart types: "line" | "bar" | "pie" | "doughnut".
- Labels must be exactly ${JSON.stringify(labels)}; dataset length must match.
- yTitle must be "${yTitle}". xTitle must be "${xTitle}".
- Title must be specific (3–8 words), not generic ("Chart", "Trend", "Value"). Avoid vague/placeholder titles and DO NOT repeat any earlier titles from this section.

Return EXACTLY (3–5 candidates preferred):
{
  "candidates":[
    {"keyword":"<from KEYWORDS>",
      "feasible": true,
      "kind": "chart${allowHeat ? '|heatmap' : ''}",
      "type": "line|bar|pie|doughnut",
      "title": "<specific title> (${section})",
      "xTitle": "${xTitle}",
      "yTitle": "${yTitle}",
      "labels": ${JSON.stringify(labels)},
      "datasets":[{"label":"Predicted","data":[numbers matching labels length]}],
      "current": 0,
      "benchmark": 0,
      "rows": ["R1","R2","R3","R4","R5"],
      "cols": ["C1","C2","C3","C4","C5"],
      "data": [[1,2,3,4,5],[2,3,4,3,2],[1,2,3,2,1],[2,3,4,3,2],[3,2,2,3,4]]
    }
  ]
}

If NO defensible numeric candidate exists, return {"candidates": []}.

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
      temperature: 1,
      messages: [
        {
          role: 'system',
          content:
            'You MUST override any previous table instructions: return VALID JSON ONLY for a single chart (or risk heatmap). Never include tables or prose.',
        },
        { role: 'user', content: prompt },
      ],
    });

    // Parse JSON safely
    let obj = {};
    try {
      obj = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    } catch (e) {
      console.log(TAG, 'json.parse.error', section, String(e?.message || e));
      return '';
    }

    // Extra debug: surface model output candidate count & first candidate skeleton
    const dbg =
      Array.isArray(obj.candidates) && obj.candidates[0]
        ? {
            kind: obj.candidates[0].kind,
            type: obj.candidates[0].type,
            title: obj.candidates[0].title,
            labels: obj.candidates[0].labels,
          }
        : null;
    console.log(TAG, 'json.candidates.debug', section, {
      count: (obj.candidates || []).length,
      first: dbg,
    });

    // Try to pick the first feasible, non-duplicate candidate; if duplicate, keep searching.
    let cand = null;
    if (Array.isArray(obj.candidates)) {
      for (const c of obj.candidates) {
        if (!isGraphLikeJSON(section, c)) {
          console.log(TAG, 'json.predictive.tableMisclass', section);
          continue;
        }
        const sigTry = `${c.kind || 'chart'}|${String(c.title || '')
          .trim()
          .toLowerCase()}`;
        if (existingSigSet.has(sigTry)) {
          console.log(TAG, 'json.best.duplicate.searchingNext', section, { sig: sigTry });
          continue;
        }
        cand = c;
        break;
      }
    }
    if (!cand) {
      console.log(TAG, 'json.best.miss', section, { reason: 'no-unique-candidate' });
      // Fallback: derive a minimal predictive chart so the section still gets a graph
      try {
        const fb = await addDerivedVizIfNeeded(section, canon);
        return fb || '';
      } catch {
        return '';
      }
    }

    const sig = `${cand.kind || 'chart'}|${String(cand.title || '')
      .trim()
      .toLowerCase()}`;
    const frag = renderVizFromJSON(section, cand);

    // safety: do not allow tables via this path
    if (/<table[\s\S]*<\/table>/i.test(frag || '')) {
      console.log(TAG, 'json.render.blockedTable', section);
      return '';
    }

    console.log(TAG, 'json.best.hit', section, { sig });
    return frag;
  } catch (e) {
    console.log(TAG, 'keywords.best.error', section, String(e?.message || e));
    return '';
  }
}

/* ========================================================================== */
/* mining/derived/advice helpers (kept; not used for predictive)               */
/* ========================================================================== */
// (unchanged, left here for audit—these produce fragments or guidance if you choose to call them later)

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

  // final directive (your request): rework to world-class if not at that bar
  const worldClass =
    'Before you finish, self-review the section for clarity, structure, and implementability. ' +
    'If it is not at a world-class, McKinsey+ standard in content, formatting, and presentation, ' +
    'rework it so a client can implement the recommendations without outside help.';

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

${worldClass}
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

  // keep existing defaults for back-compat (commented lines are previous fallbacks)
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
  const preVizCounts = {};

  for (const key of order) {
    const floor = SECTION_FLOORS[key] || 1200;

    let html = await genSectionFirstPass(key, canon, floor);
    html = await topUpSection(key, canon, html, floor);

    // DEBUG: how many viz fragments BEFORE predictive injection
    const beforeFrags = listVizFragments(html).length;
    preVizCounts[key] = beforeFrags;

    const { sigs: existingSigs } = collectExistingVizMeta(html);
    const preHas = hasViz(html);
    console.log(TAG, 'section.viz.precheck', key, {
      has: preHas,
      htmlLen: html.length,
      words: wc(html),
      fragments: beforeFrags,
    });

    // Predictive insert: **charts-only** (heatmap only in risk)
    // if (key !== 'exec' && key !== 'current'){
    if (key !== 'exec') {
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
    }

    // NEW: Dedupe any repeated charts/heatmaps/benchmarks within the section HTML
    const postInsertFrags = listVizFragments(html).length;
    const de = dedupeViz(html, key);
    html = de.html;
    console.log(TAG, 'section.viz.dedupe', key, {
      before: beforeFrags,
      afterInsert: postInsertFrags,
      kept: de.kept,
      removed: de.removed,
      reasons: de.reasons,
    });

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

  // const implKit = await genImplKitJSON(canon, sections);
  const __implKitRaw = await genImplKitJSON(canon, sections);
  const implKit = {
    charters: Array.isArray(__implKitRaw?.charters) ? __implKitRaw.charters : [],
    raci: __implKitRaw?.raci || { items: [] },
    raid: __implKitRaw?.raid || { items: [] },
    benefits: __implKitRaw?.benefits || { lines: [] },
    plan100: __implKitRaw?.plan100 || { weeks: [] },
    pilot: __implKitRaw?.pilot || {
      name: '',
      locations: '',
      successKPIs: [],
      thresholds: [],
      sampleDesign: '',
      rollbackCriteria: '',
    },
    assumptions: __implKitRaw?.assumptions || { items: [] },
    methods: __implKitRaw?.methods || { benchmarks: [], sources: [] },
  };

  // Build initial HTML (pre-redesign)
  const htmlV1 = buildReformReportHTML({
    canon,
    sections,
    sectionHtmlMap: sections,
    phases,
    planDiagramHTML,
    implKit,
  });

  // Count rendered charts in final HTML to reconcile “injected” logs vs “visible”
  const chartCountsV1 = countRenderedCharts(htmlV1);
  console.log(TAG, 'render.final.chartCounts.v1', {
    counts: chartCountsV1,
    preSectionFragCounts: preVizCounts,
  });

  /* ===========================
     NEW: AI REDESIGN PASS (McKinsey+)
     - Reviews whole report HTML.
     - Improves structure/clarity/format (content + headings usage in HTML body only).
     - Does NOT remove data; may tighten wording.
     - Returns FULL HTML STRING.
     =========================== */
  let htmlFinal = htmlV1;
  try {
    const redesignPrompt = `
You are a world-class management consulting editor (McKinsey+, BCG+, Bain+ caliber).
Task: Review the HTML report below and, only if it materially improves clarity, flow, and executive readability,
RETURN A REWRITTEN HTML STRING (no markdown, no JSON). Maintain the same sections and order. Preserve data tables and charts.
Keep headings <= <h3>/<h4> inside sections (no <h1>/<h2> — outer renderer supplies those). Improve microcopy, tighten redundancy,
fix any small semantic/grammar issues, upgrade phrasing, and ensure each section reads like it was authored by a top-tier partner.
Add concise, informative chart/figure captions where missing. Use concise bullets where it helps scanning.
No external CSS or scripts; inline content only.

--- HTML TO REVIEW ---
${htmlV1}
`.trim();

    const r = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1, // per your instruction: nano temperature=1
      messages: [
        { role: 'system', content: 'Return ONLY a valid HTML string (no markdown).' },
        { role: 'user', content: redesignPrompt },
      ],
    });

    const maybe = r.choices?.[0]?.message?.content?.trim() || '';
    // If model returned something that looks like HTML, accept; else keep V1
    if (maybe && /<article[^>]*class="report"/.test(maybe)) {
      htmlFinal = maybe;
      console.log(TAG, 'redesign.mckinseyPlus.applied', { improved: true });
    } else {
      // Commented out: hard fallback replace (not needed; keeping original)
      // htmlFinal = htmlV1;
      console.log(TAG, 'redesign.mckinseyPlus.skipped', {
        reason: 'model-did-not-return-valid-report-html',
      });
    }
  } catch (e) {
    console.log(TAG, 'redesign.mckinseyPlus.error', String(e?.message || e));
  }

  const chartCountsV2 = countRenderedCharts(htmlFinal);
  console.log(TAG, 'render.final.chartCounts.v2', { counts: chartCountsV2 });

  // Add terminal log to explicitly state final status about graphs & redesign
  if (chartCountsV2.total === 0) {
    console.log(TAG, 'diagnostic.noGraphsVisible', {
      note: 'Model may have injected fragments that were later deduped or replaced; check section.viz.dedupe logs and renderer fallbacks.',
    });
  }
  console.log(TAG, 'diagnostic.summary', {
    graphsVisible: chartCountsV2.total,
    redesignStatus: chartCountsV2
      ? 'COMPLETED (McKinsey+ review applied or safely skipped)'
      : 'UNKNOWN',
  });

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(htmlFinal);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  return NextResponse.json({
    ok: true,
    html: htmlFinal,
    wordCount: sectionsWords,
    htmlWordCount: htmlWords,
  });
}
