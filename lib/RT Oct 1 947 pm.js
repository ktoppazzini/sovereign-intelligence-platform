// ===============================
// lib/reportTemplate.js
// ===============================
// White-body template with navy cover + interactive visuals hydration.
// (Surgically updated: letter width, no horizontal scroll, dark text,
// remove Country/Tier/Size on cover, responsive canvases/SVGs,
// Implementation-roadmap.png path.)

import * as Graphs from '@/lib/reportGraphs';

const esc = (s='') =>
  String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function styles(){
  return `
  <style>
    /* --- Layout + Typography (scoped) ----------------------------------- */
    :root{ --navy:#0f294d; --ink:#0b1220; --rule:#e6edf5; --muted:#667085; }

    /* Prevent external styles from leaking in and causing white text, etc. */
    .report, .report * {
      box-sizing:border-box;
      color:#0b1220;               /* force dark body text */
      font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial;
    }

    html,body{ background:#fff; color:#0b1220; overflow-x:hidden; }

    .report{
      /* Letter portrait width (~8.5in @ 96dpi) and no horizontal scroll */
      max-width:816px;
      width:100%;
      margin:0 auto;
      padding:28px 28px 80px;
      background:#fff;
      border-radius:16px;
      overflow-x:hidden;
    }

    h1,h2,h3{ color:var(--navy); margin:0 0 8px; }
    h1{ font-size:40px; line-height:1.1 }
    h2{ font-size:24px; margin-top:26px }
    h3{ font-size:18px; margin-top:16px }

    /* Make any media responsive to prevent sideways scrollbar */
    .report img,
    .report svg,
    .report canvas,
    .report table{ max-width:100%; height:auto; }

    figure{ margin:16px 0 }
    .viz-wrap{ margin:12px 0 }
    .hidden{ display:none }

    /* --- Cover ----------------------------------------------------------- */
    .cover{
      background:var(--navy);
      color:#fff;                 /* cover text is intentionally white */
      padding:72px 0;
      margin-bottom:28px;
      border-radius:16px
    }
    .cover-inner{ max-width:816px; margin:0 auto; padding:0 28px }
    .cover-logo{ height:42px; margin-bottom:14px }
    .cover-title{ color:#fff }
    .cover-meta{ opacity:.95; display:grid; gap:6px }

    /* --- Body sections --------------------------------------------------- */
    .sec{
      background:#fff;
      border:1px solid var(--rule);
      border-radius:14px;
      padding:16px 18px;
      margin:18px 0
    }
    .sec-body p{ margin:10px 0 }

    /* Tables (zebra) */
    .report-table{ width:100%; border-collapse:collapse; margin:32px 0; background:#fff; }
    .report-table th,
    .report-table td{ border-bottom:1px solid var(--rule); padding:8px 10px; text-align:left }
    .report-table th{ background:var(--navy); color:#fff; }
    .report-table tr:nth-child(even) td{ background:#fbfdff }

    /* Implementation diagram overlay */
    .impl-wrap{ position:relative; margin:12px 0 }
    .impl-wrap img{ width:100%; border:1px solid var(--rule); border-radius:12px }
    .impl-labels{
      position:absolute; left:0; right:0; top:38%;
      display:grid; grid-template-columns:repeat(5,1fr);
      gap:8px; padding:0 6%;
    }
    .impl-label{ text-align:center }
    .impl-title{ font-weight:800; color:var(--navy) }
    .impl-cap{ color:#333; font-size:14px }

    /* Ensure canvases and fallbacks don’t cause width overflow */
    .viz-wrap canvas{ max-width:100% !important; height:auto !important; display:block; }
    .viz-wrap svg{ max-width:100% !important; height:auto !important; display:block; }

    /* Print to LETTER portrait */
    @media print {
      @page { size: Letter portrait; margin: 0.5in; }
      .cover{ break-after: page; }
    }
  </style>`;
}

function coverHTML(canon){
  return `
  <section class="cover">
    <div class="cover-inner">
      <img class="cover-logo" src="${esc(canon.logoUrl || 'public/images/secure.png')}" alt="Sovereign Intelligence"/>
      <h1 class="cover-title">${esc(canon.orgName)} — Reform Strategy Report</h1>
      <div class="cover-meta">
        <div><strong>Prepared for:</strong> ${esc(canon.preparedFor || canon.orgName)}</div>
        <div><strong>Prepared by:</strong> ${esc(canon.preparedBy || 'Sovereign Intelligence')}</div>
        <!-- Removed Country · Tier · Company size per request -->
        <div><strong>Time frame:</strong> ${esc(canon.timeFrame)} · <strong>Date:</strong> ${esc(canon.reportDate)}</div>
      </div>
    </div>
  </section>`;
}

function toc(items){
  return `<nav class="toc"><h2>Contents</h2><ol>${
    items.map((it,i)=>
      `<li><span style="color:var(--muted);font-weight:700">${i+1}.</span> <a href="#${it.id}">${esc(it.title)}</a></li>`
    ).join('')
  }</ol></nav>`;
}

