// lib/reportTemplate.js
/* eslint-disable no-console */
export default function buildReformReportHTML(opts = {}) {
  const {
    canon = {},
    sections = {},
    phases = [],
    chartRegistry = [],
    logoUrl = '/images/secure.png',
  } = opts;

  const org = canon.orgName || 'Client';
  const preparedFor = canon.preparedFor || '';
  const preparedBy = canon.preparedBy || '';
  const reportDate = canon.reportDate || '';

  const section = (id, title, html) => `
    <section id="${id}" class="report-section">
      <h2 class="section-title">${title}</h2>
      ${html||''}
    </section>`;

  const CSS = `
  #report{ --bg:#0b1220; --fg:#e6f0ff; --muted:#aac0e0; --tile:#0e1626; --table-border:#1b2942; }
  #report{ max-width:1040px; margin:18px auto; padding:22px; color:var(--fg); background:transparent }
  #report h1,#report h2,#report h3{ margin:0 0 10px 0 }
  #report h1{ font-size:26px }
  #report .section-title{ font-size:20px; border-bottom:1px solid #142038; padding-bottom:6px; margin:18px 0 12px }
  #report .chart-note{ color:#bcd1f2; font-size:13px; margin:8px 4px 0 4px }
  #report .report-table{ width:100%; border-collapse:collapse; background:#0c1322; border:1px solid var(--table-border) }
  #report .report-table th,#report .report-table td{ padding:8px 10px; border-bottom:1px solid var(--table-border) }
  #report .report-table th{ background:#0e1a30; color:#e6f0ff; text-align:left }
  #report .table-title{ font-weight:700; color:#fff; margin:6px 0 6px 0; background:#000; padding:6px 10px; border-radius:6px; display:inline-block }
  `;

  const HYDRATOR = `
  <script>
  (function(){
    function parseSpec(fig){
      try{ return JSON.parse((fig.getAttribute('data-chart')||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&')); }
      catch(e){ console.warn('[hydrator] bad data-chart', e); return null; }
    }
    function ensureCanvas(fig){ var c=fig.querySelector('canvas'); if(!c){ c=document.createElement('canvas'); fig.appendChild(c); } return c.getContext('2d'); }
    function renderAll(){
      var figs = document.querySelectorAll('#report figure[data-chart]'); if(!figs.length) return;
      figs.forEach(function(fig){
        var spec=parseSpec(fig); if(!spec) return;
        try{
          var ctx = ensureCanvas(fig);
          if(Array.isArray(spec.datasets) && spec.datasets.length){
            var d=spec.datasets[0]; d.borderColor=d.borderColor||'#ff7a00'; d.backgroundColor=d.backgroundColor||'rgba(255,122,0,0.15)';
            if(typeof d.tension!=='number') d.tension=0.35; if(typeof d.pointRadius!=='number') d.pointRadius=3; if(typeof d.fill!=='boolean') d.fill=true;
          }
          var cfg={ type:(spec.type||'line').toLowerCase(), data:{ labels:spec.labels||[], datasets:spec.datasets||[] }, options:Object.assign({
            responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
            scales:{ x:{ title:{ display:!!spec.xTitle, text:spec.xTitle||'' } }, y:{ title:{ display:!!spec.yTitle, text:spec.yTitle||'' } } }
          }, spec.options||{}) };
          // eslint-disable-next-line no-undef
          new Chart(ctx, cfg);
        }catch(e){ console.warn('[hydrator] render failed', e); }
      });
    }
    function start(){ if(window.Chart){ renderAll(); return; } var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/chart.js'; s.onload=renderAll; s.onerror=function(){console.warn('[hydrator] Chart.js load failed')}; document.head.appendChild(s); }
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', start); } else { start(); }
  })();
  </script>`;

  const html = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Reform Report — ${org}</title>
      <style>${CSS}</style>
    </head>
    <body>
      <div id="report">
        <header>
          <h1>Reform Report — ${org}</h1>
          <div>${reportDate}</div>
        </header>
        ${section('exec','Executive Summary', sections.exec || '')}
        ${section('current','Current State', sections.current || '')}
        ${section('financials','Financials', sections.financials || '')}
        ${section('kpis','KPIs & Targets', sections.kpis || '')}
        ${section('timeline','Implementation Plan', sections.timeline || '')}
        ${section('ops','Operating Model', sections.ops || '')}
        ${section('risk','Risks & Mitigations', sections.risk || '')}
        ${section('roi','ROI & Next Steps', sections.roi || '')}
        ${section('appendices','Appendix', sections.appendix || '')}
      </div>
      ${HYDRATOR}
    </body>
  </html>`;

  return html;
}
