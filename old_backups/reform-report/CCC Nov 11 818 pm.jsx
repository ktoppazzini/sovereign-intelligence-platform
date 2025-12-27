'use client';

/**
 * ChartHydrator — CSS-driven theming
 * - Reads colors from each <figure data-chart> card (GRAPH_CSS) via getComputedStyle
 * - Paints the canvas with those colors (no more card color bleeding through)
 * - Adds a working "Type" dropdown (Line | Area | Bar)
 * - Appends a 2–3 sentence description paragraph *below* the chart
 * - Idempotent: marks figures with data-hydrated="1"
 * - Console logs for your telemetry
 */

import { useEffect } from 'react';
import {
  Chart,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Filler, Tooltip, Legend, Title
} from 'chart.js';

Chart.register(
  LineController, LineElement, PointElement,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Filler, Tooltip, Legend, Title
);

const BRAND_PLUGIN_ID = 'brandAreaFill';
// [KT:SURGICAL:GLOBAL-STATE]
const __SR_CHARTS__ = new WeakMap(); // WeakMap<figure, ChartInstance>

// Rebuild helper used by local & delegated handlers
function __srRebuildChart(fig, newType) {
  try {
    const spec = parseFigureSpec(fig);
    if (!spec) return;
    const palette = readPalette(fig);

    const canvas = fig.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Destroy old, if any
    const old = __SR_CHARTS__.get(fig);
    if (old && old.destroy) { old.destroy(); }

    // Build + save
    const cfg = buildConfig(newType, spec, palette);
    const chart = new Chart(ctx, cfg);
    __SR_CHARTS__.set(fig, chart);

    // Mirror current type for debugging/telemetry
    fig.setAttribute('data-type', newType);
    console.log('[SR:REFORM] ui.type.changed', { newType, title: spec?.title });

  } catch (e) {
    console.log('[SR:REFORM] ui.type.error', String(e?.message || e));
  }
}


// Utility: parse rgba()/rgb()/hex to rgba object
function toRGBA(input, fallback = 'rgba(20,35,55,1)') {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = input;
    const computed = ctx.fillStyle; // normalized
    // computed is either rgb(a) or hex; let the browser parse again
    const div = document.createElement('div');
    div.style.color = computed;
    document.body.appendChild(div);
    const cs = getComputedStyle(div).color; // "rgb(r, g, b)" or "rgba(r, g, b, a)"
    document.body.removeChild(div);
    const nums = cs.replace(/[^\d.,]/g, '').split(',').map(n => Number(n.trim()));
    const [r, g, b, a = 1] = nums;
    return { r, g, b, a };
  } catch {
    return toRGBA(fallback);
  }
}

function rgbaString({ r, g, b, a = 1 }) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Read palette from the figure card (GRAPH_CSS drives everything)
function readPalette(fig) {
  const cs = getComputedStyle(fig);
  // Try common token names; fall back to computed basics
  const surface = cs.getPropertyValue('--surface')?.trim() || cs.backgroundColor || '#0b1623';
  const text = cs.getPropertyValue('--text')?.trim() || cs.color || '#f5f7fb';
  const muted = cs.getPropertyValue('--muted')?.trim() || 'rgba(255,255,255,.6)';
  const border = cs.getPropertyValue('--border')?.trim() || 'rgba(255,255,255,.2)';
  const accent = cs.getPropertyValue('--primary')?.trim()
    || cs.getPropertyValue('--accent-500')?.trim()
    || '#2ea7c9';
  const accentAlt = cs.getPropertyValue('--accent-300')?.trim() || '#7ccfe3';

  // Build derived colors
  const surfaceRGBA = toRGBA(surface);
  const areaBG = rgbaString({ ...surfaceRGBA, a: 0.9 });       // chart area fill
  const grid = rgbaString({ ...toRGBA(text), a: 0.18 });       // faint grid
  const tick = rgbaString({ ...toRGBA(text), a: 0.8 });        // tick labels
  const title = rgbaString({ ...toRGBA(text), a: 1 });
  const line = rgbaString({ ...toRGBA(accent), a: 1 });
  const fill = rgbaString({ ...toRGBA(accentAlt), a: 0.2 });
  const tooltipBG = rgbaString({ ...surfaceRGBA, a: 0.95 });
  const tooltipBorder = rgbaString({ ...toRGBA(border), a: 1 });

  return { surface, areaBG, grid, tick, title, line, fill, tooltipBG, tooltipBorder };
}

// Brand plugin: paint chart area each frame (pre-draw) to avoid card bleed
const brandAreaPlugin = {
  id: BRAND_PLUGIN_ID,
  beforeDraw(chart, args, opts) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.fillStyle = opts.areaBG || 'rgba(20,35,55,0.9)';
    ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
    ctx.restore();
  }
};

