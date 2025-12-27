/* eslint-disable no-console */
/**
 * app/api/reform/generate/route.js
 * - Builds section HTML + figures according to VISUAL_PLAN
 * - Dedupes near-identical charts across sections
 * - Keeps notes OUTSIDE the canvas (executive copy)
 * - Predictive charts for ROI with safe fallback to baseline forecast
 */

export const dynamic = 'force-dynamic';

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    status: 200,
  });
}

/* ---------------------------------------------
 * Minimal domain helpers (no hard-coding data)
 * These adapters expect the caller (form/airtable/AI)
 * to pass canon + series in request body.
 * -------------------------------------------*/
function safeArray(x) { return Array.isArray(x) ? x : []; }
function coerceLabels(labels, len) {
  const L = safeArray(labels);
  if (L.length === len) return L;
  // default Months (M1..Mlen)
  return Array.from({ length: len }, (_, i) => `M${i + 1}`);
}
function clampLen(a, len) { return safeArray(a).slice(0, len); }

function buildCTX(payload) {
  const canon = payload?.canon || {};
  const series = payload?.series || {};

  // common series accessors
  const standardSeries = (kind) => {
    switch (kind) {
      case 'savings': {
        const data = safeArray(series.savings);
        const labels = coerceLabels(series.labels, data.length);
        const units = series.units?.savings || 'CAD';
        const timeframeLabel = (labels.length <= 12 ? 'Months' : 'Years');
        return { timeframeLabel, labels, savingsData: data, units };
      }
      case 'benchmarks': {
        const bench = safeArray(series.benchmarks);
        const labels = coerceLabels(series.benchLabels, bench.length);
        const units = series.units?.benchmarks || 'Index';
        return { labels, benchData: bench, units };
      }
      case 'financials': {
        const spend = safeArray(series.spend);
        const payback = safeArray(series.payback);
        const n = Math.max(spend.length, payback.length);
        const labels = coerceLabels(series.labels, n);
        const units = series.units?.spend || 'CAD';
        return {
          labels,
          spendData: clampLen(spend, n),
          paybackData: clampLen(payback, n),
          units,
        };
      }
      case 'forecast': {
        const forecast = safeArray(series.forecast);
        const labels = coerceLabels(series.labels, forecast.length);
        const units = series.units?.forecast || 'Index';
        return { labels, forecastData: forecast, units };
      }
      default:
        return { labels: [], savingsData: [], units: 'Index' };
    }
  };

  const seriesByKey = (k) => safeArray(series?.[k]);

  const kpiQuad = () => {
    const labels = coerceLabels(series.labels, Math.max(
      series.savings?.length || 0,
      series.aov?.length || 0,
      series.orders?.length || 0,
      series.margin?.length || 0,
      series.payback?.length || 0,
    ));
    return {
      labels,
      savingsData: clampLen(series.savings || [], labels.length),
      aovData: clampLen(series.aov || [], labels.length),
      ordersData: clampLen(series.orders || [], labels.length),
      marginData: clampLen(series.margin || [], labels.length),
    };
  };

  const heatmap = (kind) => {
    // Expect a matrix: { xLabels, yLabels, values: number[][] }
    const h = series.heatmaps?.[kind] || {};
    return {
      xTitle: h.xTitle || 'X',
      yTitle: h.yTitle || 'Y',
      matrix: {
        xLabels: safeArray(h.xLabels),
        yLabels: safeArray(h.yLabels),
        values: safeArray(h.values),
      },
    };
  };

  // Simulated predictive candidates (your AI path should replace this)
  const predictive = (sectionKey) => {
    const preds = payload?.predictive?.[sectionKey];
    if (Array.isArray(preds) && preds.length) return preds;
    return [];
  };

  return {
    canon,
    standardSeries,
    kpiQuad,
    heatmap,
    series: seriesByKey,
    predictive,
  };
}

/* ---------------------------------------------
 * VISUAL PLAN — exact chart allocations per section
 * -------------------------------------------*/
