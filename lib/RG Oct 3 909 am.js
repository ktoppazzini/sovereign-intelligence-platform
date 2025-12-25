// lib/reportGraphs.js
// Small, dependency-free chart helpers used by the report template.
// Exports:
//  - GRAPH_CSS (string for blue "card" look)
//  - lineChartHTML(opts), barChartHTML(opts), heatmapHTML(opts)
//  - HYDRATE_INLINE_SCRIPT (client-side renderer & drop-down handler)

/* ---------- card CSS (injected inside <style> by the template) ---------- */
export const GRAPH_CSS = `
.chart-card{background:#0E2A44;border-radius:18px;padding:14px 16px;margin:10px 0 8px;
  box-shadow:0 2px 10px rgba(0,0,0,.06);color:#E6F0FF}
.chart-top{display:flex;justify-content:space-between;align-items:center;margin:2px 4px 8px}
.chart-title{font-weight:700;opacity:.95}
.chart-type{font-size:.9rem;background:#0c2238;border:1px solid rgba(255,255,255,.12);
  color:#E6F0FF;border-radius:8px;padding:2px 8px}
.chart-canvas{width:100%;height:320px;display:block;border-radius:12px;background:#0b2034}
.chart-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:.85rem;opacity:.9}
.chart-legend .sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px}
.ssr-svg{border-radius:16px}
`;

/* ---------- utilities ---------- */
function safeArr(a, len = 0, fill = 0){ 
  if (!Array.isArray(a) || !a.length) return Array.from({length:len},(_,i)=>i<len?fill:0);
  return a;
}
function enc(x){ return encodeURIComponent(JSON.stringify(x)); } // for data-* payload
function cardHTML({ id, title, labels=[], series=[], xTitle='', yTitle='', type='line'}){
  const lab = safeArr(labels);
  const ser = safeArr(series, lab.length);
  const t   = (type||'line').toLowerCase();
  const hasBar = true, hasLine = true;

  return `
  <figure class="chart-card" 
      data-id="${id}" data-type="${t}" 
      data-labels="${enc(lab)}" data-series="${enc(ser)}"
      data-xtitle="${enc(xTitle)}" data-ytitle="${enc(yTitle)}">
    <div class="chart-top">
      <figcaption class="chart-title">${title ? String(title) : ''}</figcaption>
      <label>Chart: 
        <select class="chart-type" aria-label="Chart type">
          ${hasLine?'<option value="line"'+(t==='line'?' selected':'')+'>Line</option>':''}
          ${hasBar ?'<option value="bar"'+(t==='bar' ?' selected':'')+'>Bar</option>':''}
        </select>
      </label>
    </div>
    <canvas class="chart-canvas" width="900" height="320"></canvas>
  </figure>`;
}

/* ---------- public HTML builders ---------- */
export function lineChartHTML(opts={}){
  const o = { type:'line', ...opts };
  return cardHTML(o);
}
export function barChartHTML(opts={}){
  const o = { type:'bar', ...opts };
  return cardHTML(o);
}
export function heatmapHTML({ id, title='Heat Map', rows=[], cols=[], data=[] } = {}){
  const r = Array.isArray(rows)&&rows.length?rows:['R1','R2','R3','R4','R5'];
  const c = Array.isArray(cols)&&cols.length?cols:['C1','C2','C3','C4','C5'];
  const m = Array.isArray(data)&&data.length?data:Array.from({length:r.length},()=>Array.from({length:c.length},()=>1+Math.floor(Math.random()*5)));
  const payload = enc({rows:r, cols:c, data:m});
  return `
  <figure class="chart-card" data-type="heatmap" data-heat="${payload}">
    <div class="chart-top"><figcaption class="chart-title">${title}</figcaption></div>
    <canvas class="chart-canvas" width="900" height="320"></canvas>
    <div class="chart-legend" aria-hidden="true">
      <span><span class="sw" style="background:#173b5e"></span>Low</span>
      <span><span class="sw" style="background:#1e5b87"></span></span>
      <span><span class="sw" style="background:#247eae"></span></span>
      <span><span class="sw" style="background:#2aa4c6"></span></span>
      <span><span class="sw" style="background:#30c7db"></span>High</span>
    </div>
  </figure>`;
}

