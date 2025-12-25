/* lib/reportGraphs.js
   Professional SVG charts for Reform Report
   - Bar chart (Financial Impact)
   - Line chart (KPIs & Measurement)
   - Implementation timeline (months if <=12, otherwise years)
   All outputs are returned as HTML <figure> blocks containing an <svg> plus a visible <figcaption>.
*/

import './utils/string.js';
import '../polyfills/repeatGuard.js';

const NS = '[SR:REFORM][graphs]';

// ----------------------------- Utilities ------------------------------------
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const num = (v, d = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : d;
};
const fmt = (n, d = 2) => Number(n).toFixed(d).replace(/\.00$/, '');

// Safe array helper
function safeArray(a, def = []) {
  if (!a) return def;
  if (Array.isArray(a)) return a;
  if (typeof a === 'number') return [a];
  return def;
}

// Stubs for legacy template support (backup files refer to these exports)
export function generateBarChartConfig(data, opts) {
  // Legacy: construct a basic bar chart config for Chart.js
  const labels = Array.isArray(data?.labels) ? data.labels : [];
  const datasets = Array.isArray(data?.datasets) && data.datasets.length > 0
    ? data.datasets.map((ds, i) => ({
        label: ds.label ?? `Series ${i + 1}`,
        data: Array.isArray(ds.data) ? ds.data.map(v => Number(v) || 0) : [],
        backgroundColor: ds.backgroundColor ?? ['#6366F1', '#10B981', '#F59E0B', '#EF4444'][i % 4],
      }))
    : [{
        label: 'Series 1',
        data: data?.data ? data.data.map(v => Number(v) || 0) : [],
        backgroundColor: '#6366F1',
      }];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } }
  };

  return {
    type: 'bar',
    data: { labels, datasets },
    options
  };
}
export function generateLineChartConfig(data, opts) {
  // Basic line chart config
  const labels = Array.isArray(data?.labels) ? data.labels : [];
  const datasets = Array.isArray(data?.datasets) && data.datasets.length > 0
    ? data.datasets.map((ds, i) => ({
        label: ds.label ?? `Series ${i + 1}`,
        data: Array.isArray(ds.data) ? ds.data.map(v => Number(v) || 0) : [],
        borderColor: ds.borderColor ?? (i % 2 ? '#10B981' : '#6366F1'),
        fill: ds.fill ?? false
      }))
    : [{
        label: data?.label ?? 'Series 1',
        data: data?.data ? data.data.map(v => Number(v) || 0) : [],
        borderColor: '#6366F1',
        fill: false
      }];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } }
  };

  return {
    type: 'line',
    data: { labels, datasets },
    options
  };
}
export function serializeChartConfig(cfg) {
  // Serialize to string for storage or transmission
  return JSON.stringify(cfg);
}

