// ===============================
// lib/reportTemplate.js
// ===============================
// White-body template with navy cover, blue chart canvases, type switchers,
// exec-friendly paragraph chunking, and dynamic implementation roadmap overlay.

import * as Graphs from '@/lib/reportGraphs'; // keeps your existing graph fallbacks

const esc = (s='') =>
  String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ---------- styles: white report, navy headings, readable tables -------------
function styles(){
  return `
  <style>
    :root{
      --navy:#0f294d; --ink:#0b1220; --rule:#e6edf5; --muted:#667085;
      --heading-blue:#0f294d; --text-safe:#0b1220; --bg-safe:#ffffff;
      --chart-canvas:#e8f1ff; /* light blue chart area */
    }
    html,body{
      background:#fff;
      color:var(--ink);
      font:16px/1.58 ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;
      overflow-x:hidden;
    }
    a{color:#0f62fe;text-decoration:none}

    .report{
      max-width:980px; width:100%;
      margin:0 auto; padding:28px 28px 80px;
      background:var(--bg-safe); color:var(--text-safe);
      box-sizing:border-box;
    }

    h1,h2,h3{color:var(--heading-blue);margin:0 0 8px}
    h1{font-size:40px;line-height:1.1}
    h2{font-size:24px;margin-top:26px}
    h3{font-size:18px;margin-top:16px}
    .sec-body, .sec-body p, .sec-body li, .sec-body span { color: var(--text-safe); }

    /* Cover */
    .cover{background:var(--navy);color:#fff;padding:72px 0;margin-bottom:28px;border-radius:16px}
    .cover-inner{max-width:980px;margin:0 auto;padding:0 28px}
    .cover-logo{height:42px;margin-bottom:14px}
    .cover-title{color:#fff}
    .cover-meta{opacity:.95;display:grid;gap:6px}

    /* TOC + sections */
    .toc{background:#f6f9fe;border:1px solid var(--rule);border-radius:12px;padding:16px 20px;margin:16px 0}
    .toc ol{margin:0;padding-left:20px}
    .toc a{color:var(--navy)}
    .sec{background:#fff;border:1px solid var(--rule);border-radius:14px;padding:16px 18px;margin:18px 0}
    .sec-body p{margin:10px 0}

    /* Zebra tables (AI-provided <table> honor these) */
    table, .report-table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid var(--rule);padding:8px 10px;text-align:left}
    tr:nth-child(even){background:#fbfdff}

    /* Chart frames + controls */
    figure{margin:16px 0}
    .viz-wrap{margin:12px 0}
    .hidden{display:none}
    .chart-controls{
      display:flex; gap:8px; align-items:center; margin:6px 0 10px;
    }
    .chart-controls label{font-size:12px;color:var(--muted)}
    .chart-controls select{border:1px solid var(--rule);border-radius:8px;padding:4px 8px;background:#fff}

    /* Implementation diagram overlay (uses public/images/Implementation-roadmap.png) */
    .impl-wrap{position:relative;margin:12px 0}
    .impl-wrap img{width:100%;border:1px solid var(--rule);border-radius:12px}
    .impl-labels{position:absolute;left:0;right:0;top:38%;
      display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:0 6%}
    .impl-label{text-align:center}
    .impl-title{font-weight:800;color:var(--navy)}
    .impl-cap{color:#333;font-size:14px}

    /* tiny tooltip used by the interactive heatmap */
    .rtip{position:fixed;z-index:50;background:#111;color:#fff;padding:6px 8px;border-radius:6px;font-size:12px;
          transform:translate(-50%,-120%);pointer-events:none;white-space:nowrap;opacity:0;transition:.08s}
    .rtip.show{opacity:1}
  </style>`;
}

// ---------- cover & layout ----------------------------------------------------
function coverHTML(canon){
  return `
  <section class="cover">
    <div class="cover-inner">
      <img class="cover-logo" src="${esc(canon.logoUrl || '/images/secure.png')}" alt="Sovereign Intelligence"/>
      <h1 class="cover-title">${esc(canon.orgName)} — Reform Strategy Report</h1>
      <div class="cover-meta">
        <div><strong>Prepared for:</strong> ${esc(canon.preparedFor || canon.orgName)}</div>
        <div><strong>Prepared by:</strong> ${esc(canon.preparedBy || 'Sovereign Intelligence')}</div>
        <div><strong>Country:</strong> ${esc(canon.country)} · <strong>Tier:</strong> ${esc(canon.tier)} · <strong>Company size:</strong> ${esc(canon.companySize)}</div>
        <div><strong>Time frame:</strong> ${esc(canon.timeFrame)} · <strong>Date:</strong> ${esc(canon.reportDate)}</div>
      </div>
    </div>
  </section>`;
}

