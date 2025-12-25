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

// -------- helpers ------------------------------------------------------------
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

// Prompt builders -------------------------------------------------------------
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

When you recommend a chart/benchmark/heat map, DO NOT describe it in prose.
Instead, insert one of these exact HTML blocks (valid fragments only):
- <figure data-chart='{"type":"bar|line|pie|doughnut","title":"...","labels":[...],"datasets":[{"label":"...","data":[...]}]}'><canvas></canvas></figure>
- <figure data-widget="benchmark" data-spec='{"title":"...","label":"...","current":N,"benchmark":N}'><canvas></canvas></figure>
- <div data-heatmap='{"rows":[...],"cols":[...],"data":[[...]]}'><canvas width="900" height="280"></canvas></div>`;
}

function expandPrompt(section, canon, remainingWords) {
  return `Add NEW detail to the existing ${section} section for ${canon.orgName}.
Write 2–3 short paragraphs (no headings above <h3>). Avoid repeating or rephrasing earlier text.
Target at least ${remainingWords} additional words. Output valid HTML only. Remember to use <table class="report-table"> for any tables.`;
}

// -------- core generation ----------------------------------------------------
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

// -------- API route ----------------------------------------------------------
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

  // Per-section loop
  for (const key of order) {
    const floor = SECTION_FLOORS[key] || 1200;
    let html = await genSectionFirstPass(key, canon, floor);
    html = await topUpSection(key, canon, html, floor);
    sections[key] = html;
  }

  // If whole report short, balanced top-ups
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

  // Build final HTML with your template (hydration & CSS injected inside)
  const html = buildReformReportHTML({
    canon,
    sections,
    phases,
    planDiagramHTML,
  });

  console.log(TAG, 'generate.done', { words: wc(html) });
  return NextResponse.json({ ok: true, html, wordCount: wc(html) });
}
