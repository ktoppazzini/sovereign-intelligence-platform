// /lib/reportTemplate.js
// Surgical updates:
// 1) Use the new planDiagramHTML (title → phases → icons → descriptions).
// 2) Make EVERY table use the same dark “Appendix” style by converting all
//    <table> to <table class="table"> (IMPLKIT_CSS already defines .table).

import {
  lineChartHTML,
  barChartHTML,
  heatmapHTML,
  benchmarkHTML,
  GRAPH_CSS
} from './reportGraphs.js';

import {
  IMPLKIT_CSS,
  chartersHTML, raciHTML, raidHTML,
  benefitsHTML, plan100HTML, pilotHTML,
  assumptionsHTML, methodsSourcesHTML
} from './implKitHtml.js';

// NEW: roadmap renderer that matches your mock
import { planDiagramHTML } from './implPlan.js';

const esc = (s='') => String(s);

function normalizeLogoPath(raw) {
  let s = (raw || '').trim().replace(/\\/g, '/');
  if (!s) return '/public/images/secure.png';
  if (s.startsWith('/')) return s;
  if (/^public\/images\//i.test(s)) return '/' + s;
  if (/^images\//i.test(s)) return '/public/' + s;
  return '/public/images/' + s.split('/').pop();
}

const splitParas = (html='') => {
  const text = String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '</p>\n');
  return text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
};
const wrapIfPlain = p => /<\/?[a-z]/i.test(p) ? p : `<p>${esc(p)}</p>`;

// CHANGED: always force Appendix-style tables
function unifyTables(html='') {
  return String(html).replace(/<table(\s|>)/gi, '<table class="table"$1');
}

function labelsForPeriod(timeFrame='') {
  const s = (timeFrame||'').toLowerCase();
  let months = 24;
  const num = Number((s.match(/([\d.]+)/)||[])[1]||0);
  if (s.includes('month')) months = Math.max(1, Math.round(num||12));
  if (s.includes('year'))  months = Math.max(1, Math.round((num||2)*12));
  if (months <= 12) return Array.from({length:months}, (_,i)=>`M${i+1}`);
  const years = Math.ceil(months/12);
  return Array.from({length:years}, (_,i)=>`Y${i+1}`);
}
const mkDefaultSeries = (len, total=100) =>
  Array.from({length:len}, (_,i)=>Math.round((i+1)*total/len));

/* ---- Render explicit data-* blocks to real charts (SSR) ------------------- */
function safeParseAttrJSON(s='') {
  try { return JSON.parse(String(s).replace(/&quot;/g,'"').replace(/&amp;/g,'&')); }
  catch { return null; }
}
function renderDataBlocks(html='', labels) {
  html = html.replace(/<figure[^>]*data-chart=['"]([^'"]+)['"][^>]*>[\s\S]*?<\/figure>/gi,
    (_m, specRaw) => {
      const spec = safeParseAttrJSON(specRaw) || {};
      const type  = (spec.type || 'line').toLowerCase();
      const title = spec.title || 'Chart';
      const ds    = Array.isArray(spec.datasets) && spec.datasets[0] ? spec.datasets[0] : { data: [] };
      const series = Array.isArray(ds.data) && ds.data.length ? ds.data : mkDefaultSeries(labels.length, 100);
      const xTitle = spec.xTitle || (labels[0]?.startsWith('Y') ? 'Years' : 'Months');
      const yTitle = spec.yTitle || 'Value';
      if (type === 'bar')  return barChartHTML({ title, labels, series, xTitle, yTitle });
      if (type === 'pie')  return lineChartHTML({ title, labels, series, xTitle, yTitle });
      if (type === 'doughnut') return lineChartHTML({ title, labels, series, xTitle, yTitle });
      return lineChartHTML({ title, labels, series, xTitle, yTitle });
    });

  html = html.replace(/<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([^'"]+)['"][^>]*>[\s\S]*?<\/figure>/gi,
    (_m, specRaw) => {
      const spec = safeParseAttrJSON(specRaw) || {};
      return benchmarkHTML({
        title: spec.title || 'Benchmark',
        current: Number(spec.current || 0),
        benchmark: Number(spec.benchmark || 0),
        yTitle: spec.yTitle || 'Percent'
      });
    });

  html = html.replace(/<div[^>]*data-heatmap=['"]([^'"]+)['"][^>]*>[\s\S]*?<\/div>/gi,
    (_m, specRaw) => {
      const spec = safeParseAttrJSON(specRaw) || {};
      return heatmapHTML({
        title: spec.title || 'Risk Heat Map',
        rows: Array.isArray(spec.rows) ? spec.rows : ['R1','R2','R3','R4','R5'],
        cols: Array.isArray(spec.cols) ? spec.cols : ['C1','C2','C3','C4','C5'],
        data: Array.isArray(spec.data) ? spec.data
             : Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1))
      });
    });

  return html;
}

/** Convert any paragraph that looks like a "placeholder" into a real widget. */
function injectSmartWidgets(html, { labels, canon }) {
  if (!html) return { html: '', injected: false };

  const blocks = splitParas(html);
  let injected = false;

  const make = (kind) => {
    const series = mkDefaultSeries(labels.length, (canon?.costSavingsGoal || 100));
    switch (kind) {
      case 'bar':
        return barChartHTML({
          title: 'Implementation Expenditures',
          labels, series,
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'Spend'
        });
      case 'heat':
        return heatmapHTML({
          title: 'Risk Heat Map',
          rows: ['Ops','Sales','CX','IT','People'],
          cols: ['Q1','Q2','Q3','Q4','Q5'],
          data: Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1))
        });
      case 'benchmark':
        return benchmarkHTML({
          title: "Delivery Penetration vs Market",
          current: Number(canon?.metrics?.deliveryShare ?? 28),
          benchmark: Number(canon?.metrics?.marketDelivery ?? 34),
          yTitle: 'Percent'
        });
      default:
        return lineChartHTML({
          title: 'Projected Savings Over Time',
          labels, series,
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'Savings'
        });
    }
  };

  const kindFromText = (t) => {
    const text = t.toLowerCase();
    if (/\bheat\s*map\b/.test(text)) return 'heat';
    if (/\bimplementation.*expenditure|\bspend\b/.test(text)) return 'bar';
    if (/\bdelivery\b.*\bmarket share|\bmarket\b.*\bdelivery/.test(text)) return 'benchmark';
    if (/\brecommended\s+benchmark\s+visualization\b/.test(text)) return 'benchmark';
    if (/\binteractive\s+element\b|\bvisual\s+element\b|\bplaceholder\b|\bai\s+generated\b/.test(text)) return 'line';
    if (/\broi\b|\bpayback\b/.test(text)) return 'line';
    if (/\bprojected\s+savings|\bover\s+time\b/.test(text)) return 'line';
    return 'line';
  };

  const replaced = blocks.map((raw) => {
    const p = raw.replace(/\s+/g, ' ').trim();
    const isPlaceholder =
      /^notes\s+on\s+the\s+chart\s+below/i.test(p) ||
      /^the\s+following\s+chart\s+is\s+presented/i.test(p) ||
      /\bchart\s+below\b/i.test(p) ||
      /\bthe\s+following\s+chart\b/i.test(p) ||
      /\brecommended\s+(?:benchmark|visualization)\b/i.test(p) ||
      /\binteractive\s+element\b/i.test(p) ||
      /\bvisual\s+element\b/i.test(p) ||
      /\bplaceholder\b/i.test(p) ||
      /\bai\s+generated\b/i.test(p);
    if (isPlaceholder) {
      injected = true;
      return make(kindFromText(p));
    }
    return wrapIfPlain(raw);
  }).join('\n');

  return { html: replaced, injected };
}