function toc(items){
  return `<nav class="toc"><h2>Contents</h2><ol>${items
    .map((it,i)=>`<li><span style="color:var(--muted);font-weight:700">${i+1}.</span> <a href="#${it.id}">${esc(it.title)}</a></li>`)
    .join('')}</ol></nav>`;
}

function section(id,title,html){
  return `\n<section id="${id}" class="sec"><h2>${esc(title)}</h2><div class="sec-body">${html}</div></section>`;
}

// ---------- helper: derive period labels (months if <=12, else years) --------
function periodLabels(count, timeFrameText=''){
  const lower = String(timeFrameText||'').toLowerCase();
  const isMonthy = /month/.test(lower);
  if (count <= 12 || isMonthy){
    return Array.from({length:count}, (_,i)=>`M${i+1}`);
  }
  return Array.from({length:count}, (_,i)=>`Y${i+1}`);
}

// ---------- implementation diagram (PNG + dynamic text overlays) -------------
export function planDiagramHTML({ phases = [], imageSrc = '/images/Implementation-roadmap.png' } = {}){
  const five = (phases||[]).slice(0,5);
  while (five.length < 5) five.push({ title:`Phase ${five.length+1}`, caption:'' });
  const cells = five.map(p=>`
    <div class="impl-label">
      <div class="impl-title">${esc(p.title||'')}</div>
      <div class="impl-cap">${esc(p.caption||'')}</div>
    </div>`).join('');
  return `
  <div class="impl-wrap">
    <img src="${imageSrc}" alt="Implementation Plan"/>
    <div class="impl-labels">${cells}</div>
  </div>`;
}

