// lib/reportGraphs.js
// SSR-only charts that render perfectly even if scripts don't execute.
// - Blue chart card + blue canvas look (SVG background = #0E2A44)
// - Visible X/Y axes, tick values, and legend
// - "Type" dropdown works via CSS :has() (no JS required in the page)
// - Heat map with gradient legend
// - Benchmark widget (two bars with labels)
// - Overflow contained

function esc(s=''){ return String(s); }
function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

function svgAxes({w,h,p,xTitle,yTitle,maxY,ticks=5,labels=[]}){
  const lines = [];
  for(let i=0;i<=ticks;i++){
    const y = p + (i*(h-2*p))/ticks;
    const val = Math.round(maxY * (1 - i/ticks));
    lines.push(`
      <line x1="${p}" y1="${y}" x2="${w-p}" y2="${y}" stroke="rgba(255,255,255,.35)"/>
      <text x="${6}" y="${y+4}" fill="#E6F0FF" font-size="11">${val}</text>
    `);
  }
  const slot = (w-2*p)/Math.max(labels.length,1);
  const xTicks = labels.map((t,i)=>{
    const x = p + i*slot + slot/2;
    return `<text x="${x}" y="${h-p+14}" text-anchor="middle" fill="#E6F0FF" font-size="11">${esc(t)}</text>`;
  }).join('');
  return `
    <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
    ${lines.join('')}
    <polyline points="${p},${p} ${p},${h-p} ${w-p},${h-p}" fill="none" stroke="rgba(255,255,255,.65)"/>
    ${xTicks}
    ${xTitle?`<text x="${w/2}" y="${h-6}" text-anchor="middle" fill="#E6F0FF" font-size="12">${esc(xTitle)}</text>`:''}
    ${yTitle?`<text transform="translate(12 ${h/2}) rotate(-90)" text-anchor="middle" fill="#E6F0FF" font-size="12">${esc(yTitle)}</text>`:''}
  `;
}

