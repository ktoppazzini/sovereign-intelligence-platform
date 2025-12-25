// lib/reportTemplate.js
// Baseline: your last version I sent (5:49 pm) with surgical fixes that don't rely on JS execution.
// - Logo: robust path + onerror fallback; renders exactly 200x200
// - Guaranteed SSR charts (axes, tick values, legends) — no blank canvases if scripts don't run
// - KPI dashboard: 4 widgets (bar, line, and 2 benchmarks) in stacked/2x2 layout
// - Implementation roadmap overlays (phase name + short caption)
// - Heat map with gradient legend
// - 0.5-inch left/right margins
// - Bold-cascade guard
//
// NOTE: Graph interactivity (switching chart type) is done with pure CSS :has(), so it works
// even if your app injects HTML with scripts stripped. (Chromium/Edge supports :has().)

import {
  lineChartHTML,
  barChartHTML,
  heatmapHTML,
  benchmarkHTML,
  GRAPH_CSS
} from './reportGraphs.js';

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
function zebraWrapTables(html='') {
  return String(html).replace(/<table(\s|>)/gi, '<table class="zebra tight"$1');
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
          labels,
          series,
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
          benchmark: Number(canon?.metrics?.marketDelivery ?? 34)
        });
      default:
        return lineChartHTML({
          title: 'Projected Savings Over Time',
          labels,
          series,
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
      /\bthe\s+following\s+chart\b/i.test(p);
    if (isPlaceholder) {
      injected = true;
      return make(kindFromText(p));
    }
    return wrapIfPlain(raw);
  }).join('\n');

  return { html: replaced, injected };
}

// Implementation roadmap overlays (no JS)
function roadmapHTML(phases=[]) {
  const imgSrc = '/public/images/implementation-roadmap.png';
  const anchors = [
    { left:'12%', top:'12%' },
    { left:'32%', top:'12%' },
    { left:'52%', top:'12%' },
    { left:'72%', top:'12%' },
    { left:'88%', top:'12%' },
  ];
  const heads = (phases||[]).slice(0,5);
  while (heads.length < 5) heads.push({
    title:`Phase ${heads.length+1}`, caption:'Short description'
  });

  const overlays = heads.map((p, i) => `
    <div class="road-slot" style="left:${anchors[i].left}; top:${anchors[i].top}">
      <div class="road-phase">${esc(p.title||`Phase ${i+1}`)}</div>
      <div class="road-cap">${esc(p.caption||'Short phase description')}</div>
    </div>`).join('');

  return `
  <section>
    <h2>Implementation Timeline</h2>
    <div class="road-wrap">
      <img class="road-img"
           src="${imgSrc}"
           alt="Implementation roadmap"
           onerror="this.onerror=null;(this.src='/images/implementation-roadmap.png')" />
      ${overlays}
    </div>
  </section>`;
}

export default function buildReformReportHTML(opts) {
  const { canon, sections={}, phases=[] } = (opts||{});

  const logo = normalizeLogoPath(canon?.logoUrl || 'public\\images\\secure.png');
  const labels = labelsForPeriod(canon?.timeFrame || '2 years');

  const prep = (s) => {
    const html = zebraWrapTables(splitParas(s||'').map(wrapIfPlain).join('\n'));
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
    benchmark:Number(canon?.metrics?.marketDelivery ?? 34)
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
        ${benchmarkHTML({ title:"Order On-time %", current:Number(canon?.metrics?.onTime ?? 87), benchmark:92 })}
        ${benchmarkHTML({ title:"NPS", current:Number(canon?.metrics?.nps ?? 46), benchmark:55 })}
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

  const roadmap = roadmapHTML(phases || []);

  const tocItems = [
    'Executive Summary','Current State','Financials','KPIs & Targets',
    'Implementation Timeline','Operating Model','Risks & Mitigations','ROI & Next Steps'
  ].map((t,i)=>`<li>${i+1}. ${t}</li>`).join('');

  const html = `
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
    /* 0.5" margins left/right */
    .report{ padding-left:0.5in; padding-right:0.5in; }

    /* prevent bold from leaking after headings */
    .report p, .report li, .report td, .report th { font-weight: 400; }
    .report strong, .report b { font-weight: 600; }

    .report{ color-scheme:light; background:#fff; color:#111; max-width:816px; margin:0 auto; padding-top:12px; padding-bottom:48px; }
    .report section{ margin:1rem 0 1.1rem; }

    .title-page{ background:#0E2A44; color:#E6F0FF; border-radius:18px; padding:20px 20px 24px; }
    .title-head h1{ margin:.5rem 0 1rem; font-size:2rem; }
    .title-head .brand{ height:200px; width:200px; object-fit:contain; display:block; }  /* exact 200×200 */
    .title-head .meta{ display:flex; flex-wrap:wrap; gap:12px 18px; font-size:.95rem; opacity:.95; }
    .toc .toc-list{ padding-left:1.25rem; }
    .toc .toc-list li{ margin:.3rem 0; }

    ${GRAPH_CSS}

    table.zebra{ width:100%; border-collapse:collapse; margin:.75rem 0; font-size:.95rem; background:#fff; color:#111; }
    table.zebra th, table.zebra td{ padding:.55rem .7rem; border-bottom:1px solid #e6e9ef; }
    table.zebra th{ background:#eef2f9; font-weight:600; }
    table.zebra tr:nth-child(even){ background:#f7f9fc; }

    .road-wrap{ position:relative; }
    .road-img{ width:100%; display:block; border-radius:12px; }
    .road-slot{ position:absolute; transform:translateX(-50%); width:20%; text-align:center; }
    .road-phase{ font-weight:700; margin:.2rem 0; color:#0E2A44; text-shadow:0 1px 0 rgba(255,255,255,.9); }
    .road-cap{ font-size:.9rem; color:#1f2d3d; text-shadow:0 1px 0 rgba(255,255,255,.9); }

    .kpi-grid{ display:grid; grid-template-columns:1fr; gap:10px; }
    @media (min-width: 900px){ .kpi-grid{ grid-template-columns:1fr 1fr; } }
  </style>
  `;
  return html;
}








