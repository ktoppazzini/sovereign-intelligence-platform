'use client';

/* [KT:SURGICAL:CLIENT-NOTES:v3]
   - One note per figure (guards with data-note="1")
   - Primary: GPT-5-Nano via /api/graph-note
   - Fallback: statAnalysis
   - White text; preserves telemetry; no style/layout changes to charts
*/

import { useEffect } from 'react';

function parseAttrJSON(s) {
  try { return JSON.parse(String(s || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')); }
  catch { return null; }
}

function statAnalysis({ title, xTitle, yTitle, labels=[], series=[] }){
  const t=title||'This visual', x=xTitle||'X-axis', y=yTitle||'Y-axis';
  const vals=(Array.isArray(series)?series:[]).map(n=>Number(n)).filter(Number.isFinite);
  if(!vals.length){
    return `<p class="chart-note" style="color:#FFFFFF">${t} shows performance with ${x} on the horizontal axis and ${y} on the vertical axis.</p>`;
  }
  const n=vals.length, first=vals[0], last=vals[n-1];
  const change=last-first, pct=first!==0?(change/Math.abs(first))*100:0;
  let sx=0,sy=0,sxy=0,sxx=0;
  for(let i=0;i<n;i++){ const X=i+1,Y=vals[i]; sx+=X; sy+=Y; sxy+=X*Y; sxx+=X*X; }
  const slope=((n*sxy)-(sx*sy))/Math.max(1,((n*sxx)-(sx*sx)));
  const dir=slope>0?'upward':slope<0?'downward':'flat';
  const returns=[]; for(let i=1;i<n;i++){ const prev=vals[i-1]||0; returns.push(prev===0?0:(vals[i]-prev)/Math.abs(prev)); }
  const avgR=returns.length?returns.reduce((a,b)=>a+b,0)/returns.length:0;
  const sdR =returns.length?Math.sqrt(returns.reduce((a,r)=>a+(r-avgR)**2,0)/returns.length):0;
  const vol=sdR, volTxt=vol<0.05?'low':vol<0.15?'moderate':'high';
  const next=Math.max(0,last+slope);
  const nf=(n)=>new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(n);
  const pf=(n)=>new Intl.NumberFormat(undefined,{maximumFractionDigits:1}).format(n);
  const s1 = `${t} shows performance with ${x} on the horizontal axis and ${y} on the vertical axis.`;
  const s2 = `Trend is ${dir}: ${change>=0?'up':'down'} ${nf(Math.abs(change))} (${pf(Math.abs(pct))}%). Volatility is ${volTxt}.`;
  const s3 = `Projected next period value is ~${nf(next)} if momentum holds.`;
  return `<p class="chart-note" style="color:#FFFFFF">${s1} ${s2} ${s3}</p>`;
}

async function aiNote(meta){
  try{
    const res = await fetch('/api/graph-note', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({
        title: meta?.title || 'Chart',
        xTitle: meta?.xTitle || 'X-axis',
        yTitle: meta?.yTitle || 'Y-axis',
        kind: meta?.kind || 'chart'
      })
    });
    const out = await res.json();
    if (out?.html) return out.html; // white HTML paragraph
  }catch(e){ /* swallow */ }
  return statAnalysis({ title: meta?.title, xTitle: meta?.xTitle, yTitle: meta?.yTitle, labels: [], series: [] });
}

function extractMeta(el) {
  const fig = el.closest('figure[data-chart], .chart-card, figure');
  if (fig?.hasAttribute('data-chart')) {
    const json = parseAttrJSON(fig.getAttribute('data-chart')) || {};
    return { kind:'chart', title:json.title||'Chart', xTitle:json.xTitle||'X-axis', yTitle:json.yTitle||'Y-axis', type:(json.type||'line').toLowerCase() };
  }
  const bench = el.closest('figure[data-widget="benchmark"]');
  if (bench) {
    const json = parseAttrJSON(bench.getAttribute('data-spec')) || {};
    return { kind:'benchmark', title:json.title||'Benchmark', xTitle:'Measure', yTitle:json.yTitle||'Percent', type:'benchmark' };
  }
  const h = fig?.querySelector?.('h2,h3,h4');
  return { kind:'chart', title:(h?h.textContent.trim():'Chart'), xTitle:'Months', yTitle:'Index', type:'line' };
}

function closestFigure(el){
  return el.closest('figure[data-chart], .chart-card, figure') || el;
}

function hasNote(fig){
  return fig.getAttribute('data-note') === '1' ||
         !!fig.nextElementSibling?.classList?.contains?.('chart-note');
}

function sendTelemetry(payload) {
  try {
    const data = JSON.stringify(payload);
    const blob = new Blob([data], { type: 'application/json' });
    navigator.sendBeacon?.('/api/telemetry', blob);
  } catch {}
}

export default function VisualNotesObserver() {
  useEffect(() => {
    const run = async () => {
      const runId = (crypto?.randomUUID?.() || String(Date.now()));
      const page = typeof location !== 'undefined' ? location.pathname : '/';
      const batch = [];

      async function ensureNoteOnceFor(el, phase){
        const fig = closestFigure(el);
        if (!fig || hasNote(fig)) return false;

        const meta = extractMeta(fig);
        const html = await aiNote(meta);

        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        const note = wrap.firstElementChild;
        fig.after(note);
        fig.setAttribute('data-note','1');

        batch.push({ ts:new Date().toISOString(), phase, page, runId, kind:meta.kind, type:meta.type, title:meta.title });
        if (batch.length >= 5) sendTelemetry({ source:'client.notes', injected: batch.splice(0, batch.length) });
        return true;
      }

      let injected = 0;
      const targets = Array.from(document.querySelectorAll('figure[data-chart], .chart-card'));
      await Promise.all(targets.map(async fig => {
        const prime = fig.querySelector('canvas,svg') || fig;
        if (await ensureNoteOnceFor(prime, 'initial')) injected++;
      }));
      if (injected) sendTelemetry({ source:'client.notes', summary:{ phase:'initial', count:injected, page, runId } });

      const mo = new MutationObserver(list => {
        let add = 0;
        list.forEach(m => {
          m.addedNodes?.forEach(n => {
            if (!(n instanceof HTMLElement)) return;
            if (n.matches?.('figure[data-chart], .chart-card')) {
              ensureNoteOnceFor(n, 'mut').then(ok => { if (ok) add++; });
            } else {
              n.querySelectorAll?.('figure[data-chart], .chart-card')
               .forEach(node => ensureNoteOnceFor(node, 'mut').then(ok => { if (ok) add++; }));
            }
          });
        });
        if (add) sendTelemetry({ source:'client.notes', summary:{ phase:'mut', count:add, page, runId } });
      });
      mo.observe(document.body, { childList:true, subtree:true });
    };
    run();
  }, []);

  return null;
}

