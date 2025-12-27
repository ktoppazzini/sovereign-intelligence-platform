'use client';

import { useEffect } from 'react';

export default function ChartHydrator() {
  useEffect(() => {
    let disposed = false;
    const chartInstances = new Set();

    const log = (...a) => console.log('[page.hydrator]', ...a);
    const warn = (...a) => console.warn('[page.hydrator]', ...a);

     async function ensureChartLib() {
// cached?
if (window.__SR_CHART__) return window.__SR_CHART__;
// already provided by your scripts (e.g., /reform-wire.js)?
if (window.Chart) { window.__SR_CHART__ = window.Chart; return window.Chart; }
if (window.ReformWire?.Chart) { window.__SR_CHART__ = window.ReformWire.Chart; return window.ReformWire.Chart; }
// load from CDN (no install)
try {
await new Promise((res, rej) => {
const s = document.createElement('script');
s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
s.async = true;
 s.onload = res;
 s.onerror = rej;
 document.head.appendChild(s);
});
 if (window.Chart) { window.__SR_CHART__ = window.Chart; return window.Chart; }
} catch (e) {
 warn('CDN load failed', e);
  }
  warn('Chart unavailable (no global and CDN blocked).');
     return null;
  }

    function parseSpec(fig) {
      try {
        const raw = fig.getAttribute('data-chart') || '';
        const json = raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        return JSON.parse(json);
      } catch (e) {
        warn('bad data-chart spec:', e);
        return null;
      }
    }

    function getOrCreateCanvas(fig) {
      let canvas = fig.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '280px';
        fig.appendChild(canvas);
      }
      return canvas;
    }

    function destroyAll() {
      for (const ch of chartInstances) {
        try { ch.destroy?.(); } catch {}
      }
      chartInstances.clear();
      document
        .querySelectorAll('#report canvas[data-chart-bound="true"]')
        .forEach((c) => {
          delete c.__chartInstance;
          c.removeAttribute('data-chart-bound');
        });
    }

    async function hydrateNow() {
      const root = document.querySelector('#report');
      if (!root) { warn('no #report found'); return; }

      const figs = root.querySelectorAll('figure[data-chart]');
      if (!figs.length) { warn('no-figures-found under #report'); return; }

      const Chart = await ensureChartLib();
      if (!Chart) return;

      destroyAll();

      try {
        Chart.defaults.color = '#FFFFFF';
        if (Chart.defaults.plugins?.legend?.labels) {
          Chart.defaults.plugins.legend.labels.color = '#FFFFFF';
        }
      } catch {}

      
      figs.forEach((fig, idx) => {
        try {
          const spec = parseSpec(fig);
          if (!spec) return;

          const ds0 = Array.isArray(spec.datasets) && spec.datasets.length
            ? spec.datasets[0]
            : { data: [] };

          ds0.borderColor = ds0.borderColor || '#ff7a00';
          ds0.backgroundColor = ds0.backgroundColor || 'rgba(255,122,0,0.15)';
          if (typeof ds0.tension !== 'number') ds0.tension = 0.35;
          if (typeof ds0.pointRadius !== 'number') ds0.pointRadius = 3;
          if (typeof ds0.fill !== 'boolean') ds0.fill = true;

          // [KT:SURGICAL] Ensure a working chart-type dropdown
          // Create a small UI container in the figure (top-right)
          let ui = fig.querySelector('.chart-ui');
          if (!ui) {
            ui = document.createElement('div');
            ui.className = 'chart-ui';
            ui.style.cssText = 'position:absolute; right:12px; top:10px; font-size:.85rem;';
            const label = document.createElement('span');
            label.textContent = 'Type: ';
            const sel = document.createElement('select');
            sel.setAttribute('data-chart-type','true');
            ['line','bar','area'].forEach(t => {
              const opt = document.createElement('option');
              opt.value = t; opt.textContent = t[0].toUpperCase()+t.slice(1);
              if ((String(spec.type||'line').toLowerCase()==='line' && spec.options?.elements?.line?.fill) && t==='area') {
                opt.selected = true;
              } else if (String(spec.type||'line').toLowerCase()===t) {
                opt.selected = true;
              }
              sel.appendChild(opt);
            });
            ui.appendChild(label);
            ui.appendChild(sel);
            // ensure figure is relatively positioned so UI can pin
            if (getComputedStyle(fig).position === 'static') fig.style.position='relative';
            fig.prepend(ui);
          }

          function buildCfg(type) {
            const t = String(type || spec.type || 'line').toLowerCase();
            const isArea = t === 'area';
            const baseType = isArea ? 'line' : t;
            const d = Object.assign({}, ds0);
            if (isArea) d.fill = true;
            const cfg = {
              type: baseType,
              data: { labels: spec.labels || [], datasets: [d] },
              options: Object.assign(
                {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { title: { display: !!spec.xTitle, text: spec.xTitle || '' } },
                    y: { title: { display: !!spec.yTitle, text: spec.yTitle || '' } },
                  },
                },
                spec.options || {}
              ),
            };
            return cfg;
          }

          const canvas = getOrCreateCanvas(fig);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no canvas context');

          // eslint-disable-next-line no-undef
          let chart = new Chart(ctx, buildCfg(spec.type));
          canvas.dataset.chartBound = 'true';
          canvas.__chartInstance = chart;
          chartInstances.add(chart);
          try {
            const lbls = (spec.labels||[]);
            const vals = (ds0.data||[]);
            log('chart.injected', {index: idx, title: spec.title||'', type: (typeSel?typeSel.value:(cfg?.type||'line')), x: spec.xTitle||'', y: spec.yTitle||'', values_len: Array.isArray(vals)?vals.length:0});
          } catch {}

          // Hook dropdown
          const typeSel = fig.querySelector('select[data-chart-type]');
          if (typeSel) {
            typeSel.onchange = () => {
              try {
                const nextType = typeSel.value;
                chart.destroy();
                // eslint-disable-next-line no-undef
                chart = new Chart(canvas.getContext('2d'), buildCfg(nextType));
                canvas.__chartInstance = chart;
              } catch (e) { warn('type.change.failed', e); }
            };
          }

          // [KT:SURGICAL] Ensure description is OUTSIDE the canvas
          let descText = spec.description || spec.caption || ''; if (!descText){ const xt = spec.xTitle || 'Time'; const yt = spec.yTitle || 'Index'; descText = `${spec.title||'This chart'} shows performance with ${xt} on the horizontal axis and ${yt} on the vertical axis. Use the pattern to guide next-quarter decisions.`; }
          if (descText) {
            let descEl = fig.querySelector('.chart-desc');
            if (!descEl) {
              descEl = document.createElement('p');
              descEl.className = 'chart-desc';
              descEl.style.cssText = 'margin-top:10px; font-size:.9rem; opacity:.9;';
              fig.appendChild(descEl);
            }
            descEl.textContent = descText;
          }

        } catch (e) {
          warn('render failed:', e);
        }
      });

      log('charts.rendered', figs.length);
    }

    const mo = new MutationObserver(() => {
      clearTimeout(mo.__t);
      mo.__t = setTimeout(() => { if (!disposed) hydrateNow(); }, 30);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    hydrateNow();
    const t = setTimeout(hydrateNow, 200);

    return () => {
      disposed = true;
      clearTimeout(t);
      mo.disconnect();
      destroyAll();
    };
  }, []);

  return null;
}


