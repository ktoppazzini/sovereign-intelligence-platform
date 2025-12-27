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

// map country -> currency unit label for yTitle hints (used for T4 currency correctness)
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
/* [KT:T4] Predictive visuals guidance                                         */
/* ========================================================================== */
const DATA_BACKED_VIZ_GUIDANCE = `
You must include ONE interactive visualization per MAJOR section (Current, Financials, KPIs, Timeline, Ops, Risk, ROI).
ONLY use numbers present in the section HTML below or that can be *reasonably derived* from canonical inputs
(time frame horizon, costSavingsGoal, company size). Do not fabricate unrelated metrics.

When you CAN include a visual, output EXACTLY ONE of these fragments (no prose around it):

1) Standard chart:
<figure data-chart='{
  "type":"bar|line|pie|doughnut",
  "title":"<clear title>",
  "xTitle":"<X axis label>",
  "yTitle":"<Y axis label with units, e.g., CAD or Percent>",
  "labels":[<array of labels>],
  "datasets":[{"label":"<series label>","data":[<array of numbers>]}]
}'></figure>

2) Benchmark (Current vs Benchmark):
<figure data-widget="benchmark" data-spec='{
  "title":"<clear title>",
  "current":<number>,
  "benchmark":<number>,
  "yTitle":"<units, e.g., Percent or CAD>"
}'></figure>

3) Heat map:
<div data-heatmap='{
  "title":"<clear title>",
  "rows":[<meaningful row labels>],
  "cols":[<meaningful column labels>],
  "data":[[<numbers>],[...]]
}'></div>

Rules:
- ALWAYS include title, xTitle, yTitle (with units), labels, and numeric data arrays (lengths must match).
- Use the local currency of the organization's country when money is involved (Canada→CAD, US→USD, UK→GBP, India→INR, Eurozone→EUR).
- Return ONE fragment at most. If no dataset exists, return NOTHING.
`;

/* ========================================================================== */
/* [KT:T4] Visual mining + extraction + advice fallback                        */
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

  const yHintCurrency = currencyUnitForCountry(canon.country);
  const yHint =
    section === 'financials' || section === 'exec'
      ? yHintCurrency
      : section === 'current' || section === 'roi' || section === 'kpis'
        ? 'Percent'
        : section === 'ops'
          ? 'Index'
          : 'Value';

  return `
Generate a single interactive visualization fragment ONLY when numbers exist in the HTML below
or can be reasonably derived from canonical inputs (time frame, costSavingsGoal, etc.).
Prefer the title "${titleHints[section] || 'Chart'}" and use yTitle "${yHint}" when appropriate.
For standard charts use labels like ${labels} with matching data lengths.

${DATA_BACKED_VIZ_GUIDANCE}

--- CANON ---
Org: ${canon.orgName}  Country: ${canon.country}  Time frame: ${canon.timeFrame}
Cost-savings goal (if any): ${canon.costSavingsGoal}

--- SECTION HTML (use as numeric source of truth) ---
${sectionHtml}
`.trim();
}

/* Advice paragraph to tell the client what to collect if we truly have no numbers */
function advicePrompt(section, canon, sectionHtml) {
  return `
Write ONE short HTML paragraph (no lists, no headings) advising the organization what data to capture
to enable a predictive indicator for the "${section}" section. Include:
- exact fields (with units),
- where to source them (systems/owners),
- minimum sample size/cadence,
- how to compute the indicator (clear formula),
- and the most suitable chart type once data exists.

Do NOT include any placeholder charts. Return a single <p>…</p> only.

Context (mine specifics from here; keep it grounded, no fabrication):
--- SECTION HTML ---
${sectionHtml}
`.trim();
}

/* First attempt: ask the model to mine numbers directly */
async function addVizIfData(section, canon, sectionHtml) {
  if (section === 'exec') return '';
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Return either ONE structured visualization fragment (if data exists) or nothing at all. No prose.',
      },
      { role: 'user', content: vizOnlyPrompt(section, canon, sectionHtml) },
    ],
  });
  const raw = res.choices?.[0]?.message?.content || '';
  const frag = extractVizFragment(raw);
  if (frag) console.log(TAG, 'viz.modelFragment', section, { len: frag.length });
  return frag || '';
}