function parseFigureSpec(fig) {
  try {
    const raw = fig.getAttribute('data-chart'); // "&quot;{...}&quot;"
    if (!raw) return null;
    // unescape &quot;
    const json = raw.replace(/&quot;/g, '"');
    return JSON.parse(json);
  } catch (e) {
    console.log('[SR:REFORM] hydrator.parse.error', e?.message);
    return null;
  }
}

function ensureControls(fig) {
  let bar = fig.querySelector('.sr-chart-controls');
  if (bar) return bar;
  select.value = fig.getAttribute('data-type') || 'line';


  bar = document.createElement('div');
  bar.className = 'sr-chart-controls';
  bar.style.display = 'flex';
  bar.style.justifyContent = 'flex-end';
  bar.style.gap = '8px';
  bar.style.margin = '6px 4px 0 4px';

  const label = document.createElement('label');
  label.textContent = 'Type';
  label.style.fontWeight = '700';
  label.style.marginRight = '6px';

  const select = document.createElement('select');
  select.className = 'sr-chart-type';
  // Neutral base; Chart.js handles the palette
  select.style.background = 'transparent';
  select.style.border = '1px solid currentColor';
  select.style.padding = '2px 6px';
  select.style.borderRadius = '6px';

  ['Line', 'Area', 'Bar'].forEach(t => {
    const o = document.createElement('option');
    o.value = t.toLowerCase();
    o.textContent = t;
    select.appendChild(o);
    // [KT:SURGICAL:TYPE-HOOK]
select.setAttribute('data-role', 'sr-chart-type');

  });

  const right = document.createElement('div');
  right.style.display = 'flex';
  right.style.alignItems = 'center';
  right.appendChild(label);
  right.appendChild(select);
  bar.appendChild(right);

  // Insert controls above canvas (but inside figure)
  fig.prepend(bar);
  return bar;
}
// [KT:SURGICAL:TYPE-DROPDOWN]


function ensureCanvas(fig) {
  let canvas = fig.querySelector('canvas');
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.width = fig.clientWidth;
  canvas.height = Math.max(240, fig.clientHeight || 320);
  fig.appendChild(canvas);
  return canvas;
}

function ensureNote(fig, spec) {
  // If a sibling note already exists and matches signature, skip
  let note = fig.nextElementSibling;
  const signature = 'sr-chart-note';
  if (!(note && note.classList?.contains(signature))) {
    note = document.createElement('p');
    note.className = signature;
    note.style.margin = '6px 2px 18px';
    note.style.opacity = '0.95';
    note.style.fontSize = '0.95rem';
    note.style.lineHeight = '1.4';
    fig.after(note);
  }
  // 2–3 tight sentences outside canvas
  const title = spec?.title || 'Forecast';
  const x = spec?.xTitle || spec?.x || 'Time';
  const y = spec?.yTitle || spec?.y || 'Index';
  note.textContent =
    `${title} is rendered using CSS-driven theming for visual consistency. ` +
    `${x} values anchor the horizontal axis and ${y} values define the performance scale. ` +
    `Use the Type selector to explore line, area, or bar views without changing the underlying data.`;
}

function buildConfig(type, spec, palette) {
  const labels = spec?.labels?.length ? spec.labels : (spec?.labelsLen ? Array.from({ length: spec.labelsLen }, (_, i) => `Y${i + 1}`) : []);
  const values = spec?.values?.length ? spec.values : (spec?.dataLen ? Array.from({ length: spec.dataLen }, (_, i) => i + 1) : []);

  const commonScales = {
    x: {
      grid: { color: palette.grid },
      ticks: { color: palette.tick }
    },
    y: {
      grid: { color: palette.grid },
      ticks: { color: palette.tick }
    }
  };

  const datasetBase = {
    label: spec?.title || 'Series',
    data: values,
    // We avoid setting the CSS shorthand border; Chart.js uses borderWidth/borderColor separately.
    borderColor: palette.line,
    backgroundColor: palette.fill,
    borderWidth: 3,
    pointRadius: 3,
    pointHoverRadius: 4,
    tension: 0.3
  };

  const isArea = type === 'area';
  const controller = type === 'bar' ? 'bar' : 'line';

  return {
    type: controller,
    data: {
      labels,
      datasets: [
        controller === 'bar'
          ? {
              ...datasetBase,
              borderWidth: 0,
              backgroundColor: rgbaString({ ...toRGBA(palette.line), a: 0.85 })
            }
          : {
              ...datasetBase,
              fill: isArea ? true : false
            }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!spec?.title,
          text: spec?.title || '',
          color: palette.title,
          padding: { top: 4, bottom: 6 },
          font: { weight: '800', size: 14 }
        },
        legend: { display: false },
        tooltip: {
          backgroundColor: palette.tooltipBG,
          borderColor: palette.tooltipBorder,
          borderWidth: 1,
          titleColor: palette.title,
          bodyColor: palette.tick
        },
        // Pass area fill to brand plugin
        [BRAND_PLUGIN_ID]: { areaBG: palette.areaBG }
      },
      scales: commonScales
    },
plugins: [brandAreaPlugin]
  };
}

