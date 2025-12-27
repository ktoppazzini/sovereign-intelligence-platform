/ app/api/reform/generate/route.js
// Next.js App Router (Node runtime)

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// ✳️ STATIC import of the report template
import { buildReformReportHTML } from '@/lib/reportTemplate';

// i18n helpers expected by template
import { getUiTranslations, normalizeLang, isRTL } from '@/lib/i18nClient';
import fetchChatGPTTranslation from '@/lib/fetchChatGPTTranslation';
import { planFigureSVG } from '@/lib/implPlan';

// ---- Config ------------------------------------------------------------------

export const runtime = 'nodejs';
const TAG = '[reform][generate]';

// Models & floors (default to Nano-5 in dev; prod uses OPENAI_MODEL)
const isDev = (process.env.NODE_ENV === 'development');
const MODEL = isDev ? 'gpt-5-nano-2025-08-07' : (process.env.OPENAI_MODEL || 'gpt-4o-mini');
const MIN_WORDS_FLOOR = 20000; // hard floor
const REPORT_MAX_EXPANSION_ROUNDS = 60; // safety cap

// Airtable env (REST API)
const AT_API_KEY = process.env.AIRTABLE_API_KEY;
const AT_BASE_ID = process.env.AIRTABLE_BASE_ID;

// Tables & fields (match your base)
const TABLE_REQUESTS = 'Reform Requests';
const TABLE_COUNTRIES = 'Countries';
const TABLE_TIERS = 'Tiers';
const TABLE_COMP_SIZES = 'Company Sizes';
const TABLE_TIMEFRAMES = 'Time Frames';

// Fields on Reform Requests
const F_ORG = 'Organization Name';
const F_COST_GOAL = 'Cost Savings Goal (Optional)';
const F_STRAT = 'Strategic Goals';
const F_OUTCOME = 'Desired Outcome';
const F_PREPARED_FOR = 'Prepared For';
const F_PREPARED_BY = 'Prepared By';
const F_COUNTRY = 'Country';
const F_TIER = 'Tier';
const F_SIZE = 'Company Size';
const F_TIME = 'Implementation Time Frame';
const F_HTML = 'Generated Report'; // long text

// ---- Small utils -------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const dbg = (...a) => {
  try {
    console.log(TAG, ...a);
  } catch {}
};

