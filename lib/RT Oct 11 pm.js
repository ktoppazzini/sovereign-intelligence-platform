
/* ============================================================================
   [LOCKED FILE — SOVEREIGN INTELLIGENCE]
   ENFORCEMENT HEADER – DO NOT REMOVE
   (ruleset for surgical-only operation, no deletions, etc.)
   ...
   [Existing enforcement header content here]
   ...
============================================================================ */

/* ---------------------------------------------------------------------------
   AGENT SPECIFICATION – SOVEREIGN INTELLIGENCE SURGICAL DEV-AGENT
   ---------------------------------------------------------------------------
   Type:      SOVEREIGN INTELLIGENCE SURGICAL DEV-AGENT
   Purpose:   Perform single-pass, add-only code edits in locked modules.
   Authority: May modify AI calls *only if explicitly instructed* (“unless I instruct otherwise”).
   Boundaries:
     - No deletions, refactors, or formatting.
     - Preserve comments, spacing, and layout.
     - Comment out legacy logic instead of removing it.
     - Wrap all changes in [KT:SURGICAL:<TAG>] markers.
     - Backup file before edit (timestamped, /_backups).
   Priority Order:
     1. Correctness
     2. Stability
     3. Speed
     4. Creativity (disabled unless instructed)
   Verification:
     - Line counts before/after
     - Proof logs for every injection
     - Audit confirms no syntax or TS errors
     - No scope bleed outside stated section
   Session Start Protocol:
     “Load Agent Profile and request Session Brief.”
   --------------------------------------------------------------------------- */
// /lib/reportTemplate.js
// Surgical: adjust viewport width to remove inner scrollbar; keep letter portrait for print.

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
    .replace(/<\s*br\s*\/?>(?!\s*<)/gi, '\n')
    .replace(/<\/p>/gi, '</p>\n');
  return text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
};
const wrapIfPlain = p => /<\/?[a-z]/i.test(p) ? p : `<p>${esc(p)}</p>`;

// Force Appendix class onto ALL tables in sections.
function unifyTables(html='') {
  return String(html).replace(/<table(\s|>)/gi, '<table class="table"$1');
}