function hydrateOne(fig) {
  if (fig.getAttribute('data-hydrated') === '1') return;

  const spec = parseFigureSpec(fig);
  if (!spec) return;

  const palette = readPalette(fig);

  const bar = ensureControls(fig);
  const canvas = ensureCanvas(fig);
  const ctx = canvas.getContext('2d');

  const select = bar.querySelector('.sr-chart-type');
  if (!select) return;
const initialType = (spec.type || 'line').toLowerCase();
select.value = initialType === 'line' || initialType === 'bar' ? initialType : (spec.fill ? 'area' : 'line');
// [KT:SURGICAL:TYPE-DEFAULT]
if (!['line', 'area', 'bar'].includes(select.value)) select.value = 'line';

// Build initial chart
let chart = new Chart(ctx, buildConfig(select.value, spec, palette));
// [KT:SURGICAL:STORE] keep reference so we can rebuild from a global handler too
__SR_CHARTS__.set(fig, chart);


  // Handle type changes
  /*select.onchange = () => {
    try {
      const newType = select.value;
      chart.destroy();
      chart = new Chart(ctx, buildConfig(newType, spec, palette));
      console.log('[SR:REFORM] ui.type.changed', { newType, title: spec?.title });
    } catch (e) {
      console.log('[SR:REFORM] ui.type.error', String(e?.message || e));
    }

  };*/
  // [KT:SURGICAL:LOCAL-CHANGE]
function onTypeChange() {
  const newType = select.value;
  __srRebuildChart(fig, newType);
}
select.addEventListener('change', onTypeChange);
select.addEventListener('input', onTypeChange); // some browsers fire input first


  // Append description paragraph *below* chart
  ensureNote(fig, spec);

  // Mark hydrated
  fig.setAttribute('data-hydrated', '1');

  console.log('[SR:REFORM] hydrator.hydrated', {
    title: spec?.title,
    type: select.value,
    labelsLen: spec?.labels?.length || spec?.labelsLen || 0,
    valuesLen: spec?.values?.length || spec?.dataLen || 0
  });
}

export default function ChartHydrator() {
  useEffect(() => {
    try {
      const figs = Array.from(document.querySelectorAll('figure[data-chart]'));
      if (!figs.length) {
        console.log('[SR:REFORM] hydrator.no-figures');
        return;
      }
      figs.forEach(hydrateOne);
      // Mutation observer: hydrate any figures added later
      const mo = new MutationObserver(muts => {
        for (const m of muts) {
          m.addedNodes?.forEach(n => {
            if (n?.nodeType === 1) {
              if (n.matches?.('figure[data-chart]')) hydrateOne(n);
              n.querySelectorAll?.('figure[data-chart]')?.forEach(hydrateOne);
            }
          });
        }
      });
      // [KT:SURGICAL:DELEGATED-CHANGE]
// This guarantees Type switching works even if nodes are re-inserted or React re-mounts parts of the DOM.
function delegatedTypeHandler(e) {
  const sel = e.target?.closest?.('select.sr-chart-type,[data-role="sr-chart-type"]');
  if (!sel) return;
  const fig = sel.closest?.('figure[data-chart]');
  if (!fig) return;

  // ensure the select's value is synced (sometimes event fires before value settles)
  const value = (sel.value || 'line').toLowerCase();
  __srRebuildChart(fig, value);
}

document.addEventListener('change', delegatedTypeHandler, true);
document.addEventListener('input', delegatedTypeHandler, true);

// [KT:SURGICAL:EXPOSE-DEBUG] optional debugger hooks
window.SRHydrator = Object.assign(window.SRHydrator || {}, {
  _rebuild: __srRebuildChart,
  _charts: __SR_CHARTS__
});

// Cleanup on unmount
return () => {
  mo.disconnect();
  document.removeEventListener('change', delegatedTypeHandler, true);
  document.removeEventListener('input', delegatedTypeHandler, true);
};


      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    } catch (e) {
      console.log('[SR:REFORM] hydrator.error', String(e?.message || e));
    }
  }, []);

  return null;
}