function stripHtml(s = '') {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wc(s = '') {
  const plain = stripHtml(s);
  return plain ? plain.split(/\s+/).filter(Boolean).length : 0;
}

function safeNum(n, d = 0) {
  const v = Number(String(n).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(v) ? v : d;
}

function getOrigin(req) {
  try {
    return req.nextUrl.origin;
  } catch {
    return '';
  }
}

// remove code fences and a leading <h1..h6> if it matches the section title
function cleanSectionHTML(html = '', title = '') {
  let out = String(html || '');
  out = out.replace(/^```[\s\S]*?\n/, '').replace(/```$/m, '');
  const hRe = /^\s*<(h[1-6])[^>]*>(.*?)<\/\1>\s*/i;
  const m = out.match(hRe);
  if (m) {
    const inner = m[2]
      .replace(/<[^>]+>/g, '')
      .trim()
      .toLowerCase();
    const t = String(title || '')
      .trim()
      .toLowerCase();
    if (!inner || inner === t) out = out.replace(hRe, '');
  }
  // discourage duplicated headings
  out = out.replace(/<h[1-6][^>]*>\s*(Executive Summary)\s*<\/h[1-6]>/gi, '');
  return out.trim();
}

// ---- Minimal formatting helpers used by chart wrappers -----------------------

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const toNumArray = (v) =>
  Array.isArray(v) ? v.map((x) => num(x)).filter((x) => Number.isFinite(x)) : [];

// ---- DEFENSIVE CHART WRAPPER (for templates that import old Graphs) ----------
// These functions accept either the legacy signature (values, labels, opts)
// OR the object signature ({ values, labels, width, height, ... }).
// They never throw; they return empty <svg> placeholders on bad input.

const SafeGraphs = (() => {
  const fmt = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? String(Math.round(x * 10) / 10) : '0';
  };

  function unpackArgs(a, b, c) {
    // allow legacy (values, labels, opts) OR object bag
    if (Array.isArray(a) || Array.isArray(b)) {
      return { values: toNumArray(a || []), labels: Array.isArray(b) ? b : [], opts: c || {} };
    }
    const bag = a || {};
    return {
      values: toNumArray(bag.values || bag.series || []),
      labels: Array.isArray(bag.labels) ? bag.labels : [],
      opts: bag,
    };
  }

  function sparklineHTML(a = [], b = {}) {
  const { values, opts } = unpackArgs(a, null, b);
  const width  = num(opts.width, 320);
  const height = num(opts.height, 64);
  const stroke = opts.stroke || '#4F46E5';
  const title  = opts.title || '';
  if (!values.length) {
    return `<svg width="${width}" height="${height}" role="img" aria-label="${title}"></svg>`;
  }
  const pad = 6, w = width, h = height;
  const min = Math.min(...values, 0), max = Math.max(...values, 1);
  const sx = (i) => pad + (i * (w - 2 * pad)) / Math.max(1, values.length - 1);
  const sy = (v) => pad + (h - 2 * pad) * (1 - (v - min) / Math.max(1e-6, max - min));
  const d  = values.map((v, i) => `${i ? 'L' : 'M'}${fmt(sx(i))},${fmt(sy(v))}`).join(' ');

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function lineChartHTML(a, b, c) {
  const { values, labels, opts } = unpackArgs(a, b, c);
  const width  = num(opts.width, 720);
  const height = num(opts.height, 280);
  const stroke = opts.stroke || '#10B981';
  const title  = opts.title || 'Trend';
  if (!values.length) {
    return `<svg width="${width}" height="${height}" role="img" aria-label="${title}"></svg>`;
  }
  const padL = 50, padR = 10, padT = 14, padB = 28;
  const w = width, h = height;

  const min = Math.min(...values, 0), max = Math.max(...values, 1);
  const sx = (i) => padL + (i * (w - padL - padR)) / Math.max(1, values.length - 1);
  const sy = (v) => padT + (h - padT - padB) * (1 - (v - min) / Math.max(1e-6, max - min));

  const d = values.map((v, i) => `${i ? 'L' : 'M'}${fmt(sx(i))},${fmt(sy(v))}`).join(' ');
  const xTicks = (labels || [])
    .slice(0, values.length)
    .map((t, i) => `<text x="${fmt(sx(i))}" y="${h - 8}" text-anchor="middle" font-size="11" fill="#9CA3AF">${t ?? ''}</text>`)
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
    <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="#E5E7EB"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="#E5E7EB"/>
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
    ${xTicks}
  </svg>`;
}


  function barChartHTML(a, b, c) {
    const { values, labels, opts } = unpackArgs(b, a, c); // bar(labels, values, opts)
    const width = num(opts.width, 720);
    const height = num(opts.height, 280);
    const barColor = opts.barColor || '#6366F1';
    const title = opts.title || 'Financial Impact';
    if (!values.length)
      return `<svg width="${width}" height="${height}" role="img" aria-label="${title}"></svg>`;
    const padL = 50,
      padB = 36,
      padT = 18,
      padR = 10,
      w = width,
      h = height;
    const n = Math.min(values.length, (labels || []).length || values.length);
    const max = Math.max(...values, 1);
    const colW = (w - padL - padR) / Math.max(1, n);
    const sy = (v) => padT + (h - padT - padB) * (1 - (v - 0) / Math.max(1e-6, max - 0));
    const bars = values
      .slice(0, n)
      .map((v, i) => {
        const x = padL + i * colW + colW * 0.15;
        const y = sy(v);
        const bw = colW * 0.7;
        const bh = h - padB - y;
        return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(bw)}" height="${fmt(bh)}" rx="4" fill="${barColor}"/>
              <text x="${fmt(x + bw / 2)}" y="${fmt(h - padB - 6)}" text-anchor="middle" font-size="11" fill="#9CA3AF">${(labels || [])[i] ?? ''}</text>`;
      })
      .join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
      <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="#E5E7EB"/>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="#E5E7EB"/>
      ${bars}
      <text x="${padL - 8}" y="${padT + 10}" text-anchor="end" font-size="11" fill="#9CA3AF">${fmt(max)}</text>
      <text x="${padL - 8}" y="${h - padB}"   text-anchor="end" font-size="11" fill="#9CA3AF">0</text>
    </svg>`;
  }

  function implementationTimelineHTML(yearsOrObj = 3, opts = {}) {
    let nYears = 3,
      milestones = [];
    if (typeof yearsOrObj === 'number') {
      nYears = Math.max(1, yearsOrObj | 0);
    } else if (yearsOrObj && typeof yearsOrObj === 'object') {
      const totalMonths = num(yearsOrObj.totalMonths, 36);
      nYears = Math.max(1, Math.round(totalMonths / 12));
      milestones = Array.isArray(yearsOrObj.milestones) ? yearsOrObj.milestones : [];
    }
    const width = num(opts.width, 720);
    const height = num(opts.height, 160);
    const title = opts.title || 'Implementation Timeline';
    const w = width,
      h = height,
      pad = 24,
      n = nYears;
    const sx = (i) => pad + (i * (w - 2 * pad)) / n;
    const ticks = [...Array(n + 1).keys()];
    const bar = `<line x1="${sx(0)}" y1="${h / 2}" x2="${sx(n)}" y2="${h / 2}" stroke="#CBD5E1" stroke-width="3"/>`;
    const dots = ticks
      .map(
        (i) =>
          `<circle cx="${sx(i)}" cy="${h / 2}" r="5" fill="${i === 0 || i === n ? '#2563EB' : '#94A3B8'}"/>`,
      )
      .join('');
    const labels = ticks
      .map(
        (i) =>
          `<text x="${sx(i)}" y="${h / 2 + 28}" text-anchor="middle" font-size="12" fill="#64748B">Year ${i}</text>`,
      )
      .join('');
    const marks = milestones
      .map(
        (m) =>
          `<text x="${sx(num(m.at, 0) / 12)}" y="${h / 2 - 10}" text-anchor="middle" font-size="11" fill="#334155">${m.label ?? ''}</text>`,
      )
      .join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">${bar}${dots}${labels}${marks}</svg>`;
  }

  return {
    sparklineHTML,
    lineChartHTML,
    lineQuarterlyHTML: (...args) => {
      // simple average per 3 points
      const { values, opts } = unpackArgs(args[0], null, args[1]);
      const q = [];
      for (let i = 0; i < values.length; i += 3) {
        const s = values.slice(i, i + 3);
        if (s.length) q.push(s.reduce((a, b) => a + b, 0) / s.length);
      }
      const labels = q.map(
        (_, i) => `Q${(i % 4) + 1}${Math.floor(i / 4) ? ` Y${Math.floor(i / 4) + 1}` : ''}`,
      );
      return lineChartHTML(q, labels, opts || {});
    },
    barChartHTML,
    barSVG: barChartHTML,
    lineSVG: lineChartHTML,
    lineSvg: lineChartHTML,
    implementationTimelineHTML,
    implementationTimelineSVG: implementationTimelineHTML,
    implementationRoadmapSVG: implementationTimelineHTML,
    roadmapSVG: implementationTimelineHTML,
    renderBarCompare: (labels, values, opts = {}) =>
      barChartHTML(labels, values, { title: opts.title || 'Financial Impact', ...opts }),
    renderTimeline: (years, opts = {}) => implementationTimelineHTML(years, opts),
  };
})();

