/* eslint-disable no-console */
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate.js';

const TAG = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

/* ---------------------------- small helpers ----------------------------- */
const wc = (html = '') =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;

const today = () =>
  new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });

function currencyForCountry(country = '') {
  const c = String(country || '').toLowerCase();
  if (/(canada|\bca\b)/.test(c)) return 'CAD';
  if (/(united states|\busa\b|\bus\b)/.test(c)) return 'USD';
  if (/(united kingdom|\buk\b|england)/.test(c)) return 'GBP';
  if (/(euro|france|germany|italy|spain|netherlands|belgium|ireland)/.test(c)) return 'EUR';
  if (/india/.test(c)) return 'INR';
  return 'USD';
}
function benchmarkHint(country = '') {
  const c = String(country || '').toLowerCase();
  if (/(canada|\bca\b)/.test(c)) return 'against Canada peer median';
  if (/(united kingdom|\buk\b)/.test(c)) return 'against UK peer median';
  if (/india/.test(c)) return 'against India peer median';
  if (/(euro|france|germany|italy|spain|netherlands|belgium|ireland)/.test(c)) return 'against EU peer median';
  return 'against US peer median';
}
const safeJSON = (o) => JSON.parse(JSON.stringify(o || {}));
const labelsForTimeframe = (tf = '') =>
  /\bmonth/.test(String(tf).toLowerCase()) && !/\byear/.test(String(tf).toLowerCase())
    ? ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12']
    : ['Y1', 'Y2', 'Y3'];

/* ------------------------- section word floors -------------------------- */
const SECTION_FLOORS = {
  exec: 2400,
  current: 2800,
  financials: 2800,
  kpis: 2400,
  timeline: 2400,
  ops: 3000,
  risk: 2200,
  roi: 2000,
  conclusion: 1200
};
const TOTAL_FLOOR = Object.values(SECTION_FLOORS).reduce((a, b) => a + b, 0);

/* --------------------- deterministic section prompts -------------------- */
function sectionRules(section, canon) {
  const needsOneTable = new Set(['current', 'financials', 'kpis', 'impl', 'ops', 'risk', 'roi']).has(
    section,
  );

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

  const subPrefix = (i) => `${mapNumber}.${i}`;

  const base = `
You are drafting the <${section}> section for ${canon.orgName} (${canon.country}).
Audience: C-suite. Concise paragraphs (3–4 sentences). Avoid filler and duplication.
Use numbered sub-headings exactly as:
<h3 class="subhead"><span class="sec-no">${mapNumber}.X</span> Title</h3>

${needsOneTable ? 'Include EXACTLY ONE <table class="report-table">…</table>.' : 'Do NOT include tables here.'}
Never include charts/heatmaps here — visuals are injected separately. Return a clean HTML fragment only.`.trim();

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
  }[section];

  return { base, subheads };
}

/* --------------------- prose generator (tables only) --------------------- */
async function genSectionHTML(section, canon, minWords) {
  const { base, subheads } = sectionRules(section, canon);
  const prompt = [
    base,
    '',
    'Use exactly these sub-headings (numbered as given). Under each, write 1–2 short paragraphs.',
    'Sub-headings:',
    subheads.map((t) => `- ${t}`).join('\n'),
  ].join('\n');

  console.log(TAG, 'section.start', section, { floor: minWords });
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1, // **nano supports only temperature==1**
    messages: [
      { role: 'system', content: 'Return valid HTML fragment only (no <html> wrappers).' },
      { role: 'user', content: `${prompt}\n\nMinimum words: ${minWords}` },
    ],
  });

  let html = (res.choices?.[0]?.message?.content || '').trim();
  // sanitize: strip any visuals (we inject our own)
  html = html
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<div[^>]*data-heatmap[^>]*>[\s\S]*?<\/div>/gi, '');
  console.log(TAG, 'section.firstPass', section, { words: wc(html) });
  return html;
}

/* ---------------------- visual builder + AI notes ----------------------- */
const chartEntry = (id, cfg) => ({ id, config: JSON.stringify(cfg) });

function aiNoteParagraph(title, x, y, org, extra = '') {
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
      return /^<p\b[^>]*class=["']chart-note["']/.test(p) ? p : `<p class="chart-note">${p}</p>`;
    } catch (e) {
      console.log(TAG, 'note.error', title, String(e?.message || e));
      return `<p class="chart-note">${title} charts ${y} against ${x}. Use this to focus next-quarter actions.</p>`;
    }
  };
}

