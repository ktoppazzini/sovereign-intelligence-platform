// lib/reportGraphs.js
// Lightweight, dependency-free charts + heatmap used by the report template.
// Produces SSR SVG fallbacks and hydrates to <canvas> at runtime.

const BLUE = "#0E2A44";
const WHITE = "#FFFFFF";
const GRID = "#7fa1c4";
const TXT = "#E6F0FF";

// ---------- helpers ----------
function toNumArray(x) {
  if (Array.isArray(x)) return x.map(v => Number(v)).filter(v => Number.isFinite(v));
  if (typeof x === 'string') {
    const parts = x.split(/[^0-9.+-]+/).map(n => Number(n)).filter(n => Number.isFinite(n));
    return parts;
  }
  return [];
}
function toStrArray(x) {
  if (Array.isArray(x)) return x.map(v => String(v));
  if (typeof x === 'string') return x.split(/[,|]/).map(s => s.trim()).filter(Boolean);
  return [];
}
function esc(s='') {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function svgLinePath(series, w, h, p) {
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const span = (max - min) || 1;
  let d = '';
  series.forEach((v, i) => {
    const x = p + (i * (w - 2*p)) / Math.max(series.length - 1, 1);
    const y = h - p - ((v - min) * (h - 2*p)) / span;
    d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  });
  return d;
}
function svgBars(series, w, h, p) {
  const max = Math.max(...series, 1);
  const min = Math.min(0, ...series);
  const span = (max - min) || 1;
  const n = series.length;
  const bw = (w - 2*p) / Math.max(n, 1) * 0.7;
  const gap = ((w - 2*p) - n*bw) / Math.max(n-1,1);
  return series.map((v,i) => {
    const x = p + i*(bw+gap);
    const y = h - p - ((v - min) * (h - 2*p)) / span;
    const y0 = h - p - ((0 - min) * (h - 2*p)) / span;
    const hh = Math.max(2, Math.abs(y0 - y));
    const top = Math.min(y, y0);
    return `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="2" ry="2" />`;
  }).join('');
}
function svgAxis(w, h, p, labels, blueBg) {
  const axisCol = blueBg ? TXT : "#333";
  const gridCol = blueBg ? "rgba(255,255,255,.18)" : "#ddd";
  const y1 = h - p, x0 = p, x1 = w - p;
  let ticks = '';
  const k = Math.min(6, Math.max(3, Math.round((w-2*p)/140)));
  for (let i=0;i<labels.length;i++) {
    const x = p + (i * (w - 2*p)) / Math.max(labels.length - 1,1);
    ticks += `<line x1="${x}" y1="${p}" x2="${x}" y2="${y1}" stroke="${gridCol}" stroke-width="1"/>`;
  }
  return `
    <line x1="${x0}" y1="${p}" x2="${x0}" y2="${y1}" stroke="${axisCol}" stroke-width="1.5"/>
    <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${axisCol}" stroke-width="1.5"/>
    ${ticks}
  `;
}

// ---------- SSR blocks ----------
function lineChartSVG({ labels=[], series=[], title='', blue=true, w=900, h=320, p=40 }) {
  labels = toStrArray(labels);
  series = toNumArray(series);
  if (!labels.length) labels = series.map((_,i)=>String(i+1));
  const path = svgLinePath(series, w, h, p);
  const axis = svgAxis(w, h, p, labels, blue);
  const bg = blue ? BLUE : "#fff";
  const stroke = blue ? "#7FC8FF" : "#0E2A44";
  const titleFill = blue ? TXT : "#1a1a1a";
  return `
  <svg viewBox="0 0 ${w} ${h}" class="ssr-svg" role="img" aria-label="${esc(title)}">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" rx="16" />
    ${axis}
    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
    <text x="${p}" y="28" font-size="16" fill="${titleFill}" font-weight="600">${esc(title)}</text>
  </svg>`;
}

function barChartSVG({ labels=[], series=[], title='', blue=true, w=900, h=320, p=40 }) {
  labels = toStrArray(labels);
  series = toNumArray(series);
  if (!labels.length) labels = series.map((_,i)=>String(i+1));
  const bars = svgBars(series, w, h, p);
  const axis = svgAxis(w, h, p, labels, blue);
  const bg = blue ? BLUE : "#fff";
  const fill = blue ? "#7FC8FF" : "#0E2A44";
  const titleFill = blue ? TXT : "#1a1a1a";
  return `
  <svg viewBox="0 0 ${w} ${h}" class="ssr-svg" role="img" aria-label="${esc(title)}">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" rx="16"/>
    ${axis}
    <g fill="${fill}">${bars}</g>
    <text x="${p}" y="28" font-size="16" fill="${titleFill}" font-weight="600">${esc(title)}</text>
  </svg>`;
}

function heatmapSVG({ rows=[], cols=[], data=[[]], title='', blue=true, w=900, h=280, p=40 }) {
  rows = toStrArray(rows);
  cols = toStrArray(cols);
  const r = Math.max(rows.length, 1);
  const c = Math.max(cols.length, 1);
  const cellW = (w - 2*p) / c;
  const cellH = (h - 2*p) / r;
  const flat = (Array.isArray(data) ? data.flat() : []);
  const vals = flat.map(Number).filter(v=>Number.isFinite(v));
  const max = Math.max(...vals, 1);
  const bg = blue ? BLUE : "#fff";
  const titleFill = blue ? TXT : "#1a1a1a";
  const axisCol = blue ? TXT : "#333";

  function cell(x,y,v){
    const t = Math.max(0, Math.min(1, Number(v)/max));
    // blue → cyan scale
    const R = Math.round(14 + 100*t);
    const G = Math.round(60 + 160*t);
    const B = Math.round(120 + 120*t);
    return `<rect x="${(p+x*cellW).toFixed(1)}" y="${(p+y*cellH).toFixed(1)}"
      width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" fill="rgb(${R},${G},${B})" rx="4" />`;
  }
  let cells = '';
  for (let y=0;y<r;y++){
    for (let x=0;x<c;x++){
      const v = (data[y] && Number(data[y][x])) || 0;
      cells += cell(x,y,v);
    }
  }
  const yLabels = rows.map((t,i)=>{
    const yy = p + i*cellH + cellH/2 + 5;
    return `<text x="${p-8}" y="${yy.toFixed(1)}" text-anchor="end" font-size="12" fill="${axisCol}">${esc(t)}</text>`;
  }).join('');
  const xLabels = cols.map((t,i)=>{
    const xx = p + i*cellW + cellW/2;
    return `<text x="${xx.toFixed(1)}" y="${(h-p+16).toFixed(1)}" text-anchor="middle" font-size="12" fill="${axisCol}">${esc(t)}</text>`;
  }).join('');

  return `
  <svg viewBox="0 0 ${w} ${h}" class="ssr-svg" role="img" aria-label="${esc(title)}">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" rx="16"/>
    ${cells}
    ${yLabels}
    ${xLabels}
    <text x="${p}" y="28" font-size="16" fill="${titleFill}" font-weight="600">${esc(title)}</text>
  </svg>`;
}

// ---------- exported HTML builders ----------
// Each returns a container with an SSR <svg> and the data needed for hydration.
export function lineChartHTML({ id, title, labels=[], series=[], yLabel='', blue=true }) {
  const svg = lineChartSVG({ labels, series, title, blue });
  const payload = esc(JSON.stringify({ type:'line', labels, series, title, yLabel, blue }));
  return `
  <div class="chart-block" data-chart='${payload}' id="${esc(id||'c_'+Math.random().toString(36).slice(2))}">
    <div class="chart-switch">
      <label>Chart:</label>
      <select class="chart-type">
        <option value="line" selected>Line</option>
        <option value="bar">Bar</option>
      </select>
    </div>
    <div class="chart-viewport">${svg}</div>
    <canvas class="chart-canvas" aria-hidden="true"></canvas>
  </div>`;
}
export function barChartHTML({ id, title, labels=[], series=[], yLabel='', blue=true }) {
  const svg = barChartSVG({ labels, series, title, blue });
  const payload = esc(JSON.stringify({ type:'bar', labels, series, title, yLabel, blue }));
  return `
  <div class="chart-block" data-chart='${payload}' id="${esc(id||'c_'+Math.random().toString(36).slice(2))}">
    <div class="chart-switch">
      <label>Chart:</label>
      <select class="chart-type">
        <option value="bar" selected>Bar</option>
        <option value="line">Line</option>
      </select>
    </div>
    <div class="chart-viewport">${svg}</div>
    <canvas class="chart-canvas" aria-hidden="true"></canvas>
  </div>`;
}
export function heatmapHTML({ id, title, rows=[], cols=[], data=[[]], blue=true }) {
  const svg = heatmapSVG({ rows, cols, data, title, blue });
  const payload = esc(JSON.stringify({ type:'heatmap', rows, cols, data, title, blue }));
  return `
  <div class="chart-block" data-chart='${payload}' id="${esc(id||'h_'+Math.random().toString(36).slice(2))}">
    <div class="chart-viewport">${svg}</div>
    <canvas class="chart-canvas" aria-hidden="true"></canvas>
  </div>`;
}

// ---------- hydration (draw on canvas, add interactivity) ----------
export const HYDRATE_INLINE_SCRIPT = `
(() => {
  const BLUE = "${BLUE}", WHITE = "${WHITE}", TXT="${TXT}";
  const $blocks = Array.from(document.querySelectorAll('.chart-block[data-chart]'));
  const fit = (canvas) => {
    const box = canvas.parentElement.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, box.width) * scale;
    canvas.height = (canvas.classList.contains('heatmap') ? 280 : 320) * scale;
    canvas.style.width = Math.max(320, box.width) + 'px';
    canvas.style.height = (canvas.classList.contains('heatmap') ? 280 : 320) + 'px';
    return canvas.getContext('2d');
  };
  function drawLine(ctx, labels, series, blue) {
    const w = ctx.canvas.width, h = ctx.canvas.height, p = 48 * (window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = blue ? BLUE : '#fff';
    ctx.fillRect(0,0,w,h);
    // axes
    ctx.strokeStyle = blue ? 'rgba(255,255,255,.6)' : '#333';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p, h-p); ctx.lineTo(w-p, h-p); ctx.moveTo(p,p); ctx.lineTo(p,h-p); ctx.stroke();
    const max = Math.max(...series, 1), min = Math.min(...series, 0), span = (max-min)||1;
    // grid
    ctx.strokeStyle = blue ? 'rgba(255,255,255,.15)' : '#ddd';
    const steps = Math.min(6, Math.max(3, Math.round((w-2*p)/200)));
    for (let i=0;i<labels.length;i++){
      const x = p + (i*(w-2*p))/Math.max(labels.length-1,1);
      ctx.beginPath(); ctx.moveTo(x,p); ctx.lineTo(x,h-p); ctx.stroke();
    }
    // line
    ctx.strokeStyle = blue ? '#7FC8FF' : '#0E2A44';
    ctx.lineWidth = 4;
    ctx.beginPath();
    series.forEach((v,i)=>{
      const x = p + (i*(w-2*p))/Math.max(series.length-1,1);
      const y = h - p - ((v-min)*(h-2*p))/span;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
  function drawBar(ctx, labels, series, blue) {
    const w = ctx.canvas.width, h = ctx.canvas.height, p = 48 * (window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = blue ? BLUE : '#fff';
    ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = blue ? 'rgba(255,255,255,.6)' : '#333';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p, h-p); ctx.lineTo(w-p, h-p); ctx.moveTo(p,p); ctx.lineTo(p,h-p); ctx.stroke();
    const max = Math.max(...series, 1), min = Math.min(0, ...series), span = (max-min)||1;
    const n = series.length;
    const bw = (w-2*p)/Math.max(n,1)*0.7;
    const gap = ((w-2*p)-n*bw)/Math.max(n-1,1);
    ctx.fillStyle = blue ? '#7FC8FF' : '#0E2A44';
    for (let i=0;i<n;i++){
      const x = p + i*(bw+gap);
      const y = h - p - ((series[i]-min)*(h-2*p))/span;
      const y0 = h - p - ((0-min)*(h-2*p))/span;
      const hh = Math.max(2, Math.abs(y0 - y));
      const top = Math.min(y,y0);
      ctx.fillRect(x, top, bw, hh);
    }
  }
  function drawHeat(ctx, rows, cols, data, blue) {
    ctx.canvas.classList.add('heatmap');
    const w = ctx.canvas.width, h = ctx.canvas.height, p = 48 * (window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = blue ? BLUE : '#fff';
    ctx.fillRect(0,0,w,h);
    const r = Math.max(rows.length,1), c = Math.max(cols.length,1);
    const cw = (w-2*p)/c, ch = (h-2*p)/r;
    const flat = data.flat().map(Number).filter(Number.isFinite);
    const max = Math.max(...flat, 1);
    for (let y=0;y<r;y++){
      for (let x=0;x<c;x++){
        const v = (data[y] && Number(data[y][x])) || 0;
        const t = Math.max(0, Math.min(1, v/max));
        const R = Math.round(14 + 100*t), G = Math.round(60 + 160*t), B = Math.round(120 + 120*t);
        ctx.fillStyle = 'rgb('+R+','+G+','+B+')';
        ctx.fillRect(p+x*cw, p+y*ch, cw-4, ch-4);
      }
    }
  }
  function render(block) {
    try {
      const payload = JSON.parse(block.dataset.chart || '{}');
      const canvas = block.querySelector('canvas');
      const ctx = fit(canvas);
      // hide SSR when hydrated
      const ssr = block.querySelector('.ssr-svg'); if (ssr) ssr.style.display = 'none';
      const labels = Array.isArray(payload.labels) ? payload.labels : [];
      const series = Array.isArray(payload.series) ? payload.series.map(Number).filter(Number.isFinite) : [];
      const blue = !!payload.blue;
      if (payload.type === 'heatmap') {
        drawHeat(ctx, payload.rows||[], payload.cols||[], payload.data||[], blue);
        return;
      }
      const draw = (payload.type === 'bar') ? drawBar : drawLine;
      draw(ctx, labels, series, blue);
      const sel = block.querySelector('select.chart-type');
      if (sel) {
        sel.value = payload.type;
        sel.onchange = () => { payload.type = sel.value; render(block); }
      }
      window.addEventListener('resize', ()=>render(block), { passive:true });
    } catch (e) { /* noop */ }
  }
  $blocks.forEach(render);
})();
`;

// ---------- styles you can include ----------
export const GRAPH_CSS = `
.chart-block{ margin:1rem 0 2rem; }
.chart-block .chart-switch{ display:flex; gap:.5rem; align-items:center; margin:.25rem 0 .5rem; }
.chart-block .chart-switch label{ font-size:.875rem; color:#5f6b7a; }
.chart-viewport{ width:100%; }
.chart-viewport svg{ width:100%; height:auto; display:block; }
.chart-canvas{ width:100%; height:320px; display:block; border-radius:16px; }
`;

