// lib/reportGraphs.js
// Robust chart helpers: accept either (labels, series, opts) or a single spec object.
// No assumptions about arrays; safe on SSR.

function safe(v){ return String(v == null ? '' : v); }
function escAttr(json){
  const s = typeof json === 'string' ? json : JSON.stringify(json);
  return s.replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function normalizeSpec(a, b, opts = {}) {
  // Form A: (labels:Array, series:Array, opts)
  if (Array.isArray(a) || Array.isArray(b)) {
    const labels = Array.isArray(a) ? a.slice() : [];
    const series = Array.isArray(b) ? b.slice() : [];
    const lbls = labels.length ? labels : Array.from({ length: series.length || 0 }, (_, i) => `P${i + 1}`);
    return {
      type: opts.type || 'line',
      title: opts.title || '',
      labels: lbls,
      datasets: [{ label: opts.label || 'Series', data: series }],
    };
  }
  // Form B: (specObject)
  const specIn = a && typeof a === 'object' ? { ...a } : {};
  const dsIn = Array.isArray(specIn.datasets)
    ? specIn.datasets
    : [{
        label: specIn.label || 'Series',
        data: Array.isArray(specIn.series) ? specIn.series : (Array.isArray(b) ? b : []),
      }];
  const first = dsIn[0] || { data: [] };
  const labels = Array.isArray(specIn.labels) ? specIn.labels
    : (Array.isArray(first.data) ? first.data.map((_, i) => `P${i + 1}`) : []);
  return {
    type: specIn.type || opts.type || 'line',
    title: specIn.title || opts.title || '',
    labels,
    datasets: dsIn.map(d => ({ label: d.label || 'Series', data: Array.isArray(d.data) ? d.data.slice() : [] })),
  };
}

function chartFigure(spec, blue = true) {
  const json = escAttr(spec);
  // Pre-select the dropdown to current type
  const opts = ['line','bar','pie','doughnut','radar']
    .map(t => `<option value="${t}"${t === (spec.type || 'line') ? ' selected' : ''}>${t[0].toUpperCase()+t.slice(1)}</option>`)
    .join('');
  return `
  <figure class="chart-block">
    <div class="chart-toolbar">
      <label>Chart:</label>
      <select class="chart-type">${opts}</select>
    </div>
    <div class="chart-canvas ${blue ? 'blue' : ''}">
      <canvas></canvas>
    </div>
    ${spec.title ? `<figcaption>${safe(spec.title)}</figcaption>` : ''}
    <div data-chart='${json}' hidden></div>
  </figure>`;
}

// Public helpers (named exports) ---------------------------------------------

export function lineChartHTML(a, b, opts = {}) {
  const spec = normalizeSpec(a, b, { ...opts, type: 'line' });
  return chartFigure(spec, opts.blue !== false);
}

export function barChartHTML(a, b, opts = {}) {
  const spec = normalizeSpec(a, b, { ...opts, type: 'bar' });
  return chartFigure(spec, opts.blue !== false);
}

export function doughnutChartHTML(a, b, opts = {}) {
  const spec = normalizeSpec(a, b, { ...opts, type: 'doughnut' });
  return chartFigure(spec, opts.blue !== false);
}

export function radarChartHTML(a, b, opts = {}) {
  const spec = normalizeSpec(a, b, { ...opts, type: 'radar' });
  return chartFigure(spec, opts.blue !== false);
}

/** Heatmap: pass {rows:[], cols:[], data:[[]]} or it will safely default. */
export function heatmapHTML(spec = {}) {
  const rows = Array.isArray(spec.rows) ? spec.rows : ['Very Low','Low','Medium','High','Very High'];
  const cols = Array.isArray(spec.cols) ? spec.cols : ['Very Low','Low','Medium','High','Very High'];
  const data = Array.isArray(spec.data) ? spec.data : [];
  const json = escAttr({ rows, cols, data });
  return `<div class="heatmap-holder" data-heatmap='${json}'><canvas width="900" height="280"></canvas></div>`;
}

// (Optional) tiny CSS helpers if your template doesn't add styles itself.
// You can import these strings and inject <style> in your template if needed.
export const graphsCSS = `
.chart-block{ margin:.75rem 0 1rem; }
.chart-toolbar{ display:flex; gap:.5rem; align-items:center; margin:0 0 .5rem; }
.chart-canvas{ border-radius:12px; padding:.75rem; background:#fff; color:#0b1220; }
.chart-canvas.blue{ background:#0a2640; color:#fff; }
.chart-canvas.blue canvas{ background:transparent; }
.chart-block figcaption{ color:#94a3b8; margin-top:.35rem; }
`;