// ---------- interactive bootloader (Chart.js + heatmap + type switchers) -----
function bootstrapJS(){
  return `
  <script>
  (function(){
    // Load Chart.js once (CDN). If it fails, SVG fallbacks remain visible.
    function ensureChartJS(){
      return new Promise(function(resolve){
        if (window.Chart) return resolve();
        var s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/chart.js';
        s.onload=resolve; s.onerror=resolve;
        document.head.appendChild(s);
      });
    }

    // Blue chart-area background plugin
    function registerBlueCanvas(){
      if(!window.Chart) return;
      const bg = {
        id:'chartAreaBG',
        beforeDraw(chart, args, opts){
          const {ctx, chartArea} = chart;
          if (!chartArea) return;
          ctx.save();
          ctx.fillStyle = (opts && opts.color) || getComputedStyle(document.documentElement).getPropertyValue('--chart-canvas') || '#e8f1ff';
          ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
          ctx.restore();
        }
      };
      window.Chart.register(bg);
    }

    // Build a Chart.js instance from a spec
    function buildChart(canvas, spec, typeOverride){
      const type = typeOverride || spec.type || 'bar';
      const data = { labels: spec.labels||[], datasets: spec.datasets||[] };
      const options = Object.assign({
        responsive:true,
        maintainAspectRatio:false,
        plugins:{
          chartAreaBG:{ color: '#e8f1ff' },
          title:{ display: !!spec.title, text: spec.title },
          legend:{ display: true }
        },
        scales:{
          x:{ ticks:{ autoSkip:true, maxRotation:0 }, grid:{ color:'rgba(15,41,77,0.1)'} },
          y:{ beginAtZero:true, grid:{ color:'rgba(15,41,77,0.1)'} }
        }
      }, spec.options||{});
      const ctx = canvas.getContext('2d');
      return new Chart(ctx, { type, data, options });
    }

    function attachTypeSwitcher(fig, makeChart){
      const wrap = document.createElement('div');
      wrap.className = 'chart-controls';
      wrap.innerHTML = '<label>Chart type:</label>';
      const sel = document.createElement('select');
      ['bar','line','doughnut','radar'].forEach(t=>{
        const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o);
      });
      wrap.appendChild(sel);
      fig.prepend(wrap);
      let chart = makeChart(sel.value);
      sel.addEventListener('change', function(){
        try{ chart.destroy(); }catch(e){}
        chart = makeChart(sel.value);
      });
    }

    function hydrateCharts(){
      if (!window.Chart) return; // keep SVG fallbacks
      document.querySelectorAll('figure[data-chart]').forEach(function(fig){
        try{
          var spec = JSON.parse(fig.getAttribute('data-chart')||'{}');
          var canvas = fig.querySelector('canvas');
          if (!canvas) return;
          const makeChart = (type)=>buildChart(canvas, spec, type);
          attachTypeSwitcher(fig, makeChart);
          // hide fallback SVG (if present)
          var fallback = fig.querySelector('[data-fallback]');
          if (fallback) fallback.classList.add('hidden');
          canvas.classList.remove('hidden');
        }catch(e){}
      });
    }

    // Simple benchmark widget (2 bars: current vs benchmark), also with type switcher.
    function hydrateBenchmarks(){
      if (!window.Chart) return;
      document.querySelectorAll('figure[data-widget="benchmark"]').forEach(function(el){
        try{
          var spec = JSON.parse(el.getAttribute('data-spec')||'{}');
          var canvas = el.querySelector('canvas'); if (!canvas) return;
          const baseSpec = {
            title: spec.title || spec.label || 'Benchmark',
            labels: ['Current','Benchmark'],
            datasets: [{ label: spec.label || 'Benchmark', data:[Number(spec.current||0), Number(spec.benchmark||0)] }]
          };
          const makeChart = (type)=>buildChart(canvas, { ...baseSpec, type }, type);
          // controls
          const wrap = document.createElement('div');
          wrap.className = 'chart-controls';
          wrap.innerHTML = '<label>Chart type:</label>';
          const sel = document.createElement('select');
          ['bar','line','radar','doughnut'].forEach(t=>{
            const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o);
          });
          wrap.appendChild(sel);
          el.prepend(wrap);
          let chart = makeChart(sel.value);
          sel.addEventListener('change', function(){ try{ chart.destroy(); }catch(e){} chart = makeChart(sel.value); });

          var fb = el.querySelector('[data-fallback]'); if (fb) fb.classList.add('hidden');
          canvas.classList.remove('hidden');
        }catch(e){}
      });
    }

    // Lightweight heatmap with hover tooltip (no Chart.js dependency)
    function hydrateHeatmaps(){
      var tip = document.createElement('div'); tip.className='rtip'; document.body.appendChild(tip);
      function showTip(x,y,text){ tip.textContent=text; tip.style.left=x+'px'; tip.style.top=y+'px'; tip.classList.add('show'); }
      function hideTip(){ tip.classList.remove('show'); }

      document.querySelectorAll('[data-heatmap]').forEach(function(box){
        var spec = {};
        try{ spec = JSON.parse(box.getAttribute('data-heatmap')||'{}'); }catch(e){}
        var rows = spec.rows||[], cols = spec.cols||[], data = spec.data||[];
        var canvas = box.querySelector('canvas'); if (!canvas) return;
        var w = canvas.width, h = canvas.height;
        var ctx = canvas.getContext('2d');
        var pad = 24, innerW = w - pad*2, innerH = h - pad*2;
        var cw = innerW / Math.max(1, cols.length), ch = innerH / Math.max(1, rows.length);

        // draw grid
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
        for (var r=0;r<rows.length;r++){
          for (var c=0;c<cols.length;c++){
            var val = Math.max(1, Math.min(5, Number((data[r]||[])[c]||1)));
            var alpha = 0.15 + (val/5)*0.65;
            ctx.fillStyle = 'rgba(220,38,38,'+alpha+')';
            ctx.fillRect(pad + c*cw, pad + r*ch, cw, ch);
            ctx.strokeStyle = '#fff'; ctx.strokeRect(pad + c*cw, pad + r*ch, cw, ch);
          }
        }
        // labels
        ctx.fillStyle = '#0b1220'; ctx.font='12px ui-sans-serif';
        for (var r=0;r<rows.length;r++){ ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillText(rows[r], pad-6, pad + r*ch + ch/2); }
        for (var c=0;c<cols.length;c++){ ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(cols[c], pad + c*cw + cw/2, pad + innerH + 6); }

        canvas.addEventListener('mousemove', function(ev){
          var rect = canvas.getBoundingClientRect();
          var x = ev.clientX - rect.left - pad, y = ev.clientY - rect.top - pad;
          if (x<0||y<0||x>innerW||y>innerH){ hideTip(); return; }
          var ci = Math.floor(x/cw), ri = Math.floor(y/ch);
          var val = (data?.[ri]?.[ci] ?? '');
          showTip(ev.clientX, ev.clientY, (rows[ri]||'')+' × '+(cols[ci]||'')+': '+val);
        });
        canvas.addEventListener('mouseleave', hideTip);

        var fb = box.querySelector('[data-fallback]'); if (fb) fb.classList.add('hidden');
        canvas.classList.remove('hidden');
      });
    }

    // Exec readability: split very long paragraphs into smaller ones (2–4 sentences each)
    function chunkLongParagraphs(){
      document.querySelectorAll('.sec-body').forEach(function(root){
        const paras = Array.from(root.querySelectorAll(':scope > p'));
        paras.forEach(function(p){
          const text = p.textContent||'';
          if (text.length < 650) return; // keep short ones as-is
          const parts = text.match(/[^.!?]+[.!?]+/g) || [text];
          const newNodes = [];
          let buffer = [];
          parts.forEach((sent, i)=>{
            buffer.push(sent.trim());
            if (buffer.join(' ').length > 350 || i === parts.length-1){
              const np = document.createElement('p');
              np.textContent = buffer.join(' ');
              newNodes.push(np);
              buffer = [];
            }
          });
          if (newNodes.length){
            const parent = p.parentNode;
            newNodes.forEach(n=>parent.insertBefore(n, p));
            parent.removeChild(p);
          }
        });
      });
    }

    (async function(){
      await ensureChartJS();
      registerBlueCanvas();
      hydrateCharts();
      hydrateBenchmarks();
      hydrateHeatmaps();
      chunkLongParagraphs();
    })();
  })();
  </script>`;
}

