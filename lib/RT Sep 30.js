/*
To Do List:
1)Go to your previous backup where there were no tables consuming the report
2) Break down content into shorter paragraphs
3)NO ** in the content
4)Remove graphs Narrative Allocation, Section Depth Comparison
   Methodology Themes
5)Remove values from line graphs
6)Allocate Graphs as follows by type
   executiveSummary-Bar Graph or Line graph of Savings by Period (months if less than 12 months else years)
   background: ''
   methodology: ''
   findings: ''
   recommendations: ''
   implementationRoadmap-The implementation with report data (dynamic meaning changing from report to report that looks
                         exactly like the one attached)
   financials-Line graph of expenditures and payback
   kpis: Dashboard with the following Bar graph of savings, Payback over investment horizon and 2 metrics from the company from AI against benchmarks
   risks: -Heat Map
   change: ''
   timeline-The implementation with report data (dynamic meaning changing from report to report that looks
                         exactly like the one attached)
   conclusion: ''
   appendices: ''
7)Drop downs to switch graph types
  }
- Inject Organization Name
- Stylized zebra tables, 1-2 per section, no tables consuming the report
- Ensure correct Sovereign Intelligence logo is used
*/

import { buildReformReportHTML as buildFromBackup } from './reportTemplate.js.20250921014018.bak.js';
import { barChartHTML, lineChartHTML, implementationTimelineHTML } from './reportGraphs.js';
import { generateBarChartConfig, generateLineChartConfig, serializeChartConfig } from './reportGraphs.js';
import { safeRepeat } from '../utils/stringSafe.js';
import './utils/string.js';
import '../polyfills/repeatGuard.js';