/* [KT:SURGICAL:DEDUP-HELPERS] Helper to remove duplicate charts/heatmaps across the report */
function __kt_dedupeVisuals(html = '') {
  try {
    const src = String(html || '');
    const re = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;
    const seen = new Set(); let out = '', last = 0, m;
    const sig = (frag) => {
      try {
        const c = frag.match(/data-chart=['"]([\\s\\S]*?)['"]/i);
        if (c) {
          const o = JSON.parse(c[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
          return 'chart|' + String(o.title || '').toLowerCase() + '|' + String(o.type || '').toLowerCase();
        }
        const h = frag.match(/data-heatmap=['"]([\\s\\S]*?)['"]/i);
        if (h) {
          const o = JSON.parse(h[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
          return 'heatmap|' + String(o.title || '').toLowerCase();
        }
      } catch {}
      return '';
    };
    while ((m = re.exec(src)) !== null) {
      const start = m.index, end = re.lastIndex, frag = m[0];
      out += src.slice(last, start);
      const s = sig(frag);
      if (s && seen.has(s)) {
        // skip duplicate
      } else {
        if (s) seen.add(s);
        out += frag;
      }
      last = end;
    }
    out += src.slice(last);
    return out;
  } catch {
    return html;
  }
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

function _wrapFigureWithSpec(figHTML, attrs) {
  try {
    return String(figHTML||'').replace(/<figure\b([^>]*)>/i, function(m,rest){
      var add = '';
      if (attrs['data-chart'])   add += " data-chart='" + attrs['data-chart'] + "'";
      if (attrs['data-origin'])  add += " data-origin=\"" + attrs['data-origin'] + "\"";
      if (attrs['data-widget'])  add += " data-widget=\"" + attrs['data-widget'] + "\"";
      if (attrs['data-spec'])    add += " data-spec='" + attrs['data-spec'] + "'";
      return '<figure' + rest + add + '>';
    });
  } catch(e){ return figHTML; }
}
function safeParseAttrJSON(s='') {
  try { return JSON.parse(String(s).replace(/&quot;/g,'"').replace(/&amp;/g,'&')); }
  catch { return null; }
}

/* [KT:SURGICAL:STANDARD-DESC:A] — begin
   Adds attribute-safe JSON + tags standard <figure class="chart-card"> so generate/route can
   inject exec notes like predictive visuals. Also adds debug logging counts. */

/** HTML-attribute-safe JSON (quotes escaped as &quot;) */
function __kt_toAttrJSON(obj){
  try { return JSON.stringify(obj).replace(/"/g,'&quot;'); } catch { return '{}'; }
}

/**
 * Finds <figure class="chart-card" ...>…</figure> without data-* spec and
 * adds minimal data-chart so downstream description injector can attach a
 * <p class="chart-note">. Logs counts and a sample.
 */
function __kt_tagStandardCharts(html='', labels=[], canon={}){
  try{
    const src = String(html||'');
    const re  = /<figure\b([^>]*class=["'][^"']*chart-card[^"']*["'][^>]*)>([\s\S]*?)<\/figure>/gi;
    let out = '', last = 0, m;
    let scanned = 0, upgraded = 0;
    let sample = [];

    while((m = re.exec(src))!==null){
      scanned++;
      const start = m.index, end = re.lastIndex;
      const open  = m[1] || '';
      const inner = m[2] || '';

      // already tagged? pass-through
      if (/(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i.test(open)) {
        out += src.slice(last, end); last = end; continue;
      }

      // derive safe title and type
      const h3 = (inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)||[])[1] || '';
      const title = h3.replace(/<[^>]*>/g,'').trim() || 'Chart';
      const type  = ((open.match(/data-type=["']([^"']+)["']/i)||[])[1]||'line').toLowerCase();
      const xTitle = labels[0]?.startsWith('Y') ? 'Years' : 'Months';
      const yTitle = /percent|%/i.test(title) ? 'Percent'
                    : /payback/i.test(title) ? 'Cumulative'
                    : /savings|revenue|spend|capex|opex/i.test(title) ? 'Value'
                    : 'Index';

      const spec = {
        type, title, xTitle, yTitle,
        labels: Array.isArray(labels) ? labels : [],
        datasets: [{ label: title, data: (labels||[]).map((_,i)=>i+1) }]
      };

      const upgradedOpen =
        open + " data-chart='" + __kt_toAttrJSON(spec) + "' data-origin=\"standard\"";

      out += src.slice(last, start) + '<figure' + upgradedOpen + '>' + inner + '</figure>';
      last = end;
      upgraded++;
      if (sample.length < 3) sample.push(title);
    }
    out += src.slice(last);

    // [KT:SURGICAL:LOGS] precise, additive debug
    console.log('[SR:REFORM] std.charts.tagged', { scanned, upgraded, sample });

    return out;
  }catch(e){
    console.log('[SR:REFORM] std.charts.tag.error', String(e?.message||e));
    return html;
  }
}
// [KT:SURGICAL:STANDARD-DESC:A] — end


function toAttrJSON(obj){
  try { return JSON.stringify(obj).replace(/"/g,'&quot;'); } catch { return '{}'; }
}

function renderDataBlocks(html='', labels) {
  // Preserve raw data-* specs while rendering visual HTML
  html = html.replace(/<figure[^>]*data-chart=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/figure>/gi,
    function(_m, specRaw, origin){
      const spec = safeParseAttrJSON(specRaw) || {};
      const type  = (spec.type || 'line').toLowerCase();
      const title = spec.title || 'Chart';
      const ds    = Array.isArray(spec.datasets) && spec.datasets[0] ? spec.datasets[0] : { data: [] };
      const series = Array.isArray(ds.data) && ds.data.length ? ds.data : mkDefaultSeries(labels.length, 100);
      const xTitle = spec.xTitle || (labels[0]?.startsWith('Y') ? 'Years' : 'Months');
      const yTitle = spec.yTitle || 'Value';
      let fig;
      if (type === 'bar')  fig = barChartHTML({ title, labels, series, xTitle, yTitle });
      else if (type === 'pie') fig = lineChartHTML({ title, labels, series, xTitle, yTitle });
      else if (type === 'doughnut') fig = lineChartHTML({ title, labels, series, xTitle, yTitle });
      else fig = lineChartHTML({ title, labels, series, xTitle, yTitle });
      return _wrapFigureWithSpec(fig, { 'data-chart': specRaw, 'data-origin': origin||'predictive' });
    });

  html = html.replace(/<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/figure>/gi,
    function(_m, specRaw, origin){
      const spec = safeParseAttrJSON(specRaw) || {};
      const fig = benchmarkHTML({
        title: spec.title || 'Benchmark',
        current: Number(spec.current || 0),
        benchmark: Number(spec.benchmark || 0),
        yTitle: spec.yTitle || 'Percent'
      });
      return _wrapFigureWithSpec(fig, { 'data-widget': 'benchmark', 'data-spec': specRaw, 'data-origin': origin||'predictive' });
    });

  html = html.replace(/<div[^>]*data-heatmap=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/div>/gi,
    function(_m, specRaw, origin){
      const spec = safeParseAttrJSON(specRaw) || {};
      const inner = heatmapHTML({
        title: spec.title || 'Risk Heat Map',
        rows: Array.isArray(spec.rows) ? spec.rows : ['R1','R2','R3','R4','R5'],
        cols: Array.isArray(spec.cols) ? spec.cols : ['C1','C2','C3','C4','C5'],
        data: Array.isArray(spec.data) ? spec.data
             : Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1))
      });
      return "<div data-heatmap='"+specRaw+"' "+(origin?("data-origin=\""+origin+"\""):"")+">"+inner+"</div>";
    });

  return html;
}

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

  const prep = (s) => {
    const preRendered = renderDataBlocks(String(s||''), labels);
    const html = unifyTables(splitParas(preRendered).map(wrapIfPlain).join('\n'));
    const { html: withWidgets, injected } = injectSmartWidgets(html, { labels, canon });

    // [KT:SURGICAL:STANDARD-DESC:B] — tag standard charts then log counts
    let postHTML = withWidgets;
    try {
      postHTML = __kt_tagStandardCharts(postHTML, labels, canon);
      // log emitted inside __kt_tagStandardCharts
    } catch(e) {
      console.log('[SR:REFORM] std.charts.tag.error', String(e?.message||e));
    }

    // [KT:SURGICAL:WIDTH-GUARD] — moved to final assembly (see bottom)

    return { html: postHTML, injected };
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
    </section`

+ `>

    <section class="toc">
      <h2>Contents</h2>
      <ol class="toc-list">${tocItems}</ol>
    </section>

    <section>
      <h2 id="exec">Executive Summary</h2>
      ${ensureOne(SEC.exec.injected, execFallback)}
      ${SEC.exec.html}
    </section>

    <section>
      <h2 id="current">Current State</h2>
      ${ensureOne(SEC.current.injected, currentFallback)}
      ${SEC.current.html}
    </section>

    <section>
      <h2 id="financials">Financials</h2>
      ${ensureOne(SEC.financials.injected, finSpend + finPayback)}
      ${SEC.financials.html}
    </section>

    <section>
      <h2 id="kpis">KPIs & Targets</h2>
      ${ensureOne(SEC.kpis.injected, kpiDash)}
      ${SEC.kpis.html}
    </section>

    ${roadmap}

    <section>
      <h2 id="ops">Operating Model</h2>
      ${ensureOne(SEC.ops.injected, lineChartHTML({ title:'Ops Throughput Trend', labels, series: mkDefaultSeries(labels.length, 100), xTitle: labels[0].startsWith('Y')?'Years':'Months', yTitle:'Index' }))}
      ${SEC.ops.html}
    </section>

    <section>
      <h2 id="risk">Risks & Mitigations</h2>
      ${ensureOne(SEC.risk.injected, riskHeat)}
      ${SEC.risk.html}
    </section>

    <section>
      <h2 id="roi">ROI & Next Steps</h2>
      ${ensureOne(SEC.roi.injected, roiMini)}
      ${SEC.roi.html}
    </section>
  </article>

  <style>
    /* Viewport fit to remove inner horizontal scrollbar */
    .report{ box-sizing:border-box; max-width: 760px; margin:0 auto; padding: 0.55in 0.45in 0.6in; overflow-x:hidden;
             color-scheme:light; background:#fff; color:#111; }
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

    /* Global Appendix-style table theme */
    .table{ width:100%; border-collapse:collapse; background:linear-gradient(180deg,#0B2036,#08192B); color:#E6F0FF; }
    .table th, .table td{ border:1px solid rgba(230,240,255,.15); padding:8px 10px; vertical-align:top; font-size:0.95rem; }
    .table th{ background:#0E2A44; color:#E6F0FF; font-weight:700; text-align:left; }
    .table tbody tr:nth-child(even) td{ background:rgba(255,255,255,.02); }
    .table caption{ caption-side:top; text-align:left; color:#BFE1FF; font-weight:700; padding:6px 2px; }

    .kpi-grid{ display:grid; grid-template-columns:1fr; gap:10px; }
    @media (min-width: 900px){ .kpi-grid{ grid-template-columns:1fr 1fr; } }

    @media print {
      @page { size: Letter portrait; margin: 0.75in; }
      .report{ max-width: 100%; padding:0; }
      .report section{ break-inside: avoid; page-break-inside: avoid; }
    }
  </style>

  <script>
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

  // [KT:SURGICAL:STANDARD-DESC:B — ORIGINAL GLOBAL CALL COMMENTED]
  // The following global-scope call caused ReferenceError/duplication in some builds.
  // Keeping it for history, but disabled to avoid out-of-scope mutation.
  // postHTML = tagStandardVisualsWithDataAttrs(postHTML);

  // [KT:SURGICAL:WIDTH-GUARD:FINAL] — final override so report is full-width
  html += `\n<style>.report{max-width:100% !important;width:100% !important}</style>`;
  console.log('[SR:REFORM] width.guard.injected@final');

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

  /* [KT:SURGICAL:PORT-DARK] Add dark-theme overrides from Oct 27 */
  html += `\n<style>
  .report{ background:#0d0f13; color:#e8eefb; color-scheme:dark; }
  .report h1, .report h2, .report h3{ color:#e8eefb; }
  .report .table{ background:#0c1018; color:#e8eefb; border-color:#1f2937; }
  .report .table th{ background:#0f141d; color:#d9e6ff; }
  .report .table td{ border-color:#1f2937; }
  </style>`;

  /* [KT:SURGICAL:PORT-CHART] Add Chart.js hydrator to render charts dynamically */
  html += `\n<script id="chart-registry" type="application/json">{}</script>\n<script>\n(function(){\n  function parseSpec(fig){\n    try{\n      var raw = fig.getAttribute('data-chart') || '';\n      var json = raw.replace(/&quot;/g,'"').replace(/&amp;/g,'&');\n      return JSON.parse(json);\n    }catch(e){ console.warn('[report.hydrator] bad data-chart:', e); return null; }\n  }\n  function ensureCanvas(fig){\n    var c = fig.querySelector('canvas');\n    if(!c){ c = document.createElement('canvas'); fig.appendChild(c); }\n    return c.getContext('2d');\n  }\n  function renderAll(){\n    var figs = document.querySelectorAll('.report figure[data-chart]:not([data-hydrated])');\n    if(!figs.length){ console.warn('[report.hydrator] no-figures-found under .report'); return; }\n    figs.forEach(function(fig){\n      var spec = parseSpec(fig); if(!spec) return;\n      try{\n        var ctx = ensureCanvas(fig);\n        if(Array.isArray(spec.datasets) && spec.datasets.length){\n          var d = spec.datasets[0];\n          d.borderColor = d.borderColor || '#ff7a00';\n          d.backgroundColor = d.backgroundColor || 'rgba(255,122,0,0.15)';\n          if(typeof d.tension !== 'number') d.tension = 0.35;\n          if(typeof d.pointRadius !== 'number') d.pointRadius = 3;\n          if(typeof d.fill !== 'boolean') d.fill = true;\n        }\n        var cfg = {\n          type: (spec.type || 'line').toLowerCase(),\n          data: { labels: spec.labels || [], datasets: spec.datasets || [] },\n          options: Object.assign({\n            responsive:true, maintainAspectRatio:false,\n            plugins:{ legend:{ display:false }, title:{ display:false } },\n            scales:{\n              x:{ title:{ display: !!spec.xTitle, text: spec.xTitle || '' } },\n              y:{ title:{ display: !!spec.yTitle, text: spec.yTitle || '' } }\n            }\n          }, spec.options||{})\n        };\n        new Chart(ctx, cfg);\n        fig.setAttribute('data-hydrated','');\n      }catch(e){ console.warn('[report.hydrator] render failed:', e); }\n    });\n    console.log('[report.hydrator] charts.rendered', figs.length);\n  }\n  function start(){\n    if(window.Chart){ renderAll(); return; }\n    var s = document.createElement('script');\n    s.src = 'https://cdn.jsdelivr.net/npm/chart.js';\n    s.onload = renderAll;\n    s.onerror = function(){ console.warn('[report.hydrator] Chart.js load failed'); };\n    document.head.appendChild(s);\n  }\n  if(document.readyState === 'loading'){\n    document.addEventListener('DOMContentLoaded', start);\n  } else { start(); }\n})();\n</script>`;

  /* [KT:SURGICAL:DEDUP-AT-RETURN] Remove duplicate visuals at final assembly */
  try {
    html = __kt_dedupeVisuals(html);
  } catch (e) {
    console.log('[report] visuals.dedupe.error', String(e?.message || e));
  }
  return html;
}