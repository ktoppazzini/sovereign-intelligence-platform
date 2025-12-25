'use client';

import { useEffect } from 'react';

// [KT:SURGICAL] DOM audit — verify note is above canvas and style applied
function auditChartDOM(container){
  try{
    const note = container.querySelector('.chart-note');
    const canv = container.querySelector('canvas');
    const sel  = container.querySelector('.kt-type-select');
    const noteAbove = !!(note && canv && note.compareDocumentPosition(canv) & Node.DOCUMENT_POSITION_FOLLOWING);
    console.log('[SR:REFORM] audit.dom', {
      hasNote: !!note,
      hasCanvas: !!canv,
      hasDropdown: !!sel,
      noteAboveCanvas: noteAbove
    });
  }catch(e){ console.log('[SR:REFORM] audit.dom.error', String(e?.message||e)); }
}


// [KT:SURGICAL] Chart style defaults — orange line + shadow fill  KT_ORANGE_THEME_INJECTED
const KT_ORANGE_LINE = 'rgba(255, 140, 0, 1)';
const KT_ORANGE_FILL = 'rgba(255, 140, 0, 0.25)';
function applyOrangeThemeToConfig(config){
  try{
    if(!config) return config;
    const t = String(config.type||'line').toLowerCase();
    if(!Array.isArray(config.data?.datasets)) return config;
    config.data.datasets = config.data.datasets.map(ds=>{
      const c = Object.assign({}, ds);
      if(t==='line'){
        if(!c.borderColor) c.borderColor = KT_ORANGE_LINE;
        if(!c.backgroundColor) c.backgroundColor = KT_ORANGE_FILL;
        if(c.fill===undefined) c.fill = 'origin';
        if(c.tension===undefined) c.tension = 0.35;
        if(c.pointRadius===undefined) c.pointRadius = 3;
      }
      return c;
    });
    return config;
  }catch{ return config; }
}