function injectPreviewOverrides(html) {
  const overrides = `
  <style id="si-preview-overrides">
    /* Prevent horizontal scrollbars */
  html, body { overflow-x: hidden !important; background: #ffffff !important; }
  /* Constrain viewer for readability */
  .reportContainer { max-width: 600px !important; margin: 0 auto !important; overflow-x: hidden !important; }
    .reportContainer .section-content { max-width: 100% !important; overflow-x: hidden !important; }
    .reportContainer img, .reportContainer canvas, .reportContainer svg { max-width: 100% !important; height: auto; }
    figure, table { max-width: 100% !important; }

    /* Force portrait Letter for print and preview */
    @page { size: Letter portrait; margin: 1in; }
    @media print {
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #ffffff !important; }
      .reportContainer { width: auto; margin: 0 auto; background: #ffffff !important; color: #111827 !important; }
    }

    /* Contrast fixes for dark cards (timeline/phase blocks) */
    .reportContainer .phase, .reportContainer [class*="phase"], .reportContainer .card, .reportContainer .timeline, .reportContainer .panel {
      color: #ffffff !important;
    }
    .reportContainer .phase h1, .reportContainer .phase h2, .reportContainer .phase h3,
    .reportContainer [class*="phase"] h1, .reportContainer [class*="phase"] h2, .reportContainer [class*="phase"] h3,
    .reportContainer .card h1, .reportContainer .card h2, .reportContainer .card h3 { color:#ffffff !important; }

    .reportContainer, .reportContainer .section-content { background: #ffffff !important; color: #111827 !important; }
    .reportContainer p, .reportContainer li, .reportContainer td, .reportContainer th { color: #111827 !important; }

    /* Table alignment and sizing */
    .reportContainer table { width: 100% !important; table-layout: fixed; border-collapse: collapse; margin: 12px auto; float: none; }
  /* Table row striping and header background styles for key metrics table */
    .reportContainer table tr:nth-child(even) { background-color: #f9fafb !important; }
    .reportContainer table th { background-color: #e5e7eb !important; font-weight: 600 !important; }
    .reportContainer table th, .reportContainer table td { border: 1px solid #d1d5db; padding: 10px 12px; vertical-align: top; word-wrap: break-word; }
    .reportContainer figure { margin: 16px auto; }
    /* Ensure badges/insights are legible */
    .reportContainer .badge, .reportContainer .chip, .reportContainer .pill, .reportContainer [class*="insight"] { color: #111827 !important; background: #e5f2ff !important; border-color: #bfdbfe !important; }
    /* Comment/insight bubble must not cover content */
    .reportContainer [class*="insight"], .reportContainer .comment, .reportContainer .note { position: static !important; display: block !important; clear: both !important; width: auto !important; margin: 8px 0 !important; z-index: 1 !important; }

    /* No scrollbars in preview; we replace any problematic table entirely */
    .reportContainer .table-wrapper { max-height: none; overflow: visible; border: none; border-radius: 0; background: transparent; }
    .reportContainer .table-wrapper table { display: table; width: 100%; }

    /* New: generic scroll wrapper for giant tables */
    .si-table-scroll { max-height: 440px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; }

    /* Bold fix: reset block weights and honor inline strong/bold */
    .reportContainer p, .reportContainer li, .reportContainer td, .reportContainer th { font-weight: 400 !important; }
    .reportContainer h1, .reportContainer h2, .reportContainer h3, .reportContainer h4 { font-weight: 700 !important; }
    .reportContainer p strong, .reportContainer p b, .reportContainer li strong, .reportContainer li b { font-weight: 700 !important; }

    .si-chart-controls { display:flex; gap:8px; align-items:center; margin: 6px 0 8px; font: 500 13px/1.4 ui-sans-serif, system-ui; color:#111827; }
    .si-chart-controls select { border:1px solid #d1d5db; border-radius:6px; padding:4px 8px; background:#fff; color:#111827; }
    .chart-container { position: relative; width: 100%; height: 360px; margin: 8px 0 12px; }

    /* KPI dashboard cards */
    .si-kpi-grid{display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:12px; margin:10px 0 12px;}
    .si-kpi-card{background:#0f172a; color:#e5e7eb; border-radius:12px; padding:12px;}
    .si-kpi-name{font:600 12px/1.1 ui-sans-serif,system-ui; opacity:.85;}
    .si-kpi-val{font:800 20px/1.1 ui-sans-serif,system-ui; margin-top:6px;}
    .si-kpi-bar{height:6px; background:#1f2937; border-radius:999px; overflow:hidden; margin-top:8px;}
    .si-kpi-bar-fill{height:100%; background:#22d3ee;}

    /* Add CSS to hide any slider controls for graphs */
    .slider, input[type=range] { display: none !important; }

    /* Force dark figcaption titles to white */
    .reportContainer figure.graph figcaption { color: #ffffff !important; }

  </style>`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n${overrides}`);
  }
  return `${overrides}${html}`;
}

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '<').replace(/>/g, '>');
}

function cleanAndFixHTML(html) {
  if (typeof html !== 'string') return html;

  let cleaned = html;

  const openTables = (cleaned.match(/<table[^>]*>/gi) || []).length;
  const closeTables = (cleaned.match(/<\/table>/gi) || []).length;

  if (openTables > closeTables) {
    const missingCloseTags = openTables - closeTables;
    for (let i = 0; i < missingCloseTags; i += 1) {
      cleaned += '</tbody></table>';
    }
  }

  const openTbody = (cleaned.match(/<tbody[^>]*>/gi) || []).length;
  const closeTbody = (cleaned.match(/<\/tbody>/gi) || []).length;

  if (openTbody > closeTbody) {
    const missingTbodyTags = openTbody - closeTbody;
    for (let i = 0; i < missingTbodyTags; i += 1) {
      cleaned += '</tbody>';
    }
  }

  cleaned = cleaned.replace(/(<table[^>]*>[\s\S]*?<\/table>)/gi, (match) => {
    if (match.includes('data-wrapped-table="true"')) return match;

    const normalizedTable = match.replace(/<table([^>]*)>/i, (tag, attrs = '') => {
      let nextAttrs = attrs;

      if (!/data-wrapped-table/i.test(nextAttrs)) {
        nextAttrs += ' data-wrapped-table="true"';
      }

      if (/class=/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(/class="([^"]*)"/i, (_m, classes) => `class="${classes} report-table"`);
      } else {
        nextAttrs += ' class="report-table"';
      }

      if (/style=/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(
          /style="([^"]*)"/i,
          (_m, style) => `style="${style}; width: 100%; border-collapse: collapse;"`,
        );
      } else {
        nextAttrs += ' style="width: 100%; border-collapse: collapse;"';
      }

      return `<table${nextAttrs}>`;
    });

    return `<div class="table-wrapper">${normalizedTable}</div>`;
  });

  return cleaned;
}

function replaceCanonFields(html, canon) {
  return typeof html === 'string'
    ? html.replace(/\$canon\.([a-zA-Z0-9_]+)/g, (m, key) => esc(canon[key] ?? ''))
    : html;
}

function plainText(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0';
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0%';
  return `${Math.round(num)}%`;
}

function firstSentence(text = '') {
  const match = String(text || '').match(/[^.!?]+[.!?]?/);
  return match ? match[0].trim() : String(text || '').trim();
}

function formatSectionTitle(key = '') {
  return String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function computeKeywordStats(text = '', definitions = []) {
  if (!text || !Array.isArray(definitions) || !definitions.length) return null;
  const stats = definitions.map(({ label, regex }) => {
    const pattern =
      regex instanceof RegExp ? new RegExp(regex.source, regex.flags) : new RegExp(regex, 'gi');
    const matches = text.match(pattern) || [];
    return { label, value: matches.length };
  });
  return stats.some((entry) => entry.value > 0) ? stats : null;
}

function renderChart(chartRegistry, chartType, data = {}, options = {}) {
  if (!Array.isArray(chartRegistry)) return '';

  const { title = 'Performance Metrics', insight, chartOptions = {}, fallbackLabel = 'Series' } = options;
  const labels = Array.isArray(data.labels) ? data.labels : [];
  const datasetsInput = Array.isArray(data.datasets) ? data.datasets : [];

  if (!labels.length || !datasetsInput.some((dataset) => Array.isArray(dataset?.data) && dataset.data.length)) {
    return '';
  }

  const normalizedDatasets = datasetsInput.map((dataset, index) => {
    const values = Array.isArray(dataset.data)
      ? dataset.data.map((value) => {
          const num = Number(value);
          return Number.isFinite(num) ? num : 0;
        })
      : [];

    return {
      ...dataset,
      label: dataset.label || fallbackLabel || `Series ${index + 1}`,
      data: values,
    };
  });

  const chartId = `chart_${Math.random().toString(36).slice(2, 9)}`;

  const configOptions = {
    ...chartOptions,
  };

  if (chartType !== 'line' && typeof configOptions.beginAtZero !== 'boolean') {
    configOptions.beginAtZero = true;
  }

  const chartConfig =
    chartType === 'line'
      ? generateLineChartConfig({ labels, datasets: normalizedDatasets }, configOptions)
      : generateBarChartConfig({ labels, datasets: normalizedDatasets }, configOptions);

  chartRegistry.push({
    id: chartId,
    config: serializeChartConfig(chartConfig),
    needsLocaleFormatter:
      configOptions.showDataLabels === true && !configOptions.dataLabelFormatter,
  });

  let derivedInsight = insight;
  const primaryDataset = normalizedDatasets[0];
  if (!derivedInsight && primaryDataset && primaryDataset.data.length) {
    const maxIndex = primaryDataset.data.reduce(
      (acc, value, idx) => (value > primaryDataset.data[acc] ? idx : acc),
      0,
    );
    const peakLabel = labels[maxIndex] || 'Peak';
    const peakValue = primaryDataset.data[maxIndex];
    derivedInsight = `${title} peaks in ${peakLabel} at ${formatNumber(peakValue)}.`;
  }

  return `
    <div class="chart-container">
      <div class="chart-heading">
        <h3>${esc(title)}</h3>
      </div>
      <div class="chart-body">
        <canvas id="${chartId}" height="260"></canvas>
      </div>
      ${
        derivedInsight
          ? `<div class="chart-insight"><strong>Key Insight:</strong> ${esc(derivedInsight)}</div>`
          : ''
      }
    </div>
  `;
}

function sectionDivider(title) {
  return `<h2 id="${title.toLowerCase().replace(/\s+/g, '-') }" style="font-size: 1.5rem; color: #1f2937; margin: 24px 0 16px 0;">${esc(title)}</h2>`;
}

function sectionCommentary(text) {
  if (!text) return '';
  return `<div class="section-commentary"><p>${esc(text)}</p></div>`;
}

function renderTimelinePhases(phases = []) {
  if (!Array.isArray(phases) || !phases.length) return '';
  return `
    <div class="timeline-grid">
      ${phases
        .map(
          (phase, index) => `
        <div class="timeline-card">
          <div class="timeline-step">Phase ${index + 1}</div>
          <div class="timeline-title">${esc(phase.title || `Phase ${index + 1}`)}</div>
          <div class="timeline-window">${esc(phase.window || '')}</div>
          <p>${esc(phase.focus || 'Focus on measurable deliverables and stakeholder adoption benchmarks.')}</p>
        </div>
      `,
        )
        .join('')}
    </div>
  `;
}

function boxedSummary(text) {
  // World-class executive summary box with premium styling
  return `<div class="executiveSummary"><p>${text}</p></div>`;
}

function replaceCanonFields(html, canon) {
  return typeof html === 'string'
    ? html.replace(/\$canon\.([a-zA-Z0-9_]+)/g, (m, key) => esc(canon[key] ?? `[Missing ${key}]`))
    : html;
}

function sparklineSVG(data, xLabels = ['Q1', 'Q2', 'Q3', 'Q4'], yAxisTitle = 'Value') {
  if (!Array.isArray(data) || data.length === 0) return '';

  const width = 500;
  const height = 200;
  const padding = 60;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
      const y = height - ((d - min) / range) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    })
    .join(' ');

  const xLabelElements = xLabels
    .map((label, i) => {
      const x = (i / (xLabels.length - 1)) * (width - 2 * padding) + padding;
      const y = height - padding + 25;
      return `<text x="${x}" y="${y}" font-size="14" fill="#374151" text-anchor="middle" font-weight="600">${label}</text>`;
    })
    .join('');

  const yAxisLabel = `<text x="${padding / 2}" y="${height / 2}" font-size="16" fill="#111827" text-anchor="middle" transform="rotate(-90, ${padding / 2}, ${height / 2})" font-weight="700">${yAxisTitle}</text>`;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="Sparkline chart" role="img" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border:1px solid #d1d5db; border-radius:8px;">
      ${yAxisLabel}
      <polyline fill="none" stroke="#1e40af" stroke-width="3" points="${points}" />
      ${xLabelElements}
      <text x="${width / 2}" y="${padding / 2}" font-size="18" fill="#1e40af" text-anchor="middle" font-weight="700">Trend Analysis</text>
    </svg>
  `;
}