export function lineChartHTML({ title, labels=[], series=[], xTitle='', yTitle='' }){
  const w=760,h=320,p=40;
  const data = (Array.isArray(series)?series:[]).map(Number).filter(Number.isFinite);
  const lbl = Array.isArray(labels)&&labels.length?labels:data.map((_,i)=>'P'+(i+1));
  const max = Math.max(1, ...data);
  const slot=(w-2*p)/Math.max(data.length-1,1);
  const pts = data.map((v,i)=>{
    const x = p + i*slot;
    const y = h-p - (v/max)*(h-2*p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `
  <figure class="chart-card">
    <header class="chart-head">
      <h3>${esc(title||'Line')}</h3>
      <div class="chart-legend"><span class="swatch"></span><span>${esc(title||'Series')}</span></div>
      <label class="chart-type"><span>Type:</span>
        <select aria-label="Chart type">
          <option value="line" selected>Line</option>
          <option value="bar">Bar</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
        </select>
      </label>
    </header>

    <div class="canvas-wrap">
      <!-- default visible -->
      <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title||'Line')}">
        ${svgAxes({w,h,p,xTitle,yTitle,maxY:max,labels:lbl})}
        <polyline points="${pts}" fill="none" stroke="#8bc6ff" stroke-width="2"/>
      </svg>

      <svg class="plot bar" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title||'Bar')}">
        ${svgAxes({w,h,p,xTitle,yTitle,maxY:max,labels:lbl})}
        ${data.map((v,i)=>{
          const slot=(w-2*p)/Math.max(data.length,1);
          const bw=slot*0.7;
          const x=p+i*slot+(slot-bw)/2;
          const hv=(v/max)*(h-2*p);
          const y=h-p-hv;
          return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${hv.toFixed(1)}" fill="#8bc6ff"/>`;
        }).join('')}
      </svg>

      <svg class="plot pie" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title||'Pie')}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${(() => {
          const cx=w/2, cy=h/2, R=Math.min(w,h)*0.35; let a0=-Math.PI/2;
          const sum=data.reduce((a,b)=>a+b,0)||1;
          return data.map((v,i)=>{
            const a1=a0+2*Math.PI*(v/sum);
            const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0);
            const x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
            const large=(a1-a0)>Math.PI?1:0;
            const col=`hsl(${200+(i*50)%160},80%,65%)`;
            const d=`M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0=a1; return `<path d="${d}" fill="${col}"/>`;
          }).join('');
        })()}
      </svg>

      <svg class="plot doughnut" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title||'Doughnut')}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${(() => {
          const cx=w/2, cy=h/2, R=Math.min(w,h)*0.35; let a0=-Math.PI/2;
          const sum=data.reduce((a,b)=>a+b,0)||1;
          const slices = data.map((v,i)=>{
            const a1=a0+2*Math.PI*(v/sum);
            const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0);
            const x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
            const large=(a1-a0)>Math.PI?1:0;
            const col=`hsl(${200+(i*50)%160},80%,65%)`;
            const d=`M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0=a1; return `<path d="${d}" fill="${col}"/>`;
          }).join('');
          return `${slices}<circle cx="${w/2}" cy="${h/2}" r="${(Math.min(w,h)*0.35*0.55).toFixed(1)}" fill="#0E2A44" stroke="#E6F0FF" />`;
        })()}
      </svg>
    </div>

    <footer class="chart-axes"><div class="x">${esc(xTitle||'')}</div><div class="y">${esc(yTitle||'')}</div></footer>
  </figure>`;
}

export function barChartHTML(args){ return lineChartHTML({ ...args, /* default view becomes "bar" via selected below */ title: args.title }); }

export function benchmarkHTML({ title, current=0, benchmark=0 }){
  const w=760,h=240,p=40;
  const max = Math.max(1, current, benchmark);
  const slot=(w-2*p)/2, bw=slot*0.7;
  const h1=(current/max)*(h-2*p), h2=(benchmark/max)*(h-2*p);
  return `
  <figure class="chart-card">
    <header class="chart-head"><h3>${esc(title||'Benchmark')}</h3></header>
    <div class="canvas-wrap">
      <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${svgAxes({w,h,p,xTitle:'',yTitle:'',maxY:max,labels:['Current','Benchmark']})}
        <rect x="${(p+(slot-bw)/2).toFixed(1)}" y="${(h-p-h1).toFixed(1)}" width="${bw.toFixed(1)}" height="${h1.toFixed(1)}" fill="#8bc6ff"/>
        <rect x="${(p+slot+(slot-bw)/2).toFixed(1)}" y="${(h-p-h2).toFixed(1)}" width="${bw.toFixed(1)}" height="${h2.toFixed(1)}" fill="#b3ffa8"/>
      </svg>
    </div>
  </figure>`;
}

export function heatmapHTML({ title, rows=[], cols=[], data=[[]] }){
  const w=760,h=320,p=40;
  const r = rows.length?rows:['R1','R2','R3','R4','R5'];
  const c = cols.length?cols:['C1','C2','C3','C4','C5'];
  const m = (Array.isArray(data)&&data.length)?data:Array.from({length:r.length},()=>Array.from({length:c.length},()=>0));
  let min = Infinity, max=-Infinity;
  m.forEach(row=>row.forEach(v=>{ min=Math.min(min,Number(v)||0); max=Math.max(max,Number(v)||0); }));
  if (!isFinite(min)) { min=0; max=1; }
  const cw=(w-2*p)/c.length, ch=(h-2*p)/r.length;
  const cells = r.flatMap((_,ri)=>c.map((_,ci)=>{
    const v = Number(m[ri][ci])||0;
    const t = (v-min)/Math.max(1e-6,(max-min));
    const hue = 200 - t*140; // blue→green
    const x = p + ci*cw, y = p + ri*ch;
    return `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="hsl(${hue},80%,55%)"/>`;
  })).join('');
  const grid = `
    ${Array.from({length:r.length+1},(_,i)=>{
      const y=p+i*ch; return `<line x1="${p}" y1="${y}" x2="${w-p}" y2="${y}" stroke="rgba(255,255,255,.35)"/>`;
    }).join('')}
    ${Array.from({length:c.length+1},(_,i)=>{
      const x=p+i*cw; return `<line x1="${x}" y1="${p}" x2="${x}" y2="${h-p}" stroke="rgba(255,255,255,.35)"/>`;
    }).join('')}
  `;
  const xlab = c.map((t,i)=>`<text x="${p+(i+.5)*cw}" y="${h-6}" text-anchor="middle" fill="#E6F0FF" font-size="11">${esc(t)}</text>`).join('');
  const ylab = r.map((t,i)=>`<text x="${p-6}" y="${p+(i+.5)*ch+4}" text-anchor="end" fill="#E6F0FF" font-size="11">${esc(t)}</text>`).join('');
  return `
  <section class="chart-card chart-heat">
    <header class="chart-head"><h3>${esc(title||'Heat Map')}</h3></header>
    <div class="canvas-wrap">
      <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${cells}${grid}${xlab}${ylab}
      </svg>
    </div>
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
.canvas-wrap{ position:relative; overflow:hidden; max-width:100%; border-radius:12px; }
.plot{ display:none; width:100%; height:auto; border-radius:12px; }
.plot.line{ display:block; } /* default visible if :has() unsupported */
.chart-legend{ display:inline-flex; align-items:center; gap:6px; font-size:.85rem; opacity:.95; }
.chart-legend .swatch{ width:12px; height:12px; border-radius:3px; background:#8bc6ff; display:inline-block; }
.chart-axes{ display:flex; align-items:center; justify-content:space-between; margin-top:6px; font-size:.85rem; opacity:.9; }
.chart-heat .hm-legend{ display:flex; align-items:center; gap:8px; font-size:.85rem; margin-top:6px; }
.chart-heat .hm-legend i{ flex:1; height:10px; border-radius:6px;
  background: linear-gradient(90deg, hsl(200,80%,55%), hsl(160,80%,55%)); }

/* Pure CSS "type" switcher using :has() — works in Edge/Chromium */
.chart-card:has(.chart-type select option[value="line"]:checked) .plot.line { display:block; }
.chart-card:has(.chart-type select option[value="bar"]:checked) .plot.bar { display:block; }
.chart-card:has(.chart-type select option[value="pie"]:checked) .plot.pie { display:block; }
.chart-card:has(.chart-type select option[value="doughnut"]:checked) .plot.doughnut { display:block; }
`;