// ---- SVG charts (inline) -----------------------------------------------------

function moneyShort(n) {
  const x = Math.round(n);
  if (x >= 1_000_000_000) return `$${(x / 1_000_000_000).toFixed(1)}B`;
  if (x >= 1_000_000) return `$${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `$${(x / 1_000).toFixed(1)}k`;
  return `$${x}`;
}

function sparklineSVG(
  values = [],
  { width = 560, height = 220, pad = 36, title = 'Projected savings' } = {},
) {
  if (!values.length) return '';
  const min = Math.min(...values),
    max = Math.max(...values);
  const range = max - min || 1;
  const step = (width - pad * 2) / (values.length - 1);
  const pts = values
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + (height - pad * 2) * (1 - (v - min) / range);
      return `${x},${y}`;
    })
    .join(' ');

  const yTicks = 4,
    xTicks = 6;
  const yTickEls = Array.from({ length: yTicks + 1 }, (_, i) => {
    const t = i / yTicks,
      y = pad + (height - pad * 2) * (1 - t);
    const val = min + t * range;
    return `
      <line x1="${pad - 6}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="currentColor" stroke-opacity="0.15"/>
      <text x="${pad - 8}" y="${y}" text-anchor="end" dominant-baseline="middle">${moneyShort(val)}</text>
    `;
  }).join('');

  const xTickEls = Array.from({ length: xTicks + 1 }, (_, i) => {
    const t = i / xTicks,
      x = pad + t * (width - pad * 2);
    const label = Math.round(t * (values.length - 1));
    return `
      <line x1="${x}" y1="${height - pad}" x2="${x}" y2="${pad}" stroke="currentColor" stroke-opacity="0.08"/>
      <text x="${x}" y="${height - pad + 16}" text-anchor="middle" dominant-baseline="hanging">${label}</text>
    `;
  }).join('');

  return `
<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="sparkTitle sparkDesc" xmlns="http://www.w3.org/2000/svg">
  <title id="sparkTitle">${title}</title>
  <desc id="sparkDesc">Savings trend over time with axes labels and tick values.</desc>
  <g fill="none" stroke="currentColor">
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke-width="1.5"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke-width="1.5"/>
    ${yTickEls}
    ${xTickEls}
    <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.75" />
  </g>
  <text x="${width - pad}" y="${height - pad + 30}" text-anchor="end">Time</text>
  <text x="${pad - 28}" y="${pad - 12}" text-anchor="start">Savings ($)</text>
</svg>`;
}

function barChartSVG(
  items = [],
  { width = 560, height = 260, pad = 36, title = 'Key Performance Indicators' } = {},
) {
  if (!items.length) return '';
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const gap = 12;
  const barW = innerW / items.length - gap;

  const bars = items
    .map((it, i) => {
      const h = Math.max(1, (innerH * Math.max(0, Math.min(100, it.value))) / 100);
      const x = pad + i * (barW + gap);
      const y = height - pad - h;
      return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" ry="4" />
      <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" dominant-baseline="baseline">${Math.round(it.value)}%</text>
      <text x="${x + barW / 2}" y="${height - pad + 16}" text-anchor="middle" dominant-baseline="hanging">${it.label}</text>
    `;
    })
    .join('');

  return `
<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="barTitle barDesc" xmlns="http://www.w3.org/2000/svg">
  <title id="barTitle">${title}</title>
  <desc id="barDesc">Bar chart with labeled axes and percentage values.</desc>
  <g fill="none" stroke="white">
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke-width="1.5"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke-width="1.5"/>
    ${[0, 25, 50, 75, 100]
      .map((p) => {
        const y = height - pad - (p / 100) * (height - pad * 2);
        return `<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="currentColor" stroke-opacity="0.12"/>`;
      })
      .join('')}
  </g>
  ${bars}
  <text x="${width - pad}" y="${height - pad + 30}" text-anchor="end">KPIs</text>
  <text x="${pad - 28}" y="${pad - 12}" text-anchor="start">Percent</text>
</svg>`;
}

// ---- Airtable helpers (REST) -------------------------------------------------

