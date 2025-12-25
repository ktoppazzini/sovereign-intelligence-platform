// ===============================
// app/api/reform/generate/route.js
// ===============================
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate';
import { HYDRATE_INLINE_SCRIPT, GRAPH_CSS } from '@/lib/reportGraphs.js';
import { planDiagramHTML } from '@/lib/implPlan';
import { lineChartHTML, barChartHTML, heatmapHTML } from '@/lib/reportGraphs.js';

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
  exec: 1400,
  current: 2200,
  financials: 2400,
  kpis: 1800,
  timeline: 1600,
  ops: 2600,
  risk: 1800,
  roi: 1400,
};

/* ========================================================================== */
/* [SURGICAL: keep from earlier] Data-backed visuals only                      */
/*  - If numeric data exists/derives → ONE viz fragment                        */
/*  - Else → nothing visual                                                    */
/*  - Viz MUST include: title, xTitle, yTitle(units), labels, numbers          */
/* ========================================================================== */
const DATA_BACKED_VIZ_GUIDANCE = `
For each MAJOR BODY SECTION (Current, Financials, KPIs, Timeline, Ops, Risk, ROI),
propose AI-driven predictive analytics ONLY when you have or can reasonably derive numeric data
from the section and canonical inputs. If adequate numeric data DOES exist, output EXACTLY ONE
of the following fragments (no prose around it). If NOT, output NOTHING.

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
- Include ALL elements needed to render the visual (title, xTitle, yTitle with correct units, labels, numeric data).
- The number of labels MUST match each data array length.
- Choose sensible units: "CAD" for money; "Percent" for shares/rates/ROI; "Index" or "Cumulative" as appropriate.
- Output ONE fragment at most. If no suitable numeric dataset exists, output NOTHING for that section.
`;

/* ========================================================================== */
/* [SURGICAL PATCH #1] Visual mining uses existing section HTML as context     */
/*  → Ask for a viz using ONLY numbers found in that section (or canon inputs) */
/*  → If model finds none, it returns nothing                                  */
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

  const yHint =
    section === 'financials' || section === 'exec'
      ? 'CAD'
      : section === 'current' || section === 'roi' || section === 'kpis'
        ? 'Percent'
        : section === 'ops'
          ? 'Index'
          : 'Value';

  return `
You are generating a single visualization fragment IF AND ONLY IF numeric data exists or can be reasonably derived.
Use ONLY numbers that appear in the section HTML below or that follow from the canonical inputs. Do not fabricate.
If no dataset is available, return nothing.

Prefer the title "${titleHints[section] || 'Chart'}" and set yTitle to "${yHint}" when appropriate.
For standard charts use labels like ${labels} with matching-length data arrays.

${DATA_BACKED_VIZ_GUIDANCE}

--- SECTION HTML (source of truth; mine numbers from here) ---
${sectionHtml}
`.trim();
}

/* ========================================================================== */
/* [SURGICAL PATCH #2] If no data → add a short actionable paragraph           */
/*  → Tells client what to collect, where to source it, cadence, and how       */
/*    to compute the predictive indicator + suggested chart type               */
/* ========================================================================== */
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
  return extractVizFragment(raw); // empty string means "no data → nothing"
}

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

// ---------------- prompt builders (text only) ----------------
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
Hard minimum words: ${minWords}. Do not include an appendix. Avoid generic filler.

${DATA_BACKED_VIZ_GUIDANCE}  <!-- data-backed rule; nothing if no data -->
`;
}

function expandPrompt(section, canon, remainingWords) {
  return `Add NEW detail to the existing ${section} section for ${canon.orgName}.
Write 2–3 short paragraphs (no headings above <h3>). Avoid repeating or rephrasing earlier text.
Target at least ${remainingWords} additional words. Output valid HTML only. Remember to use <table class="report-table"> for any tables.

If you add a predictive visual: include full metadata (title, xTitle, yTitle with units, labels, numeric data).
ONLY include a visual when data exists or can be reasonably derived; otherwise include nothing.
`;
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

  console.log(TAG, 'generate.start', {
    model: MODEL,
    org: canon.orgName,
    minWords: canon.minWords,
  });

  const order = ['exec', 'current', 'financials', 'kpis', 'timeline', 'ops', 'risk', 'roi'];
  const sections = {};

  for (const key of order) {
    const floor = SECTION_FLOORS[key] || 1200;

    // 1) First pass
    let html = await genSectionFirstPass(key, canon, floor);

    // 2) Top-ups to hit floor
    html = await topUpSection(key, canon, html, floor);

    // 3) Try to add ONE data-backed viz using numbers mined from this exact section
    if (key !== 'exec' && !hasViz(html)) {
      const frag = await addVizIfData(key, canon, html /* pass section HTML as context */);
      if (frag) {
        html += '\n' + frag;
        console.log(TAG, 'section.vizInjected', key);
      } else {
        console.log(TAG, 'section.noVizData', key);
        // 4) If still no data, add a very short advisory paragraph (actionable guidance)
        const advice = await addDataAdviceParagraph(key, canon, html);
        if (advice) {
          html += '\n' + advice;
          console.log(TAG, 'section.dataAdviceInjected', key);
        }
      }
    }

    sections[key] = html;
  }

  // Whole report balancing if under target
  let totalWords = wc(Object.values(sections).join(' '));
  let wholePass = 0;
  while (totalWords < canon.minWords && wholePass < 4) {
    console.log(TAG, 'report.topUpRound', {
      round: wholePass + 1,
      totalWords,
      target: canon.minWords,
    });
    for (const key of order) {
      if (totalWords >= canon.minWords) break;
      const bump = 300 + wholePass * 150;
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Add NEW, non-duplicative content. Keep it compact and executive-friendly. Return HTML only.',
          },
          { role: 'user', content: expandPrompt(key, canon, bump) },
        ],
      });
      sections[key] += '\n' + (res.choices?.[0]?.message?.content?.trim() || '');

      // After late additions, one more try to mine a viz; if still none, add advice paragraph
      if (key !== 'exec' && !hasViz(sections[key])) {
        const frag = await addVizIfData(key, canon, sections[key]);
        if (frag) {
          sections[key] += '\n' + frag;
          console.log(TAG, 'section.vizInjectedLate', key);
        } else {
          const advice = await addDataAdviceParagraph(key, canon, sections[key]);
          if (advice) {
            sections[key] += '\n' + advice;
            console.log(TAG, 'section.dataAdviceInjectedLate', key);
          }
        }
      }

      totalWords = wc(Object.values(sections).join(' '));
      console.log(TAG, 'report.topUp', key, { totalWords });
    }
    wholePass += 1;
  }

  // Phases for roadmap overlay
  let phases = await derivePhasesFrom(sections.timeline, canon);
  if (phases.length < 5) {
    phases = [1, 2, 3, 4, 5].map((i) => ({
      title: `Phase ${i}`,
      caption:
        i === 1 ? 'Kickoff & baselines' : i === 5 ? 'Sustain & scale' : 'Milestones & deliverables',
    }));
  }

  // Build final HTML
  const html = buildReformReportHTML({
    canon,
    sections,
    phases,
    planDiagramHTML,
  });

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  return NextResponse.json({ ok: true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}
