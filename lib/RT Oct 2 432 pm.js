// lib/reportTemplate.js
// Builds the full HTML report, injects charts/heatmaps/roadmap, and normalizes section text.
// No external chart libs. Uses lib/reportGraphs for SSR + hydration.

import { lineChartHTML, barChartHTML, heatmapHTML, HYDRATE_INLINE_SCRIPT, GRAPH_CSS } from './reportGraphs.js';

// --- helpers ---
const esc = (s='') => String(s);
const clamp = (n, a, b) => Math.min(b, Math.max(a, Number(n)||0));
const splitParas = (html='') => {
  const text = String(html).replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '</p>\n');
  const chunks = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  return chunks.map(p => /<\/?[a-z]/i.test(p) ? p : `<p>${esc(p)}</p>`).join('\n');
};
function zebraWrapTables(html='') {
  return html.replace(/<table(\s|>)/gi, '<table class="zebra tight"$1');
}
function parseMonths(timeFrame='') {
  const s = (timeFrame||'').toLowerCase();
  const num = Number((s.match(/([\d.]+)/)||[])[1]||0);
  if (s.includes('month')) return Math.max(1, Math.round(num||12));
  if (s.includes('year'))  return Math.max(1, Math.round((num||2)*12));
  return 24; // default
}
function labelsForPeriod(timeFrame='') {
  const months = parseMonths(timeFrame);
  if (months <= 12) {
    return Array.from({length:months}, (_,i)=>`M${i+1}`);
  }
  const years = Math.ceil(months/12);
  return Array.from({length:years}, (_,i)=>`Y${i+1}`);
}
function resample(series=[], targetLen=12) {
  if (!Array.isArray(series) || series.length === 0) return Array.from({length:targetLen},(_,i)=>0);
  if (series.length === targetLen) return series.slice();
  const out = [];
  for (let i=0;i<targetLen;i++){
    const t = (i*(series.length-1))/(targetLen-1);
    const a = Math.floor(t), b = Math.ceil(t);
    const v = a===b ? series[a] : series[a]*(b-t)+series[b]*(t-a);
    out.push(Math.round(v));
  }
  return out;
}

// --- dynamic roadmap (text overlay on PNG) ---
function implementationRoadmapHTML(phases=[], blueHeader=true) {
  // Expect phases: [{title, caption}, ...] length 5
  const imgSrc = '/images/Implementation-roadmap.png';
  const slots = [10, 30, 50, 70, 90]; // percents across image
  const heads = (phases||[]).slice(0,5);
  while (heads.length < 5) heads.push({ title:`Phase ${heads.length+1}`, caption:'Milestones & deliverables' });

  const overlays = heads.map((p, i) => `
    <div class="road-slot" style="left:${slots[i]}%">
      <div class="road-phase">${esc(p.title||`Phase ${i+1}`)}</div>
      <div class="road-cap">${esc(p.caption||'Milestones & deliverables')}</div>
    </div>
  `).join('');

  return `
  <section>
    <h2>Implementation Timeline</h2>
    <div class="road-wrap">
      <img src="${imgSrc}" alt="Implementation roadmap" />
      ${overlays}
    </div>
  </section>`;
}