async function atFetch(path, init = {}) {
  const url = `https://api.airtable.com/v0/${AT_BASE_ID}/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${AT_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function lookupLinkedIdByName(table, name) {
  const formula = `OR({Name}="${name}", {${table.slice(0, 1).toUpperCase() + table.slice(1)}}="${name}")`;
  const { ok, json } = await atFetch(
    `${encodeURIComponent(table)}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`,
  );
  if (ok && json && Array.isArray(json.records) && json.records[0] && json.records[0].id) {
    return json.records[0].id;
  }
  return null;
}

async function createOrUpdateRequest(fields, existingId = null) {
  if (existingId) {
    const { ok, json } = await atFetch(`${TABLE_REQUESTS}/${existingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });
    return { ok, json };
  }
  const { ok, json } = await atFetch(TABLE_REQUESTS, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  return { ok, json };
}

// ---- Section generation ------------------------------------------------------

// Replace old sectionPrompts with expanded prompt:
function sectionPrompts(canon) {
  const base = `
You are writing a reform strategy report for:
Organization: ${canon.orgName}
Country: ${canon.country}
Tier: ${canon.tier}
Company Size: ${canon.companySize}
Time Frame: ${canon.timeFrame}
Cost Savings Goal: ${canon.costSavingsGoal || 'N/A'}
Strategic Goals: ${canon.strategicGoal || 'N/A'}
Desired Outcome: ${canon.desiredOutcome || 'N/A'}

Write in clear, professional English without fluff. Each section must be original and not repeat prior sections or content. Ensure no duplication; later sections should introduce new, unique information. Provide concrete, implementable details, milestones, and quantified assumptions where reasonable.
Provide a detailed, step-by-step implementation roadmap section with phases, decision gates, RACI roles, and a detailed project plan.
The total report should be approximately 20,000 words, with 90% in the main body (about 18,000 words) and only 10% in appendices (about 2,000 words).
Include at least one zebra-striped HTML table of key metrics per section with clear headers, proper alignment, and no horizontal scrollbars.
Include interactive visual placeholders, AI-driven predictive analytics, benchmarking, and shaded commentary boxes below key insights.
Ensure the title page has a large logo and organization name prominently displayed.
Avoid tables or charts that consume the entire page width or create scrollbars.
`;

  return [
    {
      key: 'exec',
      title: 'Executive Summary',
      min: 2000,
      ask: `${base}
Section: Executive Summary. Minimum 2000 words.`,
    },
    {
      key: 'current',
      title: 'Current State & Problem Definition',
      min: 3000,
      ask: `${base}
Section: Current State & Problem Definition. Minimum 3000 words.`,
    },
    {
      key: 'financials',
      title: 'Financial Baseline & Savings Model',
      min: 3000,
      ask: `${base}
Section: Financial Baseline & Savings Model. Minimum 3000 words. Include specific cost drivers, sensitivity ranges, and phasing.`,
    },
    {
      key: 'kpis',
      title: 'KPIs & Measurement System',
      min: 2000,
      ask: `${base}
Section: KPIs & Measurement System. Minimum 2000 words. Define operational KPIs, targets, measurement cadence, and include a KPI summary table.`,
    },
    {
      key: 'implementation',
      title: 'Implementation Roadmap & Governance',
      min: 4000,
      ask: `${base}
Section: Implementation Roadmap & Governance. Minimum 4000 words. Include phases, decision gates, RACI roles, and detailed project plan.`,
    },
    {
      key: 'risk',
      title: 'Risks & Mitigations',
      min: 2000,
      ask: `${base}
Section: Risks & Mitigations. Minimum 2000 words. Identify top risks and concrete mitigations; include a risk heat map table.`,
    },
    {
      key: 'roi',
      title: 'ROI & Business Case',
      min: 2000,
      ask: `${base}
Section: ROI & Business Case. Minimum 2000 words. Show payback, NPV logic qualitatively, and hard/soft benefits; include a financial metrics table.`,
    },
  ];
}

async function genSection({ key, title, ask }) {
  // Build payload for chat completion, including temperature only for non-Nano models
  console.log('[reform][generate] Using model:', MODEL);
  const payload = {
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a senior transformation consultant. Return valid HTML fragments (<p>, <ul>, <ol>, <table>, <h3> etc.). Do NOT include a section heading; content only. Do NOT include <html> or <body> wrappers.',
      },
      { role: 'user', content: ask },
    ],
  };
  // Attach temperature for models other than Nano
  if (!/^gpt-5-nano/i.test(MODEL)) {
    const t = process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : 0.2;
    if (!Number.isNaN(t)) payload.temperature = t;
  }
  const res = await openai.chat.completions.create(payload);

  // extract raw content safely
  let raw = '';
  if (
    res.choices &&
    res.choices.length &&
    res.choices[0].message &&
    res.choices[0].message.content
  ) {
    raw = res.choices[0].message.content.trim();
  }
  const html = cleanSectionHTML(raw, title);
  return { key, title, html, words: wc(html) };
}

async function forceToFloor(sections, targetWords, canon) {
  // Keep appending "deep dives" until targetWords met or round cap reached
  let total = sections.reduce((n, s) => n + ((s && s.words) || 0), 0);
  let rounds = 0;

  while (total < targetWords && sections.length < REPORT_MAX_EXPANSION_ROUNDS) {
    rounds++;
    const ask = `
You are adding an appendix to a reform strategy report for ${canon.orgName}.
Write a non-redundant deep dive of at least 2000 words covering concrete implementation details:
- Standard work & SOP updates
- Training waves and curricula
- Vendor governance & SLAs
- Change management (champions, comms, incentives)
- Operational analytics and control charts
Avoid repeating earlier content. Return HTML fragment only.`;

    const extra = await genSection({
      key: `appendix-${sections.length + 1}`,
      title: 'Appendix – Implementation Details',
      ask,
    });

    // If the model returns anemic output (e.g., <10 words), immediately try again with a stronger prompt.
    if (extra.words < 100 && sections.length < REPORT_MAX_EXPANSION_ROUNDS) {
      const retry = await genSection({
        key: `appendix-${sections.length + 1}-retry`,
        title: 'Appendix – Additional Details',
        ask:
          ask +
          '\nEmphasize quantified assumptions, step-by-step playbooks, and example artifacts.',
      });
      sections.push(retry);
      total += retry.words;
    } else {
      sections.push(extra);
      total += extra.words;
    }

    if (rounds > REPORT_MAX_EXPANSION_ROUNDS) break;
  }

  return { sections, totalWords: total };
}