const VISUAL_PLAN = {
  exec: (ctx) => {
    const { timeframeLabel, labels, savingsData, units } = ctx.standardSeries('savings');
    return [{
      signature: 'exec|savings|line',
      type: 'line',
      title: 'Projected Savings Over Time',
      xTitle: timeframeLabel,
      yTitle: units,
      labels,
      datasets: [{ label: 'Savings', data: savingsData }],
      note:
        'Projected savings trend over the selected period based on current levers. ' +
        'Use the slope and inflection points to guide next-quarter priorities.',
    }];
  },

  current: (ctx) => {
    const { labels, benchData, units } = ctx.standardSeries('benchmarks');
    return [{
      signature: 'current|benchmarks|bar',
      type: 'bar',
      title: 'Benchmarks vs. Current',
      xTitle: 'Benchmarks',
      yTitle: units,
      labels,
      datasets: [{ label: 'Current vs. Bench', data: benchData }],
      note:
        'Benchmark comparison highlights relative position versus peers. ' +
        'Close the largest gaps first for outsized impact.',
    }];
  },

  financials: (ctx) => {
    const { labels, spendData, paybackData, units } = ctx.standardSeries('financials');
    return [{
      signature: 'financials|spend-payback|line',
      type: 'line',
      title: 'Expenditures & Payback',
      xTitle: 'Period',
      yTitle: units,
      labels,
      datasets: [
        { label: 'Expenditures', data: spendData },
        { label: 'Payback', data: paybackData },
      ],
      note:
        'Tracks investment cadence versus realized payback. ' +
        'Align spend with capacity and cash constraints to sustain momentum.',
    }];
  },

  kpis: (ctx) => {
    const { labels, savingsData, aovData, ordersData } = ctx.kpiQuad();
    return [
      {
        signature: 'kpis|savings|bar',
        type: 'bar',
        title: 'Savings',
        xTitle: 'Period',
        yTitle: 'Value',
        labels,
        datasets: [{ label: 'Savings', data: savingsData }],
        note: 'Savings trajectory confirms efficiency capture relative to plan.',
      },
      {
        signature: 'kpis|payback|line',
        type: 'line',
        title: 'Payback',
        xTitle: 'Period',
        yTitle: 'Months',
        labels,
        datasets: [{ label: 'Payback', data: ctx.series('payback') }],
        note: 'Payback compression signals compounding returns from prior waves.',
      },
      {
        signature: 'kpis|aov|line',
        type: 'line',
        title: 'AOV',
        xTitle: 'Period',
        yTitle: 'AOV',
        labels,
        datasets: [{ label: 'AOV', data: aovData }],
        note: 'AOV trend reflects mix, pricing, and attach rate improvements.',
      },
      {
        signature: 'kpis|orders|line',
        type: 'line',
        title: 'Orders',
        xTitle: 'Period',
        yTitle: 'Count',
        labels,
        datasets: [{ label: 'Orders', data: ordersData }],
        note: 'Steady order growth indicates demand health and campaign lift.',
      },
    ];
  },

  timeline: () => {
    return [{
      signature: 'timeline|roadmap|image',
      type: 'image',
      title: 'Implementation Roadmap',
      src: '/images/Implementation-roadmap.png',
      alt: 'Implementation roadmap',
      note: 'Phased delivery with owners, gates, and exit metrics per phase.',
    }];
  },

  ops: (ctx) => {
    const heat = ctx.heatmap('capacity');
    return [{
      signature: 'ops|capacity|heatmap',
      type: 'heatmap',
      title: 'Operational Capacity Heatmap',
      xTitle: heat.xTitle,
      yTitle: heat.yTitle,
      matrix: heat.matrix,
      note: 'Hotspots indicate where throughput or quality constraints emerge.',
    }];
  },

  risk: (ctx) => {
    const heat = ctx.heatmap('risk');
    return [{
      signature: 'risk|matrix|heatmap',
      type: 'heatmap',
      title: 'Risk Matrix',
      xTitle: heat.xTitle,
      yTitle: heat.yTitle,
      matrix: heat.matrix,
      note: 'Prioritize high-likelihood, high-impact risks with owned mitigations.',
    }];
  },

  roi: (ctx) => {
    const pred = ctx.predictive('roi');
    if (pred && pred.length) {
      return pred.map((p, i) => ({
        signature: `roi|predictive|${i}`,
        ...p,
        note: p.note || 'Predictive ROI scenario based on recent signals and plan effects.',
      }));
    }
    const { labels, forecastData, units } = ctx.standardSeries('forecast');
    return [{
      signature: 'roi|forecast|line',
      type: 'line',
      title: 'ROI Forecast',
      xTitle: 'Months',
      yTitle: units,
      labels,
      datasets: [{ label: 'Forecast', data: forecastData }],
      note:
        'Baseline ROI projection when predictive batch is unavailable. ' +
        'Re-run with fresh signals to refine confidence intervals.',
    }];
  },
};

