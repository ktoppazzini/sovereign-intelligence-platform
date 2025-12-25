// lib/reportGraphs.js
// Blue-card charts (SSR + hydrate) with axes, ticks, titles, and a working chart-type dropdown.
// No external libs.

const esc = (s='') => String(s);
const clamp = (n,a,b) => Math.min(b, Math.max(a, Number(n)||0));
const toSeries = (x) => Array.isArray(x) ? x.map(Number).map(v => (isFinite(v)?v:0)) : [];

export const GRAPH_CSS = `
.report figure{ margin:0; }
.chart-card{ background:#0E2A44; color:#fff; border-radius:16px; padding:12px; margin:12px 0; box-shadow:0 2px 10px rgba(0,0,0,.06); }
.chart-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 8px; }
.chart-title{ font-weight:700; }
.chart-ctl label{ font-size:.9rem; opacity:.9; }
.chart-ctl select{ background:#153a5d; color:#fff; border:1px solid rgba(255,255,255,.2); border-radius:8px; padding:4px 8px; }
.chart-wrap{ position:relative; }
.chart-canvas{ width:100%; height:320px; display:block; }
.ssr-svg{ width:100%; height:auto; display:block; }
.axis-title{ fill:#cfe4ff; font-size:12px; }
.tick{ stroke:rgba(255,255,255,.25); stroke-width:1; }
.grid{ stroke:rgba(255,255,255,.15); stroke-width:1; }
`;

// ---------- SSR helpers (simple axes, grid, and line/bar) ----------
function svgLine(x1,y1,x2,y2, cls='') { return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }
function svgText(x,y,t,cls='') { return `<text class="${cls}" x="${x}" y="${y}">${esc(t)}</text>`; }

function ssrScales(labels=[], series=[], w=900, h=320, p=48){
  const max = Math.max(1, ...series);
  const x = i => p + (i * (w - 2*p)) / Math.max(labels.length - 1, 1);
  const y = v => (h - p) - (clamp(v, 0, max) * (h - 2*p) / max);
  return { x, y, max };
}

function ssrAxes(labels=[], series=[], {titleX='Period', titleY='Value'}={}, w=900, h=320, p=48){
  const {x,y,max} = ssrScales(labels, series, w,h,p);
  const parts = [];

  // grid & y ticks (5)
  const steps = 5;
  for(let i=0;i<=steps;i++){
    const gy = p + (i*(h-2*p))/steps;
    parts.push(svgLine(p, gy, w-p, gy, 'grid'));
    const val = Math.round(max*(1 - i/steps));
    parts.push(svgText(p-8, gy+4, val, 'axis-title'));
  }
  // x ticks
  labels.forEach((lab, i)=>{
    const gx = x(i);
    parts.push(svgLine(gx, h-p, gx, h-p+6, 'tick'));
    const angle = 0;
    parts.push(`<g transform="translate(${gx},${h-p+18}) rotate(${angle})">${svgText(0,0, lab, 'axis-title')}</g>`);
  });

  // axis titles
  parts.push(svgText(w/2, h-8, titleX, 'axis-title'));
  parts.push(`<g transform="translate(14, ${h/2}) rotate(-90)">${svgText(0,0, titleY, 'axis-title')}</g>`);

  return parts.join('');
}

function ssrPathLine(labels=[], series=[], w=900, h=320, p=48){
  const {x,y} = ssrScales(labels, series, w,h,p);
  const pts = series.map((v,i)=>`${x(i)},${y(v)}`).join(' L ');
  return `<path d="M ${pts}" fill="none" stroke="#9bd4ff" stroke-width="3" stroke-linecap="round" />`;
}
function ssrBars(labels=[], series=[], w=900, h=320, p=48){
  const {x,y,max} = ssrScales(labels, series, w,h,p);
  const bw = (w-2*p)/Math.max(series.length,1)*0.6;
  return series.map((v,i)=>{
    const cx = x(i);
    const X = cx - bw/2;
    const Y = y(v);
    const H = (h-p) - Y;
    return `<rect x="${X}" y="${Y}" width="${bw}" height="${H}" fill="#a6d4ff" />`;
  }).join('');
}

function chartBlockHTML({ id, title, type='line', labels=[], series=[], xTitle='Period', yTitle='Value' }){
  labels = Array.isArray(labels) && labels.length ? labels : Array.from({length:12},(_,i)=>`M${i+1}`);
  series = toSeries(series);
  const w=900,h=320,p=48;

  // SSR SVG (works in PDF)
  const axes = ssrAxes(labels, series, {titleX:xTitle, titleY:yTitle}, w,h,p);
  const prim = type === 'bar' ? ssrBars(labels, series, w,h,p) : ssrPathLine(labels, series, w,h,p);

  const payload = esc(JSON.stringify({ id, title, labels, series, xTitle, yTitle, type }));
  return `
  <figure class="chart-card" data-chart='${payload}'>
    <div class="chart-head">
      <div class="chart-title">${esc(title||'Chart')}</div>
      <div class="chart-ctl"><label>Chart: 
        <select class="chart-type" aria-label="Chart type">
          <option value="line"${type==='line'?' selected':''}>Line</option>
          <option value="bar"${type==='bar'?' selected':''}>Bar</option>
        </select>
      </label></div>
    </div>
    <div class="chart-wrap">
      <svg class="ssr-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title||'chart')} (server)">
        ${axes}
        ${prim}
      </svg>
      <canvas class="chart-canvas" width="${w}" height="${h}"></canvas>
    </div>
  </figure>`;
}

