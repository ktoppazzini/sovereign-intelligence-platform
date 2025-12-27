/* eslint-disable no-console */
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate.js';

/**
 * Compact generate route:
 *  - Generates numbered sections with EXACT structure you specified
 *  - Ensures exactly one table + one predictive visual per required section
 *  - Produces per-chart executive notes OUTSIDE the canvas
 *  - Adds a 2×2 KPI dashboard (two charts + two metric tiles)
 *  - Dynamic currency & benchmark framing by selected country
 *  - Provides a chart-registry payload for client-side Chart.js hydration
 */

const TAG = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- helpers ----
const wc = (html = '') =>
  String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
    .length;

const today = () =>
  new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });

function currencyForCountry(country = '') {
  const c = String(country || '').toLowerCase();
  if (/(canada|ca\b)/.test(c)) return 'CAD';
  if (/(united states|\busa\b|\bus\b)/.test(c)) return 'USD';
  if (/(united kingdom|uk|england)/.test(c)) return 'GBP';
  if (/(euro|france|germany|italy|spain|netherlands|belgium|ireland)/.test(c)) return 'EUR';
  if (/india/.test(c)) return 'INR';
  return 'USD';
}

// Country-aware benchmark hint (lightweight & dynamic)
function benchmarkHint(country = '') {
  const c = String(country || '').toLowerCase();
  if (/(canada|ca\b)/.test(c)) return 'against Canada peer median';
  if (/(united kingdom|uk)/.test(c)) return 'against UK peer median';
  if (/(india)/.test(c)) return 'against India peer median';
  if (/(euro|france|germany|italy|spain|netherlands|belgium|ireland)/.test(c))
    return 'against EU peer median';
  return 'against US peer median';
}

// safe JSON
const safe = (o) => JSON.parse(JSON.stringify(o || {}));

/* ==========================================
   1) Section content generators (tables only)
   ========================================== */
const FLOORS = {
  exec: 2400,
  current: 2400,
  financials: 2400,
  kpis: 2400,
  impl: 2400,
  ops: 2400,
  risk: 2200,
  roi: 2200,
  conclusion: 400,
};

function sectionRules(section, canon) {
  // One table required on these sections:
  const needsOneTable = new Set([
    'current',
    'financials',
    'kpis',
    'impl',
    'ops',
    'risk',
    'roi',
  ]).has(section);

  // Numbering helpers for subheads
  const mapNumber = {
    exec: '1',
    current: '2',
    financials: '3',
    kpis: '4',
    impl: '5',
    ops: '6',
    risk: '7',
    roi: '8',
  }[section];

  const subPrefix = (idx) => `${mapNumber}.${idx}`;

  const base = `
You are drafting the <${section}> section for ${canon.orgName} (${canon.country}).
Audience: C-suite. Keep paragraphs concise (3–4 sentences). Avoid fluff and duplication.
Use numbered sub-headings. Each sub-heading MUST be written as:
<h3 class="subhead"><span class="sec-no">${mapNumber}.X</span> Title</h3>

${needsOneTable ? `Include EXACTLY ONE table, as: <table class="report-table">…</table>.` : 'Do NOT add any tables in this section.'}

Never include charts/heatmaps here — visuals will be injected separately. Output valid HTML only.
`;

  // Concrete sub-headings (may be lightly adjusted by model)
  const subheads = {
    exec: [
      `${subPrefix(1)} Strategic Context`,
      `${subPrefix(2)} Headline Value & Timeline`,
      `${subPrefix(3)} What Matters This Quarter`,
    ],
    current: [
      `${subPrefix(1)} Demand & Channel Mix`,
      `${subPrefix(2)} Cost & Throughput Constraints`,
      `${subPrefix(3)} Benchmark Gaps`,
    ],
    financials: [
      `${subPrefix(1)} Revenue & Margin Drivers`,
      `${subPrefix(2)} Cost Structure & Sensitivities`,
      `${subPrefix(3)} Investment & Payback`,
    ],
    kpis: [
      `${subPrefix(1)} North-Star Metrics`,
      `${subPrefix(2)} Leading Indicators`,
      `${subPrefix(3)} Operating Targets`,
    ],
    impl: [
      `${subPrefix(1)} Workstreams & Milestones`,
      `${subPrefix(2)} Critical Path & Risks`,
      `${subPrefix(3)} Resource & Budget Guardrails`,
    ],
    ops: [
      `${subPrefix(1)} Roles & RACI`,
      `${subPrefix(2)} Cadence & Governance`,
      `${subPrefix(3)} Data & Tooling Backbone`,
    ],
    risk: [
      `${subPrefix(1)} Top Risks Overview`,
      `${subPrefix(2)} Mitigation Playbook`,
      `${subPrefix(3)} Residual Exposure`,
    ],
    roi: [
      `${subPrefix(1)} ROI Drivers & Timing`,
      `${subPrefix(2)} Value Capture Plan`,
      `${subPrefix(3)} Next 90 Days`,
    ],
  }[section] || [];

  return { base, subheads };
}

