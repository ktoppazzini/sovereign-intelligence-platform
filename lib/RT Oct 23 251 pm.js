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
// Surgical: add universal standard-chart tagging + deterministic notes without changing look/feel,
// dropdown type-switch, or canvas rendering. No deletions; everything is additive.

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

/* ============================================================================
   [KT:SURGICAL:STANDARD-DESC] — Attribute-safe JSON + universal standard-visual support
   - __kt_toAttrJSON: escape quotes for HTML attributes
   - __kt_tagStandardCharts: original tagger for <figure class="chart-card">…</figure>
   - __kt_findStandardVisuals / __kt_upgradeLegaciesToChartSpec: broaden support to:
        * any <figure> that contains <canvas> or <svg> but lacks data-*
        * any <div class="chart-card">…</div> wrapper around a canvas/svg
   - __kt_injectStdChartNotes: deterministic <p class="chart-note">…</p> if missing
   ============================================================================ */

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
                    : /savings|revenue|spend|capex|opex|cad|usd|gbp|eur/i.test(title) ? 'Value'
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

    console.log('[SR:REFORM] std.charts.tagged', { scanned, upgraded, sample });

    return out;
  }catch(e){
    console.log('[SR:REFORM] std.charts.tag.error', String(e?.message||e));
    return html;
  }
}