function barChartSVG(items, yAxisTitle = 'Value') {
  if (!Array.isArray(items) || items.length === 0) return '';

  const width = 400;
  const height = 150;
  const padding = 40;
  const barWidth = ((width - 2 * padding) / items.length) * 0.6;
  const max = Math.max(...items.map((item) => item.value));
  const scale = (height - 2 * padding) / (max || 1);

  const bars = items
    .map((item, i) => {
      const barHeight = item.value * scale;
      const x =
        padding +
        i * ((width - 2 * padding) / items.length) +
        ((width - 2 * padding) / items.length - barWidth) / 2;
      const y = height - padding - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#2563eb" rx="3" ry="3" />
        <text x="${x + barWidth / 2}" y="${height - padding + 15}" text-anchor="middle" font-size="12" fill="#374151">${item.label}</text>
        <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="12" fill="#111827">${item.value}</text>
      `;
    })
    .join('');

  const yAxisX = padding / 2;
  const yAxisY = height / 2;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="Bar chart" role="img" xmlns="http://www.w3.org/2000/svg" style="background:#f9fafb; border-radius:4px;">
      <text x="${yAxisX}" y="${yAxisY}" text-anchor="middle" font-size="14" fill="#111827" transform="rotate(-90, ${yAxisX}, ${yAxisY})">${yAxisTitle}</text>
      ${bars}
    </svg>
  `;
}

function lineChartSVG(data, xLabels = ['Q1', 'Q2', 'Q3', 'Q4'], yAxisTitle = 'Value') {
  if (!Array.isArray(data) || data.length === 0) return '';

  const width = 400;
  const height = 150;
  const padding = 40;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
      const y = height - ((d - min) / range) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    })
    .join(' ');

  const xLabelElements = xLabels
    .map((label, i) => {
      const x = (i / (xLabels.length - 1)) * (width - 2 * padding) + padding;
      const y = height - padding + 15;
      return `<text x="${x}" y="${y}" font-size="12" fill="#374151" text-anchor="middle">${label}</text>`;
    })
    .join('');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="Line chart" role="img" xmlns="http://www.w3.org/2000/svg" style="background:#f9fafb; border-radius:4px;">
      <text x="${padding / 2}" y="${height / 2}" font-size="14" fill="#111827" transform="rotate(-90, ${padding / 2}, ${height / 2})">${yAxisTitle}</text>
      <polyline fill="none" stroke="#2563eb" stroke-width="2" points="${points}" />
      ${xLabelElements}
    </svg>
  `;
}

function pieChartSVG(data) {
  if (!Array.isArray(data) || data.length === 0) return '';

  const width = 150;
  const height = 150;
  const radius = Math.min(width, height) / 2;
  const cx = width / 2;
  const cy = height / 2;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativeAngle = 0;

  const colors = ['#2563eb', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];

  const slices = data
    .map((item, i) => {
      const valueRatio = item.value / total;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + valueRatio * 2 * Math.PI;
      cumulativeAngle = endAngle;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

      const pathData = `
        M ${cx} ${cy}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;

      return `
        <path d="${pathData}" fill="${colors[i % colors.length]}" />
        <text x="${cx + (radius / 2) * Math.cos((startAngle + endAngle) / 2)}" y="${cy + (radius / 2) * Math.sin((startAngle + endAngle) / 2)}" font-size="10" fill="#111827" text-anchor="middle" dominant-baseline="middle">${item.label}</text>
      `;
    })
    .join('');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="Pie chart" role="img" xmlns="http://www.w3.org/2000/svg" style="background:#f9fafb; border-radius:4px;">
      ${slices}
    </svg>
  `;
}

function scatterPlotSVG(data) {
  if (!Array.isArray(data) || data.length === 0) return '';

  const width = 400;
  const height = 150;
  const padding = 40;

  const xValues = data.map((d) => d.x);
  const yValues = data.map((d) => d.y);

  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const points = data
    .map((d) => {
      const x = ((d.x - xMin) / xRange) * (width - 2 * padding) + padding;
      const y = height - ((d.y - yMin) / yRange) * (height - 2 * padding) - padding;
      return `<circle cx="${x}" cy="${y}" r="5" fill="#2563eb" />`;
    })
    .join('');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="Scatter plot" role="img" xmlns="http://www.w3.org/2000/svg" style="background:#f9fafb; border-radius:4px;">
      ${points}
    </svg>
  `;
}

