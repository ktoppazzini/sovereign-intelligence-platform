/* ============================================================================
   [LOCKED FILE — SOVEREIGN INTELLIGENCE]
   ENFORCEMENT HEADER – DO NOT REMOVE
   (ruleset for surgical-only operation, no deletions, etc.)
   ...
   [Existing enforcement header content here]
   ...
============================================================================ */

/* ---------------------------------------------------------------------------
   lib/reportGraphs.js
   Unified chart styling per T4: blue canvas, white ticks, readable axes,
   currency-aware formatting, horizontal Y-title, no cutoff.

   [KT:SURGICAL:DUP-TITLES] Legend title text commented to prevent duplicate
   titles under <h3>. See .chart-legend change below.

   [KT:SURGICAL:DASHBOARD-FIT] Clamp canvas width inside card so the dashboard
   never “stretches” beyond the card; enlarge tick/axis labels for readability.
--------------------------------------------------------------------------- */

// Small safe initializer used by reportTemplate; keep it tiny/simple
export const HYDRATE_INLINE_SCRIPT = `(function(){
  // small safe initializer used by reportTemplate; keep it tiny/simple
  console.log('[report] hydrate inline noop');
})();`;

// No self-imports here — this module defines charts and GRAPH_CSS

export function getHydrateInlineScript() {
  return `(function(){ console.log('[report] hydrate'); })()`;
}

function esc(s = '') { return String(s); }

function prettyTitle(t) {
  const s = String(t || '');
  return s.trim().toUpperCase() === 'NPS' ? 'Net Promoter Score' : s;
}