// Public builders used by the template
export function lineChartHTML({ id, title, labels, series, xTitle='Period', yTitle='Value' }){
  return chartBlockHTML({ id, title, labels, series, xTitle, yTitle, type:'line' });
}
export function barChartHTML({ id, title, labels, series, xTitle='Category', yTitle='Value' }){
  return chartBlockHTML({ id, title, labels, series, xTitle, yTitle, type:'bar' });
}

// Minimal heat map (SSR only; your stable version already places it correctly)
export function heatmapHTML({ id, title='Risk Heat Map', rows=[], cols=[], data=[[]] }){
  const R = rows.length||5, C = cols.length||5;
  rows = rows.length?rows:Array.from({length:R},(_,i)=>`R${i+1}`);
  cols = cols.length?cols:Array.from({length:C},(_,i)=>`C${i+1}`);
  const cell = (r,c,v) => `<div class="hm-cell" style="--v:${v}"></div>`;
  const body = (data||[]).map((row,r)=>row.map((v,c)=>cell(r,c, clamp(v,1,5))).join('')).join('');
  return `
  <figure class="chart-card">
    <div class="chart-head"><div class="chart-title">${esc(title)}</div></div>
    <div class="heatmap" role="img" aria-label="${esc(title)}">
      ${body}
    </div>
  </figure>
  <style>
    .heatmap{ display:grid; grid-template-columns: repeat(${cols.length}, 1fr); gap:6px; padding:6px; }
    .hm-cell{ aspect-ratio:1/1; border-radius:6px; background:color-mix(in srgb, #6bb1ff calc(var(--v)*18%), #11314d); }
  </style>`;
}

// ----- Hydration: canvas renderer + dropdown behavior -----
export const HYDRATE_INLINE_SCRIPT = `
(function(){
  const els = document.querySelectorAll('.chart-card');
  els.forEach(el => {
    const cfg = JSON.parse(el.getAttribute('data-chart')||'{}');
    const cvs = el.querySelector('canvas');
    const ctx = cvs.getContext('2d');
    const select = el.querySelector('.chart-type');

    function draw(){
      const W = cvs.width, H = cvs.height, P = 48;
      const labels = cfg.labels||[];
      const series = (cfg.series||[]).map(Number);
      const max = Math.max(1, ...series);
      ctx.clearRect(0,0,W,H);

      // blue card bg is from CSS; draw plot area grid
      ctx.save();
      ctx.translate(0,0);

      // grid & ticks
      ctx.strokeStyle = 'rgba(255,255,255,.15)';
      ctx.lineWidth = 1;
      const steps = 5;
      for(let i=0;i<=steps;i++){
        const gy = P + (i*(H-2*P))/steps;
        ctx.beginPath(); ctx.moveTo(P, gy); ctx.lineTo(W-P, gy); ctx.stroke();
        const val = Math.round(max*(1 - i/steps));
        ctx.fillStyle = '#cfe4ff'; ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(String(val), P-8, gy);
      }
      // x ticks
      labels.forEach((lab,i)=>{
        const gx = P + (i*(W-2*P))/Math.max(labels.length-1,1);
        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.moveTo(gx, H-P); ctx.lineTo(gx, H-P+6); ctx.stroke();
        ctx.fillStyle = '#cfe4ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(lab, gx, H-P+8);
      });

      // axis titles
      ctx.fillStyle = '#cfe4ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(cfg.xTitle||'Period', W/2, H-8);
      ctx.save(); ctx.translate(14, H/2); ctx.rotate(-Math.PI/2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(cfg.yTitle||'Value', 0, 0); ctx.restore();

      // plot
      function X(i){ return P + (i*(W-2*P))/Math.max(labels.length-1,1); }
      function Y(v){ return (H-P) - (v*(H-2*P)/max); }

      if ((select?.value||cfg.type) === 'bar'){
        const bw = (W-2*P)/Math.max(series.length,1)*0.6;
        ctx.fillStyle = '#a6d4ff';
        series.forEach((v,i)=>{
          const cx = X(i), x = cx-bw/2, y = Y(v), h = (H-P)-y;
          ctx.fillRect(x, y, bw, h);
        });
      } else {
        ctx.strokeStyle = '#9bd4ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();
        series.forEach((v,i)=>{ const x=X(i), y=Y(v); (i?ctx.lineTo(x,y):ctx.moveTo(x,y)); });
        ctx.stroke();
      }
      ctx.restore();
    }

    select?.addEventListener('change', () => draw());
    // Initial draw after paint
    requestAnimationFrame(draw);
  });
})();
`;