export default function buildReformReportHTML(opts) {
  const { canon, sections={}, phases=[], implKit } = (opts||{});

  const logo = normalizeLogoPath(canon?.logoUrl || 'public\\images\\secure.png');
  const labels = labelsForPeriod(canon?.timeFrame || '2 years');

  // Render explicit blocks → wrap → convert tables → smart inject
  const prep = (s) => {
    const preRendered = renderDataBlocks(String(s||''), labels);
    const html = unifyTables(splitParas(preRendered).map(wrapIfPlain).join('\n'));
    const { html: withWidgets, injected } = injectSmartWidgets(html, { labels, canon });
    return { html: withWidgets, injected };
  };

  const SEC = {
    exec: prep(sections.exec),
    current: prep(sections.current),
    financials: prep(sections.financials),
    kpis: prep(sections.kpis),
    ops: prep(sections.ops),
    risk: prep(sections.risk),
    roi: prep(sections.roi),
  };

  const ensureOne = (already, fallbackHTML) => already ? '' : fallbackHTML;

  const execFallback = lineChartHTML({
    title: 'Projected Savings Over Time',
    labels,
    series: mkDefaultSeries(labels.length, canon?.costSavingsGoal||100),
    xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
    yTitle: 'Savings'
  });

  const currentFallback = benchmarkHTML({
    title:"Delivery Penetration vs Market",
    current:Number(canon?.metrics?.deliveryShare ?? 28),
    benchmark:Number(canon?.metrics?.marketDelivery ?? 34),
    yTitle: 'Percent'
  });

  const finSpend = barChartHTML({
    title:'Implementation Expenditures',
    labels,
    series: mkDefaultSeries(labels.length, (canon?.costSavingsGoal||100)*0.35),
    xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
    yTitle:'Spend'
  });

  const finPayback = lineChartHTML({
    title:'Cumulative Payback',
    labels,
    series: mkDefaultSeries(labels.length, (canon?.costSavingsGoal||100)),
    xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
    yTitle:'Cumulative'
  });

  const kpiDash = `
    <section class="kpi-dash">
      <div class="kpi-grid">
        ${barChartHTML({ title:'Savings (Bar)', labels, series: mkDefaultSeries(labels.length, canon?.costSavingsGoal||100), xTitle: labels[0].startsWith('Y')?'Years':'Months', yTitle:'Savings' })}
        ${lineChartHTML({ title:'Payback Over Horizon', labels, series: mkDefaultSeries(labels.length, canon?.costSavingsGoal||100), xTitle: labels[0].startsWith('Y')?'Years':'Months', yTitle:'Cumulative' })}
        ${benchmarkHTML({ title:"Order On-time %", current:Number(canon?.metrics?.onTime ?? 87), benchmark:92, yTitle:'Percent' })}
        ${benchmarkHTML({ title:"NPS", current:Number(canon?.metrics?.nps ?? 46), benchmark:55, yTitle:'Score' })}
      </div>
    </section>`;

  const riskHeat = heatmapHTML({
    title:'Risk Heat Map',
    rows:['Ops','Sales','CX','IT','People'],
    cols:['Q1','Q2','Q3','Q4','Q5'],
    data:Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1))
  });

  const roiMini = lineChartHTML({
    title:'ROI Trend (AI)',
    labels,
    series: mkDefaultSeries(labels.length, 100),
    xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
    yTitle:'ROI Index'
  });

  // NEW: Implementation Plan using the new renderer
  const roadmap = planDiagramHTML(phases || [], 'Implementation Plan');

  const tocItems = [
    'Executive Summary','Current State','Financials','KPIs & Targets',
    'Implementation Plan','Operating Model','Risks & Mitigations','ROI & Next Steps'
  ].map((t)=>`<li>${t}</li>`).join('');

  let html = `
  <article class="report">
    <section class="title-page">
      <div class="title-head">
        <img class="brand"
             src="${logo}"
             alt="Sovereign Intelligence"
             width="200" height="200"
             onerror="this.onerror=null;(this.src='/images/secure.png')" />
        <h1>${esc(canon?.orgName || 'Client')} — Reform Strategy Report</h1>
        <div class="meta">
          <span><strong>Prepared for:</strong> ${esc(canon?.preparedFor || '')}</span>
          <span><strong>Prepared by:</strong> ${esc(canon?.preparedBy || '')}</span>
          <span><strong>Time frame:</strong> ${esc(canon?.timeFrame || '—')}</span>
          <span><strong>Date:</strong> ${esc(canon?.reportDate || '')}</span>
        </div>
      </div>
    </section>

    <section class="toc">
      <h2>Contents</h2>
      <ol class="toc-list">${tocItems}</ol>
    </section>

    <section>
      <h2>Executive Summary</h2>
      ${ensureOne(SEC.exec.injected, execFallback)}
      ${SEC.exec.html}
    </section>

    <section>
      <h2>Current State</h2>
      ${ensureOne(SEC.current.injected, currentFallback)}
      ${SEC.current.html}
    </section>

    <section>
      <h2>Financials</h2>
      ${ensureOne(SEC.financials.injected, finSpend + finPayback)}
      ${SEC.financials.html}
    </section>

    <section>
      <h2>KPIs & Targets</h2>
      ${ensureOne(SEC.kpis.injected, kpiDash)}
      ${SEC.kpis.html}
    </section>

    ${roadmap}

    <section>
      <h2>Operating Model</h2>
      ${ensureOne(SEC.ops.injected, lineChartHTML({ title:'Ops Throughput Trend', labels, series: mkDefaultSeries(labels.length, 100), xTitle: labels[0].startsWith('Y')?'Years':'Months', yTitle:'Index' }))}
      ${SEC.ops.html}
    </section>

    <section>
      <h2>Risks & Mitigations</h2>
      ${ensureOne(SEC.risk.injected, riskHeat)}
      ${SEC.risk.html}
    </section>

    <section>
      <h2>ROI & Next Steps</h2>
      ${ensureOne(SEC.roi.injected, roiMini)}
      ${SEC.roi.html}
    </section>
  </article>

  <style>
    .report{ padding-left:0.5in; padding-right:0.5in; }
    .report p, .report li, .report td, .report th { font-weight: 400; }
    .report strong, .report b { font-weight: 600; }

    .report{ color-scheme:light; background:#fff; color:#111; max-width:816px; margin:0 auto; padding-top:12px; padding-bottom:48px; }
    .report section{ margin:1rem 0 1.1rem; }

    .title-page{ background:#0E2A44; color:#E6F0FF; border-radius:18px; padding:20px 20px 24px; }
    .title-head h1{ margin:.5rem 0 1rem; font-size:2rem; }
    .title-head .brand{ height:200px; width:200px; object-fit:contain; display:block; }
    .title-head .meta{ display:flex; flex-wrap:wrap; gap:12px 18px; font-size:.95rem; opacity:.95; }
    .toc .toc-list{ padding-left:1.25rem; }
    .toc .toc-list li{ margin:.3rem 0; }

    ${GRAPH_CSS}
    ${IMPLKIT_CSS}

    /* Removed old light zebra table styles.
       All tables now use class="table" (Appendix dark style) via unifyTables(). */

    .kpi-grid{ display:grid; grid-template-columns:1fr; gap:10px; }
    @media (min-width: 900px){ .kpi-grid{ grid-template-columns:1fr 1fr; } }
  </style>

  <script>
  // CSV export buttons for every appendix-style table (class="table")
  (function csvExport(){
    document.querySelectorAll('section.appendix .table').forEach((tbl, idx) => {
      const btn=document.createElement('button');
      btn.textContent='Download CSV';
      btn.style.cssText='margin:6px 0; padding:6px 10px; border-radius:6px; background:#0E2A44; color:#fff; border:1px solid rgba(255,255,255,.15)';
      tbl.parentNode.insertBefore(btn, tbl);
      btn.addEventListener('click', () => {
        const csv=[...tbl.querySelectorAll('tr')].map(tr =>
          [...tr.children].map(td => '"'+td.innerText.replace(/"/g,'""')+'"').join(',')
        ).join('\\n');
        const a=document.createElement('a');
        a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
        a.download=(tbl.closest('section.appendix')?.querySelector('h3')?.textContent||'table')+'-'+(idx+1)+'.csv';
        a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
      });
    });
  })();
  </script>
  `;

  // Append Implementation Kit appendices if provided
  if (implKit) {
    html += [
      implKit.charters?.length ? chartersHTML(implKit.charters) : '',
      implKit.raci ? raciHTML(implKit.raci) : '',
      implKit.raid ? raidHTML(implKit.raid) : '',
      implKit.benefits ? benefitsHTML(implKit.benefits) : '',
      implKit.plan100 ? plan100HTML(implKit.plan100) : '',
      implKit.pilot ? pilotHTML(implKit.pilot) : '',
      implKit.assumptions ? assumptionsHTML(implKit.assumptions) : '',
      implKit.methods ? methodsSourcesHTML(implKit.methods) : ''
    ].join('');
  }
  return html;
}
