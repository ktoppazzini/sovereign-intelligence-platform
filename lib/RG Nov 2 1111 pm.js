/* ============================================================================
   [LOCKED FILE — SOVEREIGN INTELLIGENCE]
   ENFORCEMENT HEADER – DO NOT REMOVE
   (ruleset for surgical-only operation, no deletions, etc.)
   ----------------------------------------------------------------------------
   This file follows Kyle’s “surgical changes only” rule:
   - No deletions; superseded code is commented with clear [KT:SURGICAL:*] tags
   - File MUST get longer (not shorter) after each fix set
   - Orange line, dotted; brown shading under line; black backgrounds; white text
   - Type dropdowns MUST toggle a single visible plot, never stack plots
   - Benchmark widgets MUST support 4 types via dropdown (bar/line/pie/doughnut)
   - Dashboard readability helpers retained; patch was to fix CSS parsing
   - Descriptions are AI-driven (Nano 5) and deduped per chart
   ===========================================================================*/

/* ===========================
   SURGICAL LOG – WHAT CHANGED
   ===========================
   1) Type shows one plot only
      Cause: inline HTML accidentally placed inside GRAPH_CSS broke CSS parsing,
             which prevented the `.plot{display:none}` + `[data-type]` rules
             from applying; browsers treated the style block as invalid.
      Fix:   HTML preserved but is now wrapped in a comment block INSIDE the
             CSS string → `/* BEGIN-REMOVED-HTML … END-REMOVED-HTML * /`
      Effect: With valid CSS, the delegated type switcher makes exactly one plot
              visible at a time; switching Type replaces the plot instead of
              stacking.

   2) Benchmark now supports 4 types
      Change: `benchmarkHTML()` upgraded to output Bar/Line/Pie/Doughnut plots
              + the same “Type” dropdown structure used in other charts.
      Visuals: Line = orange dotted with brown shading; bars = orange; pies use
               warm palette; doughnut gets inner circle. All text is white.

   3) Dashboard readability
      Prior: Your `.dashboard-wide` sizing, font bumps, and max-width override
             were correct but didn’t apply due to CSS parse error.
      Change: With CSS fixed, these expanders work again. The helper comments
              show where to wrap the dashboard section (`<section class="dashboard-wide">…`).
      Note:   The wrapper remains an **HTML** location in your template, NOT CSS.

   4) Global type-switcher initializer
      Problem: When charts were injected via `innerHTML`, the per-figure inline
               `<script>` didn’t execute, so dropdowns “did nothing”.
      Change:  Added a global delegated `change` handler + DOMContentLoaded init
               + MutationObserver to auto-wire **all** present and future charts.
               *** v2 Today: added robust fallback & diagnostics (see logs). ***

   5) AI descriptions (Nano 5) & duplication
      Change:  Added `requestAIDescription()` and `applyDescriptionForFigure()`.
               They fetch an executive, 2–3 sentence analysis via `/api/chart-describe`
               (server endpoint you own), with `MODEL = process.env.OPENAI_MODEL ||
               'gpt-5-nano-2025-08-07'`.
               A deduper ensures a **single** white `.chart-note` per card.

   6) Zero deletions guarantee
      Any risky or superseded code is commented with explicit tags like:
      - [KT:SURGICAL:DUP-TITLES]
      - [KT:SURGICAL:DASHBOARD-FIT]
      - [KT:SURGICAL:GLOBAL-TYPE-SWITCHER]
      - [KT:SURGICAL:AI-DESCRIBE]
      - [KT:SURGICAL:CSS-HTML-GUARD]

   ===========================
   END SURGICAL LOG
   ===========================
*/

/* ---------------------------------------------------------------------------
   lib/reportGraphs.js
   Unified chart styling per T4 + YOUR NEW SPECS (Nov update):
   - Black background cards and canvases
   - White text for all titles/axes/notes
   - LINE = orange (#FFA500), dotted, with brown under-shading
   - Type dropdown: orange with white text; switcher fixed to toggle (not append)
   - Descriptions injected by VisualNotesObserver render in white
   [KT:SURGICAL:DUP-TITLES] Legend title text kept commented to prevent dup
   [KT:SURGICAL:DASHBOARD-FIT] Canvas clamped to 760px for consistency
--------------------------------------------------------------------------- */

