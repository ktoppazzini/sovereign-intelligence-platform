'use client';

/* [KT:SURGICAL:CLIENT-NOTES:v2 + TELEMETRY]
   Adds notes to standard canvases/SVGs after hydration and sends telemetry beacons.
   No style/look/feel changes to charts; notes now render in white to match dark theme.
*/

import { useEffect } from 'react';

function parseAttrJSON(s) {
  try { return JSON.parse(String(s || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')); }
  catch { return null; }
}

/* ============================================================================
   VisualNotesObserver.js — Concise, AI-readable chart notes (Corrected)
   - Keeps prior return commented (no deletions)
   - Ensures notes are white via inline style to survive external CSS
   ========================================================================== */

function statAnalysis({ title, xTitle, yTitle, labels=[], series=[] }){
  const t=title||'This visual', x=xTitle||'X-axis', y=yTitle||'Y-axis';
  const vals=(Array.isArray(series)?series:[]).map(n=>Number(n)).filter(Number.isFinite);
  const labs=Array.isArray(labels)&&labels.length?labels:vals.map((_,i)=>`P${i+1}`);

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

/** Primary builder used by the chart hydrator */
export function buildNote(meta){
  const t = meta?.title || 'This visual';
  const x = meta?.xTitle || (meta?.kind==='heatmap'?'Columns':'X-axis');
  const y = meta?.yTitle || (meta?.kind==='heatmap'?'Rows':'Y-axis');

  // [KT:COMMENT-OUT] Original static one-liner kept for reference
  // return `<p class="chart-note">${t} shows performance with ${x} on the horizontal axis and ${y} on the vertical axis. Use the pattern to guide next-quarter decisions.</p>`;

  // New: static sentence + compact analysis (2–3 sentences)
  return statAnalysis({
    title: t, xTitle: x, yTitle: y,
    labels: meta?.labels || [], series: meta?.values || meta?.series || []
  });
}

function extractMeta(el) {
  const chart = el.closest('figure[data-chart]');
  if (chart) {
    const json = parseAttrJSON(chart.getAttribute('data-chart')) || {};
    return {
      kind: 'chart',
      title: json.title || 'Chart',
      xTitle: json.xTitle || 'X-axis',
      yTitle: json.yTitle || 'Y-axis',
      type: (json.type || 'line').toLowerCase(),
      labelsLen: Array.isArray(json.labels) ? json.labels.length : 0,
      valuesLen: Array.isArray(json.datasets?.[0]?.data) ? json.datasets[0].data.length : 0
    };
  }
  const bench = el.closest('figure[data-widget="benchmark"]');
  if (bench) {
    const json = parseAttrJSON(bench.getAttribute('data-spec')) || {};
    return { kind:'benchmark', title:json.title||'Benchmark', xTitle:'Measure', yTitle:json.yTitle||'Percent', type:'benchmark', labelsLen:2, valuesLen:2 };
  }
  const heat = el.closest('div[data-heatmap]');
  if (heat) {
    const json = parseAttrJSON(heat.getAttribute('data-heatmap')) || {};
    const rows = Array.isArray(json.rows) ? json.rows.length : 0;
    const cols = Array.isArray(json.cols) ? json.cols.length : 0;
    return { kind:'heatmap', title:json.title||'Risk Heat Map', xTitle:'Columns', yTitle:'Rows', type:'heatmap', labelsLen:cols, valuesLen:rows*cols };
  }
  const fig = el.closest('figure, .chart-card, .chart, .figure');
  const h = fig?.querySelector('h2,h3,h4');
  const title = h ? h.textContent.trim() : 'Chart';
  const looksPercent = /%|percent/i.test(title);
  const dsLen = (() => { const q = fig?.getAttribute?.('data-len'); return q ? Number(q) || 0 : 0; })();
  return { kind:'chart', title, xTitle:'Months', yTitle: looksPercent?'Percent':'Index', type:'line', labelsLen:0, valuesLen:dsLen };
}

function hasChartNoteAfter(node) {
  let n = node.nextSibling;
  for (let i = 0; i < 6 && n; i++, n = n.nextSibling) {
    const html = (n.outerHTML || n.textContent || '').trim();
    if (!html) continue;
    if ((/^\<!--[\s\S]*?\-->$/).test(html)) continue;
    return /<p\b[^>]*class=["']chart-note["'][^>]*>[\s\S]*?<\/p>/i.test(html);
  }
  return false;
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
    const runId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    const page = typeof location !== 'undefined' ? location.pathname : '/';
    const batch = [];

    function ensureNoteForVisual(visualEl, phase) {
      const container = visualEl.closest('figure, div.chart-card, div, section, article') || visualEl;
      if (hasChartNoteAfter(container)) return false;

      const meta = extractMeta(visualEl);
      const noteHTML = buildNote(meta);
      const wrap = document.createElement('div');
      wrap.innerHTML = noteHTML;
      const note = wrap.firstElementChild;
      container.parentNode?.insertBefore(note, container.nextSibling);

      batch.push({
        ts: new Date().toISOString(),
        phase, page, runId,
        kind: meta.kind,
        type: meta.type,
        title: meta.title,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
        labelsLen: meta.labelsLen,
        valuesLen: meta.valuesLen
      });
      if (batch.length >= 5) {
        sendTelemetry({ source: 'client.notes', injected: batch.splice(0, batch.length) });
      }
      return true;
    }

    // Initial pass
    let injected = 0;
    document.querySelectorAll('figure canvas, figure svg, .chart-card canvas, .chart-card svg').forEach(v => {
      if (ensureNoteForVisual(v, 'initial')) injected++;
    });
    if (injected) sendTelemetry({ source: 'client.notes', summary: { phase: 'initial', count: injected, page, runId } });

    // Watch for dynamic replacements
    const mo = new MutationObserver((list) => {
      let add = 0;
      for (const m of list) {
        if (m.type === 'childList') {
          m.addedNodes?.forEach(node => {
            if (!(node instanceof HTMLElement)) return;
            if (node.matches?.('canvas,svg')) { if (ensureNoteForVisual(node, 'mut')) add++; }
            node.querySelectorAll?.('canvas,svg').forEach(el => { if (ensureNoteForVisual(el, 'mut')) add++; });
          });
        }
      }
      if (add) sendTelemetry({ source: 'client.notes', summary: { phase: 'mut', count: add, page, runId } });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const flush = () => { if (batch.length) sendTelemetry({ source: 'client.notes', injected: batch.splice(0, batch.length) }); }
    window.addEventListener('beforeunload', flush);
    return () => { flush(); mo.disconnect(); window.removeEventListener('beforeunload', flush); };
  }, []);

  return null; // Pure side-effect component
}

