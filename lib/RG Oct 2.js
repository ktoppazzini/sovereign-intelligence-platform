// lib/reportGraphs.js
// Lightweight, SSR-friendly SVG charts (no Chart.js). Used by the template.

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const esc = (s='') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export function barChartHTML(values = [], { labels = [], width = 720, height = 300, pad = 56, title = 'Bar Chart' } = {}) {
  const pts = Array.isArray(values) ? values.map((v) => num(v, 0)) : [];
  if (!pts.length) return '';
  const w = width, h = height; const innerW = w - pad * 2, innerH = h - pad * 2; const axisY = pad + innerH;
  const max = Math.max(1, ...pts);
  const sx = (i) => pad + (i * innerW) / Math.max(1, pts.length);
  const bw = Math.max(8, innerW / Math.max(1, pts.length) - 10);
  const sy = (v) => pad + innerH * (1 - v / max);

  const bars = pts.map((v, i) => {
    const x = sx(i) + 5;
    const y = sy(v);
    return `<rect x="${x}" y="${y}" width="${bw}" height="${axisY - y}" fill="#0ea5e9" rx="4"/>
      <text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" style="font:500 12px ui-sans-serif;fill:#334155">${Math.round(v)}</text>`;
  }).join('');

  const xlabels = labels.length
    ? labels.map((t, i) => `<text x="${sx(i) + bw / 2}" y="${axisY + 16}" text-anchor="middle" style="font:500 12px ui-sans-serif;fill:#475569">${esc(t)}</text>`).join('')
    : '';

  return `
  <figure class="graph graph-bar" role="group" aria-roledescription="bar chart">
    <figcaption class="caption">${esc(title)}</figcaption>
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>
      <line x1="${pad}" y1="${axisY}" x2="${pad + innerW}" y2="${axisY}" stroke="#cbd5e1" stroke-width="1.25"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${axisY}" stroke="#cbd5e1" stroke-width="1.25"/>
      ${bars}
      ${xlabels}
    </svg>
  </figure>`;
}

export function lineChartHTML(values = [], { labels = [], width = 720, height = 320, pad = 56, title = 'Line Chart' } = {}) {
  const pts = Array.isArray(values) ? values.map((v) => num(v, 0)) : [];
  if (!pts.length) return '';
  const w = width, h = height; const innerW = w - pad * 2, innerH = h - pad * 2; const axisY = pad + innerH;
  const min = Math.min(...pts, 0), max = Math.max(...pts, 1), range = Math.max(1e-6, max - min);
  const sx = (i) => pad + (i * innerW) / Math.max(1, pts.length - 1);
  const sy = (v) => pad + innerH * (1 - (v - min) / range);

  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const dots = pts.map((v, i) => `<circle cx="${sx(i)}" cy="${sy(v)}" r="3" fill="#0ea5e9" />`).join('');
  const xlabels = labels.length
    ? labels.map((t, i) => `<text x="${sx(i)}" y="${axisY + 18}" text-anchor="middle" style="font:500 12px ui-sans-serif;fill:#475569">${esc(t)}</text>`).join('')
    : '';

  return `
  <figure class="graph graph-line" role="group" aria-roledescription="line chart">
    <figcaption class="caption">${esc(title)}</figcaption>
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>
      <line x1="${pad}" y1="${axisY}" x2="${pad + innerW}" y2="${axisY}" stroke="#cbd5e1" stroke-width="1.25"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${axisY}" stroke="#cbd5e1" stroke-width="1.25"/>
      <path d="${path}" stroke="#0ea5e9" stroke-width="2.75" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
      ${xlabels}
    </svg>
  </figure>`;
}

export function implementationTimelineHTML(cfg = {}) {
  const totalMonths = num(cfg.totalMonths, 18);
  const phases = Array.isArray(cfg.phases) ? cfg.phases : [];
  const width = 920, height = 200, pad = 52;
  const w = width, h = height, innerW = w - pad * 2, innerH = h - pad * 2;
  const axisY = pad + innerH - 20;
  const sx = (m) => pad + (m / Math.max(1, totalMonths)) * innerW;

  const bands = phases.map((p) => {
    const x1 = sx(num(p.start, 0));
    const x2 = sx(num(p.end, 0));
    return `<rect x="${x1}" y="${pad}" width="${Math.max(1, x2 - x1)}" height="${innerH - 40}" fill="rgba(14,165,233,0.08)" stroke="rgba(14,165,233,0.35)" />`;
  }).join('');

  const labels = phases.map((p) => {
    const mid = (num(p.start, 0) + num(p.end, 0)) / 2;
    return `<text x="${sx(mid)}" y="${pad + 18}" text-anchor="middle" style="font:600 12px ui-sans-serif;fill:#0f172a">${esc(p.label || '')}</text>`;
  }).join('');

  return `
  <figure class="graph graph-timeline" role="group" aria-roledescription="timeline">
    <figcaption class="caption">${esc(cfg.title || 'Implementation Timeline')}</figcaption>
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>
      ${bands}
      ${labels}
      <line x1="${pad}" y1="${axisY}" x2="${pad + innerW}" y2="${axisY}" stroke="#cbd5e1" stroke-width="1.25"/>
    </svg>
  </figure>`;
}

/* ------------------------------------------------------------------
   NEW: SSR fallback heat map + back-compat alias (exported)
   ------------------------------------------------------------------ */
export function heatmapHTML(data = [], {
  rowLabels = [],
  colLabels = [],
  width = 900,
  height = 280,
  pad = 24,
  title = 'Risk Heat Map (Likelihood × Impact)',
} = {}) {
  const rows = Array.isArray(data) ? data.length : 0;
  const cols = rows
    ? Math.max(...data.map(r => Array.isArray(r) ? r.length : 0), colLabels.length || 0)
    : (colLabels.length || 0);

  const w = width, h = height;
  const innerW = w - pad * 2, innerH = h - pad * 2;
  const cw = cols ? innerW / cols : innerW;
  const ch = rows ? innerH / rows : innerH;

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = Math.max(1, Math.min(5, Number((data[r] || [])[c] ?? 1)));
      const alpha = 0.15 + (v / 5) * 0.65; // 0.15–0.80
      const x = pad + c * cw, y = pad + r * ch;
      cells.push(
        `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="rgba(220,38,38,${alpha.toFixed(3)})" stroke="#ffffff" />`
      );
    }
  }

  const yLabels = rowLabels.map((t, r) =>
    `<text x="${pad - 6}" y="${pad + r * ch + ch / 2}" text-anchor="end" dominant-baseline="middle" style="font:500 12px ui-sans-serif;fill:#0b1220">${esc(t)}</text>`
  ).join('');

  const xLabels = colLabels.map((t, c) =>
    `<text x="${pad + c * cw + cw / 2}" y="${pad + innerH + 16}" text-anchor="middle" style="font:500 12px ui-sans-serif;fill:#0b1220">${esc(t)}</text>`
  ).join('');

  return `
  <figure class="graph graph-heatmap" role="group" aria-roledescription="heat map">
    <figcaption class="caption">${esc(title)}</figcaption>
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>
      ${cells.join('')}
      ${yLabels}
      ${xLabels}
    </svg>
  </figure>`;
}

// Back-compat for older callers expecting camel-cased name:
export const heatMapHTML = (...args) => heatmapHTML(...args);