/* ---------------------------------------------
 * Render helpers — figure + note (note is outside)
 * -------------------------------------------*/
function figureHTML(obj) {
  if (obj.type === 'image') {
    const alt = obj.alt || obj.title || '';
    return `
      <figure class="report-figure image-only">
        <img src="${obj.src}" alt="${alt}"/>
      </figure>
      ${obj.note ? `<div class="chart-note">${obj.note}</div>` : ''}`;
  }

  // Chart figure
  const spec = {
    type: obj.type,
    title: obj.title,
    xTitle: obj.xTitle,
    yTitle: obj.yTitle,
    labels: obj.labels,
    datasets: obj.datasets,
    options: obj.options || {},
  };
  const encoded = JSON.stringify(spec).replace(/"/g, '&quot;');
  return `
    <figure class="report-figure" data-chart="${encoded}"></figure>
    ${obj.note ? `<div class="chart-note">${obj.note}</div>` : ''}`;
}

function normalizeSig(v) {
  const t = (v.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const tt = (v.type || 'line').toLowerCase();
  return `${tt}|${t.replace(/[^a-z0-9]+/g, '')}`;
}

/* ---------------------------------------------
 * Main POST handler
 * Body expects:
 * { canon, sectionsDraft, series, predictive }
 *   - sectionsDraft: { exec, current, financials, kpis, timeline, ops, risk, roi, appendix }
 *   - series/predictive used by VISUAL_PLAN
 * -------------------------------------------*/
export async function POST(req) {
  const payload = await req.json().catch(() => ({}));
  const ctx = buildCTX(payload);

  console.log('[SR:REFORM] generate.start', {
    model: payload?.model || 'gpt-5-nano-2025-08-07',
    org: ctx.canon?.orgName || 'Client',
    minWords: payload?.minWords || 20000,
  });

  const sections = {
    exec: payload?.sectionsDraft?.exec || '',
    current: payload?.sectionsDraft?.current || '',
    financials: payload?.sectionsDraft?.financials || '',
    kpis: payload?.sectionsDraft?.kpis || '',
    timeline: payload?.sectionsDraft?.timeline || payload?.sectionsDraft?.impl || '',
    ops: payload?.sectionsDraft?.ops || '',
    risk: payload?.sectionsDraft?.risk || '',
    roi: payload?.sectionsDraft?.roi || '',
    appendix: payload?.sectionsDraft?.appendix || '',
  };

  // Build visuals by plan
  const visuals = [];
  const seen = new Set();

  const sectionKeys = ['exec', 'current', 'financials', 'kpis', 'timeline', 'ops', 'risk', 'roi'];
  for (const key of sectionKeys) {
    const planner = VISUAL_PLAN[key];
    if (!planner) continue;

    let planned = [];
    try {
      planned = planner(ctx) || [];
    } catch (e) {
      console.warn('[SR:REFORM] plan.error', key, e);
    }

    for (const v of planned) {
      const sig = v.signature || normalizeSig(v);
      if (seen.has(sig)) {
        console.log('[SR:REFORM] visuals.skip.dup', sig);
        continue;
      }
      seen.add(sig);
      visuals.push({ ...v, __section: key });
    }
  }

  // Inject figures + notes into their sections (front-load each section with its visuals)
  const inject = (key, html) => {
    const figs = visuals.filter(v => v.__section === key).map(figureHTML).join('\n');
    if (!figs) return html;
    return `${html || ''}\n${figs}\n`;
  };

  sections.exec = inject('exec', sections.exec);
  sections.current = inject('current', sections.current);
  sections.financials = inject('financials', sections.financials);
  sections.kpis = inject('kpis', sections.kpis);
  sections.timeline = inject('timeline', sections.timeline);
  sections.ops = inject('ops', sections.ops);
  sections.risk = inject('risk', sections.risk);
  sections.roi = inject('roi', sections.roi);

  // Return normalized contract for the renderer/template layer
  const chartRegistry = visuals.map(v => ({
    id: v.signature || normalizeSig(v),
    config: {
      type: v.type,
      title: v.title,
      xTitle: v.xTitle,
      yTitle: v.yTitle,
      labels: v.labels,
      datasets: v.datasets,
      options: v.options || {},
    },
  }));

  console.log('[SR:REFORM] figures.count', { count: visuals.length });

  return json({
    canon: ctx.canon,
    sections,
    chartRegistry,
  });
}