async function genSectionHTML(section, canon, minWords) {
  const { base, subheads } = sectionRules(section, canon);
  const prompt = [
    base,
    '',
    'Use exactly these sub-headings (numbered as given). Under each, write 1–2 short paragraphs.',
    'Sub-headings:',
    subheads.map((t) => `- ${t}`).join('\n'),
  ].join('\n');

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role: 'system', content: 'Return valid HTML fragment only (no <html>… wrappers).' },
      { role: 'user', content: `${prompt}\n\nMinimum words: ${minWords}` },
    ],
  });

  let html = (res.choices?.[0]?.message?.content || '').trim();
  // Remove any accidental visuals — we will inject our own
  html = html
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<div[^>]*data-heatmap[^>]*>[\s\S]*?<\/div>/gi, '');
  return html;
}

/* ==========================================
   2) Predictive visuals + notes (per section)
   ========================================== */

function chartEntry(id, cfg) {
  return { id, config: JSON.stringify(cfg) };
}

// deterministic label helper (months vs years based on timeframe)
function labelsForTimeframe(timeFrame = '') {
  const s = String(timeFrame).toLowerCase();
  if (/\bmonth/.test(s) && !/\byear/.test(s)) return ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
  return ['Y1', 'Y2', 'Y3'];
}

function aiNoteParagraph(title, x, y, org, extra = '') {
  // Lightweight: let model write the note
  return async () => {
    try {
      const r = await openai.chat.completions.create({
        model: MODEL,
        temperature: 1,
        messages: [
          {
            role: 'system',
            content:
              'Return exactly ONE HTML paragraph: <p class="chart-note">…</p>. Executive tone. 2–3 sentences.',
          },
          {
            role: 'user',
            content: `Write an executive interpretation for "${title}" at ${org}. Define ${x} and ${y}, summarize the pattern, and state one action implication. ${extra}`,
          },
        ],
      });
      const p = (r.choices?.[0]?.message?.content || '').trim();
      return /^<p\b[^>]*class=["']chart-note["']/.test(p)
        ? p
        : `<p class="chart-note">${p}</p>`;
    } catch {
      return `<p class="chart-note">${title} charts ${y} against ${x}. Use this to steer decisions next quarter.</p>`;
    }
  };
}

// Build exactly one predictive figure block per section
async function buildSectionVisual(section, canon) {
  const cur = currencyForCountry(canon.country);
  const bench = benchmarkHint(canon.country);
  const labels = labelsForTimeframe(canon.timeFrame);
  const org = canon.orgName || 'Client';

  // Common data seed (small, deterministic, section-tuned)
  const seedUp = [12, 14, 16, 18, 20, 22].slice(0, labels.length);
  const seedPay = [18, 13, 9].slice(0, labels.length);

  // Decide config by section
  let cfg, html, noteWriter, id;

  switch (section) {
    case 'exec': {
      // Savings by period (months or years) — bar or line; we pick line
      id = 'exec_savings';
      cfg = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Savings',
              data: seedUp,
            },
          ],
        },
        options: {
          plugins: { title: { display: true, text: `Savings by Period (${labels[0].startsWith('M') ? 'Months' : 'Years'})` } },
          scales: {
            y: { title: { display: true, text: cur } },
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
          },
        },
      };
      html = `
        <div class="chart-wrap">
          <canvas id="${id}"></canvas>
        </div>
      `;
      noteWriter = aiNoteParagraph(
        `Savings by Period`,
        labels[0].startsWith('M') ? 'Months' : 'Years',
        cur,
        org,
      );
      break;
    }

    case 'current': {
      // Benchmark bar graph
      id = 'current_benchmark';
      cfg = {
        type: 'bar',
        data: {
          labels: ['Company', 'Benchmark'],
          datasets: [
            {
              label: 'Index',
              data: [100, 112], // simple gap
            },
          ],
        },
        options: {
          plugins: { title: { display: true, text: `Current vs Benchmark (${bench})` } },
          scales: {
            y: { title: { display: true, text: 'Index' } },
            x: { title: { display: true, text: 'Entity' } },
          },
        },
      };
      html = `
        <div class="chart-wrap">
          <canvas id="${id}"></canvas>
        </div>
      `;
      noteWriter = aiNoteParagraph(`Current vs Benchmark`, 'Entity', 'Index', org, `Use ${bench}.`);
      break;
    }

    case 'financials': {
      // Line: expenditures & payback
      id = 'financials_payback';
      cfg = {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Capex', data: [8, 3, 1].slice(0, labels.length) },
            { label: 'Opex', data: [1, 1, 1].slice(0, labels.length) },
            { label: 'Payback', data: seedPay },
          ],
        },
        options: {
          plugins: { title: { display: true, text: 'Expenditures and Payback' } },
          scales: {
            y: { title: { display: true, text: cur } },
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
          },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('Expenditures and Payback', labels[0].startsWith('M') ? 'Months' : 'Years', cur, org);
      break;
    }

    case 'kpis': {
      // Dashboard 2×2: (1) Bar savings, (2) Line payback, (3) Metric tile, (4) Metric tile
      const g1 = 'kpi_savings';
      const g2 = 'kpi_payback';
      const m1 = { label: 'Digital Orders Share', value: '62%' };
      const m2 = { label: 'AOV vs Benchmark', value: '+4 pp' };

      const cfg1 = {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Savings', data: seedUp }] },
        options: {
          plugins: { title: { display: true, text: 'Projected Savings' } },
          scales: {
            y: { title: { display: true, text: cur } },
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
          },
        },
      };
      const cfg2 = {
        type: 'line',
        data: { labels, datasets: [{ label: 'Payback Index', data: [85, 92, 100].slice(0, labels.length) }] },
        options: {
          plugins: { title: { display: true, text: 'Payback over Horizon' } },
          scales: {
            y: { title: { display: true, text: 'Index' } },
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
          },
        },
      };

      html = `
        <div class="grid-2">
          <div class="tile chart-wrap"><canvas id="${g1}"></canvas></div>
          <div class="tile chart-wrap"><canvas id="${g2}"></canvas></div>
          <div class="tile metric">
            <div class="label">${m1.label} (${bench})</div>
            <div class="value">${m1.value}</div>
            <p class="chart-note">Share of digital orders compared to peers informs channel allocation and CRM focus.</p>
          </div>
          <div class="tile metric">
            <div class="label">${m2.label} (${bench})</div>
            <div class="value">${m2.value}</div>
            <p class="chart-note">Average order value vs. benchmark highlights pricing/menu leverage this quarter.</p>
          </div>
        </div>
      `;

      // Notes for the two charts (outside canvas)
      const n1 = await aiNoteParagraph('Projected Savings', labels[0].startsWith('M') ? 'Months' : 'Years', cur, org)();
      const n2 = await aiNoteParagraph('Payback over Horizon', labels[0].startsWith('M') ? 'Months' : 'Years', 'Index', org)();

      html += `${n1}\n${n2}`;

      return {
        html,
        charts: [chartEntry(g1, cfg1), chartEntry(g2, cfg2)],
      };
    }

    case 'impl': {
      // Implementation roadmap (simple bar timeline)
      id = 'impl_roadmap';
      cfg = {
        type: 'bar',
        data: {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [{ label: 'Milestones', data: [2, 4, 6, 8] }],
        },
        options: {
          plugins: { title: { display: true, text: 'Implementation Roadmap (Milestone Density)' } },
          scales: {
            y: { title: { display: true, text: 'Milestones' } },
            x: { title: { display: true, text: 'Quarters' } },
          },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('Implementation Roadmap', 'Quarters', 'Milestones', org);
      break;
    }

    case 'ops': {
      // Operating model: on-time rate line
      id = 'ops_ontime';
      cfg = {
        type: 'line',
        data: { labels, datasets: [{ label: 'On-Time Rate', data: [92, 95, 97].slice(0, labels.length) }] },
        options: {
          plugins: { title: { display: true, text: 'On-Time Delivery Rate' } },
          scales: {
            y: { title: { display: true, text: 'Percent' } },
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
          },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('On-Time Delivery Rate', labels[0].startsWith('M') ? 'Months' : 'Years', 'Percent', org);
      break;
    }

    case 'risk': {
      // Heatmap surrogate: we render via Chart.js bar as density proxy (client has heatmap blocker right now)
      id = 'risk_heat';
      const riskRows = ['Supply', 'Labor', 'Delivery', 'IT'];
      cfg = {
        type: 'bar',
        data: {
          labels: riskRows,
          datasets: [{ label: 'Risk Index', data: [7, 5, 6, 4] }],
        },
        options: {
          plugins: { title: { display: true, text: 'Risk Heat (Index)' } },
          scales: {
            y: { title: { display: true, text: 'Index' } },
            x: { title: { display: true, text: 'Risk Area' } },
          },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('Risk Heat (Index)', 'Risk Area', 'Index', org);
      break;
    }

    case 'roi': {
      // ROI uplift over horizon (percent line)
      id = 'roi_uplift';
      cfg = {
        type: 'line',
        data: { labels, datasets: [{ label: 'ROI Uplift', data: [5, 7, 9].slice(0, labels.length) }] },
        options: {
          plugins: { title: { display: true, text: 'ROI Uplift over Horizon' } },
          scales: {
            y: { title: { display: true, text: 'Percent' } },
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
          },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('ROI Uplift over Horizon', labels[0].startsWith('M') ? 'Months' : 'Years', 'Percent', org);
      break;
    }

    default:
      return { html: '', charts: [] };
  }

  const note = noteWriter ? await noteWriter() : '';
  return { html: `${html}\n${note}`, charts: [chartEntry(id, cfg)] };
}

/* ==========================================
   3) Appendix builder (safe)
   ========================================== */
function buildAppendix(sections) {
  try {
    const rows = Object.entries(sections).map(([k, html]) => {
      const s = String(html || '');
      const words = wc(s);
      const tables = (s.match(/<table\b/gi) || []).length;
      const canv = (s.match(/<canvas\b/gi) || []).length;
      return `<tr><td>${k}</td><td>${words}</td><td>${tables}</td><td>${canv}</td></tr>`;
    });
    return `
      <section id="appendices">
        <h3>Appendices</h3>
        <table class="report-table">
          <thead><tr><th>Section</th><th>Words</th><th>Tables</th><th>Charts</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </section>
    `;
  } catch {
    return `<section id="appendices"><h3>Appendices</h3><p>Appendix failed gracefully.</p></section>`;
  }
}

/* ==========================================
   4) Main handler
   ========================================== */
export async function POST(req) {
  const input = await req.json();

  // Canon pulled from your form payload (dynamic country, timeframe, etc.)
  const canon = {
    lang: input.lang || 'English',
    orgName: input.orgName || input?.form?.orgName || 'Client',
    country: input.country || input?.form?.country || 'United States',
    tier: input.tier || input?.form?.tier || '',
    companySize: input.companySize || input?.form?.companySize || '',
    timeFrame: input.timeFrame || input?.form?.timeFrame || '3 years',
    costSavingsGoal: Number(input.costSavingsGoal || input?.form?.costSavingsGoal || 0),
    desiredOutcome: input.desiredOutcome || input?.form?.desiredOutcome || '',
    strategicGoal: input.strategicGoal || input?.form?.strategicGoal || '',
    preparedFor: input.preparedFor || input?.form?.preparedFor || '',
    preparedBy: input.preparedBy || input?.form?.preparedBy || '',
    reportDate: today(),
    minWords: Number(input.minWords || 20000),
    logoUrl: input.logoUrl || '/images/secure.png',
  };

  console.log(TAG, 'generate.start', { org: canon.orgName, model: MODEL, tf: canon.timeFrame });

  const order = ['exec', 'current', 'financials', 'kpis', 'impl', 'ops', 'risk', 'roi'];
  const sections = {};
  const registry = [];

  // 1) Generate section prose (with exactly one table where required)
  for (const s of order) {
    const html = await genSectionHTML(s, canon, FLOORS[s] || 1800);
    sections[s] = html;
  }

  // 2) Inject the required visuals (exactly one per section) + 2×2 dashboard in KPIs
  for (const s of order) {
    const { html, charts } = await buildSectionVisual(s, canon);
    if (html) sections[s] += '\n' + html;
    (charts || []).forEach((c) => registry.push(c));
  }

  // 3) Conclusion (short)
  const concl = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role: 'system', content: 'Return valid HTML only.' },
      {
        role: 'user',
        content:
          'Write a short conclusion (2 brief paragraphs, 3-4 sentences each) that sums up the value and next steps. No tables, no charts.',
      },
    ],
  });
  sections.conclusion = (concl.choices?.[0]?.message?.content || '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '');

  // 4) Appendix
  sections.appendix = buildAppendix(sections);

  // 5) Build full HTML document with chart registry
  const htmlDoc = buildReformReportHTML({
    canon,
    sections,
    phases: [],
    chartRegistry: registry,
    logoUrl: canon.logoUrl,
  });

  // Final metrics (sections only; page HTML can be longer)
  const wordCount = wc(Object.values(sections).join(' '));
  console.log(TAG, 'generate.done', { wordCount, sections: order.length + 2 });

  return NextResponse.json({ ok: true, html: htmlDoc, wordCount, htmlWordCount: wc(htmlDoc) });
}