// [KT:SURGICAL] Inject type dropdown (white) controlling chart instance — SR_TYPE_DROPDOWN_INJECTED
function injectTypeDropdown(container, chart, initialType){
  try{
    if(!container || !chart) return;
    if(container.querySelector('.kt-type-select')) return; // avoid duplicates
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.justifyContent = 'flex-end';
    wrap.style.marginBottom = '6px';
    const label = document.createElement('label');
    label.textContent = 'Type ';
    label.style.color = '#fff';
    label.style.marginRight = '6px';
    const sel = document.createElement('select');
    sel.className = 'kt-type-select';
    sel.style.background = 'transparent';
    sel.style.border = '1px solid rgba(255,255,255,.6)';
    sel.style.color = '#fff';
    sel.style.padding = '2px 6px';
    ['line','bar','doughnut','pie'].forEach(t=>{
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t[0].toUpperCase()+t.slice(1);
      if(String(initialType||'line').toLowerCase()===t) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', ()=>{
      try{
        const t = sel.value;
        chart.config.type = t;
        if(t==='pie' || t==='doughnut'){
          if(chart.config.options && chart.config.options.scales){
            chart.config.options = Object.assign({}, chart.config.options, { scales: undefined });
          }
        }
        chart.update();
        console.log('[SR:REFORM] ui.type.change', { to: t });
      }catch(e){ console.log('[SR:REFORM] ui.type.error', String(e?.message||e)); }
    });
    wrap.appendChild(label); wrap.appendChild(sel);
    container.prepend(wrap);
    console.log('[SR:REFORM] ui.type.injected');
  }catch(e){ console.log('[SR:REFORM] ui.type.inject.error', String(e?.message||e)); }
}
export default function ChartHydrator(){
  useEffect(()=>{
    let disposed = false;
    const charts = new Set();
    const log  = (...a)=>console.log('[KT][hydrator]', ...a);
    const warn = (...a)=>console.warn('[KT][hydrator]', ...a);

    async function ensureChart(){
      if (window.Chart) return window.Chart;
      try{
        await new Promise((res,rej)=>{
          const s=document.createElement('script');
          s.src='https://cdn.jsdelivr.net/npm/chart.js';
          s.onload=res; s.onerror=rej; document.head.appendChild(s);
        });
      }catch(e){ warn('Chart.js CDN failed', e); }
      return window.Chart||null;
    }

    function parseSpec(fig){
      try{
        const raw = fig.getAttribute('data-chart')||'{}';
        return JSON.parse(raw.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'"));
      }catch(e){ warn('spec parse fail', e); return null; }
    }

    function upsertNoteAboveCanvas(fig, spec){
      const sib = fig.nextElementSibling;
      if (sib && sib.classList && sib.classList.contains('chart-note')) sib.remove();

      let note = fig.querySelector(':scope > .chart-note');
      if (!note){
        note = document.createElement('p');
        note.className = 'chart-note';
        fig.insertBefore(note, fig.querySelector('canvas') || fig.firstChild);
      }else{
        const canv = fig.querySelector('canvas');
        if (canv && note.compareDocumentPosition(canv) & Node.DOCUMENT_POSITION_FOLLOWING){
          fig.insertBefore(note, canv);
        }
      }

      const title = spec.title || 'This chart';
      const xt = spec.xTitle || 'time';
      const yt = spec.yTitle || 'index';
      note.textContent = `${title} measures ${yt} against ${xt}. Executives should focus on slope and volatility to allocate resources decisively. Use inflection points to drive next‑quarter actions.`;
    }

    function ensureUI(fig, initialType){
      let ui = fig.querySelector(':scope > .chart-ui');
      if (!ui){
        ui = document.createElement('div');
        ui.className = 'chart-ui';
        ui.style.cssText = 'position:absolute;right:12px;top:10px;font-size:.85rem;z-index:2;';
        fig.prepend(ui);
      }
      let sel = fig.querySelector(':scope select[data-chart-type]');
      if (!sel){
        sel = document.createElement('select');
        sel.setAttribute('data-chart-type','true');
        ['line','bar','area'].forEach(t=>{
          const o=document.createElement('option');
          o.value=t; o.textContent=t[0].toUpperCase()+t.slice(1);
          sel.appendChild(o);
        });
        ui.appendChild(sel);
      }
      sel.value = String(initialType||'line').toLowerCase();
      return sel;
    }

    function ensureCanvas(fig){
      let c = fig.querySelector('canvas');
      if (!c){
        c = document.createElement('canvas');
        c.style.width='100%'; c.style.height='280px';
        fig.appendChild(c);
      }
      return c;
    }

    function destroyAll(){
      for (const ch of charts){ try{ ch.destroy?.(); }catch{} }
      charts.clear();
      document.querySelectorAll('#report canvas').forEach(c=>{ delete c.__chartInstance; });
    }

    async function hydrate(){
      const root = document.querySelector('#report');
      if (!root){ warn('no #report'); return; }

      const figs = root.querySelectorAll('figure[data-chart]');
      if (!figs.length){ warn('no figures'); return; }

      const Chart = await ensureChart();
      if (!Chart){ warn('Chart unavailable'); return; }

      try { Chart.defaults.color = '#FFFFFF'; } catch {}

      destroyAll();

      figs.forEach((fig, i)=>{
        try{
          const spec = parseSpec(fig); if (!spec) return;

          upsertNoteAboveCanvas(fig, spec);

          const sel = ensureUI(fig, spec.type||'line');

          const ds0 = (Array.isArray(spec.datasets) && spec.datasets[0]) ? Object.assign({}, spec.datasets[0]) : { data: [] };
          if (!ds0.borderColor) ds0.borderColor = '#ff7a00';
          if (!ds0.backgroundColor) ds0.backgroundColor = 'rgba(255,122,0,0.18)';
          if (typeof ds0.tension !== 'number') ds0.tension = 0.35;
          if (typeof ds0.pointRadius !== 'number') ds0.pointRadius = 3;
          if (typeof ds0.fill !== 'boolean') ds0.fill = true;

          function cfgFor(t){
            const type = String(t||'line').toLowerCase();
            const isArea = type === 'area';
            const baseType = isArea ? 'line' : type;
            const dataset = Object.assign({}, ds0, isArea ? { fill:true } : {});
            return {
              type: baseType,
              data: { labels: spec.labels||[], datasets:[dataset] },
              options: Object.assign({}, spec.options||{}, {
                responsive:true, maintainAspectRatio:false,
                plugins:{ legend:{ display:false } },
                scales:{
                  x:{ title:{ display:!!spec.xTitle, text: spec.xTitle||'' }, grid:{ color:'rgba(255,255,255,0.15)' } },
                  y:{ title:{ display:!!spec.yTitle, text: spec.yTitle||'' }, grid:{ color:'rgba(255,255,255,0.15)' } }
                }
              })
            };
          }

          const canvas = ensureCanvas(fig);
          const ctx = canvas.getContext('2d');
          let chart = new Chart(ctx, cfgFor(sel.value));
          charts.add(chart);
          canvas.__chartInstance = chart;

          if (!sel.__wired){
            sel.__wired = true;
            sel.addEventListener('change', ()=>{
              try{
                chart.destroy();
                chart = new Chart(canvas.getContext('2d'), cfgFor(sel.value));
                canvas.__chartInstance = chart;
                console.log('[KT][audit] type.changed', { index:i, title:spec.title||'', type:sel.value });
              }catch(e){ warn('type change failed', e); }
            });
          }

          const note   = fig.querySelector(':scope > .chart-note');
          console.log('[KT][audit] style.applied', {
            index:i,
            title: spec.title||'',
            cardBg: getComputedStyle(fig).backgroundColor,
            hasDropdown: !!sel,
            noteInsideCard: !!note,
            noteAboveCanvas: !!(note && note.nextElementSibling && note.nextElementSibling.tagName === 'CANVAS'),
          });

        }catch(e){ warn('figure hydrate failed', e); }
      });
    }

    const mo = new MutationObserver(()=>{ clearTimeout(mo.__t); mo.__t = setTimeout(()=>{ if(!disposed) hydrate(); }, 30); });
    mo.observe(document.documentElement, { childList:true, subtree:true });
    hydrate();
    const t = setTimeout(hydrate, 200);

    return ()=>{ disposed = true; clearTimeout(t); mo.disconnect(); destroyAll(); };
  }, []);

  return null;
}

