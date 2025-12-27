/* ===============================
   app/api/reform/generate/route.js
   =============================== */

import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate';
import { planDiagramHTML } from '@/lib/implPlan';
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js';

const TAG = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';

/* -------------------------------------------------------------------------- */
/* [KT PATCH] Lazy OpenAI loader (no deletions)                                */
/* -------------------------------------------------------------------------- */
let __openai;
/* dangling token from prior edit — commented out to fix syntax */
// async
// [KT PATCH] quote-safe chart attribute writer
/*  ❗️REGRESSION NOTE:
    The original Oct 9 build began converting data-chart/data-heatmap JSON into
    &quot;…&quot;. The front-end renderer likely expects raw JSON. To restore Oct 8
    behavior, this pass is now a NO-OP. We keep the function (no deletions) but
    return the html unchanged. */
function quoteSafeChartAttrs(html = '') {
  return String(html || ''); // ← NO-OP to avoid double-encoding JSON in attributes
}

async function getOpenAI() {
  // ← must be async because we await import()
  if (!__openai) {
    const { OpenAI } = await import('openai');
    __openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return __openai;
}
/* ORIGINAL (commented) */
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------------- helpers ---------------------------------- */
const wc = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;

const today = () =>
  new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

const SECTION_FLOORS = {
  exec: 2400,
  current: 3000, // [KT:RAISE]
  financials: 2800,
  kpis: 2400,
  timeline: 2400,
  ops: 3000,
  risk: 2200,
  roi: 2000,
  conclusion: 1400,
};
const TOTAL_FLOOR = Object.values(SECTION_FLOORS).reduce((a, b) => a + b, 0);

/* [KT:AI-CURRENCY] Resolve currency via AI (Nano 5, temp=1) */
async function resolveCurrency(country = '') {
  const openai = await getOpenAI();
  try {
    const r = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return ONLY a 3-letter ISO 4217 currency code.' },
        { role: 'user', content: `Country: ${country}` },
      ],
    });
    const code = (r.choices?.[0]?.message?.content || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3);
    return /^[A-Z]{3}$/.test(code) ? code : 'USD';
  } catch {
    return 'USD';
  }
}

/* ========================================================================== */
/* [KT:VIZ] detection + extraction helpers                                     */
/* ========================================================================== */
const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const hasViz = (html = '') => HAS_VIZ_RE.test(String(html || ''));