// Escape util
function textEscape(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function moneyShort(n) {
  const x = Math.round(num(n));
  if (x >= 1_000_000_000) return `$${(x / 1_000_000_000).toFixed(1)}B`;
  if (x >= 1_000_000) return `$${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `$${(x / 1_000).toFixed(1)}k`;
  return `$${x}`;
}

// Title text block for charts
function titleBlock({ title, width, pad, fg }) {
  if (!title) return '';
  const x = pad;
  const y = pad - 10;
  return `\n    <text x="${x}" y="${y}" text-anchor="start" dominant-baseline="ideographic"
      style="font: 700 18px/1.1 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial; fill: ${fg};">
      ${textEscape(title)}
    </text>`;
}

// Dark-friendly defaults with high-contrast foreground
const DefaultTheme = {
  bg: 'transparent',
  fg: '#E5E7EB', // light gray text
  axis: '#94A3B8', // slate-400 axes
  grid: 'rgba(148,163,184,0.25)',
  bar: '#6366F1', // indigo-500
  line: '#10B981', // emerald-500
  accent: '#F59E0B', // amber-500 (milestones)
};

// --------------------------- Bar Chart ---------------------------------------
export function barChartHTML(
  items = [],
  {
    width = 720,
    height = 320,
    pad = 48,
    title = 'Financial Impact',
    theme = DefaultTheme,
    yMax = null, // optional fixed max
    yTicks = 5,
  } = {},
) {
  const data = safeArray(items).filter(Boolean);
  if (!data.length) {
    return `<figure class="graph graph-bar"><figcaption>${textEscape(title || 'Bar Chart')}</figcaption><em>No data</em></figure>`;
  }

  // Guard against invalid ticks
  const yTicksSafe = Math.max(1, Math.floor(Number(yTicks) || 1));

  const w = width, h = height;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const maxVal = yMax != null ? num(yMax) : Math.max(...data.map((d) => num(d.value, 0)), 1);
  const gap = 16;
  const barW = innerW / data.length - gap;
  const axisY = pad + innerH;

  const bars = data.map((d, i) => {
    const val = clamp(num(d.value, 0), 0, maxVal);
    const hVal = (val / (maxVal || 1)) * innerH;
    const x = pad + i * (barW + gap);
    const y = axisY - hVal;
    const c = d.color || theme.bar;
    const label = (d.label ?? '').toString();
    return `\n      <rect x="${x}" y="${y}" width="${barW}" height="${Math.max(1, hVal)}" rx="6" ry="6"
        fill="${c}"/>
      <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle"
        style="font: 600 12px ui-sans-serif, system-ui; fill: ${theme.fg};">${moneyShort(val)}</text>
      <text x="${x + barW / 2}" y="${axisY + 18}" text-anchor="middle"
        style="font: 500 12px ui-sans-serif, system-ui; fill: ${theme.fg};">${textEscape(label)}</text>\n`;
  }).join('');

  const gridLines = Array.from({ length: yTicksSafe + 1 }, (_, i) => {
    const t = i / yTicksSafe;
    const y = pad + innerH - t * innerH;
    const v = Math.round(t * maxVal);
    return `\n      <line x1="${pad}" y1="${y}" x2="${pad + innerW}" y2="${y}"
        stroke="${theme.grid}" stroke-width="1"/>\n      <text x="${pad - 10}" y="${y}" text-anchor="end" dominant-baseline="middle"
        style="font: 500 12px ui-sans-serif, system-ui; fill: ${theme.fg};">${moneyShort(v)}</text>\n    `;
  }).join('');

  return `\n<figure class="graph graph-bar" role="group" aria-roledescription="bar chart">
  ${title ? `<figcaption style="margin-bottom:6px; font-weight:700; font-size:16px; color:${theme.fg};">${textEscape(title)}</figcaption>` : ''}
  <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${theme.bg}" />
    ${titleBlock({ title, width: w, pad, fg: theme.fg })}
    <g>
      <line x1="${pad}" y1="${axisY}" x2="${pad + innerW}" y2="${axisY}" stroke="${theme.axis}" stroke-width="1.5"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${axisY}" stroke="${theme.axis}" stroke-width="1.5"/>
      ${gridLines}
      ${bars}
    </g>
  </svg>
</figure>`;
}

// --------------------------- Line Chart ---------------------------------------
export function lineChartHTML(
  values = [],
  {
    labels = [],
    width = 720,
    height = 320,
    pad = 56,
    title = 'KPIs Trend',
    theme = DefaultTheme,
    yTicks = 5,
    showDots = true,
  } = {},
) {
  const pts = safeArray(values);
  const N = pts.length;
  if (!N) {
    return `<figure class="graph graph-line"><figcaption>${textEscape(title || 'Line Chart')}</figcaption><em>No data</em></figure>`;
  }

  // Prevent invalid negative/zero tick counts that cause RangeError in Array.from
  const yTicksSafe = Math.max(1, Math.floor(Number(yTicks) || 1));

  const w = width, h = height;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const axisY = pad + innerH;

  const min = Math.min(...pts, 0);
  const max = Math.max(...pts, 1);
  const yRange = Math.max(1e-6, max - min);
  const sx = (i) => pad + (i * innerW) / Math.max(1, N - 1);
  const sy = (v) => pad + innerH * (1 - (v - min) / yRange);

  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const dots = showDots
    ? pts.map((v, i) => `<circle cx="${sx(i).toFixed(1)}" cy="${sy(v).toFixed(1)}" r="3.5" fill="${theme.line}" />`).join('')
    : '';

  const gridLines = Array.from({ length: yTicksSafe + 1 }, (_, i) => {
    const t = i / yTicksSafe;
    const y = pad + innerH - t * innerH;
    const val = min + t * yRange;
    return `\n      <line x1="${pad}" y1="${y}" x2="${pad + innerW}" y2="${y}" stroke="${theme.grid}" stroke-width="1"/>\n      <text x="${pad - 10}" y="${y}" text-anchor="end" dominant-baseline="middle"\n        style="font: 500 12px ui-sans-serif, system-ui; fill: ${theme.fg};">${fmt(val)}</text>\n    `;
  }).join('');

  const showX =
    (Array.isArray(labels) && labels.length === N)
      ? labels.map((txt, i) => `<text x="${sx(i).toFixed(1)}" y="${axisY + 18}" text-anchor="middle"
        style="font: 500 12px ui-sans-serif, system-ui; fill: ${theme.fg};">${textEscape(String(txt))}</text>`).join('')
      : '';

  return `\n<figure class="graph graph-line" role="group" aria-roledescription="line chart">
  ${title ? `<figcaption style="margin-bottom:6px; font-weight:700; font-size:16px; color:${theme.fg};">${textEscape(title)}</figcaption>` : ''}
  <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${theme.bg}" />
    ${titleBlock({ title, width: w, pad, fg: theme.fg })}
    <g fill="none">
      <line x1="${pad}" y1="${axisY}" x2="${pad + innerW}" y2="${axisY}" stroke="${theme.axis}" stroke-width="1.5"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${axisY}" stroke="${theme.axis}" stroke-width="1.5"/>
      ${gridLines}
      <path d="${path}" stroke="${theme.line}" stroke-width="2.75" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
      ${showX}
    </g>
  </svg>
</figure>`;
}

// --------------------------- Implementation Timeline -------------------------
export function implementationTimelineHTML(
  config = {},
  { width = 920, height = 220, pad = 52, theme = DefaultTheme } = {},
) {
  const totalMonths = clamp(num(config.totalMonths, 12), 1, 240);
  const milestones = safeArray(config.milestones).map((m) => ({
    when: clamp(num(m.when, 0), 0, totalMonths),
    label: String(m.label ?? ''),
    phase: m.phase ? String(m.phase) : null,
  }));
  const phases = safeArray(config.phases);
  const title = config.title || 'Implementation Timeline';

  const w = width, h = height;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const axisY = pad + innerH - 20;

  const useMonthly = totalMonths <= 12;
  const tickN = useMonthly ? totalMonths : Math.max(1, Math.round(totalMonths / 12));
  const tickStep = innerW / tickN;
  const sx = (month) => pad + (month / totalMonths) * innerW;

  // phase bands
  const bands = phases
    .map((p) => {
      const x = sx(p.start);
      const x2 = sx(p.end);
      return `\n      <rect x="${x}" y="${pad}" width="${Math.max(1, x2 - x)}" height="${innerH - 40}"
        fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.25)" stroke-width="1"/>\n      <text x="${(x + x2) / 2}" y="${pad + 16}" text-anchor="middle"
        style="font: 600 12px ui-sans-serif, system-ui; fill: ${theme.fg};">${textEscape(p.name || '')}</text>\n    `;
    })
    .join('');

  // ticks
  const ticks = Array.from({ length: tickN + 1 }, (_, i) => {
    const x = pad + i * tickStep;
    const mo = Math.round((i / tickN) * totalMonths);
    const label = useMonthly ? `M${mo}` : `Y${Math.round(mo / 12)}`;
    return `\n      <line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY - 8}" stroke="${theme.axis}" stroke-width="1.5"/>\n      <text x="${x}" y="${axisY + 16}" text-anchor="middle"\n        style="font: 500 12px ui-sans-serif, system-ui; fill: ${theme.fg};">${label}</text>\n    `;
  }).join('');

  // milestones
  const pins = milestones
    .map((m) => {
      const x = sx(m.when);
      const y = axisY - 28;
      return `\n      <line x1="${x}" y1="${axisY}" x2="${x}" y2="${y + 6}" stroke="${theme.accent}" stroke-width="2"/>\n      <circle cx="${x}" cy="${y}" r="6" fill="${theme.accent}" />\n      <text x="${x}" y="${y - 10}" text-anchor="middle" style="font: 600 12px ui-sans-serif, system-ui; fill: ${theme.fg};">${textEscape(m.label)}</text>\n    `;
    })
    .join('');

  return `\n<figure class="graph graph-timeline" role="group" aria-roledescription="timeline">
  ${title ? `<figcaption style="margin-bottom:6px; font-weight:700; font-size:16px; color:${theme.fg};">${textEscape(title)}</figcaption>` : ''}
  <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${theme.bg}" />
    ${titleBlock({ title, width: w, pad, fg: theme.fg })}
    <g>
      ${bands}
      <!-- axis -->
      <line x1="${pad}" y1="${axisY}" x2="${pad + innerW}" y2="${axisY}" stroke="${theme.axis}" stroke-width="2"/>
      ${ticks}
      ${pins}
    </g>
  </svg>
</figure>`;
}

// Safe guard: clamp repeat counts to non-negative integers to avoid RangeError
(function() {
  const _repeat = String.prototype.repeat;
  if (typeof _repeat === 'function') {
    String.prototype.repeat = function(count) {
      const n = Math.max(0, Math.floor(Number(count) || 0));
      return _repeat.call(this, n);
    };
  }
})();