// ---------- main builder ------------------------------------------------------
export default function buildReformReportHTML({ canon, sections, charts = {}, phases = [], Graphs: G = Graphs }){
  const items = [
    { id:'executive',  title:'Executive Summary',       html: sections.exec },
    { id:'current',    title:'Current State',           html: sections.current },
    { id:'financials', title:'Financials',              html: sections.financials },
    { id:'kpis',       title:'KPIs & Targets',          html: sections.kpis },
    { id:'timeline',   title:'Implementation Timeline', html: sections.timeline },
    { id:'ops',        title:'Operating Model',         html: sections.ops },
    { id:'risk',       title:'Risks & Mitigations',     html: sections.risk },
    { id:'roi',        title:'ROI & Next Steps',        html: sections.roi },
  ];

  // ---- Build specs for the interactive widgets (driven by 'charts' or model HTML)
  const trend = Array.isArray(charts.trend) ? charts.trend : [];
  const labels = periodLabels(trend.length, canon?.timeFrame);
  const savingsSpec = {
    type:'line',
    title:'Projected Savings Over Time',
    labels,
    datasets:[{ label:'Projected savings', data: trend }]
  };

  // Financials: expenditures + payback if provided (two datasets)
  const fin = charts.financials || {};
  const finLabels = Array.isArray(fin.labels) ? fin.labels : labels;
  const finDatasets = Array.isArray(fin.datasets) ? fin.datasets : [];
  const financialSpec = {
    type:'line',
    title:'Expenditures & Payback',
    labels: finLabels,
    datasets: finDatasets.length ? finDatasets : [
      { label:'Expenditures', data: trend.map(v=>Math.round(v*0.6)) },
      { label:'Payback',      data: trend }
    ]
  };

  // KPIs: dashboard bar + optional benchmarks
  const kpis = Array.isArray(charts.kpis) ? charts.kpis : [];
  const kpiLabels = kpis.map(k=>k.label);
  const kpiValues = kpis.map(k=>k.value);
  const kpiBarSpec = {
    type:'bar',
    title:'KPI Dashboard',
    labels: kpiLabels,
    datasets: [{ label:'Value', data: kpiValues }]
  };
  const benchA = charts.benchA || null; // e.g., {title,label,current,benchmark}
  const benchB = charts.benchB || null;

  // Risk heatmap spec
  const heat = Array.isArray(charts.heat) ? charts.heat :
    Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1));
  const heatSpec = {
    rows:['Very Low','Low','Medium','High','Very High'],
    cols:['Negligible','Minor','Moderate','Major','Severe'],
    data: heat
  };

  // ---- Fallback SVGs (SSR) so you never ship an empty box
  const savingsFallback = G.lineChartHTML(trend, { labels, title:'Projected Savings Over Time' });
  const financialFallback = G.lineChartHTML(financialSpec.datasets[0]?.data || [], { labels: finLabels, title:'Expenditures & Payback' });
  const kpiFallback     = G.barChartHTML(kpiValues, { labels: kpiLabels, title:'KPI Dashboard' });
  const heatFallback    = Graphs.heatmapHTML(heat, { rowLabels: heatSpec.rows, colLabels: heatSpec.cols, title:'Risk Heat Map (Likelihood × Impact)' });

  // ---- Cover & TOC
  const intro = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>${styles()}</head><body><article class="report">
    ${coverHTML(canon)}${toc(items)}`;

  // ---- Sections with visuals in the right places (interactive + fallback)
  const execSec = section('executive','Executive Summary',
    `<div class="viz-wrap">
       <figure data-chart='${esc(JSON.stringify(savingsSpec))}'>
         <div class="chart-controls"></div>
         <canvas class="hidden" width="900" height="320" style="aspect-ratio: 3 / 1;"></canvas>
         <div data-fallback>${savingsFallback}</div>
       </figure>
     </div>${items[0].html}`);

  const currentSec = section('current','Current State', items[1].html);

  const financialsSec = section('financials','Financials',
    `<div class="viz-wrap">
       <figure data-chart='${esc(JSON.stringify(financialSpec))}'>
         <div class="chart-controls"></div>
         <canvas class="hidden" width="900" height="320" style="aspect-ratio: 3 / 1;"></canvas>
         <div data-fallback>${financialFallback}</div>
       </figure>
     </div>${items[2].html}`);

  const kpiBenchBlocks = [benchA, benchB].filter(Boolean).map((b,i)=>`
    <div class="viz-wrap">
      <figure data-widget="benchmark" data-spec='${esc(JSON.stringify(b))}'>
        <div class="chart-controls"></div>
        <canvas class="hidden" width="780" height="320" style="aspect-ratio: 39 / 16;"></canvas>
        <div data-fallback>${Graphs.barChartHTML([Number(b.current||0), Number(b.benchmark||0)], { labels:['Current','Benchmark'], title:b.title||b.label||('Benchmark '+(i+1)) })}</div>
      </figure>
    </div>`).join('');

  const kpisSec = section('kpis','KPIs & Targets',
    `${kpiBenchBlocks}
     <div class="viz-wrap">
       <figure data-chart='${esc(JSON.stringify(kpiBarSpec))}'>
         <div class="chart-controls"></div>
         <canvas class="hidden" width="900" height="300" style="aspect-ratio: 3 / 1;"></canvas>
         <div data-fallback>${kpiFallback}</div>
       </figure>
     </div>${items[3].html}`);

  // Implementation plan: PNG + dynamic overlays (phases come from model extraction)
  const impl = planDiagramHTML({ phases, imageSrc:'/images/Implementation-roadmap.png' });
  const timelineSec = section('timeline','Implementation Timeline', `${impl}${items[4].html}`);

  const opsSec  = section('ops','Operating Model', items[5].html);

  const riskSec = section('risk','Risks & Mitigations',
    `<div class="viz-wrap" data-heatmap='${esc(JSON.stringify(heatSpec))}'>
       <canvas class="hidden" width="900" height="280" style="aspect-ratio: 45 / 14;"></canvas>
       <div data-fallback>${heatFallback}</div>
     </div>${items[6].html}`);

  const roiSec  = section('roi','ROI & Next Steps', items[7].html);

  // ---- Inline bootloader that hydrates everything to live charts and chunks paragraphs
  const out = `${intro}${[
    execSec, currentSec, financialsSec, kpisSec, timelineSec, opsSec, riskSec, roiSec
  ].join('\n')}${bootstrapJS()}</article></body></html>`;
  return out;
}
