// lib/reportGraphs.js
// SSR-safe HTML stubs + client-side canvas renderer (no external libs).
// Keeps your blue chart card + blue canvas; adds overflow containment,
// axis titles/ticks, legend, working type switcher, heatmap legend,
// and avoids hiding the SSR fallback if a dataset is empty.

export function lineChartHTML({ id, title, labels = [], series = [], xTitle = '', yTitle = '' }) {
  const w = 760, h = 320, p=40;
  const arr = Array.isArray(series) ? series.map(Number).filter(Number.isFinite) : [];
  const lbl = Array.isArray(labels) && labels.length ? labels : arr.map((_,i)=>String(i+1));
  const max = Math.max(...arr, 1);
  const path = arr.map((v,i)=>{
    const x = p + (i*(w-2*p))/Math.max(arr.length-1,1);
    const y = h-p - (v/max)*(h-2*p);
    return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `
  <figure class="chart-card" data-chart='${JSON.stringify({type:'line', title, labels: lbl, datasets:[{label:title||'Series', data: arr}], xTitle, yTitle})}'>
    <header class="chart-head">
      <h3>${title||'Line'}</h3>
      <div class="chart-legend"><span class="swatch"></span><span>${title||'Series'}</span></div>
      <label class="chart-type"><span>Type:</span>
        <select>
          <option value="line" selected>Line</option>
          <option value="bar">Bar</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
        </select>
      </label>
    </header>
    <div class="canvas-wrap">
      <canvas width="${w}" height="${h}" aria-label="${title||'Chart'}"></canvas>
      <svg class="ssr-svg" width="${w}" height="${h}" role="img" aria-label="fallback">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        <path d="${path}" fill="none" stroke="#8bc6ff" stroke-width="2"/>
      </svg>
    </div>
    <footer class="chart-axes"><div class="x">${xTitle||''}</div><div class="y">${yTitle||''}</div></footer>
  </figure>`;
}

export function barChartHTML({ id, title, labels = [], series = [], xTitle = '', yTitle = '' }) {
  const w = 760, h = 320, p = 40;
  const arr = Array.isArray(series) ? series.map(Number).filter(Number.isFinite) : [];
  const lbl = Array.isArray(labels) && labels.length ? labels : arr.map((_,i)=>String(i+1));
  const max = Math.max(...arr, 1);
  const barw = (w - 2*p) / Math.max(arr.length,1) * 0.7;
  const rects = arr.map((v,i)=>{
    const x = p + i*((w-2*p)/Math.max(arr.length,1)) + ((w-2*p)/Math.max(arr.length,1) - barw)/2;
    const hVal = (v/max)*(h-2*p);
    const y = h-p - hVal;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barw.toFixed(1)}" height="${hVal.toFixed(1)}" fill="#8bc6ff"/>`;
  }).join('');
  return `
  <figure class="chart-card" data-chart='${JSON.stringify({type:'bar', title, labels: lbl, datasets:[{label:title||'Series', data: arr}], xTitle, yTitle})}'>
    <header class="chart-head">
      <h3>${title||'Bar'}</h3>
      <div class="chart-legend"><span class="swatch"></span><span>${title||'Series'}</span></div>
      <label class="chart-type"><span>Type:</span>
        <select>
          <option value="bar" selected>Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
        </select>
      </label>
    </header>
    <div class="canvas-wrap">
      <canvas width="${w}" height="${h}" aria-label="${title||'Chart'}"></canvas>
      <svg class="ssr-svg" width="${w}" height="${h}" role="img" aria-label="fallback">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${rects}
      </svg>
    </div>
    <footer class="chart-axes"><div class="x">${xTitle||''}</div><div class="y">${yTitle||''}</div></footer>
  </figure>`;
}

export function heatmapHTML({ id, title, rows = [], cols = [], data = [[]] }) {
  const r = Array.isArray(rows)&&rows.length?rows:['R1','R2','R3','R4','R5'];
  const c = Array.isArray(cols)&&cols.length?cols:['C1','C2','C3','C4','C5'];
  const m = Array.isArray(data)&&data.length?data: Array.from({length:r.length},()=>Array.from({length:c.length},()=>0));
  return `
  <section class="chart-card chart-heat" data-heatmap='${JSON.stringify({rows:r, cols:c, data:m})}'>
    <header class="chart-head"><h3>${title||'Heat Map'}</h3></header>
    <div class="canvas-wrap"><canvas width="760" height="320" aria-label="${title||'Heat Map'}"></canvas></div>
    <div class="hm-legend"><span>Low</span><i></i><span>High</span></div>
  </section>`;
}

export const GRAPH_CSS = `
.chart-card{ background:#0E2A44; color:#E6F0FF; border-radius:16px; padding:12px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
.chart-card + .chart-card{ margin-top:8px; }
.chart-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin:4px 4px 8px; flex-wrap:wrap; }
.chart-head h3{ margin:0; font-size:1rem; font-weight:600; }
.chart-type{ font-size:.85rem; display:flex; align-items:center; gap:6px; }
.chart-type select{ background:#123455; color:#eaf3ff; border:1px solid #2a4b75; border-radius:8px; padding:4px 8px; }
.canvas-wrap{ position:relative; overflow:hidden; max-width:100%; }
.canvas-wrap canvas{ display:block; width:100%; height:auto; background:#0E2A44; border-radius:12px; }
.ssr-svg{ position:absolute; inset:0; pointer-events:none; border-radius:12px; max-width:100%; height:auto; }
.chart-axes{ display:flex; align-items:center; justify-content:space-between; margin-top:6px; font-size:.85rem; opacity:.9; }
.chart-heat canvas{ border-radius:12px; }
.chart-legend{ display:inline-flex; align-items:center; gap:6px; font-size:.85rem; opacity:.95; }
.chart-legend .swatch{ width:12px; height:12px; border-radius:3px; background:#8bc6ff; display:inline-block; }

.chart-heat .hm-legend{ display:flex; align-items:center; gap:8px; font-size:.85rem; margin-top:6px; }
.chart-heat .hm-legend i{ flex:1; height:10px; border-radius:6px;
  background: linear-gradient(90deg, hsl(200,80%,55%), hsl(160,80%,55%)); }
`;

export const HYDRATE_INLINE_SCRIPT = `(() => {
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function toNumArray(v){
    if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
    if (typeof v === 'string') {
      try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : []; }
      catch { return v.split(/[,\\s]+/).map(Number).filter(Number.isFinite); }
    }
    return [];
  }

  function drawAxes(ctx, W, H, pad, xTitle, yTitle, maxVal, steps=5){
    ctx.save();
    // Fill blue canvas bg each render (keeps your look)
    ctx.fillStyle = '#0E2A44';
    ctx.fillRect(0,0,W,H);

    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.fillStyle = '#E6F0FF';
    ctx.lineWidth = 1;

    for(let i=0;i<=steps;i++){
      const y = pad + (i*(H-2*pad))/steps;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
      const val = Math.round(maxVal * (1 - i/steps));
      ctx.fillText(String(val), 6, y+3);
    }
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H-pad); ctx.lineTo(W-pad, H-pad); ctx.stroke();

    if (xTitle){ ctx.textAlign='center'; ctx.fillText(xTitle, W/2, H-6); }
    if (yTitle){ ctx.save(); ctx.translate(12, H/2); ctx.rotate(-Math.PI/2); ctx.textAlign='center'; ctx.fillText(yTitle, 0, 0); ctx.restore(); }
    ctx.restore();
  }

  function drawLine(ctx, labels, data, xTitle, yTitle){
    const W = ctx.canvas.width, H = ctx.canvas.height, pad = 40;
    const maxVal = Math.max(1, ...data);
    drawAxes(ctx, W, H, pad, xTitle, yTitle, maxVal);

    ctx.save(); ctx.strokeStyle = '#8bc6ff'; ctx.lineWidth = 2;
    data.forEach((v,i)=>{
      const x = pad + (i*(W-2*pad))/Math.max(data.length-1,1);
      const y = H-pad - (v/maxVal)*(H-2*pad);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke(); ctx.restore();

    // X labels
    const slot = (W-2*pad)/Math.max(labels.length||data.length,1);
    ctx.fillStyle='#E6F0FF'; ctx.textAlign='center';
    (labels.length?labels:data.map((_,i)=>i+1)).forEach((t,i)=>{
      const x = pad + i*slot + slot/2;
      ctx.fillText(String(t), x, H-pad+14);
    });
  }

  function drawBar(ctx, labels, data, xTitle, yTitle){
    const W = ctx.canvas.width, H = ctx.canvas.height, pad = 40;
    const maxVal = Math.max(1, ...data);
    drawAxes(ctx, W, H, pad, xTitle, yTitle, maxVal);

    const slot = (W-2*pad)/Math.max(data.length,1);
    const bw = slot*0.7;
    ctx.save(); ctx.fillStyle = '#8bc6ff';
    data.forEach((v,i)=>{
      const x = pad + i*slot + (slot-bw)/2;
      const h = (v/maxVal)*(H-2*pad);
      const y = H-pad - h;
      ctx.fillRect(x,y,bw,h);
    });
    ctx.restore();

    ctx.save(); ctx.fillStyle='#E6F0FF'; ctx.textAlign='center';
    (labels.length?labels:data.map((_,i)=>i+1)).forEach((t,i)=>{
      const x = pad + i*slot + slot/2;
      ctx.fillText(String(t), x, H-pad+14);
    });
    ctx.restore();
  }

  function drawPie(ctx, labels, data, doughnut=false){
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const cx = W/2, cy = H/2, R = Math.min(W,H)*0.35;
    const sum = data.reduce((a,b)=>a+b,0) || 1;
    let a0 = -Math.PI/2;
    data.forEach((v,i)=>{
      const a1 = a0 + 2*Math.PI*(v/sum);
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.fillStyle = 'hsl('+Math.round(200 + (i*50)%160)+',80%,65%)';
      ctx.arc(cx,cy,R,a0,a1);
      ctx.closePath(); ctx.fill();
      a0 = a1;
    });
    if (doughnut){
      ctx.save(); ctx.globalCompositeOperation='destination-out';
      ctx.beginPath(); ctx.arc(cx,cy,R*0.55,0,Math.PI*2); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(cx,cy,R*0.56,0,Math.PI*2); ctx.strokeStyle='#E6F0FF'; ctx.stroke();
    }
  }

  function drawHeatmap(ctx, rows, cols, matrix){
    const W = ctx.canvas.width, H = ctx.canvas.height, pad = 40;
    const nR = rows.length, nC = cols.length;
    const cw = (W-2*pad)/nC, ch = (H-2*pad)/nR;

    let min=Infinity, max=-Infinity;
    matrix.forEach(r=>r.forEach(v=>{ if(v<min)min=v; if(v>max)max=v; }));
    if (!Number.isFinite(min)) { min=0; max=1; }

    const color = (v)=>{ const t = (v-min)/Math.max(1e-6, (max-min)); const h = 200 - t*140; return 'hsl('+h+',80%,55%)'; };

    for(let r=0;r<nR;r++){
      for(let c=0;c<nC;c++){
        const x = pad + c*cw, y = pad + r*ch;
        ctx.fillStyle = color(Number(matrix[r][c])||0);
        ctx.fillRect(x,y,cw,ch);
      }
    }

    ctx.save(); ctx.strokeStyle='rgba(255,255,255,.35)';
    for(let r=0;r<=nR;r++){ const y = pad + r*ch; ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke(); }
    for(let c=0;c<=nC;c++){ const x = pad + c*cw; ctx.beginPath(); ctx.moveTo(x,pad); ctx.lineTo(x,H-pad); ctx.stroke(); }
    ctx.restore();

    ctx.save(); ctx.fillStyle='#E6F0FF'; ctx.textAlign='center';
    cols.forEach((t,i)=>{ const x = pad + (i+.5)*cw; ctx.fillText(String(t), x, H-6); });
    ctx.textAlign='right';
    rows.forEach((t,i)=>{ const y = pad + (i+.5)*ch; ctx.fillText(String(t), pad-6, y+3); });
    ctx.restore();
  }

  function resizeCanvasToFigure(canvas){
    const fig = canvas.closest('.chart-card') || canvas.parentElement;
    if (!fig) return;
    const rect = fig.getBoundingClientRect();
    const target = Math.max(600, Math.round(rect.width - 24)); // keep inside card & avoid overflow
    if (canvas.width !== target){ canvas.width = target; }
  }

  function renderChart(fig){
    try{
      const spec = fig.getAttribute('data-chart'); if (!spec) return;
      const obj = JSON.parse(spec);
      const labels = Array.isArray(obj.labels)? obj.labels : [];
      const dataset = Array.isArray(obj.datasets) && obj.datasets[0] ? obj.datasets[0] : { data: [] };
      const data = toNumArray(dataset.data);
      const xTitle = obj.xTitle || '', yTitle = obj.yTitle || '';
      const canvas = fig.querySelector('canvas'); const svgFallback = fig.querySelector('.ssr-svg');
      if (!canvas) return;

      // If dataset is empty, keep SSR fallback visible (prevents blank graph)
      if (!data.length) {
        return;
      }

      resizeCanvasToFigure(canvas);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);

      const typeSel = fig.querySelector('.chart-type select');
      const type = (typeSel && typeSel.value) || obj.type || 'line';

      if (type === 'bar') drawBar(ctx, labels, data, xTitle, yTitle);
      else if (type === 'pie') drawPie(ctx, labels, data, false);
      else if (type === 'doughnut') drawPie(ctx, labels, data, true);
      else drawLine(ctx, labels, data, xTitle, yTitle);

      if (svgFallback) svgFallback.style.display = 'none';
    }catch(e){}
  }

  function renderHeat(block){
    try{
      const spec = block.getAttribute('data-heatmap'); if (!spec) return;
      const obj = JSON.parse(spec);
      const rows = obj.rows||[], cols = obj.cols||[], data = obj.data||[];
      const canvas = block.querySelector('canvas'); if (!canvas) return;
      resizeCanvasToFigure(canvas);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drawHeatmap(ctx, rows, cols, data);
    }catch(e){}
  }

  function renderBenchmark(fig){
    try{
      const spec = fig.getAttribute('data-spec'); if (!spec) return;
      const obj = JSON.parse(spec);
      const canvas = fig.querySelector('canvas'); if (!canvas) return;

      resizeCanvasToFigure(canvas);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);

      const W = canvas.width, H = canvas.height, pad = 40;
      const title = obj.title || 'Benchmark';
      const current = Number(obj.current)||0, benchmark = Number(obj.benchmark)||1;
      const max = Math.max(current, benchmark) * 1.2 || 1;

      // blue canvas
      ctx.fillStyle='#0E2A44'; ctx.fillRect(0,0,W,H);

      ctx.save();
      ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.fillStyle='#E6F0FF';
      ctx.beginPath(); ctx.moveTo(pad,H/2); ctx.lineTo(W-pad,H/2); ctx.stroke();
      ctx.textAlign='center'; ctx.fillText(title, W/2, pad-10);
      ctx.restore();

      const slot = (W-2*pad)/2, bw=slot*0.7;
      ctx.save();
      ctx.fillStyle='#8bc6ff';
      const h1 = (current/max)*(H-2*pad);
      ctx.fillRect(pad+(slot-bw)/2, H/2 - h1, bw, h1);
      ctx.fillStyle='#b3ffa8';
      const h2 = (benchmark/max)*(H-2*pad);
      ctx.fillRect(pad+slot+(slot-bw)/2, H/2 - h2, bw, h2);
      ctx.restore();
    }catch(e){}
  }

  function hydrate(root=document){
    $$('.chart-card[data-chart]').forEach(renderChart);
    $$('.chart-card[data-heatmap]').forEach(renderHeat);
    $$('figure[data-widget="benchmark"]').forEach(renderBenchmark);

    $$('.chart-type select').forEach(sel=>{
      sel.addEventListener('change', e=>{
        const fig = e.target.closest('[data-chart]');
        if (fig) renderChart(fig);
      }, { passive: true });
    });

    window.addEventListener('resize', () => {
      $$('.chart-card[data-chart]').forEach(renderChart);
      $$('.chart-card[data-heatmap]').forEach(renderHeat);
      $$('figure[data-widget="benchmark"]').forEach(renderBenchmark);
    }, { passive: true });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') { hydrate(document); }
  window.addEventListener('DOMContentLoaded', ()=>hydrate(document));
  window.addEventListener('load', ()=>hydrate(document));
  setTimeout(()=>hydrate(document), 400); // extra safety against hydration race
})();`;
