'use client';

import { useEffect } from 'react';

/**
 * ChartHydrator.client.jsx
 * Renders all <figure data-chart="&quot;{...}&quot;"> blocks with Chart.js,
 * moves the long paragraph BELOW the figure into the card header area ABOVE the canvas,
 * removes any short palette blurb inside the card, and adds a working Type dropdown.
 *
 * Logs (visible in the browser console and collected by your telemetry hook):
 *  - [SR:REFORM] ui.type.inject   -> when the dropdown/header are attached
 *  - [SR:REFORM] ui.type.change   -> when a user switches the chart type
 *  - [SR:REFORM] style.applied    -> confirms stroke/fill/grid/tension setup or why not
 *  - [SR:REFORM] desc.moved       -> confirms analysis paragraph was moved above the canvas
 */

function parseSpec(fig){
  try{
    const raw = fig.getAttribute('data-chart') || '';
    const json = raw.replace(/&quot;/g,'"').replace(/&amp;/g,'&');
    return JSON.parse(json);
  }catch(e){
    console.warn('[SR:REFORM] parseSpec.error', e);
    return null;
  }
}

function ensureStyleOnce(){
  if (document.getElementById('sr-hydrator-style')) return;
  const css = `
    .chart-card { position:relative; background:#0E2A44; border:1px solid #163554; border-radius:14px; padding:14px 14px 12px; }
    .chart-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin:2px 0 10px; }
    .chart-head h3 { margin:0; color:#fff; font-weight:800; font-size:1.05rem; }
    .chart-controls { display:flex; align-items:center; gap:8px; }
    .chart-controls label{ color:#fff; font-size:.9rem; }
    .chart-controls select { background:#061a2b; color:#fff; border:1px solid #2a4b66; border-radius:8px; padding:.25rem .45rem; }
    .chart-desc { color:#E6F0FF; margin:.35rem 0 .2rem; font-size:.95rem; line-height:1.35; }
    .chart-canvas-wrap { position:relative; width:100%; height:280px; }
    @media (min-width: 900px){ .chart-canvas-wrap { height:320px; } }
  `.trim();
  const el = document.createElement('style');
  el.id = 'sr-hydrator-style';
  el.textContent = css;
  document.head.appendChild(el);
}

function upsertHead(fig, titleText){
  let head = fig.querySelector(':scope > .chart-head');
  if (!head){
    head = document.createElement('div');
    head.className = 'chart-head';
    fig.prepend(head);
  }
  // Title
  let h3 = head.querySelector('h3');
  if (!h3){
    h3 = document.createElement('h3');
    head.prepend(h3);
  }
  h3.textContent = titleText || 'Chart';

  // Controls holder
  let ctrls = head.querySelector('.chart-controls');
  if (!ctrls){
    ctrls = document.createElement('div');
    ctrls.className = 'chart-controls';
    head.appendChild(ctrls);
  }
  // Ensure white "Type" dropdown
  let sel = ctrls.querySelector('select[data-role="chart-type"]');
  if (!sel){
    const label = document.createElement('label');
    label.textContent = 'Type';
    label.setAttribute('for','sr-type');
    label.style.color = '#fff';
    ctrls.appendChild(label);

    sel = document.createElement('select');
    sel.id = 'sr-type';
    sel.setAttribute('data-role','chart-type');
    ['Line','Area','Bar','Pie','Doughnut'].forEach(t => {
      const o = document.createElement('option'); o.value = t.toLowerCase(); o.textContent = t; sel.appendChild(o);
    });
    ctrls.appendChild(sel);
  }
  return sel;
}

function moveLongDescAboveCanvas(fig){
  // Remove any short palette blurb *inside* the card (catch several class names)
  fig.querySelectorAll(':scope .chart-note, :scope .inline-note, :scope figcaption, :scope small').forEach(n => n.remove());

  // Find the long paragraph that follows the figure and move it into the header area, above canvas
  let moved = false;
  const nxt = fig.nextElementSibling;
  let text = '';
  if (nxt && nxt.tagName === 'P' && (nxt.textContent || '').trim().length > 30){
    text = nxt.textContent.trim();
    nxt.remove();
    moved = true;
  } else {
    // fallback: if a sibling wrapper contains the first <p>, move that
    if (nxt && (nxt.matches('div,section,article'))){
      const p = nxt.querySelector('p');
      if (p && (p.textContent||'').trim().length > 30){
        text = p.textContent.trim();
        p.remove();
        moved = true;
      }
    }
  }

  // Insert into the card (top area, right under the header)
  let desc = fig.querySelector(':scope > .chart-desc');
  if (!desc){
    desc = document.createElement('p');
    desc.className = 'chart-desc';
    // Insert after .chart-head
    const head = fig.querySelector(':scope > .chart-head');
    if (head) head.insertAdjacentElement('afterend', desc);
    else fig.prepend(desc);
  }
  if (text) desc.textContent = text;

  console.log('[SR:REFORM] desc.moved', { moved, len: text.length });
}

