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
   [KT:SURGICAL][2025-10-29_23-00-38_EDT] — Universal Type dropdown + Image1≈Image2 style parity
   - No deletions; this block is appended and can be removed without side effects.
   - Adds a <select class="kt-type-select"> above every <figure data-chart>.
   - Ensures dropdown changes chart type live for ALL charts.
   - Normalizes default options so Image 1 visually matches Image 2.
   - Adds outside-of-canvas analysis paragraph stub; real text supplied by Generator.
============================================================================ */
(function(){try{
  const FIG = document.querySelectorAll('figure[data-chart]');
  const TYPES = ['line','bar','pie','doughnut'];
  FIG.forEach((fig, idx)=>{
    try {
      const raw = fig.getAttribute('data-chart') || '{}';
      const spec = JSON.parse(raw.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'")) || {};
      // Create control if missing
      let ctl = fig.querySelector(':scope > .kt-type-select');
      if (!ctl) {
        ctl = document.createElement('select');
        ctl.className = 'kt-type-select';
        ctl.style.cssText = 'display:block;margin:6px 0 8px auto;padding:4px 8px;border-radius:8px;font-weight:700;';
        TYPES.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t[0].toUpperCase()+t.slice(1); ctl.appendChild(o); });
        fig.prepend(ctl);
      }
      ctl.value = (String(spec.type||'line').toLowerCase());
      // Normalize style to match "Image 2" look (white bg, similar legend/axes)
      spec.options = Object.assign({}, spec.options || {}, {
        plugins: Object.assign({}, (spec.options||{}).plugins||{}, {
          legend: Object.assign({}, (((spec.options||{}).plugins||{}).legend||{}), { position:'bottom', labels:{font:{weight:'bold'}} })
        }),
        scales: Object.assign({}, (spec.options||{}).scales||{}, {
          x: Object.assign({}, (((spec.options||{}).scales||{}).x||{}), { grid:{display:true}, title:{display:true, text:spec.xTitle||'X'} }),
          y: Object.assign({}, (((spec.options||{}).scales||{}).y||{}), { grid:{display:true}, title:{display:true, text:spec.yTitle||'Y'} })
        }),
        backgroundColor:'#ffffff'
      });
      // Render function hook — tries common renderers
      function __kt_render(asType){
        try {
          const canvas = fig.querySelector('canvas') || (function(){ const c=document.createElement('canvas'); fig.appendChild(c); return c; })();
          const ctx = canvas.getContext('2d');
          const cfg = JSON.parse(JSON.stringify(spec));
          cfg.type = asType || cfg.type || 'line';
          // Support Chart.js global
          if (window.Chart) {
            // Destroy old instance if any
            if (canvas.__ktChart) { try { canvas.__ktChart.destroy(); } catch(_){} }
            canvas.__ktChart = new Chart(ctx, {
              type: cfg.type,
              data: { labels: cfg.labels||[], datasets: (cfg.datasets||[]).map(ds=>Object.assign({}, ds)) },
              options: cfg.options||{}
            });
          }
          // Support custom hydrateChart(spec, canvas) if provided
          if (window.hydrateChart) { try { window.hydrateChart(Object.assign({}, cfg), canvas); } catch(_){} }
          // Save last render type
          fig.setAttribute('data-rendered-type', cfg.type);
        } catch(e) { console.warn('KT render error', e); }
      }
      // Initial render parity
      __kt_render(spec.type||'line');
      // Wire dropdown
      ctl.onchange = (ev)=>__kt_render(ev.target.value);
      // Ensure outside-of-canvas paragraph placeholder exists (filled by generator later)
      let note = fig.nextElementSibling;
      if (!note || !(note.classList && note.classList.contains('chart-note'))) {
        note = document.createElement('p');
        note.className = 'chart-note';
        note.textContent = (spec.title||'This chart') + ' — Executive note pending.';
        note.style.cssText = 'margin:.35rem 0 1.0rem 0; font-size:.95rem; line-height:1.35;';
        fig.insertAdjacentElement('afterend', note);
      }
    } catch(e) { console.warn('KT init figure error', e); }
  });
}catch(e){ console.warn('KT dropdown init failed', e); }})();