/* ---------- client-side renderer / hydration ---------- */
export const HYDRATE_INLINE_SCRIPT = `
(function(){
  const $ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const px = (ctx, x, y)=>ctx.fillRect(x,y,1,1);

  function parse(el, name, fallback='[]'){
    try{ return JSON.parse(decodeURIComponent(el.getAttribute(name)||fallback)); }
    catch{ return JSON.parse(fallback); }
  }

  function drawAxes(ctx, W, H, pad, min, max, xLabels, titles){
    ctx.clearRect(0,0,W,H);
    const left  = pad, right = W-pad, top = pad, bottom = H-pad;
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;

    // grid + ticks (5 major)
    const yTicks = 5;
    for (let i=0;i<=yTicks;i++){
      const y = top + (i*(bottom-top))/yTicks;
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(right,y); ctx.stroke();
      ctx.globalAlpha = 1;
      const val = Math.round(max - (i*(max-min))/yTicks);
      ctx.fillStyle = '#E6F0FF'; ctx.font = '12px system-ui';
      ctx.fillText(val.toLocaleString(), 6, y+4);
    }
    // y axis
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke();
    // x axis
    ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();

    // axis titles
    ctx.fillStyle='#E6F0FF'; ctx.font='13px system-ui';
    if (titles.y){
      ctx.save(); ctx.translate(16, H/2); ctx.rotate(-Math.PI/2);
      ctx.textAlign='center'; ctx.fillText(titles.y, 0, 0); ctx.restore();
    }
    if (titles.x){
      ctx.textAlign='center'; ctx.fillText(titles.x, (left+right)/2, H-6);
    }

    // x labels (at most 12 shown)
    const show = Math.max(2, Math.min(12, xLabels.length));
    const step = Math.max(1, Math.floor(xLabels.length / show));
    ctx.font = '12px system-ui';
    for (let i=0;i<xLabels.length;i+=step){
      const x = left + (i*(right-left))/Math.max(xLabels.length-1,1);
      ctx.fillText(String(xLabels[i]), x, H-22);
    }
    return {left,right,top,bottom};
  }

  function drawSeries(ctx, kind, rect, labels, series, min, max){
    const {left, right, top, bottom} = rect;
    const scaleX = i => left + (i*(right-left))/Math.max(labels.length-1,1);
    const scaleY = v => bottom - ((v-min)/(max-min||1))*(bottom-top);

    if (kind==='line'){
      ctx.strokeStyle = '#a8d7ff'; ctx.lineWidth=3; ctx.beginPath();
      series.forEach((v,i)=>{
        const x=scaleX(i), y=scaleY(v);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
    } else {
      // bar
      const w = (right-left)/Math.max(series.length,1)*0.65;
      ctx.fillStyle = '#9cd1ff';
      series.forEach((v,i)=>{
        const x = scaleX(i) - w/2, y = scaleY(v);
        ctx.fillRect(x, y, w, bottom-y);
      });
    }
  }

  function hydrateCard(el){
    const typeSel = el.querySelector('.chart-type');
    const canvas  = el.querySelector('canvas');
    const ctx     = canvas.getContext('2d', {alpha:false});
    const type    = (el.getAttribute('data-type')||'line').toLowerCase();

    // Heat map special case
    if (type==='heatmap'){
      const payload = parse(el,'data-heat','{}');
      const rows = payload.rows||[], cols = payload.cols||[], data = payload.data||[];
      const W=canvas.width, H=canvas.height, pad=40, top=pad, left=pad+20, bottom=H-pad, right=W-pad;
      const cellW=(right-left)/cols.length, cellH=(bottom-top)/rows.length;
      const palette = ['#173b5e','#1e5b87','#247eae','#2aa4c6','#30c7db'];
      ctx.fillStyle='#0b2034'; ctx.fillRect(0,0,W,H);

      // axes
      ctx.fillStyle='#E6F0FF'; ctx.font='12px system-ui';
      rows.forEach((r,i)=>ctx.fillText(r, 8, top+cellH*(i+.65)));
      cols.forEach((c,i)=>ctx.fillText(c, left+cellW*(i+.2), H-10));
      ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.strokeRect(left, top, right-left, bottom-top);

      // cells
      for(let r=0;r<rows.length;r++){
        for(let c=0;c<cols.length;c++){
          const v = Math.max(1, Math.min(5, Number((data[r]||[])[c])||1));
          ctx.fillStyle = palette[v-1];
          ctx.fillRect(left+c*cellW+1, top+r*cellH+1, cellW-2, cellH-2);
        }
      }
      return; // no selector on heatmap
    }

    // Cartesian (line/bar)
    const labels = parse(el,'data-labels');
    const series = parse(el,'data-series');
    const xTitle = parse(el,'data-xtitle','""');
    const yTitle = parse(el,'data-ytitle','""');

    function render(kind){
      const W=canvas.width, H=canvas.height, pad=48;
      ctx.fillStyle='#0b2034'; ctx.fillRect(0,0,W,H);
      const min = Math.min(0, Math.min(...series));
      const max = Math.max(1, Math.max(...series));
      const rect = drawAxes(ctx,W,H,pad,min,max,labels,{x:xTitle,y:yTitle});
      drawSeries(ctx, kind, rect, labels, series, min, max);
    }

    const initial = (typeSel?.value || type || 'line');
    render(initial);
    if (typeSel){
      typeSel.addEventListener('change', e=>render(e.target.value));
    }
  }

  $('.chart-card').forEach(hydrateCard);
})();
`;