async function buildSectionVisual(section, canon) {
  const cur = currencyForCountry(canon.country);
  const bench = benchmarkHint(canon.country);
  const labels = labelsForTimeframe(canon.timeFrame);
  const org = canon.orgName || 'Client';

  let cfg, html, noteWriter, id;
  const seedUp = [12, 14, 16, 18, 20, 22].slice(0, labels.length);
  const seedPay = [18, 13, 9].slice(0, labels.length);

  switch (section) {
    case 'exec': {
      id = 'exec_savings';
      cfg = {
        type: 'line',
        data: { labels, datasets: [{ label: 'Savings', data: seedUp }] },
        options: {
          plugins: { title: { display: true, text: `Savings by Period (${labels[0].startsWith('M') ? 'Months' : 'Years'})` } },
          scales: {
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
            y: { title: { display: true, text: cur } },
          },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('Savings by Period', labels[0].startsWith('M') ? 'Months' : 'Years', cur, org);
      break;
    }
    case 'current': {
      id = 'current_benchmark';
      cfg = {
        type: 'bar',
        data: { labels: ['Company', 'Benchmark'], datasets: [{ label: 'Index', data: [100, 112] }] },
        options: {
          plugins: { title: { display: true, text: `Current vs Benchmark (${bench})` } },
          scales: { x: { title: { display: true, text: 'Entity' } }, y: { title: { display: true, text: 'Index' } } },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('Current vs Benchmark', 'Entity', 'Index', org, `Use ${bench}.`);
      break;
    }
    case 'financials': {
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
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
            y: { title: { display: true, text: cur } },
          },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('Expenditures and Payback', labels[0].startsWith('M') ? 'Months' : 'Years', cur, org);
      break;
    }
    case 'kpis': {
      const g1 = 'kpi_savings';
      const g2 = 'kpi_payback';
      const cfg1 = {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Projected Savings', data: seedUp }] },
        options: {
          plugins: { title: { display: true, text: 'Projected Savings' } },
          scales: {
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
            y: { title: { display: true, text: cur } },
          },
        },
      };
      const cfg2 = {
        type: 'line',
        data: { labels, datasets: [{ label: 'Payback Index', data: [85, 92, 100].slice(0, labels.length) }] },
        options: {
          plugins: { title: { display: true, text: 'Payback over Horizon' } },
          scales: {
            x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } },
            y: { title: { display: true, text: 'Index' } },
          },
        },
      };

      // 2×2 dashboard (two charts + two metric tiles)
      const m1 = { label: 'Digital Orders Share', value: '62%' };
      const m2 = { label: 'AOV vs Benchmark', value: '+4 pp' };
      let htmlDash = `
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
        </div>`;

      const n1 = await aiNoteParagraph('Projected Savings', labels[0].startsWith('M') ? 'Months' : 'Years', cur, org)();
      const n2 = await aiNoteParagraph('Payback over Horizon', labels[0].startsWith('M') ? 'Months' : 'Years', 'Index', org)();
      htmlDash += `\n${n1}\n${n2}`;

      console.log(TAG, 'dashboard.injected', { section: 'kpis', tiles: 2, charts: 2 });
      return { html: htmlDash, charts: [chartEntry(g1, cfg1), chartEntry(g2, cfg2)] };
    }
    case 'impl': {
      id = 'impl_roadmap';
      cfg = {
        type: 'bar',
        data: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [{ label: 'Milestones', data: [2, 4, 6, 8] }] },
        options: {
          plugins: { title: { display: true, text: 'Implementation Roadmap (Milestone Density)' } },
          scales: { x: { title: { display: true, text: 'Quarters' } }, y: { title: { display: true, text: 'Milestones' } } },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('Implementation Roadmap', 'Quarters', 'Milestones', org);
      break;
    }
    case 'ops': {
      id = 'ops_ontime';
      cfg = {
        type: 'line',
        data: { labels, datasets: [{ label: 'On-Time Rate', data: [92, 95, 97].slice(0, labels.length) }] },
        options: {
          plugins: { title: { display: true, text: 'On-Time Delivery Rate' } },
          scales: { x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } }, y: { title: { display: true, text: 'Percent' } } },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('On-Time Delivery Rate', labels[0].startsWith('M') ? 'Months' : 'Years', 'Percent', org);
      break;
    }
    case 'risk': {
      id = 'risk_heat';
      cfg = {
        type: 'bar',
        data: { labels: ['Supply', 'Labor', 'Delivery', 'IT'], datasets: [{ label: 'Risk Index', data: [7, 5, 6, 4] }] },
        options: {
          plugins: { title: { display: true, text: 'Risk Heat (Index)' } },
          scales: { x: { title: { display: true, text: 'Risk Area' } }, y: { title: { display: true, text: 'Index' } } },
        },
      };
      html = `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`;
      noteWriter = aiNoteParagraph('Risk Heat (Index)', 'Risk Area', 'Index', org);
      break;
    }
    case 'roi': {
      id = 'roi_uplift';
      cfg = {
        type: 'line',
        data: { labels, datasets: [{ label: 'ROI Uplift', data: [5, 7, 9].slice(0, labels.length) }] },
        options: {
          plugins: { title: { display: true, text: 'ROI Uplift over Horizon' } },
          scales: { x: { title: { display: true, text: labels[0].startsWith('M') ? 'Months' : 'Years' } }, y: { title: { display: true, text: 'Percent' } } },
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
  console.log(TAG, 'visual.injected', { section, id, title: cfg?.options?.plugins?.title?.text });
  return { html: `${html}\n${note}`, charts: [chartEntry(id, cfg)] };
}

/* ---------------------------- appendix builder --------------------------- */
function buildAppendix(sections) {
  try {
    const rows = Object.entries(sections).map(([k, html]) => {
      const s = String(html || '');
      const words = wc(s);
      const tables = (s.match(/<table\b/gi) || []).length;
      const canv = (s.match(/<canvas\b/gi) || []).length;
      return `<tr><td>${k}</td><td>${words}</td><td>${tables}</td><td>${canv}</td></tr>`;
    });
    const html = `
      <section id="appendices">
        <h3>Appendices</h3>
        <table class="report-table">
          <thead><tr><th>Section</th><th>Words</th><th>Tables</th><th>Charts</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </section>`;
    console.log(TAG, 'appendix.done', { sections: rows.length });
    return html;
  } catch (e) {
    console.log(TAG, 'appendix.error', String(e?.message || e));
    return `<section id="appendices"><h3>Appendices</h3><p>Appendix failed gracefully.</p></section>`;
  }
}

/* -------------------------------- handler -------------------------------- */
export async function POST(req) {
  const input = await req.json();

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
    minWords: clamp(input.minWords || 20000, 8000, 80000),
    logoUrl: input.logoUrl || '/images/secure.png',
  };

  console.log(TAG, 'generate.start', { org: canon.orgName, model: MODEL, tf: canon.timeFrame });

  const order = ['exec', 'current', 'financials', 'kpis', 'impl', 'ops', 'risk', 'roi'];
  const sections = {};
  const registry = [];

  // 1) prose
  for (const s of order) {
    sections[s] = await genSectionHTML(s, canon, SECTION_FLOORS || 1800);
  }

  // 2) visuals (1 each; KPIs injects a 2×2 dashboard)
  for (const s of order) {
    const { html, charts } = await buildSectionVisual(s, canon);
    if (html) sections[s] += `\n${html}`;
    (charts || []).forEach((c) => registry.push(c));
  }
  console.log(TAG, 'visuals.registry', { charts: registry.length });

  // 3) conclusion
  const concl = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role: 'system', content: 'Return valid HTML only.' },
      {
        role: 'user',
        content:
          'Write a short conclusion (2 brief paragraphs, 3–4 sentences each). No tables, no charts.',
      },
    ],
  });
  sections.conclusion = (concl.choices?.[0]?.message?.content || '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '');
  console.log(TAG, 'conclusion.ready', { words: wc(sections.conclusion) });

  /* ========================================================================== */
/* Implementation Kit JSON (appendices only)                                   */
/* ========================================================================== */
async function genImplKitJSON(canon, sections){
  const openai = await getOpenAI();
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

  try{
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role:'system', content:'Return strict JSON only. No prose.' },
        { role:'user',   content: body + `\n\n--- CONTEXT (EXCERPTS) ---\nEXEC:\n${sections.exec}\n\nCURRENT:\n${sections.current}\n\nFINANCIALS:\n${sections.financials}\n\nKPIS:\n${sections.kpis}\n\nTIMELINE:\n${sections.timeline}\n\nOPS:\n${sections.ops}\n\nRISK:\n${sections.risk}\n\nROI:\n${sections.roi}\n\nCONCLUSION:\n${sections.conclusion||''}` }
      ]
    });
    const txt = res.choices?.[0]?.message?.content || '{}';
    let json = {};
    try { json = JSON.parse(txt); } catch { json = {}; }
    if (json && typeof json === 'object') return json;
    return {};
  }catch(e){
    console.log(TAG, 'appendix.implKit.error', String(e?.message||e));
    return {};
  }
}

  // 5) assemble full document via template
  console.log(TAG, 'template.assemble.start');
  const htmlDoc = buildReformReportHTML({
    canon,
    sections,
    phases: [],
    
    chartRegistry: registry, // client can hydrate canvases from this
    logoUrl: canon.logoUrl,
  });
  console.log(TAG, 'template.assemble.done');

  const sectionsWordCount = wc(Object.values(sections).join(' '));
  const htmlWordCount = wc(htmlDoc);
  console.log(TAG, 'generate.done', {
    sectionsWords: sectionsWordCount,
    htmlWords: htmlWordCount,
    target: canon.minWords,
  });

  return NextResponse.json({
    ok: true,
    html: htmlDoc,
    wordCount: sectionsWordCount,
    htmlWordCount,
    chartRegistry: registry.map(safeJSON),
  });
}