// --- template ---
export default function buildReformReportHTML(opts) {
  const { canon, sections={}, charts={}, phases=[] } = (opts||{});
  const logo = '/images/secure.png'; // served from Next/public/images
  const timeLabels = labelsForPeriod(canon?.timeFrame||'2 years');

  // chart data (never empty)
  const trend = Array.isArray(charts?.trend) && charts.trend.length
    ? resample(charts.trend.map(Number), timeLabels.length)
    : Array.from({length: timeLabels.length}, (_,i)=>Math.round((i+1)*(canon?.costSavingsGoal||2000000)/timeLabels.length));

  // simple “expenditures” curve and cumulative payback from trend
  const spend = trend.map(v => Math.round(v * 0.35));
  const payback = trend.reduce((acc,v,i)=>{ acc.push((acc[i-1]||0)+v - spend[i]); return acc; }, []);

  // KPI sample bars from charts.kpis if present
  const klabels = (charts?.kpis||[]).map(k=>String(k.label||'KPI'));
  const kvals   = (charts?.kpis||[]).map(k=>Number(k.value||0));
  const benchA  = kvals.map(v => Math.round(v*1.1)); // simple benchmark for demo
  const benchB  = kvals.map(v => Math.round(v*0.9));

  // heat map safe defaults
  const heat = Array.isArray(charts?.heat) && charts.heat.length ? charts.heat : (
    Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1))
  );
  const heatRows = ['Ops','Sales','CX','IT','People'];
  const heatCols = ['Q1','Q2','Q3','Q4','Q5'];

  // title page (remove country/tier/size per request)
  const titlePage = `
  <section class="title-page">
    <div class="title-head">
      <img class="brand" src="${logo}" alt="Sovereign Intelligence" />
      <h1>${esc(canon?.orgName || 'Client')} — Reform Strategy Report</h1>
      <div class="meta">
        <span><strong>Prepared for:</strong> ${esc(canon?.preparedFor || '')}</span>
        <span><strong>Prepared by:</strong> ${esc(canon?.preparedBy || '')}</span>
        <span><strong>Time frame:</strong> ${esc(canon?.timeFrame || '—')}</span>
        <span><strong>Date:</strong> ${esc(canon?.reportDate || '')}</span>
      </div>
    </div>
  </section>`;

  // Table of contents without duplicate numbering
  const tocItems = [
    'Executive Summary',
    'Current State',
    'Financials',
    'KPIs & Targets',
    'Implementation Timeline',
    'Operating Model',
    'Risks & Mitigations',
    'ROI & Next Steps'
  ].map((t,i)=>`<li>${i+1}. ${t}</li>`).join('');

  // section HTML (split long strings to short paragraphs & zebra tables)
  const sExec  = zebraWrapTables(splitParas(sections.exec  || ''));
  const sCurr  = zebraWrapTables(splitParas(sections.current || ''));
  const sFin   = zebraWrapTables(splitParas(sections.financials || ''));
  const sKpis  = zebraWrapTables(splitParas(sections.kpis || ''));
  const sOps   = zebraWrapTables(splitParas(sections.ops || ''));
  const sRisk  = zebraWrapTables(splitParas(sections.risk || ''));
  const sRoi   = zebraWrapTables(splitParas(sections.roi || ''));

  // charts (SSR + hydrate). Blue canvas with white text.
  const execChart = lineChartHTML({
    id: 'exec_trend',
    title: 'Projected Savings Over Time',
    labels: timeLabels,
    series: trend,
    blue: true
  });

  const finSpend = barChartHTML({
    id: 'fin_spend',
    title: 'Implementation Expenditures',
    labels: timeLabels,
    series: spend,
    blue: true
  });

  const finPayback = lineChartHTML({
    id: 'fin_payback',
    title: 'Cumulative Payback',
    labels: timeLabels,
    series: payback,
    blue: true
  });

  const kpiSavings = barChartHTML({
    id: 'kpi_savings',
    title: 'Savings by KPI',
    labels: klabels.length ? klabels : ['A','B','C','D'],
    series: kvals.length ? kvals : [42, 55, 31, 28],
    blue: true
  });

  const kpiBenchA = barChartHTML({
    id: 'kpi_bench_a',
    title: 'Metric vs Benchmark A',
    labels: klabels.length ? klabels : ['A','B','C','D'],
    series: benchA.length ? benchA : [48, 60, 37, 30],
    blue: true
  });

  const kpiBenchB = lineChartHTML({
    id: 'kpi_bench_b',
    title: 'Payback over Horizon',
    labels: timeLabels,
    series: payback,
    blue: true
  });

  const riskHeat = heatmapHTML({
    id: 'risk_heat',
    title: 'Risk Heat Map',
    rows: heatRows,
    cols: heatCols,
    data: heat,
    blue: true
  });

  const roadmap = implementationRoadmapHTML(phases || []);

  // assemble
  const html = `
  <article class="report">
    ${titlePage}

    <section class="toc">
      <h2>Contents</h2>
      <ol class="toc-list">${tocItems}</ol>
    </section>

    <section>
      <h2>Executive Summary</h2>
      ${execChart}
      ${sExec}
    </section>

    <section>
      <h2>Current State</h2>
      ${sCurr}
      <div class="inline-note">The following visualization blocks illustrate the recommended executive views. They render dynamically with report data.</div>
    </section>

    <section>
      <h2>Financials</h2>
      ${finSpend}
      ${finPayback}
      ${sFin}
    </section>

    <section>
      <h2>KPIs & Targets</h2>
      ${kpiSavings}
      ${kpiBenchB}
      ${kpiBenchA}
      ${sKpis}
    </section>

    ${roadmap}

    <section>
      <h2>Operating Model</h2>
      ${sOps}
    </section>

    <section>
      <h2>Risks & Mitigations</h2>
      ${riskHeat}
      ${sRisk}
    </section>

    <section>
      <h2>ROI & Next Steps</h2>
      ${sRoi}
    </section>
  </article>

  <style>
    /* page sizing — letter portrait width (no horizontal scroll) */
    .report{ max-width: 816px; margin: 0 auto; padding: 12px 12px 64px; }
    .report section{ margin: 1.25rem 0 1.75rem; }
    .title-page{ background:${'#0E2A44'}; color:${'#E6F0FF'}; border-radius:18px; padding:20px 24px; }
    .title-head h1{ margin:.5rem 0 1rem; font-size:1.8rem; }
    .title-head .brand{ height:26px; }
    .title-head .meta{ display:flex; flex-wrap:wrap; gap:12px 18px; font-size:.95rem; opacity:.9; }
    .toc .toc-list{ padding-left: 1.25rem; }
    .toc .toc-list li{ margin:.3rem 0; }

    /* blue canvas charts */
    ${GRAPH_CSS}
    .ssr-svg{ border-radius:16px; box-shadow:0 2px 10px rgba(0,0,0,.06); }

    /* zebra tables across the report */
    table.zebra{ width:100%; border-collapse:collapse; margin: 1rem 0; font-size:.95rem; }
    table.zebra th, table.zebra td{ padding:.55rem .7rem; border-bottom:1px solid #e6e9ef; }
    table.zebra tr:nth-child(even){ background:#f7f9fc; }
    table.zebra.tight th, table.zebra.tight td{ padding:.45rem .6rem; }

    /* roadmap overlay */
    .road-wrap{ position:relative; }
    .road-wrap img{ width:100%; display:block; border-radius:12px; }
    .road-slot{ position:absolute; top:10%; transform:translateX(-50%); width:22%; text-align:center; }
    .road-phase{ font-weight:700; text-transform:none; margin:.2rem 0; }
    .road-cap{ font-size:.9rem; color:#2c3e50; }

    .inline-note{ font-size:.9rem; color:#6c7a89; margin:.75rem 0 0; }
  </style>

  <script type="module">${HYDRATE_INLINE_SCRIPT}</script>
  `;

  return html;
}