function section(id,title,html){
  return `\n<section id="${id}" class="sec"><h2>${esc(title)}</h2><div class="sec-body">${html}</div></section>`;
}

/* ---------- bootloader to hydrate model-emitted blocks into live visuals --- */
function chartHydrator(){
  return `
  <script>
  (function(){
    function ensureChartJS(){
      return new Promise(function(res){
        if (window.Chart) return res();
        var s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/chart.js';
        s.onload=res; s.onerror=res; document.head.appendChild(s);
      });
    }
    function hydrateCharts(){
      if(!window.Chart) return;
      document.querySelectorAll('figure[data-chart]').forEach(function(fig){
        try{
          var spec = JSON.parse(fig.getAttribute('data-chart')||'{}');
          var c = fig.querySelector('canvas'); if(!c) return;
          new Chart(c.getContext('2d'), {
            type: spec.type || 'bar',
            data: { labels: spec.labels||[], datasets: spec.datasets||[] },
            options: Object.assign({
              responsive:true,
              maintainAspectRatio:true,
              plugins:{ title:{display:!!spec.title, text:spec.title}, legend:{display:true}},
              scales:{ x:{ticks:{autoSkip:true, maxRotation:0}}, y:{beginAtZero:true} }
            }, spec.options||{})
          });
          var fb = fig.querySelector('[data-fallback]'); if(fb) fb.classList.add('hidden');
          c.classList.remove('hidden');
        }catch(e){}
      });
    }
    function hydrateBenchmarks(){
      if(!window.Chart) return;
      document.querySelectorAll('figure[data-widget="benchmark"]').forEach(function(el){
        try{
          var spec = JSON.parse(el.getAttribute('data-spec')||'{}');
          var c = el.querySelector('canvas'); if(!c) return;
          new Chart(c.getContext('2d'), {
            type:'bar',
            data:{ labels:['Current','Benchmark'], datasets:[{ label: spec.label||'Benchmark', data:[Number(spec.current||0), Number(spec.benchmark||0)] }]},
            options:{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, title:{display:!!spec.title, text:spec.title||spec.label||'Benchmark'} } }
          });
          var fb = el.querySelector('[data-fallback]'); if(fb) fb.classList.add('hidden');
          c.classList.remove('hidden');
        }catch(e){}
      });
    }
    function hydrateHeatmaps(){
      var tip=document.createElement('div'); tip.className='rtip'; document.body.appendChild(tip);
      function showTip(x,y,t){ tip.textContent=t; tip.style.left=x+'px'; tip.style.top=y+'px'; tip.classList.add('show'); }
      function hideTip(){ tip.classList.remove('show'); }
      document.querySelectorAll('[data-heatmap]').forEach(function(box){
        var spec={}; try{ spec=JSON.parse(box.getAttribute('data-heatmap')||'{}'); }catch(e){}
        var rows=spec.rows||[], cols=spec.cols||[], data=spec.data||[];
        var cv=box.querySelector('canvas'); if(!cv) return;
        var ctx=cv.getContext('2d'), w=cv.width, h=cv.height, pad=24, iw=w-pad*2, ih=h-pad*2;
        var cw=iw/Math.max(1,cols.length), ch=ih/Math.max(1,rows.length);
        ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
        for(var r=0;r<rows.length;r++){
          for(var c=0;c<cols.length;c++){
            var v=Math.max(1,Math.min(5, Number((data[r]||[])[c]||1)));
            var a=0.15+(v/5)*0.65;
            ctx.fillStyle='rgba(220,38,38,'+a+')';
            ctx.fillRect(pad+c*cw, pad+r*ch, cw, ch);
            ctx.strokeStyle='#fff';
            ctx.strokeRect(pad+c*cw, pad+r*ch, cw, ch);
          }
        }
        ctx.fillStyle='#0b1220'; ctx.font='12px ui-sans-serif';
        for(var r=0;r<rows.length;r++){ ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillText(rows[r], pad-6, pad+r*ch+ch/2); }
        for(var c=0;c<cols.length;c++){ ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(cols[c], pad+c*cw+cw/2, pad+ih+6); }
        cv.addEventListener('mousemove', function(ev){
          var rect=cv.getBoundingClientRect(), x=ev.clientX-rect.left-pad, y=ev.clientY-rect.top-pad;
          if(x<0||y<0||x>iw||y>ih){ hideTip(); return; }
          var ci=Math.floor(x/cw), ri=Math.floor(y/ch); var v=(data[ri]||[])[ci];
          showTip(ev.clientX, ev.clientY, (rows[ri]||'')+' × '+(cols[ci]||'')+': '+v);
        });
        cv.addEventListener('mouseleave', hideTip);
        var fb = box.querySelector('[data-fallback]'); if(fb) fb.classList.add('hidden');
        cv.classList.remove('hidden');
      });
    }
    (async function(){ await ensureChartJS(); hydrateCharts(); hydrateBenchmarks(); hydrateHeatmaps(); })();
  })();
  </script>`;
}

