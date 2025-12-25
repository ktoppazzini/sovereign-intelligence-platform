/* eslint-disable no-console */
/**
 * lib/reportTemplate.js
 * - Scope styles under #report
 * - Hydrator lazy-loads Chart.js and renders all <figure data-chart="…">
 * - Warn loudly if no figures found under #report
 */

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

  const registryJSON = JSON.stringify(
    chartRegistry.map((e) => ({ id: e.id, config: e.config })),
  );

  const sectionBlock = (num, title, id, html) => `
    <section id="${id}" class="report-section">
      <h2 class="section-title"><span class="sec-no">${num}.</span> ${title}</h2>
      ${html || ''}
    </section>
  `;

  const CSS = `
  #report{ --bg:#0d0f13; --fg:#e8eefb; --muted:#a8b3c7; --accent:#3b82f6; --tile:#121620; --card:#0f141d; --table-border:#1f2937; }
  #report *{ box-sizing:border-box }
  #report a{ color:#9ec7ff }
  #report .report-shell{ max-width:1052px; margin:24px auto; padding:24px; color:var(--fg); background:transparent; }
  #report header.report-head{ display:flex; align-items:center; gap:16px; padding-bottom:16px; border-bottom:1px solid #152033; margin-bottom:18px }
  #report header.report-head img{ width:80px; height:80px; object-fit:contain }
  #report .report-meta small{ display:block; color:var(--muted) }
  #report h1,#report h2,#report h3{ margin:0 0 8px 0; color:var(--fg) }
  #report h1{ font-size:26px; letter-spacing:.2px }
  #report h2.section-title{ font-size:22px; margin:24px 0 12px; border-bottom:1px solid #162135; padding-bottom:8px }
  #report h3{ font-size:16px; color:#cfe1ff; margin-top:12px }
  #report .sec-no{ color:#7fb1ff; margin-right:6px }
  #report .chart-note{ color:#b9c8e6; font-size:13px; margin:8px 4px 0 4px }
  #report .report-table{ width:100%; border-collapse:collapse; margin:8px 0; background:#0c1018; border:1px solid var(--table-border) }
  #report .report-table th,#report .report-table td{ padding:8px 10px; border-bottom:1px solid var(--table-border) }
  #report .report-table th{ background:#0f141d; color:#d9e6ff; text-align:left }
  #report .table-title{ font-weight:700; color:#fff; margin:6px 0 6px 0; background:#000; padding:6px 10px; border-radius:6px; display:inline-block }
  #report #appendices h3{ margin-top:20px }
  #report footer{ color:#8aa2c6; margin-top:18px; font-size:12px }
  `;

  const HYDRATOR = `
  <script>
  (function(){
    function parseSpec(fig){
      try{
        var raw = fig.getAttribute('data-chart') || '';
        var json = raw.replace(/&quot;/g, '"').replace(/&amp;/g,'&');
        return JSON.parse(json);
      }catch(e){ console.warn('[report.hydrator] bad data-chart:', e); return null; }
    }
    function ensureCanvas(fig){
      var c = fig.querySelector('canvas');
      if(!c){ c = document.createElement('canvas'); fig.appendChild(c); }
      return c.getContext('2d');
    }
    function renderAll(){
      //var figs = document.querySelectorAll('#report figure[data-chart]');
      var figs = document.querySelectorAll('#report figure[data-chart]:not([data-hydrated="true"])');
      if(!figs.length){ console.warn('[report.hydrator] no-figures-found under #report'); return; }
      figs.forEach(function(fig){
        var spec = parseSpec(fig); if(!spec) return;
        try{
          var ctx = ensureCanvas(fig);
          if(Array.isArray(spec.datasets) && spec.datasets.length){
            var d = spec.datasets[0];
            d.borderColor = d.borderColor || '#ff7a00';
            d.backgroundColor = d.backgroundColor || 'rgba(255,122,0,0.15)';
            if(typeof d.tension !== 'number') d.tension = 0.35;
            if(typeof d.pointRadius !== 'number') d.pointRadius = 3;
            if(typeof d.fill !== 'boolean') d.fill = true;
          }
          var cfg = {
            type: (spec.type||'line').toLowerCase(),
            data: { labels: spec.labels||[], datasets: spec.datasets||[] },
            options: Object.assign({
              responsive:true, maintainAspectRatio:false,
              plugins:{ legend:{ display:false }, title:{ display:false } },
              scales:{
                x:{ title:{ display: !!spec.xTitle, text: spec.xTitle||'' } },
                y:{ title:{ display: !!spec.yTitle, text: spec.yTitle||'' } }
              }
            }, spec.options||{})
          };
          // eslint-disable-next-line no-undef
          new Chart(ctx, cfg);
          fig.setAttribute('data-hydrated','true');
        }catch(e){ console.warn('[report.hydrator] render failed:', e); }
      });
      console.log('[report.hydrator] charts.rendered', figs.length);
    }
    function start(){
      if(window.Chart){ renderAll(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      s.onload = renderAll;
      s.onerror = function(){ console.warn('[report.hydrator] Chart.js load failed'); };
      document.head.appendChild(s);
    }
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', start);
    } else { start(); }
  })();
  </script>
  `;
  // [KT] Drop repeated charts/heatmaps within a section and across merges
  function dedupeVisuals(html) {
    try {
      const src = String(html||'');
      const re = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;
      const seen = new Set(); let out = '', last = 0, m;
      const sig = (frag) => {
        try {
          const c = frag.match(/data-chart=['"]([\s\S]*?)['"]/i);
          if (c) { const o = JSON.parse(c[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&')); return 'chart|'+String(o.title||'').toLowerCase()+'|'+String(o.type||'').toLowerCase(); }
          const h = frag.match(/data-heatmap=['"]([\s\S]*?)['"]/i);
          if (h) { const o = JSON.parse(h[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&')); return 'heatmap|'+String(o.title||'').toLowerCase(); }
        } catch {}
        return '';
      };
      while ((m = re.exec(src)) !== null) {
        const start = m.index, end = re.lastIndex, frag = m[0];
        out += src.slice(last, start);
        const s = sig(frag);
        if (s && seen.has(s)) {
          // skip duplicate
        } else {
          if (s) seen.add(s);
          out += frag;
        }
        last = end;
      }
      out += src.slice(last);
      return out;
    } catch { return html; }
  }

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Reform Report — ${org}</title>
      <style>${CSS}</style>
    </head>
    <body>
      <div id="report" class="report-shell">
        <header class="report-head">
          <img src="${logoUrl}" alt="Logo"/>
          <div class="report-meta">
            <h1>Reform Report — ${org}</h1>
            <small>Prepared for ${preparedFor || org}${preparedBy ? ` · Prepared by ${preparedBy}` : ''} · ${reportDate}</small>
          </div>
        </header>

        ${sectionBlock('1', 'Executive Summary', 'executive-summary', dedupeVisuals(sections.exec || ''))}
${sectionBlock('2', 'Current State', 'current-state', dedupeVisuals(sections.current || ''))}
${sectionBlock('3', 'Financials', 'financials', dedupeVisuals(sections.financials || ''))}
${sectionBlock('4', 'KPIs & Targets', 'kpis-targets', dedupeVisuals(sections.kpis || ''))}
${sectionBlock('5', 'Implementation Plan', 'implementation-plan', dedupeVisuals(sections.timeline || sections.impl || ''))}
${sectionBlock('6', 'Operating Model', 'operating-model', dedupeVisuals(sections.ops || ''))}
${sectionBlock('7', 'Risks & Mitigations', 'risks-mitigations', dedupeVisuals(sections.risk || ''))}
${sectionBlock('8', 'ROI & Next Steps', 'roi-next', dedupeVisuals(sections.roi || ''))}
        ${sectionBlock('9', 'Appendix', 'appendices', sections.appendix || '<section id="appendices"></section>')}
        <footer>Generated by Sovereign Intelligence</footer>

        <script id="chart-registry" type="application/json">${registryJSON}</script>
      </div>
      ${HYDRATOR}
      <div id="chart-hydrator-hook" data-ready="true" style="display:none"></div>
    </body>
  </html>
  `;
}