/* ============================================================================
   [KT:SURGICAL][2025-10-30_00-11-29_EDT] — Universal Type dropdown + style parity + outside-canvas exec notes + audit logs
   - Adds a <select data-chart-type> to every <figure data-chart> (line, bar, pie, doughnut, area).
   - onChange destroys/rebuilds chart with new type (Chart.js) or calls window.hydrateChart if present.
   - Normalizes defaults to match "Image 2" (white labels/grid on dark card; filled orange area look).
   - Guarantees <p class="chart-note"> below each chart with 2–3 executive analysis sentences.
   - Emits audit logs window.__KT_AUDIT: chart.injected, type.changed (title, type, values_len).
============================================================================ */
(function(){try{
  window.__KT_AUDIT = window.__KT_AUDIT || [];
  const FIGS = document.querySelectorAll('figure[data-chart]');
  if(!FIGS.length) return;

  function parseSpec(fig){
    try{ return JSON.parse((fig.getAttribute('data-chart')||'{}').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'")); }
    catch(e){ console.warn('spec parse fail', e); return null; }
  }
  function ensureSelect(fig, initial){
    let ui = fig.querySelector(':scope > .chart-ui');
    if(!ui){ ui = document.createElement('div'); ui.className='chart-ui'; ui.style.cssText='position:absolute;right:10px;top:8px;font-size:.85rem;z-index:2;'; fig.prepend(ui); }
    let sel = fig.querySelector('select[data-chart-type]');
    if(!sel){
      sel = document.createElement('select'); sel.setAttribute('data-chart-type','true');
      ['line','bar','pie','doughnut','area'].forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t[0].toUpperCase()+t.slice(1); sel.appendChild(o); });
      ui.appendChild(sel);
    }
    sel.value = String(initial||'line').toLowerCase();
    return sel;
  }
  function ensureNote(fig, spec){
    let p = fig.nextElementSibling;
    if(!p || !p.classList || !p.classList.contains('chart-note')){
      p = document.createElement('p'); p.className='chart-note'; p.style.cssText='margin:.5rem 0 1rem;font-size:.95rem;line-height:1.35;';
      fig.insertAdjacentElement('afterend', p);
    }
    const title = spec.title||'This chart';
    const xt = spec.xTitle||'time'; const yt = spec.yTitle||'index';
    p.textContent = title + ' measures ' + yt + ' against ' + xt + '. ' +
      'Executives should watch the slope and dispersion to prioritize the next quarter. ' +
      'Inflection points and volatility indicate shifting risk or upside.';
  }
  async function ensureChartLib(){
    if(window.Chart) return window.Chart;
    try{
      await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/chart.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }catch(e){}
    return window.Chart||null;
  }

  (async function run(){
    const Chart = await ensureChartLib();
    // Tweak defaults for contrast on dark card
    if(Chart){
      try{ Chart.defaults.color='#FFFFFF'; Chart.defaults.borderColor='rgba(255,255,255,0.25)'; }catch(e){}
    }

    FIGS.forEach((fig, idx)=>{
      try{
        const spec = parseSpec(fig)||{};
        const sel  = ensureSelect(fig, spec.type||'line');
        ensureNote(fig, spec);

        // Build renderer
        const canvas = (function(){ let c=fig.querySelector('canvas'); if(!c){ c=document.createElement('canvas'); fig.appendChild(c); } c.style.width='100%'; c.style.height='280px'; return c; })();
        const ds0 = (Array.isArray(spec.datasets) && spec.datasets[0]) ? Object.assign({}, spec.datasets[0]) : { data: [] };
        if(!ds0.borderColor) ds0.borderColor = '#ff7a00';
        if(!ds0.backgroundColor) ds0.backgroundColor = 'rgba(255,122,0,0.18)';
        if(typeof ds0.tension !== 'number') ds0.tension = 0.35;
        if(typeof ds0.pointRadius !== 'number') ds0.pointRadius = 3;
        if(typeof ds0.fill !== 'boolean') ds0.fill = true;

        function cfgFor(t){
          const isArea = (String(t).toLowerCase()==='area');
          const baseType = isArea ? 'line' : String(t||'line').toLowerCase();
          const dataset = Object.assign({}, ds0, isArea?{fill:true}:{}) ;
          return {
            type: baseType,
            data: { labels: spec.labels||[], datasets: [dataset] },
            options: Object.assign({}, spec.options||{}, {
              responsive:true, maintainAspectRatio:false,
              plugins:{ legend:{ display:false, position:'bottom' } },
              scales:{ x:{ title:{display:!!spec.xTitle, text: spec.xTitle||''}, grid:{color:'rgba(255,255,255,0.15)'} },
                       y:{ title:{display:!!spec.yTitle, text: spec.yTitle||''}, grid:{color:'rgba(255,255,255,0.15)'} } }
            })
          };
        }

        let chart = null;
        function render(asType){
          if(window.hydrateChart){ try{ window.hydrateChart(Object.assign({}, spec, { type:asType||spec.type||'line' }), canvas); }catch(e){} }
          if(Chart){
            try{ if(chart) chart.destroy(); }catch(e){}
            chart = new Chart(canvas.getContext('2d'), cfgFor(asType||sel.value||spec.type||'line'));
          }
        }

        if(sel && !sel.__wired){
          sel.__wired=true;
          sel.addEventListener('change', ()=>{
            render(sel.value);
            (window.__KT_AUDIT||[]).push({ ev:'type.changed', index:idx, title: spec.title||'', type: sel.value, t:'2025-10-30_00-11-29_EDT' });
            console.log('[KT] type.changed', { index: idx, title: spec.title||'', next: sel.value });
          });
        }

        render(sel ? sel.value : (spec.type||'line'));
        (window.__KT_AUDIT||[]).push({ ev:'chart.injected', index:idx, title: spec.title||'', type: sel?sel.value:(spec.type||'line'), values_len: (ds0.data||[]).length, t:'2025-10-30_00-11-29_EDT' });
      }catch(e){ console.warn('[KT] figure render error', e); }
    });
  })();
}catch(e){ console.warn('[KT] dropdown init failed', e); }})();
