// app/lib/reportGraphs.js
// Lightweight, dependency-free SVG renderers used by the report template.
// Exports: lineChartHTML, barChartHTML, heatmapHTML, benchmarkHTML, GRAPH_CSS

/* ───────────────────────────── Helpers ───────────────────────────── */

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const prettyTitle = (s = '') => String(s).trim() || 'Untitled';

const niceMax = (max) => {
  const m = Math.max(1, Number(max) || 0);
  const pow = Math.pow(10, Math.floor(Math.log10(m)));
  const top = Math.ceil(m / pow) * pow;
  // Round to 1, 2, 5 steps
  if (top / pow >= 5) return 5 * pow;
  if (top / pow >= 2) return 2 * pow;
  return pow;
};

const fmtTick = (v, unit = '') => {
  const n = Number(v) || 0;
  if (/percent/i.test(unit)) return `${n}%`;
  if (/cad|usd|eur|gbp|inr|spend|revenue|sales|$/.test(unit.toLowerCase())) {
    // Simple currency-ish compact format
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return String(n);
  }
  return String(n);
};

// common grid (axes + ticks + axis titles)
function gridAndAxes({ w, h, p, labels, xTitle, yTitle, maxY }) {
  const ticks = 5;
  const M = Math.max(1, Number(maxY) || 1);
  const grid = [];
  for (let i = 0; i <= ticks; i++) {
    const y = p + (i * (h - 2 * p)) / ticks;
    const val = Math.round(M * (1 - i / ticks));
    grid.push(`
      <line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" stroke="rgba(255,255,255,35)"/>
      <!-- [KT:SURGICAL:FONT-UP] enlarged for readability -->
      <text x="${p - 14}" y="${y + 10}" text-anchor="end" fill="#FFFFFF" font-size="18">${fmtTick(val, yTitle)}</text>
    `);
  }

  const slot = (w - 2 * p) / Math.max(labels.length, 1);
  const xTicks = labels
    .map((t, i) => {
      const x = p + i * slot + slot / 2;
      return `<text x="${x}" y="${h - p + 22}" text-anchor="middle" fill="#FFFFFF" font-size="18">${esc(t)}</text>`;
    })
    .join('');

  const axes = `<polyline points="${p},${p} ${p},${h - p} ${w - p},${h - p}" fill="none" stroke="rgba(255,255,255,65)"/>`;

  const xTitleText = xTitle
    ? `<text x="${w / 2}" y="${h - 6}" text-anchor="middle" fill="#9AD0FF" font-size="20" font-weight="700">${esc(
        xTitle
      )}</text>`
    : '';
  const yTitleText = yTitle
    ? `<text x="${p - 16}" y="${p - 14}" text-anchor="end" fill="#9AD0FF" font-size="20" font-weight="700">${esc(
        yTitle
      )}</text>`
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

/* ───────────────────────────── Line Chart ───────────────────────────── */

export function lineChartHTML({ title, labels = [], series = [], xTitle = '', yTitle = '' }) {
  const w = 760,
    h = 320,
    p = 92;
  const data = (Array.isArray(series) ? series : []).map(Number).filter(Number.isFinite);
  const lbl = Array.isArray(labels) && labels.length ? labels : data.map((_, i) => 'P' + (i + 1));
  const max = Math.max(1, ...data);
  const M = niceMax(max);

  const slot = (w - 2 * p) / Math.max(data.length - 1, 1);
  const pts = data
    .map((v, i) => {
      const x = p + i * slot;
      const y = h - p - (v / M) * (h - 2 * p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const nice = prettyTitle(title || 'Line');

  return `
  <figure class="chart-card" data-type="line">
    <header class="chart-head">
      <h3>${esc(nice)}</h3>
      <div class="chart-type"><label>Type</label>
        <select aria-label="Chart Type" onchange="this.closest('.chart-card').dataset.type=this.value">
          <option value="line" selected>Line</option>
          <option value="bar">Bar</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
        </select>
      </div>
    </header>

    <div class="canvas-wrap">
      <!-- LINE -->
      <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        ${gridAndAxes({ w, h, p, labels: lbl, xTitle, yTitle, maxY: M })}
        <polyline points="${pts}" fill="none" stroke="#8bc6ff" stroke-width="3"/>
        ${data
          .map((v, i) => {
            const x = p + i * slot;
            const y = h - p - (v / M) * (h - 2 * p);
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#8bc6ff"/>`;
          })
          .join('')}
      </svg>

      <!-- BAR -->
      <svg class="plot bar" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        ${gridAndAxes({ w, h, p, labels: lbl, xTitle, yTitle, maxY: M })}
        ${data
          .map((v, i) => {
            const slot = (w - 2 * p) / Math.max(data.length, 1);
            const bw = slot * 0.9;
            const x = p + i * slot + (slot - bw) / 2;
            const hv = (v / M) * (h - 2 * p);
            const y = h - p - hv;
            return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(
              1
            )}" height="${hv.toFixed(1)}" fill="#8bc6ff"/>`;
          })
          .join('')}
      </svg>

      <!-- PIE -->
      <svg class="plot pie" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${(() => {
          const cx = w / 2,
            cy = h / 2,
            R = Math.min(w, h) * 0.35;
          let a0 = -Math.PI / 2;
          const sum = data.reduce((a, b) => a + b, 0) || 1;
          return data
            .map((v, i) => {
              const a1 = a0 + (2 * Math.PI * v) / sum;
              const x0 = cx + R * Math.cos(a0),
                y0 = cy + R * Math.sin(a0);
              const x1 = cx + R * Math.cos(a1),
                y1 = cy + R * Math.sin(a1);
              const large = a1 - a0 > Math.PI ? 1 : 0;
              const col = `hsl(${200 + ((i * 50) % 160)},80%,65%)`;
              const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
              a0 = a1;
              return `<path d="${d}" fill="${col}"/>`;
            })
            .join('');
        })()}
      </svg>

      <!-- DOUGHNUT -->
      <svg class="plot doughnut" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        ${(() => {
          const cx = w / 2,
            cy = h / 2,
            R = Math.min(w, h) * 0.35;
          let a0 = -Math.PI / 2;
          const sum = data.reduce((a, b) => a + b, 0) || 1;
          const slices = data.map((v, i) => {
            const a1 = a0 + (2 * Math.PI * v) / sum;
            const x0 = cx + R * Math.cos(a0),
              y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1),
              y1 = cy + R * Math.sin(a1);
            const large = a1 - a0 > Math.PI ? 1 : 0;
            const outer = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0 = a1;
            return { outer, i };
          });
          const innerR = R * 0.58;
          return slices
            .map(({ outer, i }) => {
              const col = `hsl(${200 + ((i * 50) % 160)},80%,65%)`;
              return `<path d="${outer}" fill="${col}"/>`;
            })
            .join('') +
            `<circle cx="${w / 2}" cy="${h / 2}" r="${innerR}" fill="#0E2A44"/>`;
        })()}
      </svg>
    </div>
  </figure>`;
}

/* ───────────────────────────── Bar Chart ───────────────────────────── */

export function barChartHTML({ title, labels = [], series = [], xTitle = '', yTitle = '' }) {
  const w = 760,
    h = 320,
    p = 92;
  const data = (Array.isArray(series) ? series : []).map(Number).filter(Number.isFinite);
  const lbl = Array.isArray(labels) && labels.length ? labels : data.map((_, i) => 'P' + (i + 1));
  const max = Math.max(1, ...data);
  const M = niceMax(max);
  const slot = (w - 2 * p) / Math.max(data.length, 1);
  const bw = slot * 0.9;
  const nice = prettyTitle(title || 'Bar');

  return `
  <figure class="chart-card" data-type="bar">
    <header class="chart-head">
      <h3>${esc(nice)}</h3>
      <div class="chart-type"><label>Type</label>
        <select aria-label="Chart Type" onchange="this.closest('.chart-card').dataset.type=this.value">
          <option value="bar" selected>Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
        </select>
      </div>
    </header>
    <div class="canvas-wrap">
      <svg class="plot bar" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        ${gridAndAxes({ w, h, p, labels: lbl, xTitle, yTitle, maxY: M })}
        ${data
          .map((v, i) => {
            const x = p + i * slot + (slot - bw) / 2;
            const hv = (v / M) * (h - 2 * p);
            const y = h - p - hv;
            return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(
              1
            )}" height="${hv.toFixed(1)}" rx="4" ry="4" fill="#8bc6ff"/>`;
          })
          .join('')}
      </svg>
    </div>
  </figure>`;
}

/* ───────────────────────────── Heat Map ───────────────────────────── */

export function heatmapHTML({ title, rows = [], cols = [], data = [[]] }) {
  const w = 760,
    h = 320,
    p = 92;
  const r = rows.length ? rows : ['R1', 'R2', 'R3', 'R4', 'R5'];
  const c = cols.length ? cols : ['C1', 'C2', 'C3', 'C4', 'C5'];
  const m = Array.isArray(data) && data.length ? data : Array.from({ length: r.length }, () =>
    Array.from({ length: c.length }, () => 0)
  );

  let min = Infinity,
    max = -Infinity;
  m.forEach((row) =>
    row.forEach((v) => {
      v = Number(v) || 0;
      min = Math.min(min, v);
      max = Math.max(max, v);
    })
  );
  if (!isFinite(min)) {
    min = 0;
    max = 1;
  }
  const cw = (w - 2 * p) / c.length,
    ch = (h - 2 * p) / r.length;

  const cells = r
    .flatMap((_, ri) =>
      c.map((_, ci) => {
        const v = Number(m[ri][ci]) || 0;
        const t = (v - min) / Math.max(1e-6, max - min);
        const hue = 200 - t * 140; // blue → green
        const x = p + ci * cw,
          y = p + ri * ch;
        return `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="hsl(${hue},80%,55%)"/>`;
      })
    )
    .join('');

  const grid = `
    ${Array.from({ length: r.length + 1 }, (_, i) => {
      const y = p + i * ch;
      return `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" stroke="rgba(255,255,255,35)"/>`;
    }).join('')}
    ${Array.from({ length: c.length + 1 }, (_, i) => {
      const x = p + i * cw;
      return `<line x1="${x}" y1="${p}" x2="${x}" y2="${h - p}" stroke="rgba(255,255,255,35)"/>`;
    }).join('')}
  `;

  const xlab = c
    .map(
      (t, i) =>
        `<text x="${p + (i + 0.5) * cw}" y="${h - 6}" text-anchor="middle" fill="#9AD0FF" font-size="18" font-weight="700">${esc(
          t
        )}</text>`
    )
    .join('');
  const ylab = r
    .map(
      (t, i) =>
        `<text x="${p - 8}" y="${p + (i + 0.5) * ch + 6}" text-anchor="end" fill="#9AD0FF" font-size="22" font-weight="700">${esc(
          t
        )}</text>`
    )
    .join('');

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

/* ───────────────────────────── Benchmark (2-col gauge) ───────────────────────────── */

export function benchmarkHTML({ title, current = 0, benchmark = 0, yTitle = '' }) {
  const w = 760,
    h = 200,
    p = 92;
  const nice = prettyTitle(title || 'Benchmark');
  const M = niceMax(Math.max(Math.abs(current), Math.abs(benchmark), 1));
  const toX = (v) => p + ((v / M) * (w - 2 * p)) / 1; // 0..M scale

  return `
  <figure class="chart-card" data-type="benchmark">
    <header class="chart-head"><h3>${esc(nice)}</h3></header>
    <div class="canvas-wrap">
      <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(nice)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#0E2A44"/>
        <line x1="${p}" y1="${h / 2}" x2="${w - p}" y2="${h / 2}" stroke="rgba(255,255,255,35)"/>
        <circle cx="${toX(current)}" cy="${h / 2}" r="8" fill="#8bc6ff"/>
        <circle cx="${toX(benchmark)}" cy="${h / 2}" r="8" fill="hsl(40,90%,60%)"/>
        <text x="${toX(current)}" y="${h / 2 - 14}" text-anchor="middle" fill="#E6F0FF" font-size="14">Current: ${fmtTick(
          current,
          yTitle
        )}</text>
        <text x="${toX(benchmark)}" y="${h / 2 + 28}" text-anchor="middle" fill="#E6F0FF" font-size="14">Benchmark: ${fmtTick(
          benchmark,
          yTitle
        )}</text>
        ${
          yTitle
            ? `<text x="${p - 16}" y="${p - 14}" text-anchor="end" fill="#9AD0FF" font-size="18" font-weight="700">${esc(
                yTitle
              )}</text>`
            : ''
        }
      </svg>
    </div>
  </figure>`;
}

/* ───────────────────────────── Shared CSS ───────────────────────────── */

export const GRAPH_CSS = `
.chart-card{ background:#0E2A44; color:#E6F0FF; border-radius:16px; padding:12px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
.chart-card + .chart-card{ margin-top:8px; }
.chart-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin:4px 4px 8px; flex-wrap:wrap; }
.chart-head h3{ margin:0; font-size:1.05rem; font-weight:700; letter-spacing:.2px; }
.chart-type{ font-size:.90rem; display:flex; align-items:center; gap:6px; }
.chart-type select{ background:#123455; color:#eaf3ff; border:1px solid #2a4b75; border-radius:8px; padding:4px 8px; }
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

/* Avoid a second CSS-only switcher that could double-toggle visuals
.chart-card:has(.chart-type select option[value="line"]:checked) .plot.line { display:block; }
.chart-card:has(.chart-type select option[value="bar"]:checked) .plot.bar { display:block; }
.chart-card:has(.chart-type select option[value="pie"]:checked) .plot.pie { display:block; }
.chart-card:has(.chart-type select option[value="doughnut"]:checked) .plot.doughnut { display:block; }
*/
`;