/** NEW: broaden standard-visual discovery to legacy markup */
function __kt_findStandardVisuals(html=''){
  const s = String(html||'');
  const matches = [];
  // A) <figure ...> containing <canvas> or <svg>, but no data-* spec
  const reFig = /<figure\b([^>]*?)>([\s\S]*?)<\/figure>/gi;
  let m;
  while((m = reFig.exec(s))!==null){
    const open = m[1]||'', inner = m[2]||'';
    const hasData = /(data-chart|data-heatmap|data-widget\s*=\s*["']benchmark["'])/i.test(open);
    const looksLikeVisual = /<canvas\b|<svg\b/i.test(inner);
    if (!hasData && looksLikeVisual){
      matches.push({ start:m.index, end:reFig.lastIndex, open, inner, tag:'figure' });
    }
  }
  // B) <div class="chart-card"> wrapper around canvas/svg, but no data-* spec
  const reDiv = /<div\b([^>]*class=["'][^"']*chart-card[^"']*["'][^>]*)>([\s\S]*?)<\/div>/gi;
  let d;
  while((d = reDiv.exec(s))!==null){
    const open = d[1]||'', inner = d[2]||'';
    const hasData = /(data-chart|data-heatmap|data-widget\s*=\s*["']benchmark["'])/i.test(open);
    const looksLikeVisual = /<canvas\b|<svg\b/i.test(inner);
    if (!hasData && looksLikeVisual){
      matches.push({ start:d.index, end:reDiv.lastIndex, open, inner, tag:'div' });
    }
  }
  return { source:s, matches };
}

/** NEW: upgrade legacy visuals to normalized <figure data-chart="…"> so notes can attach */
function __kt_upgradeLegaciesToChartSpec(html='', labels=[], canon={}){
  try{
    const { source, matches } = __kt_findStandardVisuals(html);
    if (!matches.length) return html;

    let out = '', cursor = 0, upgraded = 0, sample=[];
    for (const m of matches){
      out += source.slice(cursor, m.start);
      const titleGuess = (m.inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)||[])[1] || 'Chart';
      const title = String(titleGuess).replace(/<[^>]*>/g,'').trim() || 'Chart';
      const xTitle = (labels[0]||'').startsWith('Y') ? 'Years' : 'Months';
      const yTitle = /percent|%/i.test(title)?'Percent':/savings|revenue|spend|capex|opex|cad|usd|gbp|eur/i.test(title)?'Value':'Index';
      const spec = {
        type: 'line',
        title, xTitle, yTitle,
        labels: Array.isArray(labels)?labels:[],
        datasets: [{ label: title, data: (labels||[]).map((_,i)=>i+1) }]
      };
      const attr = " data-chart='" + __kt_toAttrJSON(spec) + "' data-origin=\"standard\"";
      if (m.tag === 'figure'){
        out += '<figure' + m.open + attr + '>' + m.inner + '</figure>';
      } else {
        // normalize wrapper to figure for downstream renderers
        out += '<figure class="chart-card"' + attr + '>' + m.inner + '</figure>';
      }
      cursor = m.end;
      upgraded++;
      if (sample.length<3) sample.push(title);
    }
    out += source.slice(cursor);
    console.log('[SR:REFORM] std.legacy.upgraded', { found: matches.length, upgraded, sample });
    return out;
  }catch(e){
    console.log('[SR:REFORM] std.legacy.upgrade.error', String(e?.message||e));
    return html;
  }
}

/** Deterministic description (no OpenAI) matching predictive style class. */
function __kt_makeNote_local(meta){
  const t = meta?.title || 'This visual';
  const x = meta?.xTitle || (meta?.kind==='heatmap' ? 'Columns' : 'X-axis');
  const y = meta?.yTitle || (meta?.kind==='heatmap' ? 'Rows'    : 'Y-axis');
  return `<p class="chart-note">${t} shows performance with ${x} on the horizontal axis and ${y} on the vertical axis. Use the trend or hotspots to focus this quarter’s decisions and monitoring.</p>`;
}

/** Minimal meta parser for this module (chart/benchmark/heatmap). */
function __kt_parseVizMeta_local(frag=''){
  const out = { kind:'', title:'', xTitle:'', yTitle:'' };
  if (!frag) return out;

  const mChart = frag.match(/<figure[^>]*data-chart=['"]([\s\S]*?)['"]/i);
  if (mChart){
    out.kind = 'chart';
    const json = safeParseAttrJSON(mChart[1]) || {};
    out.title  = String(json.title || 'Chart');
    out.xTitle = String(json.xTitle || 'X-axis');
    out.yTitle = String(json.yTitle || 'Y-axis');
    return out;
  }
  const mBench = frag.match(/<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([\s\S]*?)['"]/i);
  if (mBench){
    out.kind = 'benchmark';
    const json = safeParseAttrJSON(mBench[1]) || {};
    out.title  = String(json.title || 'Benchmark');
    out.xTitle = 'Measure';
    out.yTitle = String(json.yTitle || 'Percent');
    return out;
  }
  const mHeat = frag.match(/<div[^>]*data-heatmap=['"]([\s\S]*?)['"]/i);
  if (mHeat){
    out.kind = 'heatmap';
    const json = safeParseAttrJSON(mHeat[1]) || {};
    out.title  = String(json.title || 'Risk Heat Map');
    out.xTitle = 'Columns';
    out.yTitle = 'Rows';
    return out;
  }
  return out;
}

/**
 * Inject notes after any visual lacking one; preserve look/feel and switcher.
 * Logs count and sample titles for audit.
 */
function __kt_injectStdChartNotes(html=''){
  try{
    const src = String(html||'');
    const re  = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;

    let outParts = [], cursor = 0, match, injected = 0, sample = [];
    while((match = re.exec(src))!==null){
      const start = match.index, end = re.lastIndex, frag = match[0];
      outParts.push(src.slice(cursor, start));      // content before visual
      outParts.push(frag);                          // the visual itself

      const tail = src.slice(end, end + 600).replace(/^\s+/, '');
      const hasNote = /^(?:<!\-\-.*?\-\->\s*)*<p\b[^>]*class=["']chart-note["'][^>]*>[\s\S]*?<\/p>/i.test(tail);
      if (!hasNote){
        const meta = __kt_parseVizMeta_local(frag);
        const note = __kt_makeNote_local(meta);
        if (injected < 3) sample.push(meta.title || '(untitled)');
        outParts.push('\n' + note + '\n');
        injected++;
      }
      cursor = end;
    }
    outParts.push(src.slice(cursor));
    const out = outParts.join('');
    console.log('[SR:REFORM] std.chart.notes.injected', { injected, sample });
    return out;
  }catch(e){
    console.log('[SR:REFORM] std.chart.notes.error', String(e?.message||e));
    return html;
  }
}
/* ======================= end [KT:SURGICAL:STANDARD-DESC] =================== */

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

/* ============================================================================
   Smart widget injector (unchanged behavior) + standard-notes pipeline hooks
   ============================================================================ */
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

    // [KT:SURGICAL:STANDARD-DESC:B+] — normalize/upgrade *before* tagging + notes
    let postHTML = withWidgets;
    try {
      postHTML = __kt_upgradeLegaciesToChartSpec(postHTML, labels, canon);
    } catch(e) {
      console.log('[SR:REFORM] std.legacy.upgrade.invoke.error', String(e?.message||e));
    }

    // [KT:SURGICAL:STANDARD-DESC:B] — tag standard charts then log counts
    try {
      postHTML = __kt_tagStandardCharts(postHTML, labels, canon);
      // log emitted inside __kt_tagStandardCharts
    } catch(e) {
      console.log('[SR:REFORM] std.charts.tag.error', String(e?.message||e));
    }

    // [KT:SURGICAL:STD-NOTES] — ensure every visual has a concise executive note
    try {
      postHTML = __kt_injectStdChartNotes(postHTML);
    } catch(e) {
      console.log('[SR:REFORM] std.chart.notes.invoke.error', String(e?.message||e));
    }

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

  // Final width guard override so report is full-width (kept)
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
  return html;
}