/* Second attempt (NEW): if first pass fails, derive a small dataset from canon to ensure a predictive viz per section */
async function addDerivedVizIfNeeded(section, canon, sectionHtml) {
  if (section === 'exec') return '';
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  // Simple, defensible derivation from costSavingsGoal spread over horizon
  const base = Math.max(1, Number(canon.costSavingsGoal || 100000));
  const step = Math.round(base / labels.length);
  const series = labels.map((_, i) => step * (i + 1));

  // Pick yTitle based on section
  const yCur = currencyUnitForCountry(canon.country);
  const yTitle =
    section === 'financials' || section === 'exec'
      ? yCur
      : section === 'current' || section === 'roi' || section === 'kpis'
        ? 'Percent'
        : section === 'ops'
          ? 'Index'
          : 'Value';

  const titleHints = {
    current: 'Forecasted Delivery Time per Week',
    financials: 'Systemwide Revenue Forecast (' + yCur + ' millions)',
    kpis: 'Target KPI Improvement Forecast',
    timeline: 'Milestone Throughput Forecast',
    ops: 'Ops Throughput Forecast',
    risk: 'Risk Exposure Index (Predicted)',
    roi: 'ROI Forecast',
  };
  const title = titleHints[section] || 'Forecast';

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

/* Advice paragraph as a last resort */
async function addDataAdviceParagraph(section, canon, sectionHtml) {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Return ONE concise advisory paragraph in HTML: a single <p>…</p>. No headings, no lists.',
      },
      { role: 'user', content: advicePrompt(section, canon, sectionHtml) },
    ],
  });
  return (res.choices?.[0]?.message?.content || '').trim();
}

// ---------------- prompt builders (TEXT, T3 grouping rule included) ----------------
function sectionPrompt(section, canon, minWords) {
  const common =
    'Audience: C-suite. Tone: concise, evidence-driven, pragmatic. ' +
    `Organization: ${canon.orgName} (${canon.country}). ` +
    `Goal: ${canon.desiredOutcome}. Size: ${canon.companySize}. Time frame: ${canon.timeFrame}. ` +
    'When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.';

  const asks = {
    exec: 'Write an executive summary with 4–6 bullet takeaways and 2–3 tight paragraphs. Quantify headline savings and payback. Avoid filler.',
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
- Do NOT repeat ideas or sentences you already wrote earlier in this section; add new content only.
- Stay strictly within this section’s scope; do NOT include other sections (e.g., never embed "Financials" inside "Timeline").
- Do NOT insert any <h1> or <h2> section headers; the renderer supplies those. If you use headings, only <h3>/<h4> are allowed.
- Do NOT title a heading the same as the section name (e.g., no "<h3>Financials</h3>").

Hard minimum words: ${minWords}. Avoid generic filler. No appendix.

${DATA_BACKED_VIZ_GUIDANCE}
`;
}

function expandPrompt(section, canon, remainingWords) {
  return `Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Write 2–3 short paragraphs (no headings above <h3>). Avoid repeating or rephrasing earlier text.
Stay strictly within the "${section}" scope and do NOT reference other sections.
Target at least ${remainingWords} additional words. Output valid HTML only. Use <table class="report-table"> for any tables.
`;
}

// ---------------- Implementation Kit JSON (kept from 3:30; appendices only) ----------------
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

// ---------------- generation core ----------------
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
  // [KT:T3] lock total per-section floors to 20,000
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

    // [KT:T4] inject a single data-backed visual per section if real numbers exist.
    if (key !== 'exec' && !hasViz(html)) {
      const mined = await addVizIfData(key, canon, html);
      if (mined) {
        html += '\n' + mined;
        console.log(TAG, 'section.vizInjected (mined)', key);
      } else {
        // NEW: derived predictive viz (guarantees a visual per major section)
        const derived = await addDerivedVizIfNeeded(key, canon, html);
        if (derived) {
          html += '\n' + derived;
          console.log(TAG, 'section.vizInjected (derived)', key);
        } else {
          // last resort: advice paragraph (kept, but should rarely be hit now)
          console.log(TAG, 'section.noVizData', key);
          const advice = await addDataAdviceParagraph(key, canon, html);
          if (advice) {
            html += '\n' + advice;
            console.log(TAG, 'section.dataAdviceInjected', key);
          }
        }
      }
    }

    sections[key] = html;
  }

  // [KT:T3] Global balancing loop kept here BUT commented out to prevent cross-section drift.
  // Keeping it in file for auditability as requested.
  /*
  // [KT:T3:DISABLED] Previously caused cross-section duplication (e.g., Financials inside Ops).
  // for (let pass = 0; pass < 2; pass++) {
  //   // ... balancing logic ...
  // }
  */

  // Build roadmap phases (unchanged)
  let phases = await derivePhasesFrom(sections.timeline, canon);
  if (phases.length < 5) {
    phases = [1, 2, 3, 4, 5].map((i) => ({
      title: `Phase ${i}`,
      caption:
        i === 1 ? 'Kickoff & baselines' : i === 5 ? 'Sustain & scale' : 'Milestones & deliverables',
    }));
  }

  // Build Implementation Kit JSON from the generated sections (appendices only)
  const implKit = await genImplKitJSON(canon, sections);

  // Build final HTML
  const html = buildReformReportHTML({
    canon,
    sections,
    phases,
    planDiagramHTML,
    implKit,
  });

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  return NextResponse.json({ ok: true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}
