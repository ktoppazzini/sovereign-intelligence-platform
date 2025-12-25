/**
 * lib/reportTemplate.js
 * Renders the full Reform report HTML string.
 * Pure JS string builder so it can run server-side in Next route.
 */

const PX_PER_INCH = 96;
const LETTER_WIDTH = Math.round(8.5 * PX_PER_INCH); // 816px approx
const MAX_BODY_WIDTH = LETTER_WIDTH; // keep portrait, avoid horizontal scroll

function safe(val) {
  return String(val == null ? '' : val);
}
function escAttr(json) {
  const s = typeof json === 'string' ? json : JSON.stringify(json);
  return s.replace(/&/g, '&amp;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
}
function pickLabelsByHorizon(n) {
  if (n <= 12) return Array.from({length:n}, (_,i)=>`M${i+1}`);
  return Array.from({length:n}, (_,i)=>`Y${i+1}`);
}
function sectionBlock(title, id, innerHTML) {
  const trimmed = (innerHTML || '').trim();
  const startsWithH2 = /^<h2[\s>]/i.test(trimmed);
  return `
    <section id="${id}">
      ${startsWithH2 ? '' : `<h2>${title}</h2>`}
      ${trimmed}
    </section>
  `;
}
function titlePage(canon) {
  const logoSrc = safe(canon.logoUrl || '/images/secure.png');
  return `
  <header class="title-page">
    <div class="title-head">
      <img class="brand" src="${logoSrc}" alt="Sovereign Intelligence" />
    </div>
    <h1>${safe(canon.orgName)} — Reform Strategy Report</h1>
    <p class="meta">
      <strong>Prepared for:</strong> ${safe(canon.preparedFor || canon.orgName)} ·
      <strong>Prepared by:</strong> ${safe(canon.preparedBy || 'Sovereign Intelligence')}<br/>
      <strong>Country:</strong> ${safe(canon.country)} ·
      <strong>Tier:</strong> ${safe(canon.tier)} ·
      <strong>Company size:</strong> ${safe(canon.companySize)}<br/>
      <strong>Time frame:</strong> ${safe(canon.timeFrame)} ·
      <strong>Date:</strong> ${safe(canon.reportDate)}
    </p>
  </header>`;
}
/** Optional dynamic PNG overlay renderer for the Implementation Plan diagram */
function planFigure(phases, planDiagramHTML) {
  try {
    if (typeof planDiagramHTML === 'function') {
      return planDiagramHTML(phases || []);
    }
  } catch {}
  // Safe fallback
  return `
  <section id="implementation-plan">
    <h2>Implementation Timeline</h2>
    <ol class="phases">
      ${(phases||[]).slice(0,5).map(p=>`<li><h3>${safe(p.title)}</h3><p>${safe(p.caption||'')}</p></li>`).join('')}
    </ol>
  </section>`;
}
function chartFigure(spec){
  const json = escAttr(spec);
  return `<figure class="chart-block">
    <div class="chart-toolbar">
      <label>Chart:</label>
      <select class="chart-type">
        <option value="line">Line</option>
        <option value="bar">Bar</option>
        <option value="pie">Pie</option>
        <option value="doughnut">Doughnut</option>
        <option value="radar">Radar</option>
      </select>
    </div>
    <div class="chart-canvas blue">
      <canvas></canvas>
    </div>
    <figcaption>${safe(spec.title || '')}</figcaption>
    <div data-chart='${json}' hidden></div>
  </figure>`;
}

export default function buildReformReportHTML(opts){
  const { canon, sections={}, charts={}, phases=[], Graphs, planDiagramHTML } = opts || {};
  const trend = charts.trend || [];
  const trendLabels = pickLabelsByHorizon(trend.length || 12);

  // Executive Summary chart: savings over horizon
  const execChartSpec = {
    type: 'line',
    title: 'Projected Savings Over Time',
    labels: trendLabels,
    datasets: [{ label: 'Savings', data: trend }]
  };

  // Financials chart: expenditures vs payback
  const spend = charts.expenditures || trend.map(()=>0);
  const payback = charts.payback || trend.map((v,i)=>trend.slice(0,i+1).reduce((a,b)=>a+b,0));
  const finChartSpec = {
    type: 'line',
    title: 'Expenditures & Payback',
    labels: trendLabels,
    datasets: [
      { label:'Expenditures', data: spend },
      { label:'Cumulative Payback', data: payback }
    ]
  };

  // KPI dashboard
  const kpiItems = Array.isArray(charts.kpis) ? charts.kpis : [];
  const kpiLabels = kpiItems.map(k=>k.label);
  const kpiValues = kpiItems.map(k=>Number(k.value||0));
  const kpiBarSpec = {
    type: 'bar',
    title: 'KPI — Savings by Metric',
    labels: kpiLabels,
    datasets: [{ label:'Value', data: kpiValues }]
  };

  const heat = charts.heat || [];
  const heatSpec = {
    rows: charts.heatRows || ['Very Low','Low','Medium','High','Very High'],
    cols: charts.heatCols || ['Very Low','Low','Medium','High','Very High'],
    data: heat
  };

  // Server-side fallbacks (static HTML) if hydration fails
  const execFallback = Graphs && Graphs.lineChartHTML
    ? Graphs.lineChartHTML(execChartSpec)
    : chartFigure(execChartSpec);

  const finFallback = Graphs && Graphs.lineChartHTML
    ? Graphs.lineChartHTML(finChartSpec)
    : chartFigure(finChartSpec);

  const kpiFallback = Graphs && Graphs.barChartHTML
    ? Graphs.barChartHTML(kpiBarSpec)
    : chartFigure(kpiBarSpec);

  const heatFallback = Graphs && Graphs.heatMapHTML
    ? Graphs.heatMapHTML(heat, { rowLabels: heatSpec.rows, colLabels: heatSpec.cols, title:'Risk Heat Map (Likelihood × Impact)' })
    : `<div class="heatmap-holder" data-heatmap='${escAttr(heatSpec)}'><canvas width="900" height="280"></canvas></div>`;

  const css = `
  <style>
    :root {
      --brand-blue: #0f2b46;
      --ink: #0b1220;
      --muted: #6b7a90;
      --paper: #ffffff;
      --accent: #0ea5e9;
    }
    .report-shell { max-width: ${MAX_BODY_WIDTH}px; margin: 0 auto; }
    .title-page {
      background: var(--brand-blue);
      color: #fff;
      padding: 2.25rem 2rem 2.75rem;
      border-radius: 14px;
      margin: 1rem 0 1.5rem;
    }
    .title-head { display:flex; justify-content:flex-start; align-items:center; margin-bottom:1rem; }
    .title-page .brand { height: 28px; }
    .title-page h1 { color:#fff; margin: 0.5rem 0 0.75rem; font-size: 2rem; }
    .title-page .meta { color: #dbeafe; }

    section { background: var(--paper); color: var(--ink); padding: 1.25rem 1.25rem 1rem; margin: 1rem 0; border-radius: 12px; }
    h2 { margin: 0 0 .75rem; font-size: 1.6rem; color: var(--ink); }
    h3 { margin: 1rem 0 .5rem; font-size: 1.2rem; }
    p { line-height: 1.55; margin: .5rem 0; }

    /* Charts */
    .chart-block { margin: .75rem 0 1rem; }
    .chart-toolbar { display:flex; gap:.5rem; align-items:center; margin: 0 0 .5rem; }
    .chart-canvas { border-radius:12px; padding:.75rem; }
    .chart-canvas.blue { background: #0a2640; color:#fff; }
    .chart-canvas.blue canvas { background: transparent; }
    .chart-block figcaption { color: #94a3b8; margin-top:.35rem; }

    /* Zebra tables (all tables) */
    table { width:100%; border-collapse: collapse; margin:.75rem 0 1rem; font-size:.95rem; }
    table th, table td { padding:.6rem .65rem; text-align:left; border-bottom:1px solid #e5e7eb; }
    table tbody tr:nth-child(odd) { background:#f9fafb; }
    table tbody tr:nth-child(even) { background:#eef2ff; }

    /* Implementation phases fallback */
    #implementation-plan .phases { display:grid; grid-template-columns:repeat(5,1fr); gap:.75rem; margin:0; padding:0; list-style:none; }
    #implementation-plan li { background:#f1f5f9; padding:.75rem; border-radius:10px; }

    /* prevent horizontal overflow */
    .report-shell * { max-width: 100%; box-sizing: border-box; }
  </style>`;

  const bootstrap = `
  <script>
  (function(){
    function qsa(sel, el){ return Array.from((el||document).querySelectorAll(sel)); }

    // Load Chart.js once if needed
    let chartLibPromise = null;
    function ensureChartJs(){
      if (window.Chart) return Promise.resolve(window.Chart);
      if (!chartLibPromise){
        chartLibPromise = new Promise(function(resolve,reject){
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
          s.onload = ()=> resolve(window.Chart);
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      return chartLibPromise;
    }
    function buildChart(canvas, spec){
      const ctx = canvas.getContext('2d');
      const cfg = {
        type: spec.type || 'line',
        data: { labels: spec.labels || [], datasets: (spec.datasets||[]).map((d)=>({
          label: d.label, data: d.data
        }))},
        options: {
          plugins: { legend: { labels: { color: getComputedStyle(canvas).color } }, title: { display: !!spec.title, text: spec.title } },
          scales: {
            x: { ticks: { color: getComputedStyle(canvas).color } },
            y: { ticks: { color: getComputedStyle(canvas).color } }
          }
        }
      };
      return new Chart(ctx, cfg);
    }
    async function hydrateCharts(){
      const blocks = qsa('figure.chart-block');
      if (!blocks.length) return;
      const Chart = await ensureChartJs();
      blocks.forEach(function(fig){
        const holder = fig.querySelector('[data-chart]');
        if (!holder) return;
        let spec = {};
        try { spec = JSON.parse(holder.getAttribute('data-chart')); } catch {}
        const canvas = fig.querySelector('canvas');
        const select = fig.querySelector('select.chart-type');
        if (select) {
          if (spec.type) select.value = spec.type;
          select.addEventListener('change', function(){
            spec.type = this.value;
            if (canvas.__chart){ canvas.__chart.destroy(); }
            buildChart(canvas, spec);
          });
        }
        canvas.__chart = buildChart(canvas, spec);
      });
    }
    function hydrateHeatmaps(){
      qsa('[data-heatmap]').forEach(function(div){
        try {
          const spec = JSON.parse(div.getAttribute('data-heatmap'));
          const cv = div.querySelector('canvas');
          const ctx = cv.getContext('2d');
          const rows = spec.rows || [];
          const cols = spec.cols || [];
          const data = spec.data || [];
          const w = cv.width, h = cv.height;
          const cellW = Math.floor(w / Math.max(1, cols.length));
          const cellH = Math.floor(h / Math.max(1, rows.length));
          const max = Math.max(1, ...data.flat());
          for (let r=0; r<rows.length; r++){
            for (let c=0; c<cols.length; c++){
              const val = (data[r] && data[r][c]) || 0;
              const alpha = 0.15 + 0.75*(val/max);
              ctx.fillStyle = 'rgba(14,165,233,'+alpha+')';
              ctx.fillRect(c*cellW, r*cellH, cellW-1, cellH-1);
            }
          }
        } catch(e){}
      });
    }
    if (document.readyState !== 'loading') { hydrateCharts(); hydrateHeatmaps(); }
    else document.addEventListener('DOMContentLoaded', function(){ hydrateCharts(); hydrateHeatmaps(); });
  })();
  </script>`;

  const html = `
  ${css}
  <div class="report-shell">
    ${titlePage(canon)}

    <section id="contents">
      <h2>Contents</h2>
      <ol>
        <li>1. Executive Summary</li>
        <li>2. Current State</li>
        <li>3. Financials</li>
        <li>4. KPIs & Targets</li>
        <li>5. Implementation Timeline</li>
        <li>6. Operating Model</li>
        <li>7. Risks & Mitigations</li>
        <li>8. ROI & Next Steps</li>
      </ol>
    </section>

    ${sectionBlock('Executive Summary','exec', `
      ${chartFigure(execChartSpec)}
      ${execFallback}
      ${safe(sections.exec || '')}
    `)}

    ${sectionBlock('Current State','current', `
      ${safe(sections.current || '')}
    `)}

    ${sectionBlock('Financials','financials', `
      ${chartFigure(finChartSpec)}
      ${finFallback}
      ${safe(sections.financials || '')}
    `)}

    ${sectionBlock('KPIs & Targets','kpis', `
      <div class="dashboard">
        ${chartFigure(kpiBarSpec)}
        ${kpiFallback}
      </div>
      ${safe(sections.kpis || '')}
    `)}

    ${sectionBlock('Implementation Timeline','timeline', `
      ${planFigure(phases, planDiagramHTML)}
      ${safe(sections.timeline || '')}
    `)}

    ${sectionBlock('Operating Model','ops', safe(sections.ops || ''))}
    ${sectionBlock('Risks & Mitigations','risk', `
      <h3>Risk Heat Map</h3>
      ${heatFallback}
      ${safe(sections.risk || '')}
    `)}
    ${sectionBlock('ROI & Next Steps','roi', safe(sections.roi || ''))}
  </div>
  ${bootstrap}
  `;
  return html;
}