/* PNG-backed implementation roadmap with dynamic text overlays */
function planOverlayHTML({ phases = [], imageSrc = 'public/images/Implementation-roadmap.png' } = {}){
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

export default function buildReformReportHTML({
  canon,
  sections,
  charts = {},
  phases = [],
  Graphs: G = Graphs,
  planDiagramHTML,   // optional external PNG overlay renderer
}){
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

  /* Build specs for interactive widgets */
  const trend = Array.isArray(charts.trend) ? charts.trend : [];
  const trendLabels = trend.map((_,i)=>`T${i+1}`);
  const trendSpec = {
    type:'line',
    title:'Projected Savings Over Time',
    labels: trendLabels,
    datasets:[{ label:'Projected savings', data: trend }]
  };

  const kpis = Array.isArray(charts.kpis) ? charts.kpis : [];
  const kpiLabels = kpis.map(k=>k.label);
  const kpiValues = kpis.map(k=>k.value);
  const kpiBarSpec = {
    type:'bar',
    title:'KPI Dashboard',
    labels:kpiLabels,
    datasets:[{ label:'Value', data:kpiValues }]
  };
  const costKpi = kpis.find(k=>/cost.?unit/i.test(k.label||''));
  const benchmarkSpec = costKpi
    ? { title:'Benchmark — Cost/Unit', label:'Cost/Unit',
        current:Number(costKpi.value||0),
        benchmark:Math.max(1,Math.round(Number(costKpi.value||0)*1.2)) }
    : null;

  const heat = Array.isArray(charts.heat)
    ? charts.heat
    : Array.from({length:5},()=>Array.from({length:5},()=>Math.floor(Math.random()*5)+1));
  const heatSpec = {
    rows:['Very Low','Low','Medium','High','Very High'],
    cols:['Negligible','Minor','Moderate','Major','Severe'],
    data: heat
  };

  /* Fallback SVGs (SSR-safe) */
  const savingsFallback = G.lineChartHTML(trend, { labels: trendLabels, title:'Projected Savings Over Time' });
  const kpiFallback     = G.barChartHTML(kpiValues, { labels: kpiLabels, title:'KPI Dashboard' });
  const heatFallback    = G.heatMapHTML(heat, { rowLabels: heatSpec.rows, colLabels: heatSpec.cols, title:'Risk Heat Map (Likelihood × Impact)' });

  const intro = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>${styles()}</head><body><article class="report">${coverHTML(canon)}${toc(items)}`;

  const execSec = section('executive','Executive Summary',
    `<div class="viz-wrap">
       <figure data-chart='${esc(JSON.stringify(trendSpec))}'>
         <canvas class="hidden" width="900" height="320"></canvas>
         <div data-fallback>${savingsFallback}</div>
       </figure>
     </div>${items[0].html}`);

  const financialsSec = section('financials','Financials',
    `<div class="viz-wrap">
       <figure data-chart='${esc(JSON.stringify(trendSpec))}'>
         <canvas class="hidden" width="900" height="320"></canvas>
         <div data-fallback>${savingsFallback}</div>
       </figure>
     </div>${items[2].html}`);

  const kpisSec = section('kpis','KPIs & Targets',
    `${benchmarkSpec ? `
      <div class="viz-wrap">
        <figure data-widget="benchmark" data-spec='${esc(JSON.stringify(benchmarkSpec))}'>
          <canvas class="hidden" width="780" height="320"></canvas>
          <div data-fallback>${
            Graphs.barChartHTML(
              [benchmarkSpec.current, benchmarkSpec.benchmark],
              { labels:['Current','Benchmark'], title:benchmarkSpec.title }
            )
          }</div>
        </figure>
      </div>` : ''}
     <div class="viz-wrap">
       <figure data-chart='${esc(JSON.stringify(kpiBarSpec))}'>
         <canvas class="hidden" width="900" height="300"></canvas>
         <div data-fallback>${kpiFallback}</div>
       </figure>
     </div>${items[3].html}`);

  const riskSec = section('risk','Risks & Mitigations',
    `<div class="viz-wrap" data-heatmap='${esc(JSON.stringify(heatSpec))}'>
       <canvas class="hidden" width="900" height="280"></canvas>
       <div data-fallback>${heatFallback}</div>
     </div>${items[6].html}`);

  /* Implementation plan: PNG + dynamic overlays */
  const impl = (typeof planDiagramHTML === 'function')
    ? planDiagramHTML({ phases, imageSrc:'/images/Implementation-roadmap.png' })
    : planOverlayHTML({ phases });

  const timelineSec = section('timeline','Implementation Timeline', `${impl}${items[4].html}`);

  const body = [
    execSec,
    section('current','Current State', items[1].html),
    financialsSec,
    kpisSec,
    timelineSec,
    section('ops','Operating Model', items[5].html),
    riskSec,
    section('roi','ROI & Next Steps', items[7].html),
  ].join('\\n');

  const out = `${intro}${body}${chartHydrator()}</article></body></html>`;
  return out;
}