// Small safe initializer used by reportTemplate; keep it tiny/simple
export const HYDRATE_INLINE_SCRIPT = `(function(){
  // small safe initializer used by reportTemplate; keep it tiny/simple
  console.log('[report] hydrate inline noop');
})();`;

// No self-imports here — this module defines charts and GRAPH_CSS.
// Keep a getter to maintain API compatibility with any older code:
export function getHydrateInlineScript() {
  return `(function(){ console.log('[report] hydrate'); })()`;
}

/* -----------------------
   Utility helpers (kept)
   -----------------------*/
function esc(s = '') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function prettyTitle(t) {
  const s = String(t || '');
  return s.trim().toUpperCase() === 'NPS' ? 'Net Promoter Score' : s;
}

/* [KT:SURGICAL:DEBUG-FLAGS]
   Toggle verbose logging for the global type switcher and card init. */
const __DEBUG_TYPESWITCH__ = true;

/* ----------------------------
   Number formatting (unchanged)
   ----------------------------*/
function detectCurrency(yTitle = '') {
  const t = String(yTitle).toUpperCase();
  if (t.includes('CAD') || t.includes('C$')) return { code: 'CAD', locale: 'en-CA', sym: 'C$' };
  if (t.includes('USD') || (t.includes('$') && !/C\\$/ .test(t))) return { code: 'USD', locale: 'en-US', sym: '$' };
  if (t.includes('GBP') || t.includes('£')) return { code: 'GBP', locale: 'en-GB', sym: '£' };
  if (t.includes('EUR') || t.includes('€')) return { code: 'EUR', locale: 'de-DE', sym: '€' };
  if (t.includes('INR') || t.includes('₹')) return { code: 'INR', locale: 'en-IN', sym: '₹' };
  return null;
}
function fmtTick(val, yTitle = '') {
  const t = String(yTitle || '');
  if (/percent|%/i.test(t)) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(val);
    }
  const cur = detectCurrency(t);
  if (cur) return new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(val);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(val);
}

// Round max up to a "nice" step so grid looks clean
function niceMax(x) {
  const e = Math.pow(10, Math.floor(Math.log10(Math.max(1, x))));
  const m = Math.ceil(x / e);
  const nice = (m <= 2 ? 2 : m <= 5 ? 5 : 10) * e;
  return Math.max(nice, 1);
}

/* ------------------------------------
   Shared axes SVG (white text on black)
   ------------------------------------*/
function svgAxes({ w, h, p, xTitle, yTitle, maxY, ticks = 5, labels = [] }) {
  const M = niceMax(maxY);

  // grid + Y tick values
  const grid = [];
  for (let i = 0; i <= ticks; i++) {
    const y = p + (i * (h - 2 * p)) / ticks;
    const val = Math.round(M * (1 - i / ticks));
    grid.push(`
      <line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" stroke="rgba(255,255,255,.35)"/>
      <!-- [KT:SURGICAL:FONT-UP] enlarged for readability -->
      <text x="${p - 14}" y="${y + 10}" text-anchor="end" fill="#FFFFFF" font-size="18">${fmtTick(val, yTitle)}</text>
    `);
  }

  // X tick labels
  const slot = (w - 2 * p) / Math.max(labels.length, 1);
  const xTicks = labels.map((t, i) => {
    const x = p + i * slot + slot / 2;
    return `<text x="${x}" y="${h - p + 22}" text-anchor="middle" fill="#FFFFFF" font-size="18">${esc(t)}</text>`;
  }).join('');

  // axes path
  const axes = `<polyline points="${p},${p} ${p},${h - p} ${w - p},${h - p}" fill="none" stroke="rgba(255,255,255,.65)"/>`;

  // Axis titles (horizontal Y, left of axis)
  const xTitleText = xTitle
    ? `<text x="${w / 2}" y="${h - 6}" text-anchor="middle" fill="#FFFFFF" font-size="20" font-weight="700">${esc(xTitle)}</text>`
    : '';
  const yTitleText = yTitle
    ? `<text x="${p - 16}" y="${p - 14}" text-anchor="end" fill="#FFFFFF" font-size="20" font-weight="700">${esc(yTitle)}</text>`
    : '';

  return `
    <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
    ${grid.join('')}
    ${axes}
    ${xTicks}
    ${xTitleText}
    ${yTitleText}
  `;
}