function ensureCanvasWrap(fig){
  let wrap = fig.querySelector(':scope > .chart-canvas-wrap');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.className = 'chart-canvas-wrap';
    fig.appendChild(wrap);
  }
  let canvas = wrap.querySelector('canvas');
  if (!canvas){
    canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
  }
  return canvas.getContext('2d');
}

function setupDatasetDefaults(ds0, chartType){
  // Orange theme + shaded area for line/area
  if (!ds0.borderColor) ds0.borderColor = '#ff7a00';
  if (!ds0.backgroundColor){
    ds0.backgroundColor = (chartType === 'line' || chartType === 'area')
      ? 'rgba(255,122,0,0.18)'
      : '#ff7a00';
  }
  if (chartType === 'line' || chartType === 'area'){
    if (typeof ds0.tension !== 'number') ds0.tension = 0.35;
    if (typeof ds0.pointRadius !== 'number') ds0.pointRadius = 3;
    if (typeof ds0.fill !== 'boolean') ds0.fill = true;
  }
}

function cfgFor(spec, type, ds0){
  const base = String(type || spec.type || 'line').toLowerCase();
  const isArea = base === 'area';
  const chartType = isArea ? 'line' : base;

  const dataset = Object.assign({}, ds0, isArea ? { fill: true } : {});
  setupDatasetDefaults(dataset, chartType);

  return {
    type: chartType,
    data: { labels: spec.labels || [], datasets: [dataset] },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, title: { display: false } },
      scales: {
        x: { title: { display: !!spec.xTitle, text: spec.xTitle || '' }, grid: { color: 'rgba(255,255,255,0.15)' } },
        y: { title: { display: !!spec.yTitle, text: spec.yTitle || '' }, grid: { color: 'rgba(255,255,255,0.15)' } }
      }
    }, spec.options || {})
  };
}

export default function ChartHydrator(){
  useEffect(() => {
    ensureStyleOnce();

    const figures = Array.from(document.querySelectorAll('.report figure[data-chart]'));
    if (!figures.length){
      console.log('[SR:REFORM] hydrator.no-figures');
      return;
    }

    // Load Chart.js once
    function boot(){
      figures.forEach(fig => {
        if (fig.hasAttribute('data-hydrated')) return;

        const spec = parseSpec(fig);
        if (!spec || !Array.isArray(spec.datasets) || !spec.datasets[0]){
          console.log('[SR:REFORM] style.applied', { ok:false, reason:'no-datasets', title: spec?.title });
          return;
        }

        // Ensure card class
        fig.classList.add('chart-card');

        // MOVE LONG DESC ABOVE CANVAS + remove short blurb
        moveLongDescAboveCanvas(fig);

        // Header + dropdown
        const sel = upsertHead(fig, spec.title || 'Chart');
        sel.value = (spec.type || 'line').toLowerCase();
        console.log('[SR:REFORM] ui.type.inject', { title: spec.title || 'Chart', typeDefault: sel.value });

        // Canvas ctx
        const ctx = ensureCanvasWrap(fig);

        // Initial dataset
        const ds0 = Object.assign({}, spec.datasets[0]);
        setupDatasetDefaults(ds0, sel.value);

        const cfg = cfgFor(spec, sel.value, ds0);
        const chart = new window.Chart(ctx, cfg);
        fig.setAttribute('data-hydrated','');

        // Confirm style log
        console.log('[SR:REFORM] style.applied', {
          ok: true,
          title: spec.title || 'Chart',
          type: sel.value,
          stroke: ds0.borderColor,
          fill: ds0.fill === true || sel.value === 'area',
          bg: ds0.backgroundColor
        });

        // Type switching
        sel.addEventListener('change', () => {
          try{
            const t = sel.value;
            const nextCfg = cfgFor(spec, t, Object.assign({}, ds0));
            chart.destroy();
            new window.Chart(ctx, nextCfg);
            console.log('[SR:REFORM] ui.type.change', { title: spec.title || 'Chart', to: t });
          }catch(e){
            console.warn('[SR:REFORM] ui.type.change.error', String(e?.message||e));
          }
        });
      });
    }

    if (window.Chart) boot();
    else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      s.onload = boot;
      s.onerror = () => console.warn('[SR:REFORM] chartjs.load.error');
      document.head.appendChild(s);
    }
  }, []);

  return null;
}