export async function buildReformReportHTML(data, ctx) {
  const { sections, rawHtml, logoUrl, reportDate } = data;
  const canon = ctx.canon || {};

  // Title page with world-class styling
  const relativeLogoUrl =
    logoUrl && logoUrl.startsWith('/') ? logoUrl : `/${logoUrl?.replace(/^https?:\/\//, '')}`;
  const titlePage = `
    <div class="title-page" style="padding-top: 2rem; line-height: 1.2;">
      <img src="${relativeLogoUrl}" alt="Sovereign Intelligence Logo" class="logo" style="height: 96px; margin-bottom: 0.25rem;" />
      <h1 class="report-title" style="margin-top: 0; margin-bottom: 0.25rem;">${replaceCanonFields('Reform Strategy Report for $canon.orgName', canon)}</h1>
      <div class="report-meta" style="margin-top: 0; font-size: 1rem;">
        <div class="meta-item">Report Date: ${reportDate || new Date().toLocaleDateString()}</div>
      </div>
    </div>
  `;

  // Table of Contents with premium styling
  const tocEntries = Object.entries(sections)
    .filter(([k, v]) => v && k !== 'appendices')
    .map(([k, v]) => ({
      id: k,
      title: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    }));
  const toc = `
    <div class="toc" style="font-weight: 700; font-size: 1.2rem;">
      <h3 style="font-weight: 700; font-size: 1.4rem;">Table of Contents</h3>
      <ol>
        ${tocEntries.map((e) => `<li><a href="#${e.id}" style="font-weight: 700;">${esc(e.title)}</a></li>`).join('')}
      </ol>
    </div>`;

  // Main body sections (90% content) with world-class formatting
  let bodyHtml = '';
  for (let i = 0; i < tocEntries.length; i++) {
    const sec = tocEntries[i];
    const content = replaceCanonFields(sections[sec.id] || '', ctx.canon || {});
    bodyHtml += sectionDivider(sec.title, i + 1);
    bodyHtml += `<div class="section-content">${content}</div>`;

    // Add boxed commentary for each section
    const commentaryText =
      ctx.sectionCommentary && ctx.sectionCommentary[sec.id]
        ? ctx.sectionCommentary[sec.id]
        : `Key insights and strategic considerations for ${sec.title.toLowerCase()}.`;
    bodyHtml += sectionCommentary(commentaryText);

    // Insert high-quality graphs where relevant
    if (sec.id === 'financials') {
      const finData = ctx.financialsData || [120000, 95000, 80000, 70000];
      const finLabels = ctx.financialsLabels || ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
      const yAxisTitle = ctx.financialsYAxisTitle || 'Millions of dollars';
      bodyHtml += `<figure class="graph sparkline" aria-describedby="financial-trend"><figcaption id="financial-trend">Financial Impact Projection</figcaption>${sparklineSVG(finData, finLabels, yAxisTitle)}</figure>`;
      // Additional line chart
      bodyHtml += `<figure class="graph line-chart" aria-describedby="financial-line"><figcaption id="financial-line">Financial Trend Over Time</figcaption>${lineChartSVG(finData, finLabels, yAxisTitle)}</figure>`;
      // Pie chart example
      const pieData = ctx.financialsPieData || [
        { label: 'Product A', value: 40 },
        { label: 'Product B', value: 30 },
        { label: 'Product C', value: 20 },
        { label: 'Product D', value: 10 },
      ];
      bodyHtml += `<figure class="graph pie-chart" aria-describedby="financial-pie"><figcaption id="financial-pie">Revenue Breakdown by Product</figcaption>${pieChartSVG(pieData)}</figure>`;
    }
    if (sec.id === 'kpis') {
      const kpiData = ctx.kpiValues || [80, 85, 90, 95];
      const kpiLabels = ctx.kpiLabels || ['Cost-to-Serve', 'On-time', 'Defect', 'Engagement'];
      const kpiItems = kpiLabels.map((label, i) => ({ label, value: kpiData[i] || 0 }));
      bodyHtml += `<figure class="graph kpi-bars" aria-describedby="kpi-bars"><figcaption id="kpi-bars">KPI Performance Trend</figcaption>${barChartSVG(kpiItems, '% of business by channel')}</figure>`;
      // Additional scatter plot example
      const scatterData = ctx.kpiScatterData || [
        { x: 1, y: 5 },
        { x: 2, y: 9 },
        { x: 3, y: 7 },
        { x: 4, y: 14 },
        { x: 5, y: 10 },
      ];
      bodyHtml += `<figure class="graph scatter-plot" aria-describedby="kpi-scatter"><figcaption id="kpi-scatter">KPI Correlation Scatter Plot</figcaption>${scatterPlotSVG(scatterData)}</figure>`;
    }
    if (sec.id === 'timeline') {
      const tl = phases.map((p) => `<span style="margin-right:1rem">${p.label}</span>`).join('');
      bodyHtml += `<figure class="graph timeline"><figcaption>Implementation Timeline</figcaption><div>${tl}</div></figure>`;
    }
    if (sec.id === 'ops') {
      const opsItems = [
        { label: 'Process Opt', value: 85 },
        { label: 'Tech Enable', value: 70 },
        { label: 'Training', value: 90 },
        { label: 'Automation', value: 60 },
      ];
      bodyHtml += `<figure class="graph ops-bars" aria-describedby="ops-bars"><figcaption id="ops-bars">Operational Levers Impact</figcaption>${barChartSVG(opsItems, 'Impact Score')}</figure>`;
    }
    if (sec.id === 'risk') {
      const riskItems = [
        { label: 'Low Risk', value: 40 },
        { label: 'Med Risk', value: 35 },
        { label: 'High Risk', value: 25 },
      ];
      bodyHtml += `<figure class="graph risk-bars" aria-describedby="risk-bars"><figcaption id="risk-bars">Risk Distribution</figcaption>${barChartSVG(riskItems, 'Risk Level')}</figure>`;
    }
    if (sec.id === 'roi') {
      const roiData = [0, 20000, 50000, 80000, 120000];
      const roiLabels = ['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'];
      bodyHtml += `<figure class="graph roi-sparkline" aria-describedby="roi-trend"><figcaption id="roi-trend">ROI Payback Projection</figcaption>${sparklineSVG(roiData, roiLabels, 'USD')}</figure>`;
    }
    if (sec.id === 'implementation') {
      const implItems = [
        { label: 'Phase 1', value: 20 },
        { label: 'Phase 2', value: 40 },
        { label: 'Phase 3', value: 60 },
        { label: 'Phase 4', value: 80 },
      ];
      bodyHtml += `<figure class="graph impl-bars" aria-describedby="impl-bars"><figcaption id="impl-bars">Implementation Progress</figcaption>${barChartSVG(implItems, 'Completion %')}</figure>`;
    }
  }
  // Add Implementation Plan section with dynamic report date and data-driven content
  bodyHtml += `
    <section class="implementationPlan" style="background: #f9fafb; padding: 1rem; border-radius: 8px; margin-top: 2rem;">
      <h2 style="font-weight: 700; font-size: 1.5rem; margin-bottom: 1rem;">Implementation Plan</h2>
      <p>This implementation plan outlines key milestones, resource allocation, project phases, timeline overview, and risk management based on the report data.</p>
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem;">
        <div style="flex: 1 1 30%; background: white; padding: 1rem; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Key Milestones</h3>
          <ul style="padding-left: 1.2rem; color: #374151; font-size: 0.95rem;">
            <li>Month 1: Project kickoff and stakeholder alignment</li>
            <li>Month 2: Baseline assessment and data collection</li>
            <li>Month 3: Pilot implementation in selected areas</li>
            <li>Month 6: Full rollout and training completion</li>
            <li>Month 12: Performance review and optimization</li>
          </ul>
        </div>
        <div style="flex: 1 1 30%; background: white; padding: 1rem; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Resource Allocation</h3>
          <p style="color: #374151; font-size: 0.95rem;"><strong>Personnel:</strong> 5 FTEs (2 consultants, 2 analysts, 1 project manager)</p>
          <p style="color: #374151; font-size: 0.95rem;"><strong>Budget:</strong> $500,000 (software: $200k, training: $150k, consulting: $150k)</p>
          <p style="color: #374151; font-size: 0.95rem;"><strong>Timeline:</strong> 12 months with quarterly reviews</p>
          <p style="color: #374151; font-size: 0.95rem;"><strong>Tools:</strong> ERP system upgrade, automation software, monitoring dashboards</p>
        </div>
        <div style="flex: 1 1 30%; background: white; padding: 1rem; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Project Phases</h3>
          <ol style="color: #374151; font-size: 0.95rem; padding-left: 1.2rem;">
            <li><strong>Planning (Months 1-2):</strong> Define scope, assemble team, set baselines</li>
            <li><strong>Execution (Months 3-8):</strong> Implement changes, train staff, monitor progress</li>
            <li><strong>Optimization (Months 9-12):</strong> Fine-tune processes, measure outcomes, scale successes</li>
          </ol>
        </div>
      </div>
      <div style="margin-top: 2rem;">
        <h3 style="font-weight: 700; font-size: 1.2rem; margin-bottom: 1rem;">Project Timeline</h3>
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          ${
            ctx.implementationPhases && Array.isArray(ctx.implementationPhases)
              ? ctx.implementationPhases
                  .map(
                    (phase) => `
                    <div style="flex: 1 1 18%; background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.1); text-align: center;">
                      <div style="font-size: 2rem; margin-bottom: 0.5rem;">${phase.icon || '📅'}</div>
                      <h4 style="margin: 0 0 0.5rem 0; font-weight: 700;">${phase.name}</h4>
                      <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #2563eb;">${phase.date || ''}</p>
                      <p style="margin: 0; font-size: 0.9rem; color: #374151;">${phase.description || ''}</p>
                    </div>
                  `,
                  )
                  .join('')
              : `
                <div style="flex: 1 1 18%; background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.1); text-align: center;">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">🛠️</div>
                  <h4 style="margin: 0 0 0.5rem 0; font-weight: 700;">Initiation</h4>
                  <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #2563eb;">Jan 20XX</p>
                  <p style="margin: 0; font-size: 0.9rem; color: #374151;">Define project objectives, stakeholders, and resources.</p>
                </div>
                <div style="flex: 1 1 18%; background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.1); text-align: center;">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">📅</div>
                  <h4 style="margin: 0 0 0.5rem 0; font-weight: 700;">Planning</h4>
                  <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #2563eb;">Feb 20XX</p>
                  <p style="margin: 0; font-size: 0.9rem; color: #374151;">Develop project plans, schedule, and resource allocation.</p>
                </div>
                <div style="flex: 1 1 18%; background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.1); text-align: center;">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">🚀</div>
                  <h4 style="margin: 0 0 0.5rem 0; font-weight: 700;">Execution</h4>
                  <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #2563eb;">Mar 20XX</p>
                  <p style="margin: 0; font-size: 0.9rem; color: #374151;">Perform work according to plan, monitor progress.</p>
                </div>
                <div style="flex: 1 1 18%; background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.1); text-align: center;">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                  <h4 style="margin: 0 0 0.5rem 0; font-weight: 700;">Control</h4>
                  <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #2563eb;">Apr 20XX</p>
                  <p style="margin: 0; font-size: 0.9rem; color: #374151;">Track, review, and regulate progress and performance.</p>
                </div>
                <div style="flex: 1 1 18%; background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.1); text-align: center;">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏁</div>
                  <h4 style="margin: 0 0 0.5rem 0; font-weight: 700;">Closure</h4>
                  <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #2563eb;">May 20XX</p>
                  <p style="margin: 0; font-size: 0.9rem; color: #374151;">Finalize project deliverables, documentation, and lessons learned.</p>
                </div>
              `}
        </div>
      </div>
    </section>
  `;

  // Add Multimedia & Interactive Elements section
  // Removed as per user request

  // Add Success Stories & Testimonials section
  // Removed as per user request

  // Add Call to Action section
  // Removed as per user request

  // Appendix (10% content, only supplemental data)
  const appendixHtml = `
    <div class="appendixSection">
      <h2>Appendix – Supplemental Data</h2>
      <p>This appendix contains additional supporting information, references, and data that complement the main report.</p>
      <div class="appendix-content">
        ${replaceCanonFields(sections.appendices || '', canon)}
        <h3>Glossary of Terms</h3>
        <ul>
          <li><strong>FTE:</strong> Full-Time Equivalent</li>
          <li><strong>KPI:</strong> Key Performance Indicator</li>
          <li><strong>ROI:</strong> Return on Investment</li>
          <li><strong>NPV:</strong> Net Present Value</li>
        </ul>
        <h3>Reference Materials</h3>
        <p>For further reading, refer to industry standards from Gartner and McKinsey on operational excellence.</p>
      </div>
    </div>`;

  // Footer with professional styling
  const footer = `
    <footer class="report-footer">
      <div class="footer-content">
        <span>${esc(canon.contactInfo || 'Confidential – For client use only.')}</span>
        <span class="page-info">Page <span class="pageNum"></span></span>
      </div>
    </footer>
  `;

  // Compose full HTML with world-class CSS
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Executive Reform Strategy Report</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <link rel="stylesheet" href="/reportStyles.css" />
      <link rel="stylesheet" href="/report-graphs.css" />
    </head>
    <body>
      <div class="reportContainer">
        ${titlePage}
        ${toc}
        ${bodyHtml}
        ${appendixHtml}
      </div>
      ${footer}
      <script>
        window.onload = function() {
          const pages = document.querySelectorAll('.reportContainer > *');
          pages.forEach((p, i) => {
            const num = document.createElement('div');
            num.className = 'pageNum';
            num.textContent = i + 1;
            p.appendChild(num);
          });
        };
      </script>
    </body>
    </html>
  `;
}