/* ===========================================================
   CHART CARD: Line (with Type switcher + 4 plot implementations)
   ===========================================================*/
export function lineChartHTML({ title, labels = [], series = [], xTitle = '', yTitle = '' }) {
  const w = 760, h = 320, p = 92;  // generous padding to avoid clipping
  const data = (Array.isArray(series) ? series : []).map(Number).filter(Number.isFinite);
  const lbl = Array.isArray(labels) && labels.length ? labels : data.map((_, i) => 'P' + (i + 1));
  const max = Math.max(1, ...data);
  const M = niceMax(max);

  const slot = (w - 2 * p) / Math.max(Math.max(data.length - 1, 1), 1);
  const ptsArr = data.map((v, i) => {
    const x = p + i * slot;
    const y = h - p - (v / M) * (h - 2 * p);
    return { x, y };
  });
  const pts = ptsArr.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const baseY = h - p;
  const firstX = p;
  const lastX = p + (Math.max(data.length - 1, 0) * slot);
  const areaPts = `${firstX.toFixed(1)},${baseY.toFixed(1)} ${pts} ${lastX.toFixed(1)},${baseY.toFixed(1)}`;

  const nice = prettyTitle(title || 'Line');

  return `
  <figure class="chart-card" data-type="line" data-widget="series">
    <header class="chart-head">
      <h3>${esc(nice)}</h3>
      <!-- [KT:SURGICAL:DUP-TITLES] Duplicate legend label commented out -->
      <!-- <div class="chart-legend"><span class="swatch"></span><span>${esc(nice)}</span></div> -->
      <div class="chart-legend"><span class="swatch"></span><!-- title text hidden --></div>
      <label class="chart-type"><span>Type:</span>
        <select aria-label="Chart type">
          <option value="line" selected>Line</option>
          <option value="bar">Bar</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
        </select>
      </label>
    </header>

    <div class="canvas-wrap">
      <!-- LINE -->
      <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        ${svgAxes({ w, h, p, xTitle, yTitle, maxY: M, labels: lbl })}
        <polygon points="${areaPts}" fill="#5C3A1E" fill-opacity="0.55" stroke="none"></polygon>
        <polyline points="${pts}" fill="none" stroke="#FFA500" stroke-width="3" stroke-dasharray="6,6"/>
      </svg>

      <!-- BAR -->
      <svg class="plot bar" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        ${svgAxes({ w, h, p, xTitle, yTitle, maxY: M, labels: lbl })}
        ${data.map((v, i) => {
          const slotLocal = (w - 2 * p) / Math.max(data.length, 1);
          const bw = slotLocal * 0.90; /* [KT:SURGICAL:VISIBILITY] wider bars */
          const x = p + i * slotLocal + (slotLocal - bw) / 2;
          const hv = (v / M) * (h - 2 * p);
          const y = h - p - hv;
          return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${hv.toFixed(1)}" fill="#FFA500"/>`;
        }).join('')}
      </svg>

      <!-- PIE -->
      <svg class="plot pie" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
        ${(() => {
          const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;
          let a0 = -Math.PI / 2;
          const sum = data.reduce((a, b) => a + b, 0) || 1;
          return data.map((v, i) => {
            const a1 = a0 + 2 * Math.PI * (v / sum);
            const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
            const large = (a1 - a0) > Math.PI ? 1 : 0;
            const col = `hsl(${30 + (i * 18) % 160},80%,60%)`;
            const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0 = a1;
            return `<path d="${d}" fill="${col}"/>`;
          }).join('');
        })()}
      </svg>

      <!-- DOUGHNUT -->
      <svg class="plot doughnut" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
        ${(() => {
          const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;
          let a0 = -Math.PI / 2;
          const sum = data.reduce((a, b) => a + b, 0) || 1;
          const slices = data.map((v, i) => {
            const a1 = a0 + 2 * Math.PI * (v / sum);
            const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
            const large = (a1 - a0) > Math.PI ? 1 : 0;
            const col = `hsl(${30 + (i * 18) % 160},80%,60%)`;
            const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0 = a1;
            return `<path d="${d}" fill="${col}"/>`;
          }).join('');
          return `${slices}<circle cx="${w / 2}" cy="${h / 2}" r="${(Math.min(w, h) * 0.35 * 0.55).toFixed(1)}" fill="#000000" stroke="#FFFFFF" />`;
        })()}
      </svg>
    </div>

    <!-- Per-card Switcher (may not run when injected dynamically) -->
    <script>
      (function(){
        var card = document.currentScript && document.currentScript.closest && document.currentScript.closest('.chart-card');
        if(!card) return; // if scripts are stripped, global handler (below) applies
        var sel  = card.querySelector('.chart-type select');
        function apply(){
          var value = sel.value;
          card.setAttribute('data-type', value);
          card.querySelectorAll('.plot').forEach(function(svg){
            svg.style.display = svg.classList.contains(value) ? 'block' : 'none';
          });
        }
        sel && sel.addEventListener('change', apply);
        sel && apply();
      })();
    </script>
  </figure>`;
}

/* Keep parity: bar variant just uses the same card structure so Type works */
export function barChartHTML(args) { return lineChartHTML({ ...args, title: args?.title }); }

/* ===========================================================
   BENCHMARK CARD (4 plot types + Type dropdown + orange dotted line)
   ===========================================================*/
export function benchmarkHTML({ title, current = 0, benchmark = 0, xTitle = '', yTitle = '' }) {
  const w = 760, h = 320, p = 92;
  const nice = prettyTitle(title || 'Benchmark');
  const max = Math.max(1, current, benchmark);
  const M = niceMax(max);
  const slot = (w - 2 * p) / 2, bw = slot * 0.90;
  const h1 = (current / M) * (h - 2 * p), h2 = (benchmark / M) * (h - 2 * p);

  // two-point line coordinates
  const pts = [
    { x: p + slot * 0.5, y: h - p - h1 },
    { x: p + slot * 1.5, y: h - p - h2 }
  ];
  const polyPts = pts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const baseY = h - p;
  const areaPts = `${pts[0].x.toFixed(1)},${baseY.toFixed(1)} ${polyPts} ${pts[1].x.toFixed(1)},${baseY.toFixed(1)}`;

  return `
  <figure class="chart-card" data-type="bar" data-widget="benchmark" data-spec="${esc(JSON.stringify({title, yTitle}))}">
    <header class="chart-head">
      <h3>${esc(nice)}</h3>
      <div class="chart-legend"><span class="swatch"></span></div>
      <label class="chart-type"><span>Type:</span>
        <select aria-label="Chart type">
          <option value="bar" selected>Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
        </select>
      </label>
    </header>

    <div class="canvas-wrap">
      <!-- BAR -->
      <svg class="plot bar" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${svgAxes({ w, h, p, xTitle, yTitle, maxY: M, labels: ['Current', 'Benchmark'] })}
        <rect x="${(p + (slot - bw) / 2).toFixed(1)}" y="${(h - p - h1).toFixed(1)}" width="${bw.toFixed(1)}" height="${h1.toFixed(1)}" fill="#FFA500"/>
        <rect x="${(p + slot + (slot - bw) / 2).toFixed(1)}" y="${(h - p - h2).toFixed(1)}" width="${bw.toFixed(1)}" height="${h2.toFixed(1)}" fill="#FFA500"/>
      </svg>

      <!-- LINE -->
      <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${svgAxes({ w, h, p, xTitle, yTitle, maxY: M, labels: ['Current','Benchmark'] })}
        <polygon points="${areaPts}" fill="#5C3A1E" fill-opacity="0.55" stroke="none"></polygon>
        <polyline points="${polyPts}" fill="none" stroke="#FFA500" stroke-width="3" stroke-dasharray="6,6"/>
      </svg>

      <!-- PIE -->
      <svg class="plot pie" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
        ${(() => {
          const cx = w/2, cy = h/2, R = Math.min(w,h)*0.35;
          const vals = [current, benchmark], sum = (current+benchmark)||1;
          let a0 = -Math.PI/2;
          return vals.map((v,i)=>{
            const a1=a0+2*Math.PI*(v/sum);
            const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0);
            const x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
            const large=(a1-a0)>Math.PI?1:0;
            const col = i===0 ? '#FFA500' : 'hsl(48,80%,55%)';
            const d='M ' + cx + ',' + cy + ' L ' + x0 + ',' + y0 + ' A ' + R + ',' + R + ' 0 ' + large + ' 1 ' + x1 + ',' + y1 + ' Z';
            a0=a1; return `<path d="${d}" fill="${col}"/>`;
          }).join('');
        })()}
      </svg>

      <!-- DOUGHNUT -->
      <svg class="plot doughnut" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
        ${(() => {
          const cx = w/2, cy = h/2, R = Math.min(w,h)*0.35;
          const vals = [current, benchmark], sum = (current+benchmark)||1;
          let a0=-Math.PI/2;
          const pieces = vals.map((v,i)=>{
            const a1=a0+2*Math.PI*(v/sum);
            const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0);
            const x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
            const large=(a1-a0)>Math.PI?1:0;
            const col = i===0 ? '#FFA500' : 'hsl(48,80%,55%)';
            const d=`M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0=a1; return '<path d="' + d + '" fill="' + col + '"/>';
          }).join('');
          return `${pieces}<circle cx="${cx}" cy="${cy}" r="${(R*0.55).toFixed(1)}" fill="#000000" stroke="#FFFFFF"/>`;
        })()}
      </svg>
    </div>

    <!-- Per-card Switcher (may not run when injected dynamically) -->
    <script>
      (function(){
        var card = document.currentScript && document.currentScript.closest && document.currentScript.closest('.chart-card');
        if(!card) return;
        var sel  = card.querySelector('.chart-type select');
        function apply(){
          var value = sel.value;
          card.setAttribute('data-type', value);
          card.querySelectorAll('.plot').forEach(function(svg){
            svg.style.display = svg.classList.contains(value) ? 'block' : 'none';
          });
        }
        sel && sel.addEventListener('change', apply);
        sel && apply();
      })();
    </script>
  </figure>`;
}

/* ===========================================================
   HEATMAP (retained; no destructive changes)
   ===========================================================*/
export function heatmapHTML({ title, rows = [], cols = [], data = [[]] }) {
  const w = 760, h = 320, p = 92;
  const r = rows.length ? rows : ['R1', 'R2', 'R3', 'R4', 'R5'];
  const c = cols.length ? cols : ['C1', 'C2', 'C3', 'C4', 'C5'];
  const m = (Array.isArray(data) && data.length) ? data
    : Array.from({ length: r.length }, () => Array.from({ length: c.length }, () => 0));
  let min = Infinity, max = -Infinity;
  m.forEach(row => row.forEach(v => { v = Number(v) || 0; min = Math.min(min, v); max = Math.max(max, v); }));
  if (!isFinite(min)) { min = 0; max = 1; }
  const cw = (w - 2 * p) / c.length, ch = (h - 2 * p) / r.length;

  const cells = r.flatMap((_, ri) => c.map((_, ci) => {
    const v = Number(m[ri][ci]) || 0;
    const t = (v - min) / Math.max(1e-6, (max - min));
    const hue = 30 + (1 - t) * 20; // warm palette on black
    const x = p + ci * cw, y = p + ri * ch;
    return `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="hsl(${hue},60%,45%)"/>`;
  })).join('');

  const grid = `
    ${Array.from({ length: r.length + 1 }, (_, i) => {
      const y = p + i * ch; return `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" stroke="rgba(255,255,255,.35)"/>`;
    }).join('')}
    ${Array.from({ length: c.length + 1 }, (_, i) => {
      const x = p + i * cw; return `<line x1="${x}" y1="${p}" x2="${x}" y2="${h - p}" stroke="rgba(255,255,255,.35)"/>`;
    }).join('')}
  `;

  const xlab = c.map((t, i) => `<text x="${p + (i + .5) * cw}" y="${h - 6}" text-anchor="middle" fill="#FFFFFF" font-size="18" font-weight="700">${esc(t)}</text>`).join('');
  const ylab = r.map((t, i) => `<text x="${p - 8}" y="${p + (i + .5) * ch + 6}" text-anchor="end" fill="#FFFFFF" font-size="22" font-weight="700">${esc(t)}</text>`).join('');

  const nice = prettyTitle(title || 'Heat Map');

  return `
  <section class="chart-card chart-heat" data-type="heat">
    <header class="chart-head"><h3>${esc(nice)}</h3></header>
    <div class="canvas-wrap">
      <svg class="plot heat" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
        ${cells}${grid}${xlab}${ylab}
      </svg>
    </div>
    <div class="hm-legend"><span>Low</span><i></i><span>High</span></div>
  </section>`;
}

/* ===========================================================
   AI BENCHMARK RENDER HELPER (unchanged behavior; expanded comments)
   ===========================================================*/
export async function renderAIBenchmark(
  mountSelectorOrEl,
  {
    title = 'Benchmark',
    unit = 'Percent',
    current = 0,
    history = [],
    goal = null,
    xTitle = 'Measure',
    yTitle = 'Percent'
  } = {}
){
  try {
    const res = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, unit, current, history, goal })
    });
    const { benchmark, rationale } = await res.json();

    const html = benchmarkHTML({
      title,
      current: Number(current) || 0,
      benchmark: Number(benchmark ?? current) || Number(current) || 0,
      xTitle,
      yTitle
    });

    const el = (typeof mountSelectorOrEl === 'string')
      ? document.querySelector(mountSelectorOrEl)
      : mountSelectorOrEl;

    if (el) {
      el.innerHTML = html;
      const p = document.createElement('p');
      p.className = 'chart-note';
      p.style.color = '#FFFFFF';
      p.textContent = `AI Benchmark: ${Number(benchmark ?? current)}. ${rationale || 'AI baseline derived from trend/goal.'}`;
      // [KT:SURGICAL:AI-NOTE-DEDUP] ensure single note
      const prev = el.querySelectorAll('.chart-note');
      prev.forEach((n,i)=>{ if(i<prev.length-1) n.remove(); });
      el.appendChild(p);
    }
  } catch (err) {
    console.error('[AI-Benchmark] render failed', err);
    const el = (typeof mountSelectorOrEl === 'string')
      ? document.querySelector(mountSelectorOrEl)
      : mountSelectorOrEl;
    if (el) {
      el.innerHTML = benchmarkHTML({ title, current, benchmark: current, xTitle, yTitle });
      const p = document.createElement('p');
      p.className = 'chart-note';
      p.style.color = '#FFFFFF';
      p.textContent = 'AI benchmark fallback used due to an error.';
      const prev = el.querySelectorAll('.chart-note');
      prev.forEach((n,i)=>{ if(i<prev.length-1) n.remove(); });
      el.appendChild(p);
    }
  }
}

/* ===========================================================
   AI DESCRIPTION (Nano 5) – executive 2–3 sentence analysis
   ===========================================================*/
const MODEL = (typeof process !== 'undefined' && process.env && process.env.OPENAI_MODEL)
  ? process.env.OPENAI_MODEL
  : 'gpt-5-nano-2025-08-07';

/**
* [KT:SURGICAL:AI-DESCRIBE]
* Post the section+figure HTML to your API so server-side can call OpenAI.
* We keep this client-side thin so keys remain server-side.
*/
async function requestAIDescription(section, canon, figureHTML) {
  try {
    const payload = {
      model: MODEL,
      section,
      canon,
      figureHTML
    };
    const res = await fetch('/api/chart-describe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const { description } = await res.json();
    return String(description || '');
  } catch (e) {
    console.warn('[AI Describe] fallback', e);
    return 'This chart shows performance patterns and directionality. Values trend according to the underlying data, highlighting variance and scale.';
  }
}

/**
* Attach/replace a white `.chart-note` paragraph below a figure.
* Ensures exactly one note remains (dedupes multiples).
*/
export async function applyDescriptionForFigure(figureEl, opts = {}) {
  try {
    if (!figureEl) return;
    const section = opts.section || 'Graph';
    const canon = opts.canon || { orgName:'', country:'', timeFrame:'', costSavingsGoal:0 };
    const html = figureEl.outerHTML || '';
    const text = await requestAIDescription(section, canon, html);
    // Remove duplicates and append one
    const existing = figureEl.parentElement ? figureEl.parentElement.querySelectorAll('.chart-note') : [];
    existing.forEach((n) => {
      // If the note is directly under the same parent and precedes an AI refresh, keep the last
      if (n.parentElement === figureEl.parentElement) n.remove();
    });
    const p = document.createElement('p');
    p.className = 'chart-note';
    p.style.color = '#FFFFFF';
    p.textContent = text;
    figureEl.parentElement && figureEl.parentElement.appendChild(p);
  } catch (e) {
    console.error('[AI Describe] apply failed', e);
  }
}

/* ===========================================================
   EXPORT A SMALL RUNTIME API (browser)
   ===========================================================*/
if (typeof window !== 'undefined') {
  window.reportGraphs = Object.assign(window.reportGraphs || {}, {
    renderAIBenchmark,
    applyDescriptionForFigure,
    lineChartHTML,
    barChartHTML,
    benchmarkHTML,
    heatmapHTML
  });
}

/* ===========================================================
   GLOBAL TYPE SWITCHER – guaranteed behavior for injected charts
   ===========================================================*/
/* [KT:SURGICAL:GLOBAL-TYPE-SWITCHER v2]
   - Delegated `change` & `input` listeners for all `.chart-type select`
   - Initializes on DOMContentLoaded (or immediately if already loaded)
   - MutationObserver wires newly added `.chart-card`s
   - Extra diagnostics: logs card, value, and visible plots
*/
(function(){
  if (typeof document === 'undefined') return;

  function applyType(card){
    try{
      var sel = card && card.querySelector && card.querySelector('.chart-type select');
      if (!sel) return;
      var value = (sel.value || '').trim();
      if (!value) {
        // default to attribute or first option
        value = card.getAttribute('data-type') || (sel.options && sel.options[0] ? sel.options[0].value : 'line');
        sel.value = value;
      }
      card.setAttribute('data-type', value);
      var total = 0, shown = 0;
      card.querySelectorAll('.plot').forEach(function(svg){
        total++;
        var ok = svg.classList.contains(value);
        svg.style.display = ok ? 'block' : 'none';
        if (ok) shown++;
      });
      if (__DEBUG_TYPESWITCH__) {
        console.log('[TypeSwitch] apply', {card, value, totalPlots: total, shown});
      }
    }catch(e){ console.warn('[TypeSwitch] apply error', e); }
  }

  function initTypes(root){
    try{
      (root || document).querySelectorAll('.chart-card').forEach(applyType);
      if (__DEBUG_TYPESWITCH__) console.log('[TypeSwitch] init scan complete');
    }catch(e){ console.warn('[TypeSwitch] init error', e); }
  }

  function onChange(e){
    var sel = e.target && e.target.closest && e.target.closest('.chart-type select');
    if (!sel) return;
    var card = sel.closest('.chart-card');
    if (card) applyType(card);
  }

  // Listen in both capture and bubble to survive shadowy frameworks
  document.addEventListener('change', onChange, true);
  document.addEventListener('input', onChange, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ initTypes(document); });
  } else {
    initTypes(document);
  }

  // Wire for dynamically injected content
  var mo = new MutationObserver(function(list){
    list.forEach(function(m){
      if (m.type === 'childList') {
        m.addedNodes && m.addedNodes.forEach(function(n){
          if (n && n.nodeType === 1) {
            if (n.matches && n.matches('.chart-card')) applyType(n);
            if (n.querySelectorAll) n.querySelectorAll('.chart-card').forEach(applyType);
          }
        });
      }
    });
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // First 2 seconds: re-assert visibility in case of late CSS/hydration
  var t0 = Date.now();
  var iv = setInterval(function(){
    initTypes(document);
    if (Date.now() - t0 > 2000) clearInterval(iv);
  }, 250);

  if (typeof window !== 'undefined') {
    window.reportGraphs = Object.assign(window.reportGraphs || {}, {
      _applyType: applyType,
      _initTypes: function(){ initTypes(document); },
      _debug: { enabled: __DEBUG_TYPESWITCH__ }
    });
  }
})();

/* ===========================================================
   SHARED CHART CSS
   ===========================================================*/
export const GRAPH_CSS = `
/* Base card and header */
.chart-card{ background:#000000; color:#FFFFFF; border-radius:16px; padding:12px; box-shadow:0 2px 10px rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.12); }
.chart-card + .chart-card{ margin-top:8px; }
.chart-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin:4px 4px 8px; flex-wrap:wrap; }
.chart-head h3{ margin:0; font-size:1.05rem; font-weight:700; letter-spacing:.2px; color:#FFFFFF; }
.chart-type{ font-size:.90rem; display:flex; align-items:center; gap:6px; }
.chart-type span{ color:#FFFFFF; font-weight:700; }
.chart-type select{ background:#FFA500; color:#FFFFFF; border:1px solid rgba(255,255,255,.35); border-radius:8px; padding:4px 8px; }
.canvas-wrap{ position:relative; overflow:hidden; border-radius:12px; }

/* [KT:SURGICAL:CSS-HTML-GUARD]
   The following HTML had been placed inside the CSS previously, breaking parsing.
   We preserve it verbatim for reference but keep it commented so CSS stays valid. */
/* BEGIN-REMOVED-HTML
<section class="dashboard-wide">
  <!-- Keep your dashboard figures or mounts here -->
  <!-- Example mounts (documentation only) -->
  <div id="kpi-savings"></div>
  <div id="kpi-payback"></div>
  <div id="kpi-delivery-benchmark"></div>
</section>
END-REMOVED-HTML */

/* Plot visibility toggled by [data-type] */
.plot{ display:none; width:auto; height:auto; border-radius:12px; }
.chart-card[data-type="line"]      .plot.line{ display:block; }
.chart-card[data-type="bar"]       .plot.bar{ display:block; }
.chart-card[data-type="pie"]       .plot.pie{ display:block; }
.chart-card[data-type="doughnut"]  .plot.doughnut{ display:block; }
.chart-card.chart-heat[data-type="heat"] .plot.heat{ display:block; }

/* Legend styling */
.chart-legend{ display:inline-flex; align-items:center; gap:6px; font-size:.85rem; opacity:.95; color:#FFFFFF; }
.chart-legend .swatch{ width:12px; height:12px; border-radius:3px; background:#FFA500; display:inline-block; }

/* Dashboard enlargers */
.dashboard-wide text{ font-size:22px !important; }
.dashboard-wide .chart-head h3{ font-size:1.2rem !important; }
.dashboard-wide .chart-type{ font-size:1rem !important; }
.dashboard-wide .chart-card .canvas-wrap{ max-width:100% !important; width:100%; }
.dashboard-wide .plot{ width:100% !important; height:auto !important; }

/* Notes (AI analysis) */
.chart-note{ color:#FFFFFF; margin:10px 4px 16px; font-size:.95rem; line-height:1.45; }

/* Keep axes overlay tweaks */
.chart-axes{ display:none !important; }

/* Heatmap legend */
.chart-heat .hm-legend{ display:flex; align-items:center; gap:8px; font-size:.85rem; margin-top:6px; color:#FFFFFF; }
.chart-heat .hm-legend i{ flex:1; height:10px; border-radius:6px;
  background: linear-gradient(90deg, #2b2b2b, #FFA500); }

/* Pure CSS switcher (intentionally commented to avoid double behavior)
.chart-card:has(.chart-type select option[value="line"]:checked)      .plot.line { display:block; }
.chart-card:has(.chart-type select option[value="bar"]:checked)       .plot.bar { display:block; }
.chart-card:has(.chart-type select option[value="pie"]:checked)       .plot.pie { display:block; }
.chart-card:has(.chart-type select option[value="doughnut"]:checked)  .plot.doughnut { display:block; }
*/
`;

/* ======================================================================
     [KT:SURGICAL:DASHBOARD-FIT]
     Keep this dev note: In the template that renders your dashboard section,
     wrap charts with:
        <section class="dashboard-wide"> ... </section>
     to apply the enlargers above. No CSS changes required beyond the fixes here.
  */