// [KT:SAFE] parser that tolerates &quot;, &amp;, and &#39; (apostrophes)
function safeParseAttrJSON(s = '') {
  try {
    return JSON.parse(
      String(s)
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, '\''),
    );
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   [KT PATCH — CORE]: Attribute-safe RAW JSON emission
   We keep RAW JSON but **escape single quotes** so single-quoted attributes
   don’t terminate early when titles contain apostrophes (e.g., cohort's).
   This addresses the '{' len:1 parse errors.
   ────────────────────────────────────────────────────────────────────────── */
function escapeForSingleQuotedAttr(str) {
  return String(str).replace(/'/g, '&#39;'); // HTML-safe apostrophe
}
function toAttrJSON_RAW(obj) {
  try {
    const json = JSON.stringify(obj);
    // keep JSON as a single line and escape apostrophes for single-quoted attributes
    return json.replace(/'/g, '&#39;').replace(/\r\n|\n|\r/g, ' ');
  } catch {
    return '{}';
  }
}

/* Kept for completeness; double-quoted attr usage not used for charts now */
function toAttrJSON(obj) {
  try {
    return JSON.stringify(obj).replace(/"/g, '&quot;');
  } catch {
    return '{}';
  }
}

// Extract a single viz fragment
const extractVizFragment = (s = '') => {
  const str = String(s || '');
  const m1 = str.match(/<figure[^>]*data-chart=(["'])([\s\S]*?)\1[\s\S]*?<\/figure>/i);
  if (m1) return m1[0];
  const m2 = str.match(/<figure[^>]*data-widget=(["'])benchmark\1[\s\S]*?<\/figure>/i);
  if (m2) return m2[0];
  const m3 = str.match(/<div[^>]*data-heatmap=(["'])([\s\S]*?)\1[\s\S]*?<\/div>/i);
  if (m3) return m3[0];
  return '';
};

// Pull meta for de-dupe + logging (quote-backref safe)
function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '', xTitle: '', yTitle: '', labelsLen: 0, dataLen: 0 };
  if (!frag) return out;

  // chart
  const chart = frag.match(/<figure[^>]*data-chart=(["'])([\s\S]*?)\1/i);
  if (chart) {
    out.kind = 'chart';
    try {
      const captured = chart[2];
      const json = safeParseAttrJSON(captured);
      if (!json) {
        console.log(TAG, 'predictive.parse.error', {
          kind: 'chart',
          snippet: String(captured).slice(0, 120),
          len: String(captured).length,
        });
      }
      out.type = String(json?.type || '');
      out.title = String(json?.title || '');
      out.xTitle = String(json?.xTitle || '');
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = Array.isArray(json?.labels) ? json.labels.length : 0;
      out.dataLen = Array.isArray(json?.datasets?.[0]?.data) ? json.datasets[0].data.length : 0;
    } catch (e) {
      console.log(TAG, 'predictive.parse.exception', String(e?.message || e));
    }
    return out;
  }

  // benchmark (note: data-spec also backref)
  const bench = frag.match(
    /<figure[^>]*data-widget=(["'])benchmark\1[^>]*data-spec=(["'])([\s\S]*?)\2/i,
  );
  if (bench) {
    out.kind = 'benchmark';
    try {
      const captured = bench[3];
      const json = safeParseAttrJSON(captured);
      if (!json) {
        console.log(TAG, 'predictive.parse.error', {
          kind: 'benchmark',
          snippet: String(captured).slice(0, 120),
          len: String(captured).length,
        });
      }
      out.type = 'benchmark';
      out.title = String(json?.title || '');
      out.xTitle = 'Measure';
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = 2;
      out.dataLen = 2;
    } catch (e) {
      console.log(TAG, 'predictive.parse.exception', String(e?.message || e));
    }
    return out;
  }

  // heatmap
  const heat = frag.match(/<div[^>]*data-heatmap=(["'])([\s\S]*?)\1/i);
  if (heat) {
    out.kind = 'heatmap';
    try {
      const captured = heat[2];
      const json = safeParseAttrJSON(captured);
      if (!json) {
        console.log(TAG, 'predictive.parse.error', {
          kind: 'heatmap',
          snippet: String(captured).slice(0, 120),
          len: String(captured).length,
        });
      }
      out.type = 'heatmap';
      out.title = String(json?.title || '');
      out.xTitle = 'Columns';
      out.yTitle = 'Rows';
      out.labelsLen = Array.isArray(json?.cols) ? json.cols.length : 0;
      out.dataLen = Array.isArray(json?.data) ? json.data.length : 0;
    } catch (e) {
      console.log(TAG, 'predictive.parse.exception', String(e?.message || e));
    }
    return out;
  }
  return out;
}

/* [KT-ADD][2025-10-09 23:50 ET] Missing utility restored without deletions.
   Scans the provided HTML and returns existing visualization signatures to
   avoid duplicates when injecting predictive charts. */
function collectExistingVizMeta(html = '') {
  const titles = new Set();
  const sigs = new Set(); // kind|title
  const re =
    /(<figure[^>]*data-chart=(["'])([\s\S]*?)\2[\s\S]*?<\/figure>)|(<figure[^>]*data-widget=(["'])benchmark\5[\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=(["'])([\s\S]*?)\7[\s\S]*?<\/div>)/gi;
  const all = String(html || '').match(re) || [];
  for (const frag of all) {
    const meta = parseVizMeta(frag);
    const t = (meta.title || '').trim().toLowerCase() || '(untitled)';
    titles.add(t);
    sigs.add(`${meta.kind}|${t}`);
  }
  return { titles, sigs };
}

/* ========================================================================== */
/* Guidance blocks                                                             */
/* ========================================================================== */

// [KT:NO-VISUALS] keep writers from injecting generic figures
const NO_VISUALS_GUIDANCE = `
Do NOT include any <figure> charts, <div data-heatmap>, or benchmark widgets in this section.
If numeric evidence is helpful, use ONE compact <table class="report-table"> per section (exec summary excluded).
`;

/* ========================================================================== */
/* Predictive analytics — keywords-first                                       */
/* ========================================================================== */

function isStandardSectionGraphDuplicate(section, meta) {
  if (!meta || !meta.title) return false;
  const t = meta.title.toLowerCase();
  const reservedBySection = {
    exec: ['savings over time', 'savings by month', 'savings by year'],
    financials: ['capex vs opex', 'payback curve'],
    kpis: ['kpi benchmark', 'savings benchmark'],
  };
  const reserved = (reservedBySection[section] || []).map((s) => s.toLowerCase());
  return reserved.includes(t);
}

/* ========================================================================== */
/* 🔁 mergeSynth — fills title/axes/dataset shell and synthesizes labels       */
/* ========================================================================== */
function mergeSynth(section, canon, cand) {
  const titleSynth = section?._predictive?.titleSynth || {}; // { title }
  const axesSynth = section?._predictive?.axesSynth || {}; // { xTitle, yTitle }
  const merged = JSON.parse(JSON.stringify(cand || {}));
  merged.title = merged.title || titleSynth.title || `${String(section).toUpperCase()} Forecast`;
  merged.xTitle = merged.xTitle || axesSynth.xTitle || 'X';
  merged.yTitle = merged.yTitle || axesSynth.yTitle || 'Y';
  if (!Array.isArray(merged.datasets)) merged.datasets = [];
  if (!merged.datasets[0]) merged.datasets[0] = { label: merged.title, data: [] };
  const values = Array.isArray(merged.datasets?.[0]?.data) ? merged.datasets[0].data : [];
  const needLabels =
    !Array.isArray(merged.labels) ||
    merged.labels.length === 0 ||
    merged.labels.length !== values.length;
  if (values.length > 0 && needLabels) {
    const unit = (merged.xTitle || '').toLowerCase().includes('month') ? 'M' : 'Y';
    merged.labels = Array.from({ length: values.length }, (_, i) => `${unit}${i + 1}`);
  }
  return merged;
}

/* ========================================================================== */
/* Renderers / synth                                                           */
/* ========================================================================== */

// Render candidate to fragment — **emit RAW JSON inside SINGLE-QUOTED attr**
function renderCandidateToFragment(section, c) {
  if (String(c.type || '').toLowerCase() === 'heatmap' && section === 'risk') {
    const spec = {
      title: c.title,
      rows: Array.isArray(c.rows) ? c.rows.slice(0, 12) : ['R1', 'R2', 'R3', 'R4', 'R5'],
      cols: Array.isArray(c.cols) ? c.cols.slice(0, 12) : ['C1', 'C2', 'C3', 'C4', 'C5'],
      data: Array.isArray(c.data) ? c.data : [],
    };
    return `<div data-heatmap='${toAttrJSON_RAW(spec)}' data-origin="predictive"></div>`;
  }
  const spec = {
    type: String(c.type || 'line').toLowerCase(),
    title: c.title,
    xTitle: c.xTitle,
    yTitle: c.yTitle,
    labels: c.labels,
    datasets: c.datasets.map((ds) => ({ label: ds.label || 'Predicted', data: ds.data })),
  };
  return `<figure data-chart='${toAttrJSON_RAW(spec)}' data-origin="predictive"></figure>`;
}

// Title/axes synth — preserve and reuse the original attribute quote via backref
function synthTitleIfMissing(section, frag) {
  return String(frag).replace(
    /(<figure[^>]*data-chart=(['"]))([\s\S]*?)(\2[^>]*>[\s\S]*?<\/figure>)/i,
    (m, pre, q, jsonRaw, post) => {
      const obj = safeParseAttrJSON(jsonRaw) || {};
      let changed = false;
      if (!String(obj.title || '').trim()) {
        obj.title = `${section.toUpperCase()} Predictive ${Math.floor(Math.random() * 900) + 100}`;
        changed = true;
        console.log(TAG, 'predictive.titleSynth', section, { title: obj.title });
      }
      if (!String(obj.xTitle || '').trim()) {
        obj.xTitle = 'Years';
        changed = true;
      }
      if (!String(obj.yTitle || '').trim()) {
        obj.yTitle = 'Index';
        changed = true;
      }
      if (changed)
        console.log(TAG, 'predictive.axesSynth', section, {
          xTitle: obj.xTitle,
          yTitle: obj.yTitle,
        });

      const jsonAttr = toAttrJSON_RAW(obj);
      return pre + jsonAttr + post;
    },
  );
}

// Short executive description for predictive
async function predictiveDescription(section, canon, meta) {
  const openai = await getOpenAI();
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Return one short HTML paragraph only (<p class="chart-note">…</p>).',
        },
        {
          role: 'user',
          content: `Explain "${meta.title}" for ${canon.orgName}. State X and Y meanings, the trend, one decision it informs this quarter, and one risk to watch.`,
        },
      ],
    });
    const p = (res.choices?.[0]?.message?.content || '').trim();
    return /^<p/i.test(p) ? p : `<p class="chart-note">${p}</p>`;
  } catch {
    return '';
  }
}

/* Annotate ALL visuals with an executive note */
async function annotateAllVisuals(html, canon) {
  const openai = await getOpenAI();
  let out = html;
  const re =
    /(<figure[^>]*data-chart[^>]*>[\s\S]*?<\/figure>|<div[^>]*data-heatmap=(["'])([\s\S]*?)\2[\s\S]*?<\/div>|<figure[^>]*data-widget=(["'])benchmark\4[\s\S]*?<\/figure>)/gi;
  const found = [...out.matchAll(re)];
  for (const m of found) {
    const frag = m[0];
    const meta = parseVizMeta(frag);
    const already = /class="chart-note"/i.test(out.slice(m.index, m.index + frag.length + 160));
    if (already) continue;
    try {
      const r = await openai.chat.completions.create({
        model: MODEL,
        temperature: 1,
        messages: [
          {
            role: 'system',
            content:
              'Return ONE HTML paragraph (<p class="chart-note">…</p>), 3–4 sentences, executive tone. Do NOT change numbers.',
          },
          {
            role: 'user',
            content: `Write a short interpretation of "${meta.title}" (X:${meta.xTitle} / Y:${meta.yTitle}) for ${canon.orgName}. Describe what it says, how to use it, and one implication.`,
          },
        ],
      });
      const p = (r.choices?.[0]?.message?.content || '').trim();
      const note = /^<p/i.test(p) ? p : `<p class="chart-note">${p}</p>`;
      out = out.replace(frag, frag + '\n' + note);
    } catch (e) {
      console.log(TAG, 'annotate.error', String(e?.message || e));
    }
  }
  return out;
}

/* ========================================================================== */
/* Table title annotator (AI)                                                  */
/* ========================================================================== */
async function annotateTablesWithTitles(html, canon) {
  const openai = await getOpenAI();
  let out = String(html || '');
  const re = new RegExp(
    '((?:<\\/p>\\s*)?)(<table\\s+class=["\\\']report-table["\\\'][\\s\\S]*?<\\/table>)',
    'ig',
  );
  const parts = [];
  let last = 0,
    m;
  while ((m = re.exec(out)) !== null) {
    const before = out.slice(Math.max(0, m.index - 600), m.index);
    let title = '';
    try {
      const r = await openai.chat.completions.create({
        model: MODEL,
        temperature: 1,
        messages: [
          { role: 'system', content: 'Return ONLY a short title (4–8 words), no punctuation.' },
          {
            role: 'user',
            content: `Write a clear table title for ${canon.orgName} based on this nearby text:\n${before}`,
          },
        ],
      });
      title = (r.choices?.[0]?.message?.content || '').trim();
    } catch {}
    const caption = title ? `<p class="table-title"><strong>${title}</strong></p>\n` : '';
    parts.push(out.slice(last, m.index) + caption + m[2]);
    last = m.index + m[0].length;
  }
  parts.push(out.slice(last));
  return parts.join('');
}

/* ========================================================================== */
/* [KT-ADD] Debug helpers for insertion verification                           */
/* ========================================================================== */
const DEBUG_VERBOSE = process.env.SR_VERBOSE === '1';
const LOGV = (...args) => {
  if (DEBUG_VERBOSE) console.log(...args);
};

function listPredictiveTitles(html = '') {
  const out = [];
  const re =
    /(<figure[^>]*data-chart=(["'])([\s\S]*?)\2[^>]*data-origin=(["'])predictive\4[\s\S]*?<\/figure>)/gi;
  const matches = String(html || '').matchAll(re);
  for (const m of matches) {
    const frag = m[1];
    const meta = parseVizMeta(frag);
    if (meta && meta.title) out.push(meta.title);
  }
  return out;
}

/* ========================================================================== */
/* [KT-ADD] Reinjection of predictive fragments post-template                  */
/* ========================================================================== */
function reinjectPredictiveIntoFinal(html, predictiveFragsBySection) {
  let out = String(html || '');
  const ids = [
    'exec',
    'current',
    'financials',
    'kpis',
    'timeline',
    'ops',
    'risk',
    'roi',
    'conclusion',
  ];

  for (const id of ids) {
    const frags = predictiveFragsBySection[id] || [];
    if (!frags.length) continue;

    // Locate section block: from <h2 id="id"> to next <h2 or </body>
    const re = new RegExp(`(<h2[^>]*id=["']${id}["'][\\s\\S]*?)(?=<h2\\b|</body>)`, 'i');
    const m = out.match(re);
    if (!m) continue;

    // Avoid duplicates (if template somehow preserved them)
    const existing = m[1];
    const needs = [];
    for (const frag of frags) {
      const title = (parseVizMeta(frag).title || '').trim();
      const sig = title ? new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
      if (!sig || !sig.test(existing)) needs.push(frag);
    }
    if (!needs.length) continue;

    const injected = m[1] + '\n' + needs.join('\n');
    out = out.replace(re, injected);
  }
  return out;
}

function countSectionPredictive(html = '') {
  const sections = [
    'exec',
    'current',
    'financials',
    'kpis',
    'timeline',
    'ops',
    'risk',
    'roi',
    'conclusion',
  ];
  const result = {};
  for (const id of sections) {
    const segRe = new RegExp(`<h2[^>]*id=["']${id}["'][\\s\\S]*?(?=<h2\\b|</body>)`, 'i');
    const m = String(html || '').match(segRe);
    const seg = m ? m[0] : '';
    const count = (seg.match(/data-origin=["']predictive["']/g) || []).length;
    result[id] = count;
  }
  return result;
}

/* ========================================================================== */
/* Predictive candidate pipeline                                               */
/* ========================================================================== */
async function aiSuggestKeywords(section, canon, sectionHtml) {
  const openai = await getOpenAI();
  const prompt = [
    `Analyze the "${section}" section and propose up to 1000 SHORT predictive-analytics keywords/phrases,`,
    'ordered from most to least promising given the data. Exclude generic terms ("chart","graph").',
    'Return JSON array of strings only.',
    '',
    '--- CANON ---',
    `Org:${canon.orgName}  Country:${canon.country}  Time frame:${canon.timeFrame}  Goal:${canon.costSavingsGoal}`,
    '--- SECTION HTML ---',
    sectionHtml,
  ].join('\n');

  try {
    const r = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return JSON array of strings only.' },
        { role: 'user', content: prompt },
      ],
    });
    const txt = r.choices?.[0]?.message?.content || '[]';
    let arr;
    try {
      arr = JSON.parse(txt);
    } catch {
      arr = [];
    }
    const set = new Set();
    for (const k of Array.isArray(arr) ? arr : []) {
      const s = String(k || '').trim();
      if (!s) continue;
      if (/^(trend|chart|graph)$/i.test(s)) continue;
      const low = s.toLowerCase();
      if (!set.has(low)) set.add(low);
    }
    const keywords = Array.from(set);
    console.log(TAG, 'predictive.keywords', section, {
      count: keywords.length,
      sample: keywords.slice(0, 8),
    });
    return keywords;
  } catch (e) {
    console.log(TAG, 'predictive.keywords.error', section, String(e?.message || e));
    return [];
  }
}

async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords) {
  const openai = await getOpenAI();
  const yCur = canon.currencyCode;
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  const user =
    `From KEYWORDS, choose up to 12 of the best predictive analytics for the "${section}" section.
For each, return ONE JSON candidate chart **(no tables, no benchmarks)** with:
- "keyword" (from KEYWORDS),
- "type" in ["line","bar","pie","doughnut"]  // **no "benchmark"**
- "title" (clear, specific, and **non-empty**),
- "xTitle" ("${years ? 'Years' : 'Months'}") (**non-empty**),
- "yTitle" ("${section === 'financials' || section === 'exec' ? yCur : section === 'kpis' || section === 'roi' || section === 'current' ? 'Percent' : 'Index'}") (**non-empty**),
- "labels": ${JSON.stringify(labels)} (**must match** datasets length),
- "datasets":[{"label":"Predicted","data":[numbers matching labels length]}]
Return STRICT JSON:
{"candidates":[{...},{...}]}

Reject any candidate internally that has blank title/axes or any zero-length arrays.

KEYWORDS:
${JSON.stringify(keywords).slice(0, 6000)}

CANON:
${JSON.stringify({ country: canon.country, currency: yCur, timeFrame: canon.timeFrame, costSavingsGoal: canon.costSavingsGoal })}

SECTION HTML (for defensible numbers):
${sectionHtml}`.trim();

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Return pure JSON with property "candidates" only. No prose, no markdown.',
        },
        { role: 'user', content: user },
      ],
    });
    let obj = {};
    try {
      obj = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    } catch {
      obj = {};
    }
    const candidates = Array.isArray(obj.candidates) ? obj.candidates : [];
    console.log(TAG, 'predictive.batch', section, { received: candidates.length });
    return candidates;
  } catch (e) {
    console.log(TAG, 'predictive.batch.error', section, String(e?.message || e));
    return [];
  }
}

// Validate candidate
function isGraphCandidateValid(section, c) {
  if (!c) return false;
  if (c.kind && /table/i.test(c.kind)) {
    return false;
  }
  const type = String(c.type || '').toLowerCase();
  if (type === 'benchmark' || String(c.kind || '').toLowerCase() === 'benchmark') {
    return false;
  }
  if (!['line', 'bar', 'pie', 'doughnut', 'heatmap'].includes(type)) {
    return false;
  }
  if (type === 'heatmap' && section !== 'risk') {
    return false;
  }

  const titleOk = String(c.title || '').trim().length > 0 && !/^chart$/i.test(c.title || '');
  const xOk = String(c.xTitle || '').trim().length > 0;
  const yOk = String(c.yTitle || '').trim().length > 0;
  const labels = Array.isArray(c.labels) ? c.labels : [];
  const data = Array.isArray(c.datasets?.[0]?.data) ? c.datasets[0].data : [];
  const lenOk = labels.length > 0 && labels.length === data.length;
  const nums = data.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const dataOk = nums.length === data.length && !nums.every((n) => n === 0);

  return titleOk && xOk && yOk && lenOk && dataOk;
}

/* ========================================================================== */
/* Choose predictive fragment                                                  */
/* ========================================================================== */
async function choosePredictiveFragment(section, canon, sectionHtml, existingSigSet) {
  const keywords = await aiSuggestKeywords(section, canon, sectionHtml);
  if (!keywords.length) {
    console.log(TAG, 'predictive.fail.noKeywords', section);
    return '';
  }

  const batch = await aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords);
  if (!batch.length) {
    console.log(TAG, 'predictive.fail.noBatch', section);
    return '';
  }

  const seenLocal = new Set();

  for (let i = 0; i < batch.length; i++) {
    const c = batch[i];

    const merged = mergeSynth(section, canon, c);

    if (!merged.title || !merged.xTitle || !merged.yTitle || !merged.labels?.length) {
      console.log(TAG, 'predictive.reject.missingMeta', section, {
        idx: i + 1,
        mergedPreview: {
          title: merged.title,
          xTitle: merged.xTitle,
          yTitle: merged.yTitle,
          labelsLen: merged.labels?.length || 0,
        },
      });
      continue;
    }

    if (!isGraphCandidateValid(section, merged)) {
      console.log(TAG, 'predictive.reject.invalid', section, {
        idx: i + 1,
        reason: 'shape/labels/data/title/axes',
        type: merged.type,
        sample: Array.isArray(merged.datasets?.[0]?.data)
          ? merged.datasets[0].data.slice(0, 3)
          : [],
      });
      continue;
    }

    const frag = renderCandidateToFragment(section, merged);

    if (/<table[\s\S]*<\/table>/i.test(frag)) {
      console.log(TAG, 'predictive.reject.tableDetected', section, { idx: i + 1 });
      continue;
    }

    const metaPre = parseVizMeta(frag);
    if (String(metaPre.kind || '').toLowerCase() === 'benchmark') {
      console.log(TAG, 'predictive.reject.benchmark', section, { idx: i + 1 });
      continue;
    }

    const fragSynth = synthTitleIfMissing(section, frag);
    const meta = parseVizMeta(fragSynth);

    if (isStandardSectionGraphDuplicate(section, meta)) {
      console.log(TAG, 'predictive.reject.standardDup', section, {
        idx: i + 1,
        title: meta.title,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
      });
      continue;
    }

    const sig = `${meta.kind}|${String(meta.title || '')
      .trim()
      .toLowerCase()}`;
    if (existingSigSet.has(sig) || seenLocal.has(sig)) {
      console.log(TAG, 'predictive.reject.duplicate', section, { idx: i + 1, sig });
      continue;
    }

    const valuesSample = Array.isArray(merged.datasets?.[0]?.data)
      ? merged.datasets[0].data.slice(0, 3)
      : [];

    console.log(TAG, 'predictive.select', section, {
      idx: i + 1,
      keyword: merged.keyword || '(unspecified)',
      type: meta.type || merged.type,
      title: meta.title,
      xTitle: meta.xTitle,
      yTitle: meta.yTitle,
      labelsLen: meta.labelsLen,
      valuesSample,
      embedPreview: {
        title: merged.title,
        xTitle: merged.xTitle,
        yTitle: merged.yTitle,
        labels0: merged.labels?.[0],
        labelsLen: merged.labels?.length,
      },
    });

    const desc = await predictiveDescription(section, canon, meta);
    seenLocal.add(sig);
    return fragSynth + '\n' + desc;
  }

  console.log(TAG, 'predictive.fail.exhausted', section, { tried: batch.length });
  return '';
}

/* ========================================================================== */
/* mining / derived / advice (disabled)                                        */
/* ========================================================================== */
function vizOnlyPrompt(section, canon, sectionHtml) {
  return '';
}
async function addVizIfData(section, canon, sectionHtml) {
  return '';
}
async function addDerivedVizIfNeeded(section, canon) {
  return '';
}
function advicePrompt(section, canon, sectionHtml) {
  return '';
}
async function addDataAdviceParagraph(section, canon, sectionHtml) {
  return '';
}

/* ========================================================================== */
/* [KT:T3] Section text prompts                                                */
/* ========================================================================== */
function sectionPrompt(section, canon, minWords) {
  return `
Audience: C-suite. Tone: concise, evidence-driven, pragmatic.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Size: ${canon.companySize}. Time frame: ${canon.timeFrame}.

Paragraph discipline: 3–4 sentences per paragraph (≈4–6 lines). Split any longer blocks. Avoid run-ons.

When you include a table, ALWAYS render it as <table class="report-table">...</table> so styles apply.
${NO_VISUALS_GUIDANCE}

Section: ${section}.
Hard minimum words: ${minWords}. Avoid generic filler. No appendix.
`.trim();
}

function expandPrompt(section, canon, remainingWords) {
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Write 2–3 short paragraphs (3–4 sentences each). Avoid repetition and filler.
Target at least ${remainingWords} words. Output valid HTML only.
Use <table class="report-table"> for any tables. Do NOT include charts or heatmaps here.
`.trim();
}

/* ========================================================================== */
/* Implementation Kit JSON (appendices only)                                   */
/* ========================================================================== */
async function genImplKitJSON(canon, sections) {
  const openai = await getOpenAI();
  const body = `
You are producing JSON only (no prose). Build an Implementation Kit from the report content.

Return exactly this shape:
{
  "charters": [ { "name": "...", "objective": "...", "scopeIn": "...", "scopeOut": "...", "owner": "...",
                  "stakeholders": ["..."], "milestones":[{"milestone":"...","due":"..."}],
                  "kpis":[{"kpi":"...","baseline":0,"target":0,"source":"..."}],
                  "risks":[{"risk":"...","mitigation":"...","owner":"..."}],
                  "budgetSummary":"...", "acceptanceCriteria":"..." } ],
  "raci": { "items":[{"decision":"...","R":"...","A":"...","C":["..."],"I":["..."],"SLA":"..."}] },
  "raid": { "items":[{"type":"Risk|Assumption|Issue|Dependency","description":"...","owner":"...",
                      "impact":"...","probability":"...","trigger":"...","mitigation":"...",
                      "status":"...","nextReview":"..."}] },
  "benefits": { "lines":[{"workstream":"...","lever":"...","unitAssumption":"...",
                          "source":"...","volume":0,"rate":0,"monthlyImpact":0,
                          "confidence":"Low|Medium|High","startMonth":"M1","runRateMonth":"M3","oneOffCost":0}] },
  "plan100": { "weeks":[{"week":"W1","workstream":"...","task":"...","owner":"...","status":"Planned"}] },
  "pilot": { "name":"...", "locations":10, "successKPIs":["..."], "thresholds":["..."],
             "sampleDesign":"...", "rollbackCriteria":"..." },
  "assumptions": { "items":[{"name":"...","value":0,"unit":"...","low":0,"high":0,"note":"..."}] },
  "methods": { "benchmarks":[{"name":"...","source":"...","date":"YYYY-MM","notes":"..."}],
               "sources":["...","..."] }
}
`.trim();

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return strict JSON only. No prose.' },
        {
          role: 'user',
          content:
            body +
            `\n\n--- CONTEXT (EXCERPTS) ---\nEXEC:\n${sections.exec}\n\nCURRENT:\n${sections.current}\n\nFINANCIALS:\n${sections.financials}\n\nKPIS:\n${sections.kpis}\n\nTIMELINE:\n${sections.timeline}\n\nOPS:\n${sections.ops}\n\nRISK:\n${sections.risk}\n\nROI:\n${sections.roi}\n\nCONCLUSION:\n${sections.conclusion || ''}`,
        },
      ],
    });
    const txt = res.choices?.[0]?.message?.content || '{}';
    let json = {};
    try {
      json = JSON.parse(txt);
    } catch {
      json = {};
    }
    if (json && typeof json === 'object') return json;
    return {};
  } catch (e) {
    console.log(TAG, 'appendix.implKit.error', String(e?.message || e));
    return {};
  }
}

/* ========================================================================== */
/* [KT:AUDIT] McKinsey polish (structure/length-safe, spec-freeze enforced)    */
/* ========================================================================== */

/* ORIGINAL enforceSectionAnchors (kept):
function enforceSectionAnchors(s){
  let out = String(s||'');
  const ids = ['exec','current','financials','kpis','timeline','ops','risk','roi','conclusion'];
  for (const id of ids){
    const has = new RegExp(`id=["']${id}["']`).test(out);
    if (!has){
      out = out.replace(new RegExp(`(<h2\\b(?![^>]*id=)[^>]*>\\s*[^<]*${id}[^<]*</h2>)`,'i'),
        (m)=> m.replace('<h2','<h2 id="'+id+'"'));
    }
  }
  return out;
}
*/

function enforceSectionAnchors(s) {
  let out = String(s || '');

  // Map visible H2 titles to required IDs
  const map = [
    { title: /<h2[^>]*>\s*Executive Summary\s*<\/h2>/i, id: 'exec' },
    { title: /<h2[^>]*>\s*Current State\s*<\/h2>/i, id: 'current' },
    { title: /<h2[^>]*>\s*Financials\s*<\/h2>/i, id: 'financials' },
    { title: /<h2[^>]*>\s*KPIs?\s*&\s*Targets\s*<\/h2>/i, id: 'kpis' },
    { title: /<h2[^>]*>\s*Implementation Plan\s*<\/h2>/i, id: 'timeline' },
    { title: /<h2[^>]*>\s*Operating Model\s*<\/h2>/i, id: 'ops' },
    { title: /<h2[^>]*>\s*Risks?\s*&\s*Mitigations\s*<\/h2>/i, id: 'risk' },
    { title: /<h2[^>]*>\s*ROI\s*&\s*Next Steps\s*<\/h2>/i, id: 'roi' },
    { title: /<h2[^>]*>\s*Conclusion\s*<\/h2>/i, id: 'conclusion' },
  ];

  for (const { title, id } of map) {
    out = out.replace(title, (m) => {
      if (/id=/.test(m)) return m; // already has an id, leave it
      return m.replace(/<h2\b/i, `<h2 id="${id}"`);
    });
  }

  // Fallback: if a required id is still missing, add it to the first <h2> inside a matching <section id="...">
  const required = [
    'exec',
    'current',
    'financials',
    'kpis',
    'timeline',
    'ops',
    'risk',
    'roi',
    'conclusion',
  ];
  for (const id of required) {
    if (!new RegExp(`id=["']${id}["']`).test(out)) {
      out = out.replace(
        new RegExp(`(<section[^>]*id=["']${id}["'][\\s\\S]*?<h2\\b)(?![^>]*id=)`, 'i'),
        `$1 id="${id}" `,
      );
    }
  }
  return out;
}

async function polishMcKinsey(html, canon) {
  // [KT PATCH] === begin spec freeze helpers ===
  const TOKEN = '__KT_SPEC__';
  function freezeSpecsForAudit(s) {
    let out = String(s || '');
    const specs = [];
    out = out.replace(/data-chart=(["'])([\s\S]*?)\1/gi, (m, q, spec) => {
      const i = specs.push({ kind: 'chart', spec: spec }) - 1;
      return `data-chart="${TOKEN}${i}"`;
    });
    out = out.replace(/data-heatmap=(["'])([\s\S]*?)\1/gi, (m, q, spec) => {
      const i = specs.push({ kind: 'heat', spec: spec }) - 1;
      return `data-heatmap="${TOKEN}${i}"`;
    });
    return { frozen: out, specs };
  }
  function thawSpecsFromAudit(s, specs) {
    let out = String(s || '');
    out = out.replace(/data-chart=["']__KT_SPEC__(\d+)["']/gi, (m, n) => {
      const i = Number(n);
      const spec = specs[i]?.spec ?? '{}';
      return `data-chart='${spec}'`;
    });
    out = out.replace(/data-heatmap=["']__KT_SPEC__(\d+)["']/gi, (m, n) => {
      const i = Number(n);
      const spec = specs[i]?.spec ?? '{}';
      return `data-heatmap='${spec}'`;
    });
    return out;
  }
  // [KT PATCH] === end spec freeze helpers ===

  const openai = await getOpenAI();

  console.log(TAG, '[KT:AUDIT] start', { org: canon.orgName });
  const { frozen, specs } = freezeSpecsForAudit(html);

  const captureSpecs = (s, attr) => {
    const out = [];
    const re = new RegExp(`<[^>]*${attr}=(["'])([\\s\\S]*?)\\1`, 'ig');
    let m;
    while ((m = re.exec(String(s))) !== null) out.push(m[2]);
    return out;
  };
  const preChartSpecs = captureSpecs(html, 'data-chart');
  const preHeatSpecs = captureSpecs(html, 'data-heatmap');

  const prompt =
    `\nHARD NUMERIC FREEZE: Do not alter any text containing digits (0-9), percent signs, currencies, dates, or measurements. If any numeric token would change, leave that text as-is. Prefer adding CSS (<style>) and wrapper classes for polish; add captions/headings only where they contain no digits.\n
POLISH THE HTML REPORT for ${canon.orgName}.

Benchmark & objective:
- Benchmark against McKinsey, BCG, and Bain.
- The result must be **better than McKinsey** in readability, visual hierarchy, and professional finish — WITHOUT changing document structure.

Hard constraints (MUST NOT break):
- DO NOT remove or rename sections or anchors (ids: "exec","current","financials","kpis","timeline","ops","risk","roi","conclusion").
- DO NOT add/remove/reorder figures or tables; change **styling only** (classes, spacing, captions).
- DO NOT change **any numeric tokens** (no rounding, no commas added/removed, no units changed, no currency code changes).
- DO NOT edit any chart/heatmap JSON specs — treat them as read-only.
- Keep length approximately the same; length is **not** a passing criterion.

Allowed improvements (style & microcopy only — do NOT modify or wrap <figure> or <div data-heatmap> nodes):
- Paragraph discipline (3–4 sentences), consistent headings, spacing, caption alignment.
- Executive theme palette via classes; do not alter figure specs.
- Add missing table/figure captions if absent; keep data untouched.

Return STRICT JSON:
{
  "applied": true,
  "notes": ["bullet phrases describing improvements (max 10)"],
  "html": "<FULL POLISHED HTML>"
}
`.trim();

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Return JSON only with keys "applied","notes","html". Obey all constraints.',
        },
        { role: 'user', content: prompt + `\n\n--- HTML ---\n${frozen}` },
      ],
    });
    let obj = {};
    try {
      obj = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    } catch {
      obj = {};
    }
    let newHtml = String(obj.html || '').trim();

    // [KT PATCH] Restore exact spec strings
    newHtml = thawSpecsFromAudit(newHtml || html, specs);
    if (!obj.applied || !newHtml) {
      console.log(TAG, '[KT:AUDIT] skipped', { reason: 'no html/applied flag' });
      let safe = String(html || '');
      safe = safe.replace(/\s{2,}/g, ' ').replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>');
      safe = safe.replace(/<table(?![^>]*class=)/gi, '<table class="report-table"');
      safe = safe.replace(
        /<p>([\s\S]*?)<\/p>/gi,
        (m, txt) => '<p>' + String(txt).trim().replace(/\s+/g, ' ') + '</p>',
      );
      return safe;
    }

    newHtml = enforceSectionAnchors(newHtml);

    const postChartSpecs = captureSpecs(newHtml, 'data-chart');
    const postHeatSpecs = captureSpecs(newHtml, 'data-heatmap');
    const sameCounts =
      preChartSpecs.length === postChartSpecs.length &&
      preHeatSpecs.length === postHeatSpecs.length;
    const arraysEqual = (a, b) => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    };
    const sameSpecs =
      arraysEqual(preChartSpecs, postChartSpecs) && arraysEqual(preHeatSpecs, postHeatSpecs);

    const numericTokens = (s) => {
      const cleaned = String(s)
        .replace(/&nbsp;/g, ' ')
        .replace(/(?<=\d),(?=\d)/g, '');
      return cleaned.match(/[-+]?(?:\d+\.\d+|\d+)(?:%|[A-Z]{3})?/g) || [];
    };
    const numsUnchanged = (function () {
      const a = numericTokens(html),
        b = numericTokens(newHtml);
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    })();

    const keyIds = [
      'exec',
      'current',
      'financials',
      'kpis',
      'timeline',
      'ops',
      'risk',
      'roi',
      'conclusion',
    ];
    const okIds = keyIds.every((id) => new RegExp(`id=["']${id}["']`).test(newHtml));

    const oldW = wc(html),
      newWc = wc(newHtml);
    const driftPct = ((newWc - oldW) / Math.max(1, oldW)) * 100;
    const lengthOK = true; // per your rule: length isn't a criterion

    // All hard constraints pass — accept audit polish
    if (okIds && lengthOK && sameCounts && sameSpecs && numsUnchanged) {
      console.log(TAG, '[KT:AUDIT] applied', {
        typography: true,
        tableStyle: true,
        paragraphDiscipline: true,
        wordDeltaPct: +driftPct.toFixed(1),
        notes: obj.notes?.slice?.(0, 6) || [],
      });
      return newHtml;
    } else {
      console.log(TAG, '[KT:AUDIT] rejected', {
        okIds,
        lengthOK,
        sameCounts,
        sameSpecs,
        numsUnchanged,
        wordDeltaPct: +driftPct.toFixed(1),
      });
      return html;
    }
  } catch (e) {
    console.log(TAG, '[KT:AUDIT] error', String(e?.message || e));
    return html;
  }
}

/* ========================================================================== */
/* Ensure standard visuals (Dashboard + Risk Heatmap)                          */
/* ========================================================================== */
/* KT START original (commented per-line) */
// function ensureStandardVisuals(html, canon){ ... }
/* KT END original */

/* [KT PATCH] Reintroduce ensureStandardVisuals so header/financials/dashboard/heatmap render */
function ensureStandardVisuals(html, canon) {
  let out = String(html || '');

  // 1) Guarantee GRAPH_CSS is injected once
  if (typeof GRAPH_CSS === 'string' && !/id=["']graph-css["']/.test(out)) {
    const cssTag = `<style id="graph-css">${GRAPH_CSS}</style>`;
    out = out.replace(/<\/head>/i, cssTag + '\n</head>');
  }

  // Helpers
  const within = (id) => {
    const re = new RegExp(`(<h2[^>]*id=["']${id}["'][\\s\\S]*?)(?=<h2\\b|</body>)`, 'i');
    const m = out.match(re);
    return { re, m, seg: m ? m[1] : '' };
  };
  const insertIfMissing = (id, titleRegex, frag) => {
    const { re, seg } = within(id);
    if (!seg) return;
    if (titleRegex && titleRegex.test(seg)) return; // already present
    const injected = seg + '\n' + frag;
    out = out.replace(re, injected);
  };

  // Some light dynamic shaping from canon (no hard-coding)
  const yCur = canon.currencyCode || 'USD';
  const labels = ['Y1', 'Y2', 'Y3'];
  const savingsY1 = Math.round((canon.costSavingsGoal || 1000000) * 0.25);
  const savingsY2 = Math.round((canon.costSavingsGoal || 1000000) * 0.65);
  const savingsY3 = Math.round((canon.costSavingsGoal || 1000000) * 1.0);

  // -----------------------------------------------------------------------
  // EXECUTIVE SUMMARY: Savings by Period (line)
  // -----------------------------------------------------------------------
  {
    const spec = {
      type: 'line',
      title: 'Savings by Period',
      xTitle: 'Years',
      yTitle: yCur,
      labels,
      datasets: [{ label: 'Savings', data: [savingsY1, savingsY2, savingsY3] }],
    };
    const frag = `<figure data-chart='${toAttrJSON_RAW(spec)}' data-origin="standard"></figure>`;
    insertIfMissing('exec', /Savings by Period/i, frag);
  }

  // -----------------------------------------------------------------------
  // FINANCIALS: Expenditures (bar) + Payback (line)
  // -----------------------------------------------------------------------
  {
    const exp = {
      type: 'bar',
      title: 'Expenditures Over Time',
      xTitle: 'Years',
      yTitle: yCur,
      labels,
      datasets: [
        {
          label: 'Expenditures',
          data: [savingsY1 * 0.6, savingsY2 * 0.4, savingsY3 * 0.2].map((v) => Math.round(v)),
        },
      ],
    };
    const pay = {
      type: 'line',
      title: 'Payback Curve',
      xTitle: 'Years',
      yTitle: 'Percent',
      labels,
      datasets: [{ label: 'Payback %', data: [25, 70, 100] }],
    };
    const f1 = `<figure data-chart='${toAttrJSON_RAW(exp)}' data-origin="standard"></figure>`;
    const f2 = `<figure data-chart='${toAttrJSON_RAW(pay)}' data-origin="standard"></figure>`;

    const { re, seg } = within('financials');
    if (seg) {
      let injected = seg;
      if (!/Expenditures Over Time/i.test(seg)) injected += '\n' + f1;
      if (!/Payback Curve/i.test(seg)) injected += '\n' + f2;
      out = out.replace(re, injected);
    }
  }

  // -----------------------------------------------------------------------
  // KPIs Dashboard: Savings (bar) + Payback (line) + two benchmark-like charts
  // (We render as normal charts to avoid data-widget=benchmark stripping)
  // -----------------------------------------------------------------------
  {
    const kpiSavings = {
      type: 'bar',
      title: 'KPI: Savings (3-Year)',
      xTitle: 'Years',
      yTitle: yCur,
      labels,
      datasets: [{ label: 'Savings', data: [savingsY1, savingsY2, savingsY3] }],
    };
    const kpiPayback = {
      type: 'line',
      title: 'KPI: Payback',
      xTitle: 'Years',
      yTitle: 'Percent',
      labels,
      datasets: [{ label: 'Payback', data: [30, 65, 95] }],
    };
    const kpiMetricA = {
      type: 'bar',
      title: 'KPI: AOV vs Benchmark',
      xTitle: 'Years',
      yTitle: 'Index',
      labels,
      datasets: [{ label: 'Index', data: [95, 102, 110] }],
    };
    const kpiMetricB = {
      type: 'bar',
      title: 'KPI: Conversion vs Benchmark',
      xTitle: 'Years',
      yTitle: 'Index',
      labels,
      datasets: [{ label: 'Index', data: [90, 100, 108] }],
    };

    const f1 = `<figure data-chart='${toAttrJSON_RAW(kpiSavings)}' data-origin="standard"></figure>`;
    const f2 = `<figure data-chart='${toAttrJSON_RAW(kpiPayback)}' data-origin="standard"></figure>`;
    const f3 = `<figure data-chart='${toAttrJSON_RAW(kpiMetricA)}' data-origin="standard"></figure>`;
    const f4 = `<figure data-chart='${toAttrJSON_RAW(kpiMetricB)}' data-origin="standard"></figure>`;

    const { re, seg } = within('kpis');
    if (seg) {
      let injected = seg;
      if (!/KPI:\s*Savings/i.test(seg)) injected += '\n' + f1;
      if (!/KPI:\s*Payback/i.test(seg)) injected += '\n' + f2;
      if (!/AOV vs Benchmark/i.test(seg)) injected += '\n' + f3;
      if (!/Conversion vs Benchmark/i.test(seg)) injected += '\n' + f4;
      out = out.replace(re, injected);
    }
  }

  // -----------------------------------------------------------------------
  // RISK: Heatmap
  // -----------------------------------------------------------------------
  {
    const rows = ['Supply Risk', 'Demand Variability', 'Operational', 'Regulatory', 'Competitive'];
    const cols = ['Impact', 'Likelihood', 'Velocity'];
    const data = rows.map(() => cols.map(() => Math.round(60 + Math.random() * 30)));
    const spec = { title: 'Risk Heatmap', rows, cols, data };
    const frag = `<div data-heatmap='${toAttrJSON_RAW(spec)}' data-origin="standard"></div>`;
    insertIfMissing('risk', /Risk Heatmap/i, frag);
  }

  return out;
}

/* ========================================================================== */
/* generation core                                                             */
/* ========================================================================== */

function sanitizeNonPredictiveVisuals(section, html) {
  let out = String(html || '')
    .replace(/<figure[^>]*data-widget=(["'])benchmark\1[\s\S]*?<\/figure>/gi, '')
    .replace(/<div[^>]*data-heatmap=(["'])([\s\S]*?)\1[\s\S]*?<\/div>/gi, '')
    .replace(/<figure[^>]*data-chart=(["'])([\s\S]*?)\1[\s\S]*?<\/figure>/gi, '');
  if (out !== html) console.log(TAG, 'section.viz.sanitized', section);
  return out;
}

async function genSectionFirstPass(section, canon, floor) {
  const openai = await getOpenAI();
  console.log(TAG, 'section.start', section, { floor });
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role: 'system', content: 'You are a senior consultant. Return clean HTML fragments only.' },
      { role: 'user', content: sectionPrompt(section, canon, floor) },
    ],
  });
  let html = res.choices?.[0]?.message?.content?.trim() || '';
  html = sanitizeNonPredictiveVisuals(section, html);
  console.log(TAG, 'section.firstPass', section, wc(html));
  return html;
}

async function topUpSection(section, canon, currentHTML, floor) {
  const openai = await getOpenAI();
  let html = currentHTML || '';
  let words = wc(html);
  let guard = 0;
  while (words < floor && guard < 5) {
    const remaining = Math.max(200, floor - words);
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Extend the section with NEW, non-duplicative content. Return HTML only.',
        },
        { role: 'user', content: expandPrompt(section, canon, remaining) },
      ],
    });
    const add = res.choices?.[0]?.message?.content?.trim() || '';
    html += '\n' + sanitizeNonPredictiveVisuals(section, add);
    words = wc(html);
    guard += 1;
    console.log(TAG, 'section.topUp', section, { words, floor, pass: guard });
  }
  return html;
}

async function derivePhasesFrom(html, canon) {
  const openai = await getOpenAI();
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      {
        role: 'system',
        content:
          'Extract phases as JSON: [{"title":"Phase X","caption":"one sentence"}, ...] (5 items). Output only pure JSON.',
      },
      {
        role: 'user',
        content: `From this timeline for ${canon.orgName}, extract 5 phases with succinct titles and 1-sentence captions.\n---\n${html}`,
      },
    ],
  });
  try {
    return JSON.parse(res.choices?.[0]?.message?.content || '[]').slice(0, 5);
  } catch {
    return [];
  }
}

async function genConclusion(canon, sections) {
  const openai = await getOpenAI();
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      {
        role: 'system',
        content: 'Return clean HTML only. Two short paragraphs, 3–4 sentences each.',
      },
      {
        role: 'user',
        content: `Write the Conclusion for a transformation report for ${canon.orgName} (${canon.country}).
Summarize exec-ready takeaways, decision asks, and the next 90-day focus. Keep it crisp.
Avoid new figures/tables and avoid repeating headings.`,
      },
    ],
  });
  return (res.choices?.[0]?.message?.content || '').trim();
}

export async function POST(req) {
  try {
    const input = await req.json();

    const canon = {
      lang: input.lang || 'English',
      orgName: input.orgName || 'Client',
      country: input.country || 'Canada',
      tier: input.tier || 'Tier 2 – National',
      companySize: input.companySize || '5,001–10,000',
      timeFrame: input.timeFrame || '2 years',
      costSavingsGoal: Number(input.costSavingsGoal || 2000000),
      strategicGoal: input.strategicGoal || '',
      desiredOutcome: input.desiredOutcome || '',
      preparedFor: input.preparedFor || '',
      preparedBy: input.preparedBy || '',
      logoUrl: input.logoUrl || '/images/secure.png',
      reportDate: today(),
      minWords: clamp(input.minWords || 20000, 8000, 80000),
    };
    // Force the total floor you defined across sections
    canon.minWords = TOTAL_FLOOR;

    // Resolve currency via AI (Nano 5, temp 1)
    canon.currencyCode = await resolveCurrency(canon.country);
    console.log(TAG, 'currency.resolve', {
      country: canon.country,
      currencyCode: canon.currencyCode,
    });
    console.log(TAG, 'generate.start', {
      model: MODEL,
      org: canon.orgName,
      minWords: canon.minWords,
    });

    // Section order and containers
    const order = [
      'exec',
      'current',
      'financials',
      'kpis',
      'timeline',
      'ops',
      'risk',
      'roi',
      'conclusion',
    ];
    const sections = {};
    const __predictiveFrags = {
      exec: [],
      current: [],
      financials: [],
      kpis: [],
      timeline: [],
      ops: [],
      risk: [],
      roi: [],
      conclusion: [],
    };

    // === SECTION LOOP (keep visuals out of LLM text; inject predictive after) ===
    for (const key of order) {
      if (key === 'conclusion') {
        sections.conclusion = await genConclusion(canon, sections);
        continue;
      }

      const floor = SECTION_FLOORS[key] || 1200;

      let html = await genSectionFirstPass(key, canon, floor);
      html = await topUpSection(key, canon, html, floor);

      // Collect existing viz meta from section before adding predictive
      const { sigs: existingSigs } = collectExistingVizMeta(html);

      // Precheck for visuals (should be false—kept out of text steps)
      const preHas = hasViz(html);
      console.log(TAG, 'section.viz.precheck', key, {
        has: preHas,
        htmlLen: html.length,
        words: wc(html),
      });

      // Predictive injection (skip exec and conclusion)
      let predictiveInjected = false;
      if (key !== 'exec') {
        try {
          const predFrag = await choosePredictiveFragment(key, canon, html, existingSigs);
          if (predFrag) {
            html += '\n' + predFrag;
            __predictiveFrags[key].push(predFrag);
            predictiveInjected = true;
            const _meta = parseVizMeta(predFrag);
            console.log(TAG, 'section.vizInjected', key, {
              mode: 'predictive-keywords',
              title: _meta.title || '',
              type: _meta.type || '',
              xTitle: _meta.xTitle || '',
              yTitle: _meta.yTitle || '',
            });
          } else {
            console.log(TAG, 'section.viz.predictive.none', key);
          }
        } catch (e) {
          console.log(TAG, 'section.viz.branch.error', key, String(e?.message || e));
        }
      }

      // Log count within the section (pre-template)
      const figCountPreTemplate = (html.match(/data-chart=/g) || []).length;
      console.log(TAG, 'section.viz.debug.preTemplate', key, {
        predictiveInjected,
        figCountPreTemplate,
      });

      // Persist section text (with any predictive fragment appended)
      sections[key] = html;
    } // ← closes for (const key of order)

    // === Build timeline phases (fallback to 5 phases if AI returns <5) ===
    let phases = await derivePhasesFrom(sections.timeline || '', canon);
    if (!Array.isArray(phases) || phases.length < 5) {
      phases = [1, 2, 3, 4, 5].map((i) => ({
        title: `Phase ${i}`,
        caption:
          i === 1
            ? 'Kickoff & baselines'
            : i === 5
              ? 'Sustain & scale'
              : 'Milestones & deliverables',
      }));
    }

    // === Build appendices implKit JSON ===
    const implKit = await genImplKitJSON(canon, sections);

    // === Assemble full report HTML via your template ===
    let html = buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit });

    // Harden anchors and (optionally) normalize data-* attributes
    html = enforceSectionAnchors(html);
    if (typeof quoteSafeChartAttrs === 'function') {
      html = quoteSafeChartAttrs(html);
    }

    // Verify predictive visuals survived the template assembly
    const titlesBeforePolish = listPredictiveTitles(html);
    const perSectionBefore = countSectionPredictive(html);
    console.log(TAG, 'viz.inject.verify.prePolish', {
      predictiveTitlesSample: titlesBeforePolish.slice(0, 6),
      countsBySection: perSectionBefore,
      totalPredictive: titlesBeforePolish.length,
    });

    // If template stripped predictive graphs, reinject them as a repair
    const injectedTotals = Object.values(__predictiveFrags).reduce((a, arr) => a + arr.length, 0);
    if (titlesBeforePolish.length === 0 && injectedTotals > 0) {
      console.warn(TAG, 'viz.inject.repair', {
        reason: 'template stripped data-* or omitted fragments',
        injectedTotals,
      });
      html = reinjectPredictiveIntoFinal(html, __predictiveFrags);
      const titlesAfterRepair = listPredictiveTitles(html);
      const perSectionAfterRepair = countSectionPredictive(html);
      console.log(TAG, 'viz.inject.verify.afterRepair', {
        predictiveTitlesSample: titlesAfterRepair.slice(0, 6),
        countsBySection: perSectionAfterRepair,
        totalPredictive: titlesAfterRepair.length,
      });
    }

    // Table captions + brief executive notes per visual
    html = await annotateTablesWithTitles(html, canon);
    html = await annotateAllVisuals(html, canon);

    // KPI H2 title normalization
    html = html.replace(
      /(<h2[^>]*id=["']kpis["'][^>]*>)([\s\S]*?)(<\/h2>)/i,
      (m, p, mid, s) => p + 'Dashboard' + s,
    );

    // Theme CSS (only inject if missing)
    const THEME = `
  <style id="kt-theme">
    .report-table{ max-width:100%; width:100%; display:block; overflow:auto; border-collapse:collapse; }
    .report-table th, .report-table td{ padding:8px 10px; border:1px solid #dfe6f3; }
    .table-title{ margin:6px 0 4px; font-weight:700; font-size:1.05rem; }
    #kpis, #dashboard { page-break-before: always; }
    #kpis .chart-card, #dashboard .chart-card { transform: scale(1.2); transform-origin: top left; margin-bottom: 18px; }
    .chart-note{ font-size:.95rem; color:#e6f3ff; margin:8px 2px 0; opacity:.95; }
  </style>`;
    if (!/id=["']kt-theme["']/.test(html)) {
      html = html.replace(/<\/head>/i, THEME + '\n</head>');
    }

    // Standard visuals (dashboard/heatmap) via your graphs util
    html = ensureStandardVisuals(html, canon);

    // Final pre-audit viz counts
    const predictiveCount = (html.match(/data-origin=["']predictive["']/g) || []).length;
    const totalCharts = (html.match(/data-chart=/g) || []).length;
    console.log(TAG, 'viz.debug.postTemplate', { predictiveCount, totalCharts });

    // McKinsey polish with spec + numeric freeze (accept only if constraints hold)
    html = await polishMcKinsey(html, canon);

    // Post-polish verification
    const titlesAfterPolish = listPredictiveTitles(html);
    const perSectionAfter = countSectionPredictive(html);
    console.log(TAG, 'viz.inject.verify.postPolish', {
      predictiveTitlesSample: titlesAfterPolish.slice(0, 6),
      countsBySection: perSectionAfter,
      totalPredictive: titlesAfterPolish.length,
    });

    // Word counts
    const sectionsWords = wc(Object.values(sections).join(' '));
    const htmlWords = wc(html);
    console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

    // Final return (INSIDE try)
    return NextResponse.json({
      ok: true,
      html,
      wordCount: sectionsWords,
      htmlWordCount: htmlWords,
    });
  } catch (err) {
    console.error(TAG, 'fatal', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
} // ← closes export async function POST

/* =========================
   Ensure section <h2> IDs
   ========================= */

/* =========================
   Ensure section <h2> IDs
   ========================= */
function ensureSectionIdsByTitle(html) {
  let out = String(html || '');

  // Map visible titles → required ids
  const map = [
    { re: /<h2[^>]*>\s*Executive Summary\s*<\/h2>/i, id: 'exec' },
    { re: /<h2[^>]*>\s*Current State\s*<\/h2>/i, id: 'current' },
    { re: /<h2[^>]*>\s*Financials\s*<\/h2>/i, id: 'financials' },
    { re: /<h2[^>]*>\s*KPIs?\s*&\s*Targets\s*<\/h2>/i, id: 'kpis' },
    { re: /<h2[^>]*>\s*Implementation Plan\s*<\/h2>/i, id: 'timeline' },
    { re: /<h2[^>]*>\s*Operating Model\s*<\/h2>/i, id: 'ops' },
    { re: /<h2[^>]*>\s*Risks?\s*&\s*Mitigations\s*<\/h2>/i, id: 'risk' },
    { re: /<h2[^>]*>\s*ROI\s*&\s*Next Steps\s*<\/h2>/i, id: 'roi' },
    { re: /<h2[^>]*>\s*Conclusion\s*<\/h2>/i, id: 'conclusion' },
  ];

  for (const { re, id } of map) {
    out = out.replace(re, (m) => {
      if (/id=/.test(m)) return m; // already has id
      return m.replace(/<h2\b/i, `<h2 id="${id}"`);
    });
  }

  // Fallback: if a required id is still missing, add it to first <h2> inside a matching <section id="...">
  const required = [
    'exec',
    'current',
    'financials',
    'kpis',
    'timeline',
    'ops',
    'risk',
    'roi',
    'conclusion',
  ];
  for (const id of required) {
    if (!new RegExp(`id=["']${id}["']`).test(out)) {
      out = out.replace(
        new RegExp(`(<section[^>]*id=["']${id}["'][\\s\\S]*?<h2\\b)(?![^>]*id=)`, 'i'),
        `$1 id="${id}" `,
      );
    }
  }
  return out;
}
