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

      figs.forEach((fig) => {
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

          const cfg = {
            type: String(spec.type || 'line').toLowerCase(),
            data: { labels: spec.labels || [], datasets: [ds0] },
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

          const canvas = getOrCreateCanvas(fig);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no canvas context');

          // eslint-disable-next-line no-undef
          const chart = new Chart(ctx, cfg);
          canvas.dataset.chartBound = 'true';
          canvas.__chartInstance = chart;
          chartInstances.add(chart);
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

