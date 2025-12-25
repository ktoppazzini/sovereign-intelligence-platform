/* ============================================================================
   SOVEREIGN INTELLIGENCE – REPORT TEMPLATE (structured v2)
   Purpose: build a fully composed HTML report with numbered sections,
            one table and one visual per section (where required),
            and executive notes under visuals.
   Notes:
   - Visuals are rendered via reportGraphs helpers and tagged with data-*
   - Deterministic (non-AI) notes are injected if a note is missing
   - Extra tables/visuals are commented out to avoid duplication
   - KPI "dashboard" counts as one visual block
   ============================================================================ */

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

import { planDiagramHTML } from './implPlan.js';

/* ---------- utils ---------- */
const esc = (s='') => String(s);
const splitParas = (html='') => {
  const text = String(html)
    .replace(/<\s*br\s*\/?>(?!\s*<)/gi, '\n')
    .replace(/<\/p>/gi, '</p>\n');
  return text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
};
const wrapIfPlain = p => /<\/?[a-z]/i.test(p) ? p : `<p>${esc(p)}</p>`;
const normalizeLogoPath = (raw) => {
  let s = (raw || '').trim().replace(/\\/g, '/');
  if (!s) return '/images/secure.png';
  if (s.startsWith('/')) return s;
  if (/^public\/images\//i.test(s)) return '/' + s.replace(/^public\//,'');
  if (/^images\//i.test(s)) return '/' + s;
  return '/images/' + s.split('/').pop();
};
const labelsForPeriod = (timeFrame='') => {
  const s = (timeFrame||'').toLowerCase();
  let months = 24;
  const num = Number((s.match(/([\d.]+)/)||[])[1]||0);
  if (s.includes('month')) months = Math.max(1, Math.round(num||12));
  if (s.includes('year'))  months = Math.max(1, Math.round((num||2)*12));
  if (months <= 12) return Array.from({length:months}, (_,i)=>`M${i+1}`);
  const years = Math.ceil(months/12);
  return Array.from({length:years}, (_,i)=>`Y${i+1}`);
};
const mkSeries = (len, total=100) =>
  Array.from({length:len}, (_,i)=>Math.round((i+1)*total/len));

/* ---------- attribute-safe JSON ---------- */
function toAttrJSON(obj){ try { return JSON.stringify(obj).replace(/"/g,'&quot;'); } catch { return '{}'; } }
function parseAttrJSON(s=''){ try { return JSON.parse(String(s).replace(/&quot;/g,'"').replace(/&amp;/g,'&')); } catch { return null; } }

/* ---------- render data-* blocks (keeps spec, renders canvas/svg) ---------- */
function renderDataBlocks(html='', labels) {
  html = String(html||'');

  // Charts
  html = html.replace(/<figure[^>]*data-chart=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/figure>/gi,
    (_m, specRaw, origin) => {
      const spec = parseAttrJSON(specRaw) || {};
      const type   = (spec.type || 'line').toLowerCase();
      const title  = spec.title || 'Chart';
      const ds     = Array.isArray(spec.datasets) && spec.datasets[0] ? spec.datasets[0] : { data: [] };
      const series = Array.isArray(ds.data) && ds.data.length ? ds.data : mkSeries(labels.length, 100);
      const xTitle = spec.xTitle || (labels[0]?.startsWith('Y') ? 'Years' : 'Months');
      const yTitle = spec.yTitle || 'Value';

      let fig;
      if (type === 'bar')      fig = barChartHTML({ title, labels, series, xTitle, yTitle });
      else if (type === 'line')fig = lineChartHTML({ title, labels, series, xTitle, yTitle });
      else                     fig = lineChartHTML({ title, labels, series, xTitle, yTitle });

      return fig.replace(
        /<figure\b([^>]*)>/i,
        (m, rest) => `<figure${rest} data-chart='${specRaw}' data-origin="${origin||'predictive'}">`
      );
    });

  // Benchmark widgets
  html = html.replace(/<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/figure>/gi,
    (_m, specRaw, origin) => {
      const spec = parseAttrJSON(specRaw) || {};
      const fig = benchmarkHTML({
        title: spec.title || 'Benchmark',
        current: Number(spec.current || 0),
        benchmark: Number(spec.benchmark || 0),
        yTitle: spec.yTitle || 'Percent'
      });
      return fig.replace(
        /<figure\b([^>]*)>/i,
        (m, rest) => `<figure${rest} data-widget="benchmark" data-spec='${specRaw}' data-origin="${origin||'predictive'}">`
      );
    });

  // Heatmaps
  html = html.replace(/<div[^>]*data-heatmap=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/div>/gi,
    (_m, specRaw, origin) => {
      const spec = parseAttrJSON(specRaw) || {};
      const inner = heatmapHTML({
        title: spec.title || 'Risk Heat Map',
        rows: Array.isArray(spec.rows) ? spec.rows : ['R1','R2','R3','R4','R5'],
        cols: Array.isArray(spec.cols) ? spec.cols : ['C1','C2','C3','C4','C5'],
        data: Array.isArray(spec.data) ? spec.data
             : Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1))
      });
      return `<div data-heatmap='${specRaw}' ${origin?`data-origin="${origin}"`:''}>${inner}</div>`;
    });

  return html;
}

/* ---------- deterministic chart-note injection (below each visual) ---------- */
function parseVizMeta(frag=''){
  const out = { kind:'', title:'', xTitle:'', yTitle:'' };
  if (!frag) return out;

  let m = frag.match(/<figure[^>]*data-chart=['"]([\s\S]*?)['"]/i);
  if (m){
    const j = parseAttrJSON(m[1]) || {};
    return { kind:'chart', title:String(j.title||'Chart'), xTitle:String(j.xTitle||'X-axis'), yTitle:String(j.yTitle||'Y-axis') };
  }
  m = frag.match(/<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([\s\S]*?)['"]/i);
  if (m){
    const j = parseAttrJSON(m[1]) || {};
    return { kind:'benchmark', title:String(j.title||'Benchmark'), xTitle:'Measure', yTitle:String(j.yTitle||'Percent') };
  }
  m = frag.match(/<div[^>]*data-heatmap=['"]([\s\S]*?)['"]/i);
  if (m){
    return { kind:'heatmap', title:'Risk Heat Map', xTitle:'Columns', yTitle:'Rows' };
  }
  return out;
}
const makeNote = (meta) => {
  const t = meta?.title || 'This visual';
  const x = meta?.xTitle || (meta?.kind==='heatmap' ? 'Columns' : 'X-axis');
  const y = meta?.yTitle || (meta?.kind==='heatmap' ? 'Rows'    : 'Y-axis');
  return `<p class="chart-note">${t} measures outcomes with ${x} on the horizontal axis and ${y} on the vertical axis. Use the trend or hotspots to prioritize next-quarter decisions and mitigate risk.</p>`;
};
function injectChartNotes(html=''){
  const src = String(html||'');
  const re  = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;

  let out = '', cursor = 0, m;
  while((m = re.exec(src))!==null){
    const start = m.index, end = re.lastIndex, frag = m[0];
    out += src.slice(cursor, start) + frag;

    const tail = src.slice(end, end + 600).replace(/^\s+/, '');
    const hasNote = /^(?:<!\-\-.*?\-\->\s*)*<p\b[^>]*class=["']chart-note["'][^>]*>[\s\S]*?<\/p>/i.test(tail);
    if (!hasNote){
      out += '\n' + makeNote(parseVizMeta(frag)) + '\n';
    }
    cursor = end;
  }
  out += src.slice(cursor);
  return out;
}

/* ---------- keep exactly one table & one visual per section (when required) ---------- */
function keepOneTable(sectionHtml){
  let s = String(sectionHtml||'');
  const tableRe = /<table\b[\s\S]*?<\/table>/gi;
  let count = 0;
  s = s.replace(tableRe, (match) => {
    count += 1;
    return count === 1 ? match : `<!-- [dedup:table removed] ${match.replace(/--/g,'–')} -->`;
  });
  return s;
}
function keepOneVisual(sectionHtml){
  let s = String(sectionHtml||'');
  const vizRe = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;
  let count = 0;
  s = s.replace(vizRe, (match) => {
    count += 1;
    return count === 1 ? match : `<!-- [dedup:visual removed] ${match.replace(/--/g,'–')} -->`;
  });
  return s;
}

/* ---------- “smart widget” placeholders (AI text may include hints) ---------- */
function injectSmartWidgets(html, { labels, canon }) {
  if (!html) return { html: '', injected: false };

  const blocks = splitParas(html);
  let injected = false;

  const make = (kind) => {
    switch (kind) {
      case 'exec-savings':
        return lineChartHTML({
          title: labels[0].startsWith('Y') ? 'Projected Savings Over Years' : 'Projected Savings Over Months',
          labels, series: mkSeries(labels.length, canon?.costSavingsGoal || 100),
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'Savings'
        });
      case 'current-benchmark':
        return benchmarkHTML({
          title: "Delivery Penetration vs Market",
          current: Number(canon?.metrics?.deliveryShare ?? 28),
          benchmark: Number(canon?.metrics?.marketDelivery ?? 34),
          yTitle: 'Percent'
        });
      case 'financials-payback-combo': {
        // one combined (two-series) line: expenditures vs payback
        const spend = mkSeries(labels.length, (canon?.costSavingsGoal||100)*0.35);
        const paybk = mkSeries(labels.length, (canon?.costSavingsGoal||100));
        return lineChartHTML({
          title: 'Expenditures and Cumulative Payback',
          labels,
          series: paybk, // canvas renders one series; we encode “two-series” meaning via title/notes
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'CAD'
        });
      }
      case 'ops-trend':
        return lineChartHTML({
          title: 'Ops Throughput Trend',
          labels, series: mkSeries(labels.length, 100),
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'Index'
        });
      case 'risk-heat':
        return heatmapHTML({
          title: 'Risk Heat Map',
          rows: ['Ops','Sales','CX','IT','People'],
          cols: ['Q1','Q2','Q3','Q4','Q5'],
          data: Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1))
        });
      case 'roi-trend':
        return lineChartHTML({
          title: 'ROI Trend',
          labels, series: mkSeries(labels.length, 100),
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'ROI Index'
        });
      default:
        return '';
    }
  };

  const replaced = blocks.map((raw) => {
    const p = raw.replace(/\s+/g, ' ').trim().toLowerCase();
    const needsExec     = /\bexec(?:utive)?\s+summary\b.*\bsavings\b/.test(p);
    const needsCurrent  = /\bcurrent\s+state\b.*\bbenchmark\b/.test(p);
    const needsFin      = /\bfinancials?\b.*\bpayback\b/.test(p);
    const needsOps      = /\boperating\s+model\b.*\btrend\b/.test(p);
    const needsRisk     = /\brisks?\b.*\bheat\s*map\b/.test(p);
    const needsRoi      = /\broi\b.*\btrend\b/.test(p);

    if (needsExec)     { injected = true; return make('exec-savings'); }
    if (needsCurrent)  { injected = true; return make('current-benchmark'); }
    if (needsFin)      { injected = true; return make('financials-payback-combo'); }
    if (needsOps)      { injected = true; return make('ops-trend'); }
    if (needsRisk)     { injected = true; return make('risk-heat'); }
    if (needsRoi)      { injected = true; return make('roi-trend'); }
    return wrapIfPlain(raw);
  }).join('\n');

  return { html: replaced, injected };
}

/* ---------- per-section composer ---------- */
function prepareSection(raw, { labels, canon }) {
  // 1) render any explicit data-* blocks that model may have emitted
  let html = renderDataBlocks(String(raw||''), labels);

  // 2) normalize paragraphs
  html = splitParas(html).map(wrapIfPlain).join('\n');

  // 3) “smart widget” fills if hints found in text
  const sw = injectSmartWidgets(html, { labels, canon });
  html = sw.html;

  // 4) notes under visuals
  html = injectChartNotes(html);

  return { html, injected: sw.injected };
}

/* ---------- template entry ---------- */
export default function buildReformReportHTML(opts) {
  const { canon, sections={}, phases=[], implKit } = (opts||{});

  const logo   = normalizeLogoPath(canon?.logoUrl || '/images/secure.png');
  const labels = labelsForPeriod(canon?.timeFrame || '2 years');

  // pre-compose each section
  const S = {
    exec:       prepareSection(sections.exec,       { labels, canon }),
    current:    prepareSection(sections.current,    { labels, canon }),
    financials: prepareSection(sections.financials, { labels, canon }),
    kpis:       prepareSection(sections.kpis,       { labels, canon }),
    ops:        prepareSection(sections.ops,        { labels, canon }),
    risk:       prepareSection(sections.risk,       { labels, canon }),
    roi:        prepareSection(sections.roi,        { labels, canon }),
  };

  /* === Guaranteed visuals (fallbacks) === */
  const fallback = {
    exec: lineChartHTML({
      title: labels[0].startsWith('Y') ? 'Projected Savings Over Years' : 'Projected Savings Over Months',
      labels, series: mkSeries(labels.length, canon?.costSavingsGoal || 100),
      xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
      yTitle: 'Savings'
    }),
    current: benchmarkHTML({
      title:"Delivery Penetration vs Market",
      current:Number(canon?.metrics?.deliveryShare ?? 28),
      benchmark:Number(canon?.metrics?.marketDelivery ?? 34),
      yTitle: 'Percent'
    }),
    financials: lineChartHTML({
      title:'Expenditures and Cumulative Payback',
      labels, series: mkSeries(labels.length, (canon?.costSavingsGoal||100)),
      xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
      yTitle:'CAD'
    }),
    kpis: `
      <section class="kpi-dash" data-widget="dashboard">
        <div class="kpi-grid">
          ${barChartHTML({ title:'Savings (Bar)', labels, series: mkSeries(labels.length, canon?.costSavingsGoal||100), xTitle: labels[0].startsWith('Y')?'Years':'Months', yTitle:'Savings' })}
          ${lineChartHTML({ title:'Payback Over Horizon', labels, series: mkSeries(labels.length, canon?.costSavingsGoal||100), xTitle: labels[0].startsWith('Y')?'Years':'Months', yTitle:'Cumulative' })}
          ${benchmarkHTML({ title:"Order On-time %", current:Number(canon?.metrics?.onTime ?? 87), benchmark:92, yTitle:'Percent' })}
          ${benchmarkHTML({ title:"NPS", current:Number(canon?.metrics?.nps ?? 46), benchmark:55, yTitle:'Score' })}
        </div>
      </section>`,
    ops: lineChartHTML({
      title:'Ops Throughput Trend',
      labels, series: mkSeries(labels.length, 100),
      xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
      yTitle:'Index'
    }),
    risk: heatmapHTML({
      title:'Risk Heat Map',
      rows:['Ops','Sales','CX','IT','People'],
      cols:['Q1','Q2','Q3','Q4','Q5'],
      data:Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1))
    }),
    roi: lineChartHTML({
      title:'ROI Trend',
      labels, series: mkSeries(labels.length, 100),
      xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
      yTitle:'ROI Index'
    })
  };

  // ensure each required section has at least one visual
  const ensureVisual = (alreadyInjected, fb) => alreadyInjected ? '' : fb;

  /* === Implementation Plan (roadmap) === */
  const roadmap = planDiagramHTML(phases || [], 'Implementation Plan');

  /* === Compose sections with numbering === */
  const numbered = (n, txt) => `${n}. ${txt}`;

  function sectionBlock(num, id, title, bodyHTML, fallbackVisual, keepOneTableAlso=true, keepOneVisualAlso=true) {
    // add fallback visual (if section body had none)
    let content = (fallbackVisual || '') + String(bodyHTML||'');

    // keep one table & one visual (KPI dashboard exempt from visual dedup inside dashboard)
    if (keepOneTableAlso)  content = keepOneTable(content);
    if (keepOneVisualAlso) content = keepOneVisual(content);

    // inject notes after dedup (in case fallback added)
    content = injectChartNotes(content);

    return `
      <section id="${id}">
        <h2>${numbered(num, title)}</h2>
        ${content}
      </section>`;
  }

  const html =
`<article class="report">
  <section class="title-page">
    <div class="title-head">
      <img class="brand"
           src="${normalizeLogoPath(canon?.logoUrl || '/images/secure.png')}"
           alt="Brand" width="200" height="200"
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
    <ol class="toc-list">
      <li>Executive Summary</li>
      <li>Current State</li>
      <li>Financials</li>
      <li>KPIs & Targets</li>
      <li>Implementation Plan</li>
      <li>Operating Model</li>
      <li>Risks & Mitigations</li>
      <li>ROI & Next Steps</li>
      <li>Conclusion</li>
      <li>Appendix</li>
    </ol>
  </section>

  ${sectionBlock(1, 'executive-summary',
      'Executive Summary',
      S.exec.html,
      ensureVisual(S.exec.injected, fallback.exec))}

  ${sectionBlock(2, 'current-state',
      'Current State',
      S.current.html,
      ensureVisual(S.current.injected, fallback.current))}

  ${sectionBlock(3, 'financials',
      'Financials',
      S.financials.html,
      ensureVisual(S.financials.injected, fallback.financials))}

  ${sectionBlock(4, 'kpis-targets',
      'KPIs & Targets',
      S.kpis.html + fallback.kpis, // dashboard included; treat as one block
      '', true, false)}

  <section id="implementation-plan">
    <h2>${numbered(5, 'Implementation Plan')}</h2>
    ${roadmap}
  </section>

  ${sectionBlock(6, 'operating-model',
      'Operating Model',
      S.ops.html,
      ensureVisual(S.ops.injected, fallback.ops))}

  ${sectionBlock(7, 'risks-mitigations',
      'Risks & Mitigations',
      S.risk.html,
      ensureVisual(S.risk.injected, fallback.risk))}

  ${sectionBlock(8, 'roi-next-steps',
      'ROI & Next Steps',
      S.roi.html,
      ensureVisual(S.roi.injected, fallback.roi))}

  <section id="conclusion">
    <h2>${numbered(9, 'Conclusion')}</h2>
    ${wrapIfPlain('This section is generated upstream (route.js) and appended here.')}
  </section>

  <section id="appendix">
    <h2>${numbered(10, 'Appendix')}</h2>
    ${wrapIfPlain('Appendix content is appended from upstream (route.js) as tables/diagnostics.')}
  </section>
</article>

<style>
  .report{ box-sizing:border-box; max-width:760px; margin:0 auto; padding:0.55in 0.45in 0.6in; overflow-x:hidden; background:#fff; color:#111; }
  .report section{ margin:1rem 0 1.1rem; }
  .report img, .report svg{ max-width:100%; height:auto; }

  .title-page{ background:#0E2A44; color:#E6F0FF; border-radius:18px; padding:20px 20px 24px; }
  .title-head h1{ margin:.5rem 0 1rem; font-size:2rem; }
  .title-head .brand{ height:200px; width:200px; object-fit:contain; display:block; }
  .title-head .meta{ display:flex; flex-wrap:wrap; gap:12px 18px; font-size:.95rem; opacity:.95; }

  .toc .toc-list{ padding-left:1.25rem; }
  .toc .toc-list li{ margin:.3rem 0; }

  ${GRAPH_CSS}
  ${IMPLKIT_CSS}

  /* KPI dashboard grid */
  .kpi-grid{ display:grid; grid-template-columns:1fr; gap:10px; }
  @media (min-width: 900px){ .kpi-grid{ grid-template-columns:1fr 1fr; } }

  /* Table theme */
  table{ width:100%; border-collapse:collapse; background:linear-gradient(180deg,#0B2036,#08192B); color:#E6F0FF; }
  table th, table td{ border:1px solid rgba(230,240,255,.15); padding:8px 10px; vertical-align:top; font-size:0.95rem; }
  table th{ background:#0E2A44; color:#E6F0FF; font-weight:700; text-align:left; }
  table tbody tr:nth-child(even) td{ background:rgba(255,255,255,.02); }

  /* Notes under visuals */
  .chart-note{ margin:.5rem 0 1rem; font-size:.95rem; color:#21364a; }
  @media (prefers-color-scheme: dark){
    .chart-note{ color:#dbeafe; }
  }

  @media print {
    @page { size: Letter portrait; margin: 0.75in; }
    .report{ max-width: 100%; padding:0; }
    .report section{ break-inside: avoid; page-break-inside: avoid; }
  }
</style>

<script>
  // Optional CSV export for appendix tables
  (function csvExport(){
    document.querySelectorAll('#appendix table').forEach((tbl, idx) => {
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
        a.download=('appendix-table-'+(idx+1)+'.csv');
        a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
      });
    });
  })();
</script>

<!-- width guard -->
<style>.report{max-width:100% !important; width:100% !important}</style>
`;

  return html;
}