// ------- number formatting helpers -------
function detectCurrency(yTitle = '') {
  const t = String(yTitle).toUpperCase();
  if (t.includes('CAD') || t.includes('C$')) return { code: 'CAD', locale: 'en-CA', sym: 'C$' };
  if (t.includes('USD') || (t.includes('$') && !/C\$/.test(t))) return { code: 'USD', locale: 'en-US', sym: '$' };
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

// Shared axes SVG (Y title horizontal, top-left; no clipping)
function svgAxes({ w, h, p, xTitle, yTitle, maxY, ticks = 5, labels = [] }) {
  const M = niceMax(maxY);
  // grid + Y tick values (readable, white)
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

  // axes
  const axes = `<polyline points="${p},${p} ${p},${h - p} ${w - p},${h - p}" fill="none" stroke="rgba(255,255,255,.65)"/>`;

  // Axis titles (horizontal Y, left of axis)
  const xTitleText = xTitle
    ? `<text x="${w / 2}" y="${h - 6}" text-anchor="middle" fill="#9AD0FF" font-size="20" font-weight="700">${esc(xTitle)}</text>`
    : '';
  const yTitleText = yTitle
    ? `<text x="${p - 16}" y="${p - 14}" text-anchor="end" fill="#9AD0FF" font-size="20" font-weight="700">${esc(yTitle)}</text>`
    : '';

  return `
    <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
    ${grid.join('')}
    ${axes}
    ${xTicks}
    ${xTitleText}
    ${yTitleText}
  `;
}

export function lineChartHTML({ title, labels = [], series = [], xTitle = '', yTitle = '' }) {
  const w = 760, h = 320, p = 92;  // ample left padding prevents clipping
  const data = (Array.isArray(series) ? series : []).map(Number).filter(Number.isFinite);
  const lbl = Array.isArray(labels) && labels.length ? labels : data.map((_, i) => 'P' + (i + 1));
  const max = Math.max(1, ...data);
  const M = niceMax(max);

  const slot = (w - 2 * p) / Math.max(Math.max(data.length - 1, 1), 1);
  const pts = data.map((v, i) => {
    const x = p + i * slot;
    const y = h - p - (v / M) * (h - 2 * p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const nice = prettyTitle(title || 'Line');

  return `
  <figure class="chart-card" data-type="line">
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
        <polyline points="${pts}" fill="none" stroke="#8bc6ff" stroke-width="2"/>
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
          return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${hv.toFixed(1)}" fill="#8bc6ff"/>`;
        }).join('')}
      </svg>

      <!-- PIE -->
      <svg class="plot pie" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${(() => {
          const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;
          let a0 = -Math.PI / 2;
          const sum = data.reduce((a, b) => a + b, 0) || 1;
          return data.map((v, i) => {
            const a1 = a0 + 2 * Math.PI * (v / sum);
            const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
            const large = (a1 - a0) > Math.PI ? 1 : 0;
            const col = `hsl(${200 + (i * 50) % 160},80%,65%)`;
            const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0 = a1;
            return `<path d="${d}" fill="${col}"/>`;
          }).join('');
        })()}
      </svg>

      <!-- DOUGHNUT -->
      <svg class="plot doughnut" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${(() => {
          const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;
          let a0 = -Math.PI / 2;
          const sum = data.reduce((a, b) => a + b, 0) || 1;
          const slices = data.map((v, i) => {
            const a1 = a0 + 2 * Math.PI * (v / sum);
            const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
            const large = (a1 - a0) > Math.PI ? 1 : 0;
            const col = `hsl(${200 + (i * 50) % 160},80%,65%)`;
            const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0 = a1;
            return `<path d="${d}" fill="${col}"/>`;
          }).join('');
          return `${slices}<circle cx="${w / 2}" cy="${h / 2}" r="${(Math.min(w, h) * 0.35 * 0.55).toFixed(1)}" fill="#0E2A44" stroke="#E6F0FF" />`;
        })()}
      </svg>
    </div>

    <!-- NEW: ensure type switch only toggles, never appends new charts -->
    <script>
      (function(){
        var card = document.currentScript.closest('.chart-card');
        var sel  = card.querySelector('.chart-type select');
        function apply(){
          var value = sel.value;
          card.setAttribute('data-type', value);
          card.querySelectorAll('.plot').forEach(function(svg){
            svg.style.display = svg.classList.contains(value) ? 'block' : 'none';
          });
        }
        sel.addEventListener('change', apply);
        apply(); // init
      })();
    </script>
  </figure>`;
}

export function barChartHTML(args) {
  return lineChartHTML({ ...args, title: args?.title });
}

// Dashboard / benchmark card
export function benchmarkHTML({ title, current = 0, benchmark = 0, xTitle = '', yTitle = '' }) {
  // [KT:SURGICAL:DASHBOARD-FIT] taller for legibility; fixed width/height so canvas won’t stretch
  const w = 760, h = 320, p = 92;
  const max = Math.max(1, current, benchmark);
  const M = niceMax(max);
  const slot = (w - 2 * p) / 2, bw = slot * 0.90;
  const h1 = (current / M) * (h - 2 * p), h2 = (benchmark / M) * (h - 2 * p);
  const nice = prettyTitle(title || 'Benchmark');
  return `
  <figure class="chart-card" data-type="bar">
    <header class="chart-head"><h3>${esc(nice)}</h3></header>
    <div class="canvas-wrap">
      <svg class="plot bar" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${svgAxes({ w, h, p, xTitle, yTitle, maxY: M, labels: ['Current', 'Benchmark'] })}
        <rect x="${(p + (slot - bw) / 2).toFixed(1)}" y="${(h - p - h1).toFixed(1)}" width="${bw.toFixed(1)}" height="${h1.toFixed(1)}" fill="#8bc6ff"/>
        <rect x="${(p + slot + (slot - bw) / 2).toFixed(1)}" y="${(h - p - h2).toFixed(1)}" width="${bw.toFixed(1)}" height="${h2.toFixed(1)}" fill="#8bc6ff"/>
      </svg>
    </div>
  </figure>`;
}

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
    const hue = 200 - t * 140; // blue → green
    const x = p + ci * cw, y = p + ri * ch;
    return `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="hsl(${hue},80%,55%)"/>`;
  })).join('');

  const grid = `
    ${Array.from({ length: r.length + 1 }, (_, i) => {
    const y = p + i * ch; return `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" stroke="rgba(255,255,255,.35)"/>`;
  }).join('')}
    ${Array.from({ length: c.length + 1 }, (_, i) => {
    const x = p + i * cw; return `<line x1="${x}" y1="${p}" x2="${x}" y2="${h - p}" stroke="rgba(255,255,255,.35)"/>`;
  }).join('')}
  `;

  const xlab = c.map((t, i) => `<text x="${p + (i + .5) * cw}" y="${h - 6}" text-anchor="middle" fill="#9AD0FF" font-size="18" font-weight="700">${esc(t)}</text>`).join('');
  const ylab = r.map((t, i) => `<text x="${p - 8}" y="${p + (i + .5) * ch + 6}" text-anchor="end" fill="#9AD0FF" font-size="22" font-weight="700">${esc(t)}</text>`).join('');

  const nice = prettyTitle(title || 'Heat Map');

  return `
  <section class="chart-card chart-heat" data-type="heat">
    <header class="chart-head"><h3>${esc(nice)}</h3></header>
    <div class="canvas-wrap">
      <svg class="plot heat" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${cells}${grid}${xlab}${ylab}
      </svg>
    </div>
    <div class="hm-legend"><span>Low</span><i></i><span>High</span></div>
  </section>`;
}

// Shared chart CSS
export const GRAPH_CSS = `
.chart-card{ background:#0E2A44; color:#E6F0FF; border-radius:16px; padding:12px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
.chart-card + .chart-card{ margin-top:8px; }
.chart-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin:4px 4px 8px; flex-wrap:wrap; }
.chart-head h3{ margin:0; font-size:1.05rem; font-weight:700; letter-spacing:.2px; }
.chart-type{ font-size:.90rem; display:flex; align-items:center; gap:6px; }
.chart-type select{ background:#123455; color:#000000; border:1px solid #2a4b75; border-radius:8px; padding:4px 8px; }
.canvas-wrap{ position:relative; overflow:hidden; border-radius:12px; }
/* [KT:SURGICAL:DASHBOARD-FIT] clamp width so the canvas never stretches */
.chart-card .canvas-wrap{ max-width:760px; margin:0 auto; }

.plot{ display:none; width:auto; height:auto; border-radius:12px; } /* keep intrinsic SVG size */

/* Legend title text removed to avoid duplicate title rendering */
.chart-legend{ display:inline-flex; align-items:center; gap:6px; font-size:.85rem; opacity:.95; }
.chart-legend .swatch{ width:12px; height:12px; border-radius:3px; background:#8bc6ff; display:inline-block; }
.chart-axes{ display:none !important; }
.chart-heat .hm-legend{ display:flex; align-items:center; gap:8px; font-size:.85rem; margin-top:6px; }
.chart-heat .hm-legend i{ flex:1; height:10px; border-radius:6px;
  background: linear-gradient(90deg, hsl(200,80%,55%), hsl(160,80%,55%)); }

/* [KT:SURGICAL] show active plot by data-type (overrides .plot default) */
.chart-card[data-type="line"] .plot.line{ display:block; }
.chart-card[data-type="bar"] .plot.bar{ display:block; }
.chart-card[data-type="pie"] .plot.pie{ display:block; }
.chart-card[data-type="doughnut"] .plot.doughnut{ display:block; }
.chart-card.chart-heat[data-type="heat"] .plot.heat{ display:block; }
.chart-card .canvas-wrap{ overflow:visible; }

/* Pure CSS switcher (commented out to prevent double-behavior that can cause visual duplication) */
/*
.chart-card:has(.chart-type select option[value="line"]:checked) .plot.line { display:block; }
.chart-card:has(.chart-type select option[value="bar"]:checked) .plot.bar { display:block; }
.chart-card:has(.chart-type select option[value="pie"]:checked) .plot.pie { display:block; }
.chart-card:has(.chart-type select option[value="doughnut"]:checked) .plot.doughnut { display:block; }
*/
`;