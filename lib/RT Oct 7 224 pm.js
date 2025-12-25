// /lib/reportTemplate.js
// Surgical: honor data sent in <figure data-chart='…'>, add template-side debug,
// prefer spec.labels, accept series/values, coerce numeric strings, keep style.

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

const TPL_TAG = '[SR:REFORM:TPL]';

// ----- utils -----
function safeParseAttrJSON(s='') {
  try { return JSON.parse(String(s).replace(/&quot;/g,'"').replace(/&amp;/g,'&')); }
  catch { return null; }
}

function calcLabelsByDocTimeFrame(tf='2 years'){
  const s = String(tf||'').toLowerCase();
  const m = s.match(/(\d+)\s*(year|month)/);
  let months = 24;
  if (m){ const num = Number(m[1]); if (s.includes('month')) months = num; if (s.includes('year')) months = num*12; }
  if (months <= 12) return Array.from({length:months}, (_,i)=>`M${i+1}`);
  const years = Math.ceil(months/12);
  return Array.from({length:years}, (_,i)=>`Y${i+1}`);
}
const mkDefaultSeries = (len, total=100) =>
  Array.from({length:len}, (_,i)=>Math.round((i+1)*total/len));

function coerceNums(arr=[]) {
  return (Array.isArray(arr) ? arr : [])
    .map(v => Number(String(v).replace(/[, ]/g,'')))
    .filter(n => Number.isFinite(n));
}

function pickSeries(spec, fallbackLen){
  // OLD:
  // const ds = spec?.datasets?.[0]; const s = Array.isArray(ds?.data) ? ds.data : [];
  // if (s.length) return s;
  // NEW (flexible):
  if (spec && spec.datasets && spec.datasets[0] && Array.isArray(spec.datasets[0].data)) {
    const s = coerceNums(spec.datasets[0].data);
    if (s.length) return s;
  }
  if (spec && Array.isArray(spec.values)) {
    const s = coerceNums(spec.values);
    if (s.length) return s;
  }
  if (spec && Array.isArray(spec.series)) {
    const s = coerceNums(spec.series);
    if (s.length) return s;
  }
  return mkDefaultSeries(fallbackLen, 100);
}

function renderDataBlocks(html='', labelsDocDefault) {
  // ---------- charts ----------
  html = html.replace(/<figure[^>]*data-chart=['"]([^'"]+)['"][^>]*>[\s\S]*?<\/figure>/gi,
    (_m, specRaw) => {
      const spec = safeParseAttrJSON(specRaw) || {};
      const type  = (spec.type || 'line').toLowerCase();

      // prefer spec.labels if provided
      const labels = (Array.isArray(spec.labels) && spec.labels.length)
        ? spec.labels
        : labelsDocDefault;

      const series = pickSeries(spec, labels.length);
      const title  = spec.title || 'Chart';
      const xTitle = spec.xTitle || (labels[0]?.startsWith('Y') ? 'Years' : 'Months');
      const yTitle = spec.yTitle || 'Value';

      try {
        console.log(TPL_TAG, 'chart.parsed', {
          type, title, labelsLen: labels.length, seriesLen: series.length,
          seriesSample: series.slice(0,5)
        });
      } catch {}

      if (type === 'bar')      return barChartHTML({ title, labels, series, xTitle, yTitle });
      if (type === 'pie')      return barChartHTML({ title, labels, series, xTitle, yTitle });      // mapped to bar
      if (type === 'doughnut') return barChartHTML({ title, labels, series, xTitle, yTitle });      // mapped to bar
      return lineChartHTML({ title, labels, series, xTitle, yTitle });
    });

  // ---------- benchmark (kept) ----------
  html = html.replace(/<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([^'"]+)['"][^>]*>[\s\S]*?<\/figure>/gi,
    (_m, specRaw) => {
      const spec = safeParseAttrJSON(specRaw) || {};
      const labels = Array.isArray(spec.labels) && spec.labels.length ? spec.labels : labelsDocDefault;
      const series = pickSeries(spec, labels.length);
      try { console.log(TPL_TAG, 'benchmark.parsed', { title: spec.title||'Benchmark', labelsLen: labels.length, seriesLen: series.length }); } catch {}
      return benchmarkHTML({
        title: spec.title || 'Benchmark',
        labels,
        series,
        xTitle: spec.xTitle || (labels[0]?.startsWith('Y') ? 'Years' : 'Months'),
        yTitle: spec.yTitle || 'Percent'
      });
    });

  // ---------- heatmap (kept) ----------
  html = html.replace(/<div[^>]*data-heatmap=['"]([^'"]+)['"][^>]*>[\s\S]*?<\/div>/gi,
    (_m, specRaw) => {
      const spec = safeParseAttrJSON(specRaw) || {};
      try { console.log(TPL_TAG, 'heatmap.parsed', { title: spec.title||'Risk Heat Map' }); } catch {}
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

/* ---------------- main template export ---------------- */
export default function buildReformReportHTML({ sectionHtmlMap, canon }){
  const labels = calcLabelsByDocTimeFrame(canon?.timeFrame || '2 years');

  // --- existing header / CSS / layout (kept) ---
  const head = `
<style>
${GRAPH_CSS}
${IMPLKIT_CSS}
/* minor width tweak to avoid inner scrollbar in the viewer container */
.report-body { max-width: 900px; margin: 0 auto; }
</style>`;

  // --- assemble sections (kept) ---
  let body = `
<section id="exec">${sectionHtmlMap.exec||''}</section>
<section id="current">${sectionHtmlMap.current||''}</section>
<section id="financials">${sectionHtmlMap.financials||''}</section>
<section id="kpis">${sectionHtmlMap.kpis||''}</section>
<section id="timeline">${sectionHtmlMap.timeline||''}</section>
<section id="ops">${sectionHtmlMap.ops||''}</section>
<section id="risk">${sectionHtmlMap.risk||''}</section>
<section id="roi">${sectionHtmlMap.roi||''}</section>

<section id="implkit">
  ${chartersHTML()}${raciHTML()}${raidHTML()}${benefitsHTML()}
  ${plan100HTML()}${pilotHTML()}${assumptionsHTML()}${methodsSourcesHTML()}
</section>
`;

  // Render charts/heatmaps reliably
  body = renderDataBlocks(body, labels);

  return `<!doctype html><html><head><meta charset="utf-8" />${head}</head><body class="report-body">${body}</body></html>`;
}