// ---- Main handler ------------------------------------------------------------

export async function POST(req) {
  const started = Date.now();
  const origin = getOrigin(req);
  let body = {};
  try {
    body = await req.json();
  } catch {}

  console.log(`${TAG}`, 'req.body', JSON.stringify({ keys: Object.keys(body || {}) }));

  // Canonicalize inputs
  const canon = {
    lang: body.lang || body.targetLang || 'English',
    orgName: body.orgName || body.form?.orgName || 'Unknown Organization',
    country: body.country || body.form?.country || '',
    tier: body.tier || body.form?.tier || '',
    companySize: body.companySize || body.form?.companySize || '',
    timeFrame: body.timeFrame || body.form?.timeFrame || '',
    costSavingsGoal: safeNum(body.costSavingsGoal || body.form?.costSavingsGoal),
    strategicGoal: body.strategicGoal || body.form?.strategicGoal || '',
    desiredOutcome: body.desiredOutcome || body.form?.desiredOutcome || '',
    preparedFor: body.preparedFor || body.form?.preparedFor || '',
    preparedBy: body.preparedBy || body.form?.preparedBy || '',
    attachmentUrls: body.attachmentUrls || body.files || [],
    minWords: Math.max(MIN_WORDS_FLOOR, safeNum(body.minWords, MIN_WORDS_FLOOR)),
    recordId: body.recordId || body.rid || null,
    logoUrl:
      body.logoUrl || (origin ? `${origin}/brand/sovereign-mark.svg` : '/brand/sovereign-mark.svg'),
  };

  console.log(
    `${TAG}`,
    'normalize',
    JSON.stringify({ canonPreview: { ...canon, attachmentUrls: canon.attachmentUrls } }),
  );

  // i18n ctx passed to template
  const lang = normalizeLang(canon.lang);
  // Load base UI translations and then override with ChatGPT-based translations
  const { t: tMapBase } = await getUiTranslations({ base: {}, lang }).catch(() => ({ t: {} }));
  const tMap = { ...tMapBase };
  try {
    // Fetch core UI labels via ChatGPT for server-side rendering
    tMap.Chart = await fetchChatGPTTranslation('Chart', lang);
    for (const key of ['Bar', 'Line', 'Pie', 'Doughnut', 'Combo']) {
      tMap[key] = await fetchChatGPTTranslation(key, lang);
    }
  } catch (e) {
    console.warn(TAG, 'translation.fetch.warn', e?.message || e);
  }
  const rtl = isRTL(lang);

  // ---- Graph data ------------------------------------------------------------
  // parse years from timeFrame
  const tfMatch = String(canon.timeFrame).match(/\d+/);
  const years = Math.max(1, Number(tfMatch ? tfMatch[0] : 3));
  const points = Math.min(24, Math.max(6, years * 6)); // bi-monthly
  const base = Math.max(1, canon.costSavingsGoal || 2_000_000);
  const trend = Array.from({ length: points }, (_, i) =>
    Math.round(base * (0.4 + (0.6 * i) / (points - 1))),
  );

  const kpis = [
    { label: 'Cost-to-Serve', value: 72 },
    { label: 'On-time', value: 88 },
    { label: 'Defect', value: 91 },
    { label: 'Engagement', value: 76 },
    { label: 'Automation', value: 63 },
  ];
  const phases = Array.from({ length: Math.max(3, years) }, (_, i) => ({
    label: `Phase ${i + 1}`,
    pos: i / (Math.max(3, years) - 1 || 1),
  }));

  const graphs = {
    sparkline: sparklineSVG(trend, { title: 'Financial trend (projected savings)' }),
    bars: barChartSVG(kpis, { title: 'Key Performance Indicators' }),
  };

  // ---- Airtable linked-field lookups ----------------------------------------
  let countryId = null,
    tierId = null,
    sizeId = null,
    timeId = null;
  if (AT_API_KEY && AT_BASE_ID) {
    try {
      if (canon.country) {
        countryId = await lookupLinkedIdByName(TABLE_COUNTRIES, canon.country);
        console.log(
          `${TAG}`,
          'at.lookup.hit',
          JSON.stringify({ table: TABLE_COUNTRIES, id: countryId, value: canon.country }),
        );
      }
      if (canon.tier) {
        tierId = await lookupLinkedIdByName(TABLE_TIERS, canon.tier);
        console.log(
          `${TAG}`,
          'at.lookup.hit',
          JSON.stringify({ table: TABLE_TIERS, id: tierId, value: canon.tier }),
        );
      }
      if (canon.companySize) {
        sizeId = await lookupLinkedIdByName(TABLE_COMP_SIZES, canon.companySize);
        console.log(
          `${TAG}`,
          'at.lookup.hit',
          JSON.stringify({ table: TABLE_COMP_SIZES, id: sizeId, value: canon.companySize }),
        );
      }
      if (canon.timeFrame) {
        timeId = await lookupLinkedIdByName(TABLE_TIMEFRAMES, canon.timeFrame);
        console.log(
          `${TAG}`,
          'at.lookup.hit',
          JSON.stringify({ table: TABLE_TIMEFRAMES, id: timeId, value: canon.timeFrame }),
        );
      }
    } catch (e) {
      console.warn(`${TAG}`, 'at.lookup.warn', e?.message || e);
    }
  }

  // ---- Build sections until we hit the hard floor ----------------------------
  const prompts = sectionPrompts(canon);
  const sections = [];
  let totalWords = 0;
  // Generate each main section to its own min word target before moving on
  for (let i = 0; i < prompts.length && sections.length < REPORT_MAX_EXPANSION_ROUNDS; i++) {
    const p = prompts[i];
    let secHtml = '';
    let secWords = 0;
    console.log(`${TAG}`, 'gen.section.start', { section: p.key, target: p.min });
    // loop until this section meets its minimum word count
    while (secWords < p.min && sections.length < REPORT_MAX_EXPANSION_ROUNDS) {
      const part = await genSection(p);
      secHtml += part.html;
      secWords += part.words;
      console.log(`${TAG}`, 'gen.section.progress', { section: p.key, words: secWords });
    }
    // build final section object
    const s = { key: p.key, title: p.title, html: secHtml, words: secWords };

    // inject graphs into specific sections
    // Executive Summary savings graph
    if (prompts[i].key === 'exec') {
      s.html += `<figure class="graph exec-savings"><figcaption>Savings Over Period</figcaption><canvas id="exec-savings-canvas" width="720" height="280"></canvas></figure>`;
    }
    if (prompts[i].key === 'financials') {
      // dynamic financial trend chart placeholder
      s.html += `<figure class="graph sparkline"><figcaption>Financial trend (projected savings)</figcaption><canvas id="financial-trend-canvas" width="720" height="280"></canvas></figure>`;
      // payback over time
      s.html += `<figure class="graph payback"><figcaption>Payback Over Time</figcaption><canvas id="financial-payback-canvas" width="720" height="280"></canvas></figure>`;
    }
    if (prompts[i].key === 'kpis') {
      // dynamic KPI bars chart placeholder
      s.html += `<figure class="graph kpi-bars"><figcaption>Key Performance Indicators</figcaption><canvas id="kpi-bars-canvas" width="720" height="280"></canvas></figure>`;
    }
    // timeline handled via SafeGraphs if needed; skip legacy timeline injection
    // risk section heatmap placeholder
    if (prompts[i].key === 'risk') {
      s.html += `<figure class="graph heatmap-risk"><figcaption>Risk Heat Map</figcaption><canvas id="risk-heatmap-canvas" width="720" height="280"></canvas></figure>`;
    }

    // add interactive dashboard, heatmap, map, and implementation plan in implementation section
    if (prompts[i].key === 'implementation') {
      // dynamic implementation plan SVG with embedded phase details
      const implHtml = s.html;
      const svg = planFigureSVG(
        phases.map(({ label }) => {
          const regex = new RegExp(label + '[\\s\\S]*?(?=Phase \\d|$)', 'i');
          const match = implHtml.match(regex);
          return { title: label, focus: match ? match[0] : '' };
        }),
        { title: 'Implementation Plan' },
      );
      s.html = `<figure class="graph implementation-plan">${svg}<figcaption>Implementation Plan</figcaption></figure>`;
      // Dashboard and heatmap placeholders
      s.html += `<figure class="graph dashboard"><figcaption>Dashboard</figcaption><canvas id="dashboard-canvas" width="720" height="400"></canvas></figure>`;
      s.html += `<figure class="graph heatmap"><figcaption>Risk Heat Map</figcaption><canvas id="heatmap-container" width="720" height="400"></canvas></figure>`;
      // map removed
      // DEBUG: verify implementation placeholders present
      dbg('Implementation placeholders:', {
        dashboard: s.html.includes('id="dashboard-container"'),
        heatmap: s.html.includes('id="heatmap-container"'),
        map: s.html.includes('id="map-container"'),
      });
    }
    sections.push(s);
    totalWords += s.words;
    console.log(`${TAG}`, 'gen.section.done', { section: p.key, words: s.words });

    // continue to next section after meeting per-section target
  }

  if (totalWords < canon.minWords) {
    console.log(`${TAG}`, 'annex.required', { totalWords, remaining: canon.minWords - totalWords });
    const forced = await forceToFloor(sections, canon.minWords, canon);
    totalWords = forced.totalWords;
  }

  // Map generated array → template section keys
  const sectionMap = {
    executiveSummary: '',
    background: '',
    methodology: '',
    findings: '',
    recommendations: '',
    implementationRoadmap: '',
    financials: '',
    kpis: '',
    risks: '',
    change: '',
    timeline: '',
    conclusion: '',
    appendices: '',
  };

  for (const s of sections) {
    switch (s.key) {
      case 'exec':
        sectionMap.executiveSummary = s.html;
        break;
      case 'current':
        sectionMap.background = s.html;
        break;
      case 'financials':
        sectionMap.financials = s.html;
        break;
      case 'kpis':
        sectionMap.kpis = s.html;
        break;
      case 'timeline':
        sectionMap.timeline = s.html;
        break;
      case 'ops':
        sectionMap.implementationRoadmap = s.html;
        break;
      case 'implementation':
        sectionMap.implementationRoadmap = s.html.replace(/\[Consulting Firm Name\]/g, '');
        break;
      case 'risk':
        sectionMap.risks = s.html;
        break;
      case 'roi':
        sectionMap.conclusion = s.html;
        break;
      default:
        // Unmapped sections should be placed into appendices by AI prompt, not template
        break;
    }
  }

  const rawHtml = sections.map((s) => `<section><h2>${s.title}</h2>${s.html}</section>`).join('\n');
  console.log(
    TAG,
    'debug rawHtml tables:',
    (rawHtml.match(/<table\b/g) || []).length,
    'sections:',
    sections.length,
  );

  // Build final HTML via template
  const ctx = {
    lang,
    tMap,
    rtl,
    origin,
    logoUrl: canon.logoUrl,
    canon,
    currentYear: new Date().getFullYear(),
  };

  const dataForTemplate = {
    sections: sectionMap,
    rawHtml: '',
    financialTable: null,
    kpiTable: null,
    logoUrl: canon.logoUrl,
  };

  // ---- SAFE BUILD (2 passes) -------------------------------------------------
  let finalHTML = '';
  try {
    // Prefer passing SafeGraphs as a 3rd arg if the template supports it
    finalHTML = await buildReformReportHTML(dataForTemplate, ctx, { Graphs: SafeGraphs });
  } catch (e1) {
    console.warn(TAG, 'template.build.warn.1', e1?.message || e1);
    try {
      // Some templates read Graphs from ctx instead of a 3rd param
      finalHTML = await buildReformReportHTML(dataForTemplate, { ...ctx, Graphs: SafeGraphs });
    } catch (e2) {
      console.error(TAG, 'template.build.fallback', e2?.message || e2);
      // Last-resort: inline minimal shell so the request never fails
      finalHTML = `
        <article class="reform-report">
          <header>
            <h1>${canon.orgName} — Reform Strategy Report</h1>
          </header>
          ${rawHtml}
        </article>`;
    }
  }
  console.log(
    TAG,
    'debug finalHTML tables:',
    (finalHTML.match(/<table\b/g) || []).length,
    'svgs:',
    (finalHTML.match(/<svg\b/g) || []).length,
  );

  // remove duplicate section headings (keep first occurrence only)
  const seenTitles = new Set();
  finalHTML = finalHTML.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (full, title) => {
    const trimmed = title.trim();
    if (seenTitles.has(trimmed)) return '';
    seenTitles.add(trimmed);
    return full;
  });
  // remove duplicate header blocks beyond the first
  let seenHeader = false;
  finalHTML = finalHTML.replace(/<header[\s\S]*?<\/header>/gi, (m) => {
    if (!seenHeader) {
      seenHeader = true;
      return m;
    }
    return '';
  });
  // remove any logo images
  finalHTML = finalHTML.replace(/<img[^>]*logo[^>]*>/gi, '');

  // **Second-chance hard floor** after templating (rare, but safe)
  let finalWordCount = wc(finalHTML);
  if (finalWordCount < canon.minWords && sections.length < REPORT_MAX_EXPANSION_ROUNDS) {
    console.log(`${TAG}`, 'post.template.floor', { finalWordCount, target: canon.minWords });
    const forced = await forceToFloor(sections, canon.minWords, canon);

    // Rebuild section map / rawHtml and template again
    const rebuiltRaw = sections
      .map((s) => `<section><h2>${s.title}</h2>${s.html}</section>`)
      .join('\n');
    dataForTemplate.sections.appendices = sections
      .filter((s) => s.key.startsWith('appendix') || s.key.startsWith('deep-dive-'))
      .map((s) => `<div>${s.html}</div>`)
      .join('\n');
    dataForTemplate.rawHtml = rebuiltRaw;

    try {
      finalHTML = await buildReformReportHTML(dataForTemplate, ctx, { Graphs: SafeGraphs });
    } catch {
      try {
        finalHTML = await buildReformReportHTML(dataForTemplate, { ...ctx, Graphs: SafeGraphs });
      } catch {
        // keep the previous finalHTML if rebuild fails
      }
    }
    finalHTML = finalHTML.replace(
      /(<h2[^>]*>\s*Executive Summary\s*<\/h2>)/gi,
      (m, _g, offset, str) => (str.indexOf(m) === offset ? m : ''),
    );
    finalWordCount = wc(finalHTML);
  }

  // ---- Upsert into Airtable --------------------------------------------------
  let rid = canon.recordId || null;
  if (AT_API_KEY && AT_BASE_ID) {
    const fields = {
      [F_ORG]: canon.orgName,
      [F_COST_GOAL]: canon.costSavingsGoal ? String(canon.costSavingsGoal) : undefined,
      [F_STRAT]: canon.strategicGoal,
      [F_OUTCOME]: canon.desiredOutcome,
      ...(canon.preparedFor ? { [F_PREPARED_FOR]: canon.preparedFor } : {}),
      ...(canon.preparedBy ? { [F_PREPARED_BY]: canon.preparedBy } : {}),
      ...(countryId ? { [F_COUNTRY]: [{ id: countryId }] } : {}),
      ...(tierId ? { [F_TIER]: [{ id: tierId }] } : {}),
      ...(sizeId ? { [F_SIZE]: [{ id: sizeId }] } : {}),
      ...(timeId ? { [F_TIME]: [{ id: timeId }] } : {}),
      [F_HTML]: finalHTML,
    };

    console.log(
      `${TAG}`,
      'at.create.req',
      JSON.stringify({ table: TABLE_REQUESTS, keys: Object.keys(fields) }),
    );

    let upsert = await createOrUpdateRequest(fields, rid);
    if (
      !upsert.ok &&
      upsert.json &&
      upsert.json.error &&
      upsert.json.error.type === 'INVALID_RECORD_ID' &&
      !rid
    ) {
      // retry without HTML first to dodge size issues on first create
      const retryFields = { ...fields };
      delete retryFields[F_HTML];
      upsert = await createOrUpdateRequest(retryFields, rid);
      if (upsert.ok && upsert.json?.id) {
        rid = upsert.json.id;
        await createOrUpdateRequest({ [F_HTML]: finalHTML }, rid);
      }
    } else if (upsert.ok && upsert.json && upsert.json.id) {
      rid = upsert.json.id;
    }

    if (!upsert.ok) {
      console.error(`${TAG}`, 'fatal', {
        stage: 'AIRTABLE_UPSERT',
        message: upsert.json?.error?.message || 'Unknown Airtable error',
      });
    } else {
      console.log(`${TAG}`, 'final.update.ok', {});
    }
  }

  const ms_total = Date.now() - started;
  console.log(`${TAG}`, 'ok', { rid, ms_total, finalWordCount, min: canon.minWords });

  // Prepare chart registry injection for client-side hydration
  const chartRegistry = [];
  // Financial trend line chart
  chartRegistry.push({
    id: 'financial-trend-canvas',
    config: JSON.stringify({
      type: 'line',
      data: {
        labels: trend.map((_, i) => `T${i + 1}`),
        datasets: [{ label: 'Projected Savings', data: trend }],
      },
      options: {},
    }),
  });
  // KPI bars chart
  chartRegistry.push({
    id: 'kpi-bars-canvas',
    config: JSON.stringify({
      type: 'bar',
      data: {
        labels: kpis.map((o) => o.label),
        datasets: [{ label: 'Value', data: kpis.map((o) => o.value) }],
      },
      options: {},
    }),
  });
  // Dashboard placeholder: use KPI values
  chartRegistry.push({
    id: 'dashboard-canvas',
    config: JSON.stringify({
      type: 'bar',
      data: {
        labels: [
          'Projected Savings',
          'Payback',
          Array.isArray(kpis) && kpis[0] ? kpis[0].label : '',
          Array.isArray(kpis) && kpis[1] ? kpis[1].label : '',
        ],
        datasets: [
          {
            label: 'Dashboard Metrics',
            data: [
              trend[trend.length - 1], // final projected savings
              trend[trend.length - 1], // payback approximated same as savings
              kpis[0]?.value || 0,
              kpis[1]?.value || 0,
            ],
          },
        ],
      },
      options: {},
    }),
  });
  // Heatmap placeholder: reuse bar chart for risk levels
  chartRegistry.push({
    id: 'heatmap-container',
    config: JSON.stringify({
      type: 'bar',
      data: {
        labels: kpis.map((o) => o.label),
        datasets: [{ label: 'Risk Heat Map', data: kpis.map((o) => o.value) }],
      },
      options: {},
    }),
  });
  // Map placeholder
  chartRegistry.push({
    id: 'map-container',
    config: JSON.stringify({ type: 'scatter', data: { datasets: [] }, options: {} }),
  });
  // Executive summary savings graph
  chartRegistry.push({
    id: 'exec-savings-canvas',
    config: JSON.stringify({
      type: 'line',
      data: {
        labels: trend.map((_, i) => `T${i + 1}`),
        datasets: [{ label: 'Savings', data: trend }],
      },
      options: {},
    }),
  });
  // Payback over time chart
  chartRegistry.push({
    id: 'financial-payback-canvas',
    config: JSON.stringify({
      type: 'line',
      data: {
        labels: trend.map((_, i) => `T${i + 1}`),
        datasets: [{ label: 'Payback', data: trend }],
      },
      options: {},
    }),
  });
  // KPI dashboard
  chartRegistry.push({
    id: 'kpi-dashboard-canvas',
    config: JSON.stringify({
      type: 'bar',
      data: {
        labels: kpis.map((o) => o.label),
        datasets: [{ label: 'KPI Dashboard', data: kpis.map((o) => o.value) }],
      },
      options: {},
    }),
  });
  // Risk heatmap
  chartRegistry.push({
    id: 'risk-heatmap-canvas',
    config: JSON.stringify({
      type: 'bar', // fallback to bar chart for heatmap display
      data: {
        labels: kpis.map((o) => o.label),
        datasets: [{ label: 'Risk Levels', data: kpis.map((o) => o.value) }],
      },
      options: {},
    }),
  });
  dbg('Final chartRegistry:', chartRegistry);
  finalHTML += `<script type="application/json" id="chart-registry">${JSON.stringify(chartRegistry)}</script>`;

  return NextResponse.json({
    ok: true,
    rid,
    wordCount: finalWordCount,
    html: finalHTML,
    currentYear: new Date().getFullYear(),
    logoUrl: canon.logoUrl,
  });
}

import '../../../lib/utils/string.js';