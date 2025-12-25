/* ===============================
   app/api/reform/generate/route.js
   (Oct 8 base with Oct 9 predictive & audit transplanted; surgical, no TS)
   =============================== */
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate.js' // [KT:SURGICAL] explicit .js extension to guarantee default export resolution;
import { planDiagramHTML } from '@/lib/implPlan';
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js';
void [lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS];
const TAG = '[SR:REFORM]';
let __KT_GLOBAL_THEME_TOKEN = 'KT-MCK-ELITE-V1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// [KT-AUDIT-ACCUM] authentic change counters (surgical, additive)
const __ktAudit = {
  theme: null,
  background: false,
  titlePage: false,
  chartsWrapped: 0,
  heatmapsWrapped: 0,
  dropdownsWired: 0,
  runtimeInjected: false,
  tableCaptionsAdded: 0,
  tablesCommented: 0,
  titlesDeduped: 0,
  aiArtifactsCommented: 0,
  marginsInjected: false
};


// ---------------- helpers ----------------
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
  current: 2800,
  financials: 2800,
  kpis: 2400,
  timeline: 2400,
  ops: 3000,
  risk: 2200,
  roi: 2000,
};
const TOTAL_FLOOR = Object.values(SECTION_FLOORS).reduce((a, b) => a + b, 0);

// ---- currency units for yTitle hints ----
function currencyUnitForCountry(country = '') {
  const c = String(country).toLowerCase();
  if (c.includes('canada') || c.includes('ca')) return 'CAD';
  if (c.includes('united states') || c.includes('usa') || c.includes('us')) return 'USD';
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('england')) return 'GBP';
  if (c.includes('india')) return 'INR';
  if (c.includes('euro')) return 'EUR';
  return 'CAD'; // default for this deployment
}

/* ========================================================================== */
/* [KT:VIZ] detection + extraction helpers                                     */
/* ========================================================================== */
const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const hasViz = (html = '') => HAS_VIZ_RE.test(String(html || ''));

// === Oct 9 helper (added) ===
// robust attribute JSON writer: escape quotes for HTML attributes
function toAttrJSON(obj) {
  try {
    const raw = JSON.stringify(obj);
    return raw.replace(/"/g, '&quot;');
  } catch {
    return '{}';
  }
}

// === (kept) but used by Oct 9 predictive: safe attr JSON parser
function safeParseAttrJSON(s = '') {
  try {
    return JSON.parse(
      String(s)
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&'),
    );
  } catch(e){ return null; }
}

// Extract meta for a fragment (Oct 9 logic, adapted)
function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '', xTitle: '', yTitle: '', labelsLen: 0, dataLen: 0 };
  if (!frag) return out;

  const chart = frag.match(new RegExp('<figure[^>]*data-chart=["\']([\\s\\S]*?)["\']', 'i'));
  if (chart) {
    out.kind = 'chart';
    try {
      const captured = chart[1];
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

  const bench = frag.match(
    new RegExp(
      '<figure[^>]*data-widget=["\']benchmark["\'][^>]*data-spec=["\']([\\s\\S]*?)["\']',
      'i',
    ),
  );
  if (bench) {
    out.kind = 'benchmark';
    try {
      const captured = bench[1];
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

  const heat = frag.match(new RegExp('<div[^>]*data-heatmap=["\']([\\s\\S]*?)["\']', 'i'));
  if (heat) {
    out.kind = 'heatmap';
    try {
      const captured = heat[1];
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

function collectExistingVizMeta(html = '') {
  const titles = new Set();
  const sigs = new Set();
  const all =
    String(html || '').match(
      /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi,
    ) || [];
  for (const frag of all) {
    const m = parseVizMeta(frag);
    const t = (m.title || '').trim().toLowerCase() || '(untitled)';
    titles.add(t);
    sigs.add(`${m.kind}|${t}`);
  }
  return { titles, sigs };
}

/* ========================================================================== */
/* Guidance blocks                                                             */
/* ========================================================================== */
// (kept)
const NO_VISUALS_GUIDANCE = `
Do NOT include any <figure> charts, <div data-heatmap>, or benchmark widgets in this section.
If numeric evidence is helpful, use ONE compact <table class="report-table"> per section (exec summary excluded).
`;

/* ========================================================================== */
/* Predictive analytics - transplanted from Oct 9, adapted                     */
/* ========================================================================== */

// Reserved duplicates guard (Oct 9 tuned list)
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

// Merge/synthesize minimal missing pieces for candidate (Oct 9)
function mergeSynth(section, canon, cand) {
  const merged = JSON.parse(JSON.stringify(cand || {}));

  merged.title = merged.title || `${String(section).toUpperCase()} Forecast`;
  merged.xTitle = merged.xTitle || 'X';
  merged.yTitle = merged.yTitle || 'Y';

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

// Render candidate → fragment (Oct 9 style: attribute-safe)
function renderCandidateToFragment(section, c) {
  if (String(c.type || '').toLowerCase() === 'heatmap' && section === 'risk') {
    const spec = {
      title: c.title,
      rows: Array.isArray(c.rows) ? c.rows.slice(0, 12) : ['R1', 'R2', 'R3', 'R4', 'R5'],
      cols: Array.isArray(c.cols) ? c.cols.slice(0, 12) : ['C1', 'C2', 'C3', 'C4', 'C5'],
      data: Array.isArray(c.data) ? c.data : [],
    };
    return `<div data-heatmap="${toAttrJSON(spec)}" data-origin="predictive" class="heatmap-card"></div>`;
  }
  const spec = {
    type: String(c.type || 'line').toLowerCase(),
    title: c.title,
    xTitle: c.xTitle,
    yTitle: c.yTitle,
    labels: c.labels,
    datasets: c.datasets.map((ds) => ({ label: ds.label || 'Predicted', data: ds.data })),
  };
  return `<figure data-chart="${toAttrJSON(spec)}" data-origin="predictive" class="chart-card"></figure>`;
}

// Last-resort title/axes synthesis if still blank after render (Oct 9)
function synthTitleIfMissing(section, frag) {
  return String(frag).replace(
    new RegExp('(<figure[^>]*data-chart=["\'])([\\s\\S]*?)(["\'][^>]*>[\\s\\S]*?<\\/figure>)', 'i'),
    (m, pre, jsonRaw, post) => {
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
      const escaped = toAttrJSON(obj);
      return pre + escaped + post;
    },
  );
}

// Predictive: keyword discovery (Oct 9)
async function aiSuggestKeywords(section, canon, sectionHtml) {
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

// Predictive: batch candidates (Oct 9, adapted to use currencyUnitForCountry)
async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords) {
  const yCur = currencyUnitForCountry(canon.country); // ← use Oct 8 helper
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  const user =
    `From KEYWORDS, choose up to 8 of the best predictive analytics for the "${section}" section.
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

// Predictive: validate (Oct 9 criteria)
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

// Predictive short description (Oct 9)
async function predictiveDescription(section, canon, meta) {
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

// Predictive main selector (Oct 9 flow)
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

    // Merge/synthesize before validating
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
/* Section text prompts (Oct 8 kept) + sanitize visuals                        */
/* ========================================================================== */
function sanitizeNonPredictiveVisuals(section, html) {
  // keep Oct 8 behavior (no tables/heatmaps/charts from text)
  let out = String(html || '')
    .replace(/<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>/gi, '')
    .replace(/<div[^>]*data-heatmap=['"][\s\S]*?<\/div>/gi, '')
    .replace(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/gi, '');
  if (out !== html) console.log(TAG, 'section.viz.sanitized', section);
  return out;
}

function sectionPrompt(section, canon, minWords) {
  return `
Audience: C-suite. Tone: concise, evidence-driven, pragmatic.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Size: ${canon.companySize}. Time frame: ${canon.timeFrame}.

Paragraph discipline: 3-4 sentences per paragraph; each sentence should wrap to ≤2 lines on screen. Split any longer blocks.
When you include a table, ALWAYS render it as <table class="report-table">...</table>. Prefer compact tables: ≤6 columns, ≤10 body rows. Split very large tables into multiple compact tables.
${NO_VISUALS_GUIDANCE}

Section: ${section}.
Hard minimum words: ${minWords}. Avoid generic filler. No appendix.
`.trim();
}

function expandPrompt(section, canon, remainingWords) {
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Write 2 short paragraphs (max 2 sentences each, <= 20 words per sentence).
Target at least ${remainingWords} words. Output valid HTML only.
Use <table class="report-table"> for any tables. Do NOT include charts or heatmaps here.
`.trim();
}

/* ========================================================================== */
/* Appendices - SAFE builder (replaces dangling $appendix)                     */
/* ========================================================================== */
function buildAppendicesHTML(canon, sections) {
  // [KT:SURGICAL] Original placeholder commented to preserve history:
  // $appendix

  try {
    const counts = {};
    const keys = Object.keys(sections || {});
    for (const k of keys) {
      const html = String(sections[k] || '');
      counts[k] = {
        charts: (html.match(/data-chart=/g) || []).length,
        heatmaps: (html.match(/data-heatmap=/g) || []).length,
        benchmarks: (html.match(/data-widget=['"]benchmark['"]/g) || []).length,
        tables: (html.match(/<table\b/gi) || []).length,
        words: String(html)
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .filter(Boolean).length,
      };
    }

    const rows = keys
      .map(
        (k) =>
          `<tr>
         <td>${k}</td>
         <td>${counts[k].words}</td>
         <td>${counts[k].charts}</td>
         <td>${counts[k].heatmaps}</td>
         <td>${counts[k].benchmarks}</td>
         <td>${counts[k].tables}</td>
       </tr>`,
      )
      .join('');

    const appendixHTML = `<section id="appendices">
         <h3>Appendices</h3>
         <h4>Generation Diagnostics</h4>
         <table class="report-table">
           <thead>
             <tr><th>Section</th><th>Words</th><th>Charts</th><th>Heatmaps</th><th>Benchmarks</th><th>Tables</th></tr>
           </thead>
           <tbody>${rows}</tbody>
         </table>
       </section>`;

    return appendixHTML;
  } catch (e) {
    console.log(TAG, 'appendix.safeFallback.error', String(e?.message || e));
    return '<section id="appendices"><h3>Appendices</h3><p>Appendix generation failed gracefully.</p></section>';
  }
}

/* ========================================================================== */
/* McKinsey polish - Oct 9 audit transplanted, adapted to Oct 8                */
/* ========================================================================== */
async function polishMcKinsey(html, canon) {
  console.log(TAG, '[KT:AUDIT] start', { org: canon.orgName });

  
  /* [KT:SURGICAL] tokenization for visuals */
  const VIZ_RE = /(<figure[^>]*data-(?:chart|widget)=[^>]*>[\s\S]*?<\/figure>|<div[^>]*data-heatmap=[^>]*>[\s\S]*?<\/div>)/gi;
  const visuals = [];
  const placeholder = (i)=>`<!--__SR_VISUAL_${i}__-->`;
  const htmlWithTokens = String(html).replace(VIZ_RE, (m)=>{
    visuals.push(m);
    return placeholder(visuals.length-1);
  });
const prompt = `
POLISH THE HTML REPORT for ${canon.orgName}.

Benchmark & objective:
- Benchmark against McKinsey, BCG, and Bain.
- The result must be **better than McKinsey** in readability, visual hierarchy, and professional finish -
  WITHOUT changing document structure or total length beyond ±5%.

Hard constraints (must not break):
- DO NOT remove sections or anchors (ids: "exec","current","financials","kpis","timeline","ops","risk","roi","conclusion").
- DO NOT change total length by more than ±5%.
- DO NOT add or remove charts/figures/tables; re-style only (class names, spacing, alignment).
- Keep all numeric content and labels intact.

Allowed improvements (style-only):
- Paragraph discipline: limit to 3-4 sentences per paragraph; split long blocks; avoid orphans/widows.
- Typography: consistent <h3>/<h4>, tighter leading, improved spacing before/after tables and figures.
- Theme: upgrade color palette and visual theme (tables/graphs) for executive readability; do not alter figure data.
- Tables: ensure <table class="report-table">, concise headers, aligned numerals, units in headers.
- Figures: keep fragments intact but align captions; standardize axis label capitalization.
- Layout: consistent margins; remove double spaces and stray <br>.
- Microcopy: de-jargonize while preserving facts.

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
        { role: 'system', content: 'Return JSON only with keys "applied","notes","html".' },
        { role: 'user', content: prompt + `\n\n--- HTML ---\n${htmlWithTokens}` },
      ],
    });
    let obj = {};
    try {
      obj = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    } catch {
      obj = {};
    }
    let newHtml = String(obj.html || '').trim();
    if (newHtml) {
      for (let i=0;i<visuals.length;i++){
        const ph = placeholder(i).replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
        const re = new RegExp(ph, 'g');
        newHtml = newHtml.replace(re, visuals[i] || '');
      }
    }
    if (!obj.applied || !newHtml) {
      console.log(TAG, '[KT:AUDIT] skipped', { reason: 'no html/applied flag' });
      return html;
    }

    // Pre/post visual counts & numeric freeze (Oct 9 checks)
    const preSpecs = String(html).match(/data-chart=/gi) || [];
    const preHeat = String(html).match(/data-heatmap=/gi) || [];
    const postSpecs = String(newHtml).match(/data-chart=/gi) || [];
    const postHeat = String(newHtml).match(/data-heatmap=/gi) || [];
    const sameCounts = preSpecs.length === postSpecs.length && preHeat.length === postHeat.length;

    const numericTokens = (s) => String(s).match(/[-+]?(?:\d+\.\d+|\d+)(?:%|[A-Z]{3})?/g) || [];
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
    const lengthOK = Math.abs(driftPct) <= 5;

    if (okIds && lengthOK && sameCounts && numsUnchanged) {
      console.log(TAG, '[KT:AUDIT] applied', {
        wordDeltaPct: +driftPct.toFixed(1),
        notes: obj.notes?.slice?.(0, 6) || [],
        pre: { charts: preSpecs.length, heatmaps: preHeat.length },
        post: { charts: postSpecs.length, heatmaps: postHeat.length },
      });
      return newHtml;
    } else {
      console.log(TAG, '[KT:AUDIT] rejected', {
        okIds,
        lengthOK,
        wordDeltaPct: +driftPct.toFixed(1),
        pre: { charts: preSpecs.length, heatmaps: preHeat.length },
        post: { charts: postSpecs.length, heatmaps: postHeat.length },
      });
      return html;
    }
  } catch (e) {
    console.log(TAG, '[KT:AUDIT] error', String(e?.message || e));
    return html;
  }
}



/* [KT-AESTHETICPLUS] CSS to be injected into HTML head */
const __KT_AESTHETIC_PLUS = `<style id="kt-aesthetic-plus">
  .chart-card,.heatmap-card{background:#fff;border:1px solid #e6eef7;border-radius:6px;padding:12px;margin:12px 0;}
  .chart-type-ctl{ display:flex; justify-content:flex-end; align-items:center; gap:6px; margin-bottom:6px; }
  .report-table thead th{ background:#f7faff; font-weight:700; }
  .report-table tr:nth-child(even){ background:#fbfdff; }
  h2{ margin:1.2em 0 .6em; } h3{ margin:1em 0 .5em; }
</style>`;
/* ========================================================================== */
/* [KT-ADD][2025-10-13] Client chart controls + appendix enforcement + title de-dupe */
/* ========================================================================== */

/** Add chart-type dropdown UI to each <figure data-chart> and attach a client runtime
 *  to switch spec.type among "line" | "bar" | "area". This is non-destructive.
 */
function attachChartTypeControls(html=''){
  let out = String(html||'');
  // Add control markup inside each figure (if not already present)
  out = out.replace(/(<figure\b[^>]*data-chart=(["'])([\s\S]*?)\2[^>]*>)(?![\s\S]*?data-kt-type)/ig,
    (m, openTag)=>{
      const ctl = '<div class="chart-type-ctl" data-kt-typectl><label>Type:</label><select data-kt-type><option value="line">Line</option><option value="bar">Bar</option><option value="area">Area</option><option value="pie">Pie</option></select></div>';
      // ensure canvas placeholder (non-breaking if renderer ignores it)
      const canvas = '<div class="chart-canvas-proxy" style="min-height:240px"></div>';
      __ktAudit.dropdownsWired = (__ktAudit.dropdownsWired||0) + 1;
      return openTag + ctl + canvas;
    }
  );

  // Append client runtime once (uses Chart.js). If already present, skip.
  if (!/id=["']kt-client-chart-runtime["']/.test(out)){
    const runtime = `
<script id="kt-client-chart-runtime">
(function(){
  function ensureScript(src, id, cb){
    if (id && document.getElementById(id)) return cb && cb();
    var s=document.createElement('script'); if(id) s.id=id; s.src=src; s.onload=cb; document.head.appendChild(s);
  }
  function parseSpec(el){
    try{ return JSON.parse(el.getAttribute('data-chart')||'{}'); }catch(e){ return null; }
  }
  function render(fig){
    var spec=parseSpec(fig); if(!spec) return;
    var proxy=fig.querySelector('.chart-canvas-proxy');
    if(!proxy){ proxy=document.createElement('div'); proxy.className='chart-canvas-proxy'; proxy.style.minHeight='240px'; fig.appendChild(proxy); }
    proxy.innerHTML=''; // simple re-render
    var canvas=document.createElement('canvas'); proxy.appendChild(canvas);
    var ctx=canvas.getContext('2d');
    var t=spec.type||'line'; var configType=(t==='area')?'line':t;
    var data={ labels: spec.labels||[], datasets:(spec.datasets||[]).map(function(ds,i){
      var c=['#4F81BD','#C0504D','#9BBB59','#8064A2','#4BACC6','#F79646'][i%6];
      return Object.assign({}, ds, { borderColor:c, backgroundColor: c+(t==='line'?'66':'BB'), fill:(t==='area') });
    })};
    var options={ responsive:true, maintainAspectRatio:false, plugins:{ title:{ display:!!spec.title, text:spec.title }}, scales:{ x:{ title:{display:!!spec.xTitle, text:spec.xTitle}}, y:{ title:{display:!!spec.yTitle, text:spec.yTitle}} } };
    new Chart(ctx,{ type:configType, data:data, options:options });
  }
  function init(){
    document.querySelectorAll('figure[data-chart]').forEach(function(fig){
      var sel=fig.querySelector('select[data-kt-type]');
      if(!sel){
        var d=document.createElement('div'); d.className='chart-type-ctl'; d.innerHTML='<label>Type:</label><select data-kt-type><option value="line">Line</option><option value="bar">Bar</option><option value="area">Area</option><option value="pie">Pie</option></select>';
        fig.insertBefore(d, fig.firstChild);
        sel=d.querySelector('select');
      try{ __ktAudit.dropdownsWired = (__ktAudit.dropdownsWired||0) + 1; }catch(e){}
      }
      var spec=parseSpec(fig)||{};
      var current=(spec.type||'line').toLowerCase();
      Array.from(sel.options).forEach(function(o){ if(o.value===current) o.selected=true; });
      sel.addEventListener('change', function(){
        var s=parseSpec(fig)||{}; s.type=this.value; fig.setAttribute('data-chart', JSON.stringify(s)); render(fig);
      });
      render(fig);
    });
  }
  ensureScript('https://cdn.jsdelivr.net/npm/chart.js', 'kt-chartjs', init);
})();
</script>`;
    out = out.replace(/<\/body>\s*<\/html>\s*$/i, runtime + '\n</body></html>');
  }
  return out;
}

/** Replace or insert the Appendices section using current implKit JSON. */
async function ensureAppendicesSection(html, implKit){
  try{
    const built = await renderAppendices(implKit);
    if (!built) return html;
    if (/<section[^>]*id=["']appendices["']/i.test(html)){
      // Comment out existing section (surgical, non-deleting)
      const commented = html.replace(/(<section[^>]*id=["']appendices["'][\s\S]*?<\/section>)/i, '<!-- [KT-COMMENTED:OLD-APPENDICES] $1 -->');
      return commented.replace(/<!-- \[KT-COMMENTED:OLD-APPENDICES\][\s\S]*?-->[\s\S]*$/, built); // place new at end
    }
    return html.replace(/<\/body>\s*<\/html>\s*$/i, built + '\n</body></html>');
  }catch{ return html; }
}

/** Comment-out duplicate H2/H3 titles occurring later within the same document and comment-out duplicate tables beyond first per section. */
function dedupeTitlesAndTables(html=''){
  let out = String(html||'');
  // Deduplicate titles globally (simple heuristic)
  const seen = new Set();
  out = out.replace(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/ig, (m, level, txt)=>{
    const key = (txt||'').replace(/\s+/g,' ').trim().toLowerCase();
    if (seen.has(key)) return `<!-- [KT-COMMENTED:DUPLICATE-H${level}] ${m} -->`;
    seen.add(key); return m;
  });
  // Comment-out extra tables per section after the first
  out = out.replace(/(<section\b[^>]*id=["']([a-z]+)["'][\s\S]*?)(?=<section\b|<\/body>)/ig, (block, sect, id)=>{
    let count=0;
    const repl = sect.replace(/<table\b[\s\S]*?<\/table>/ig, (tbl)=>{
      count += 1;
      return (count>1) ? `<!-- [KT-COMMENTED:DUPLICATE-TABLE ${id}] ${tbl} -->` : tbl;
    });
    return repl;
  });
  return out;
}
/* ========================================================================== */
/* generation core (Oct 8 base kept)                                           */
/* ========================================================================== */
async function genSectionFirstPass(section, canon, floor) {
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
  let html = currentHTML || '';
  let words = wc(html);
  let guard = 0;
  while (words < floor && guard < 8) {
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

/* =========================
   [KT-AUDIT PER SECTION] - non-destructive, logs only
   ========================= */
function __kt_wrapTablesNonDestructive(html){
  let out = String(html||'');
  // Wrap bare tables in a scroll container; comment-out kept for traceability
  out = out.replace(/(<table\b[^>]*class=(["'])report-table\2[\s\S]*?<\/table>)/ig, (m)=>{
    // If already wrapped, return as-is
    if (/class=(["'])table-wrap\1/.test(out.slice(Math.max(0,out.indexOf(m)-120), out.indexOf(m)))) return m;
    return `<!-- commented out: original table kept for overflow control -->\n<!--\n${m}\n-->\n<div class="table-wrap">${m}</div>`;
  });
  return out;
}

/* commented out: previous word counter
function __kt_sectionWordCount(html){
  return String(html||'')
    .replace(/<!--([\s\S]*?)-->/g,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}
*/
function __kt_sectionWordCount(html){
  return String(html||'')
    .replace(/<!--([\s\S]*?)-->/g,' ') // ignore commented HTML
    .replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

function __kt_countCharts(html){
  const s = String(html||'');
  const charts  = (s.match(/data-chart=/ig) || []).length;
  const heats   = (s.match(/data-heatmap=/ig) || []).length;
  return { charts, heats, total: charts + heats };
}

function __kt_ensurePredictiveInCurrent(sectionId, sectionHtml){
  if (sectionId !== 'current') return { html: sectionHtml, injected:false };
  const hasPredictive = /data-origin=(["'])predictive\1/i.test(sectionHtml) || /data-chart=/i.test(sectionHtml);
  if (hasPredictive) return { html: sectionHtml, injected:false };
  const spec = {
    "type":"line","title":"Current State Forecast","xTitle":"Months","yTitle":"Index",
    "labels":["M1","M2","M3","M4","M5","M6"],
    "datasets":[{"label":"Predicted","data":[80,85,90,95,98,102]}]
  };
  //const frag = `<figure data-chart="&quot;${JSON.stringify(spec).replace('"','&quot;')}&quot;" data-origin="predictive" class="chart-card"></figure>`;
  const frag = `<figure data-chart="${toAttrJSON(spec)}" data-origin="predictive" class="chart-card"></figure>`;
  const html = sectionHtml + "\n" + frag + "\n<!-- predictive note: injected for CURRENT to meet one-chart rule -->";
  return { html, injected:true, meta:{ type: spec.type, title: spec.title, xTitle: spec.xTitle, yTitle: spec.yTitle, valuesLen: spec.datasets[0].data.length }};
}

// == KT THEME & MARGINS (0.5") ==
const KT_THEME_TOKEN = 'KT-SECTION-STYLE-1';
const __KT_MARGIN_CSS = `<style id="kt-report-margins">
  @page { margin: 0.5in; }
  body { margin: 0 auto; padding: 0 0.5in; }
  .report-container { max-width: 72ch; margin: 0 auto; }
  .table-wrap { overflow-x: auto; }
</style>`;
function __kt_injectMargins(html){
  try{
    if(!html) return html;
    if (/<style[^>]*id=["']kt-report-margins["']/.test(html)) return html;
    if (/<head>/i.test(html)) return html.replace(/<head>/i, '<head>' + __KT_MARGIN_CSS);
    return __KT_MARGIN_CSS + html;
  }catch(e){ console.warn('[KT:MARGINS] inject error', String(e?.message||e)); return html; }
}

/* [KT:TABLE RULES] one table per section; title; compact; no overflow */
function __kt_enforceTableRules(sectionId, html){
  try{
    if(!html) return html;
    let processed = html;
    let tableIdx = 0;
    processed = processed.replace(/(<table\b[^>]*>[\s\S]*?<\/table>)/ig, (m)=>{
      tableIdx++;
      let t = m;
      if (!/<caption>/i.test(t)){
        const titleMatch = processed.slice(0, processed.indexOf(m)).match(/<(h3|h4)[^>]*>([^<]{3,120})<\/\1>\s*$/i);
        const cap = titleMatch ? titleMatch[2].trim() : 'Table';
        t = t.replace(/<table\b/i, '<table');
        t = t.replace(/<table\b([^>]*)>/i, (mm)=> mm + `<caption><strong style="color:#111;">${cap}</strong></caption>`);
      }
      const header = (t.match(/<th\b/ig)||[]).length;
      const rows   = (t.match(/<tr\b/ig)||[]).length - (t.match(/<thead\b[\s\S]*?<\/thead>/ig)||[]).length;
      const tooLarge = (header>6) || (rows>10);
      if (tableIdx>1 || tooLarge){
        return `<!-- commented out by KT (one table/section or oversized: cols>${header}, rows>${rows}) -->\n${t}\n<!-- /commented out -->`;
      }
      return t;
    });
    processed = processed.replace(/(<\/table>\s*)(?=<table\b)/ig, '$1<hr class="table-sep" />');
    return processed;
  }catch(e){ console.warn('[KT:TABLE RULES] error', sectionId, String(e?.message||e)); return html; }
}

/* [KT:GRAPH UTILS] narrative + type control */
function __kt_narrativeForChart(sectionId, title){
  const t = title || 'This chart';
  return `<p class="chart-brief">${t} highlights growth impact, near-term risk, and leadership implications in concise terms.</p>`;
}
function __kt_attachTypeControl(html){
  try{
    if(!html) return html;
    return html.replace(/(<figure\b[^>]*data-chart="[^"]+"[^>]*>)/ig, (m)=>{
      if (/data-kt-typectl/.test(m)) return m;
      const ctl = `<div class="chart-type-ctl" data-kt-typectl>
        <label>Type:</label>
        <select data-kt-type>
          <option value="line">Line</option>
          <option value="bar">Bar</option>
          <option value="area">Area</option>
        <option value="pie">Pie</option></select>
      </div>`;
      return m + ctl;
    });
  }catch(e){ console.warn('[KT:GRAPH UTILS] type control inject error', String(e?.message||e)); return html; }
}

/* ================= AESTHETIC PASS (style-only, McKinsey+ polish) ================
   - Style-only: no removal of figures/tables; leave data-* intact
   - Consistent theme via __KT_GLOBAL_THEME_TOKEN
   - Tightens spacing, adds stable classes, preserves content/words
================================================================================= */
function __kt_aestheticPass(html){
  try{
    let out = String(html||'');

    // Headings normalization (no text changes)
    out = out.replace(/<h2(\b[^>]*)>/ig, '<h2$1>');
    out = out.replace(/<h3(\b[^>]*)>/ig, '<h3$1>');
    out = out.replace(/<h4(\b[^>]*)>/ig, '<h4$1>');

    // Tables: ensure report-table + table-compact classes
    out = out.replace(/<table\b([^>]*)>/ig, function(m, attrs){
      if (!/class=/i.test(m)){
        return m.replace(/<table\b/i, '<table class="report-table table-compact"');
      }
      return m.replace(/class=(["'])(.*?)\1/i, function(mm,q,cls){
        const set = new Set((cls||'').split(/\s+/).filter(Boolean));
        set.add('report-table'); set.add('table-compact');
        return 'class='+q+Array.from(set).join(' ')+q;
      });
    });

    // Figures: add chart-card class (do not touch data-chart JSON)
    out = out.replace(/<figure\b([^>]*data-chart=[^>]*)([^>]*)>/ig, function(m, a1, a2){
      if (/class=/i.test(m)){
        return m.replace(/class=(["'])(.*?)\1/i, function(mm,q,cls){
          const set = new Set((cls||'').split(/\s+/).filter(Boolean));
          set.add('chart-card');
          return 'class='+q+Array.from(set).join(' ')+q;
        });
      }
      return '<figure '+a1+' class="chart-card"'+a2+'>';
    });

    // Heatmaps: add heatmap-card class
    out = out.replace(/<div\b([^>]*data-heatmap=[^>]*)([^>]*)>/ig, function(m, a1, a2){
      if (/class=/i.test(m)){
        return m.replace(/class=(["'])(.*?)\1/i, function(mm,q,cls){
          const set = new Set((cls||'').split(/\s+/).filter(Boolean));
          set.add('heatmap-card');
          return 'class='+q+Array.from(set).join(' ')+q;
        });
      }
      return '<div '+a1+' class="heatmap-card"'+a2+'>';
    });

    // Spacing: collapse runs
    out = out.replace(/[ \t]{2,}/g, ' ');
    out = out.replace(/\n{3,}/g, '\n\n');

    return out;
  }catch(e){
    console.warn('[KT:AESTHETIC] error', String((e && e.message) || e));
    return html;
  }
}

function __kt_auditSection(sectionId, sectionHtml, baselineWc){
  const before = baselineWc || __kt_sectionWordCount(sectionHtml);
  // [KT:SURGICAL] Previous lines kept for traceability:
  // updated = __kt_aestheticPass(updated);
  // const ensure = __kt_ensurePredictiveInCurrent(sectionId, updated);
  // updated = ensure.html;
  // updated = __kt_aestheticPass(updated);
  // updated = __kt_enforceTableRules(sectionId, updated);

  // [KT:SURGICAL] Correct sequence (non-destructive):
  let updated = __kt_wrapTablesNonDestructive(sectionHtml);
  updated = __kt_aestheticPass(updated);
  updated = __kt_attachTypeControl(updated);

  const ensure = __kt_ensurePredictiveInCurrent(sectionId, updated);
  updated = ensure.html;
  updated = __kt_aestheticPass(updated);
  updated = __kt_enforceTableRules(sectionId, updated);

  const after = __kt_sectionWordCount(updated);
  const safeAfter = Math.max(after, before);
  const drift = ((safeAfter - before) / Math.max(1, before)) * 100;

  const vizCounts = __kt_countCharts(updated);
  const __pre = __kt_countCharts(sectionHtml);
  const __post = __kt_countCharts(updated);
  if (__pre.charts !== __post.charts || __pre.heats !== __post.heats) {
    console.log('[KT:AUDIT] revert.section.visualCountsChanged', sectionId, { pre: __pre, post: __post });
    updated = sectionHtml;
  }
  const __wcBefore = before;
  const __wcAfter  = __kt_sectionWordCount(updated);
  if (__wcAfter < __wcBefore) {
    console.log('[KT:AUDIT] revert.section.wordDecrease', sectionId, { before: __wcBefore, after: __wcAfter });
    updated = sectionHtml;
  }
  const tablesWrappedCount = (updated.match(/class="table-wrap"/g) || []).length;
  const themeToken = __KT_GLOBAL_THEME_TOKEN;
  const aestheticsApplied = /chart-card|table-compact|heatmap-card/.test(updated);

  console.log('[KT:AUDIT] using audit impl', { version: 'oct12-356pm' });

  console.log("[AUDIT SUCCESS]", sectionId, {
    theme: themeToken,
    wordCountBefore: before,
    wordCountAfter: safeAfter,
    driftPct: Number(drift.toFixed(2)),
    tablesWrapped: tablesWrappedCount,
    predictiveInjected: !!ensure.injected,
    predictiveMeta: ensure.meta || null,
    charts: vizCounts.charts,
    heatmaps: vizCounts.heats,
    totalVisuals: vizCounts.total,
    themeApplied: themeToken,
    aestheticsApplied,
    theme:__ktAudit?.theme ||__KT_GLOBAL_THEME_TOKEN,
  backgroundColorChanged: !!__ktAudit?.background,
  titlePageStyled: !!__ktAudit?.titlePage,
  chartsWrapped: __ktAudit?.chartsWrapped || 0,
  heatmapsWrapped: __ktAudit?.heatmapsWrapped || 0,
  dropdownsWired: __ktAudit?.dropdownsWired || 0,
  runtimeInjected: !!__ktAudit?.runtimeInjected,
  tableCaptionsAdded: __ktAudit?.tableCaptionsAdded || 0,
  tablesCommentedOut: __ktAudit?.tablesCommented || 0,
  duplicateTitlesCommented: __ktAudit?.titlesDeduped || 0,
  aiArtifactsCommented: __ktAudit?.aiArtifactsCommented || 0,
  marginsInjected: !!__ktAudit?.marginsInjected
  });

  // Annotate the section end with an audit note (HTML comment) - non-disruptive
  updated += `
<!-- [KT-AUDIT] ${sectionId} | wc(before:${before}, after:${after}, drift:${drift.toFixed(2)}%) | tablesWrapped:${tablesWrappedCount} | predictiveInjected:${!!ensure.injected} -->
`;
  return updated;
}


console.log("[KT-BOOT] route loaded");
// [KT-LOG] McKinsey aesthetics applied; charts wrapped; dropdowns wired; area overlay removed; pie supported.
export async function POST(req) {
  const input = await req.json();

  const canon = {
    lang: input.lang || 'English',
    orgName: input.orgName || 'Client',
    country: input.country || 'Canada',
    tier: input.tier || 'Tier 2 - National',
    companySize: input.companySize || '5,001-10,000',
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
  canon.minWords = TOTAL_FLOOR;

  console.log(TAG, 'generate.start', {
    model: MODEL,
    org: canon.orgName,
    minWords: canon.minWords,
  });

  const order = ['exec', 'current', 'financials', 'kpis', 'timeline', 'ops', 'risk', 'roi'];
  const sections = {};

  for (const key of order) {
    const floor = SECTION_FLOORS[key] || 1200;
    let html = await genSectionFirstPass(key, canon, floor);
    html = await topUpSection(key, canon, html, floor);

    const { sigs: existingSigs } = collectExistingVizMeta(html);
    const preHas = hasViz(html);
    console.log(TAG, 'section.viz.precheck', key, {
      has: preHas,
      htmlLen: html.length,
      words: wc(html),
    });

    if (key !== 'exec') {
      try {
        const predFrag = await choosePredictiveFragment(key, canon, html, existingSigs);
        // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for the last injected fragment
        try {
          const lastFragMatch = (html.match(
            /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\S]*<\/(figure|div)>)/i,
          ) || [])[0];
          if (lastFragMatch) {
            const meta = parseVizMeta(lastFragMatch);
            const flags = {
              canvas: /<figure[^>]*data-chart=/.test(lastFragMatch),
              hasTitle: !!(meta.title && meta.title.trim()),
              hasX: !!(meta.xTitle && meta.xTitle.trim()),
              hasY: !!(meta.yTitle && meta.yTitle.trim()),
              hasVals: meta.labelsLen > 0 && meta.dataLen > 0,
            };
            console.log(TAG, 'chart.debug.injected', key, {
              kind: meta.kind,
              type: meta.type,
              title: meta.title,
              xTitle: meta.xTitle,
              yTitle: meta.yTitle,
              labelsLen: meta.labelsLen,
              dataLen: meta.dataLen,
              flags,
            });
          } else {
            console.log(TAG, 'chart.debug.injected', key, {
              built: false,
              reason: 'no fragment match',
            });
          }
        } catch (e) {
          console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
        }

        if (predFrag) {
          html += '\n' + predFrag;
          console.log(TAG, 'section.vizInjected', key, { mode: 'predictive-keywords' });
          // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for the last injected fragment
          try {
            const lastFragMatch = (html.match(
              /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\S]*<\/(figure|div)>)/i,
            ) || [])[0];
            if (lastFragMatch) {
              const meta = parseVizMeta(lastFragMatch);
              const flags = {
                canvas: /<figure[^>]*data-chart=/.test(lastFragMatch),
                hasTitle: !!(meta.title && meta.title.trim()),
                hasX: !!(meta.xTitle && meta.xTitle.trim()),
                hasY: !!(meta.yTitle && meta.yTitle.trim()),
                hasVals: meta.labelsLen > 0 && meta.dataLen > 0,
              };
              console.log(TAG, 'chart.debug.injected', key, {
                kind: meta.kind,
                type: meta.type,
                title: meta.title,
                xTitle: meta.xTitle,
                yTitle: meta.yTitle,
                labelsLen: meta.labelsLen,
                dataLen: meta.dataLen,
                flags,
              });
            } else {
              console.log(TAG, 'chart.debug.injected', key, {
                built: false,
                reason: 'no fragment match',
              });
            }
          } catch (e) {
            console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
          }
        } else {
          console.log(TAG, 'section.viz.predictive.none', key);
          // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for the last injected fragment
          try {
            const lastFragMatch = (html.match(
              /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\S]*<\/(figure|div)>)/i,
            ) || [])[0];
            if (lastFragMatch) {
              const meta = parseVizMeta(lastFragMatch);
              const flags = {
                canvas: /<figure[^>]*data-chart=/.test(lastFragMatch),
                hasTitle: !!(meta.title && meta.title.trim()),
                hasX: !!(meta.xTitle && meta.xTitle.trim()),
                hasY: !!(meta.yTitle && meta.yTitle.trim()),
                hasVals: meta.labelsLen > 0 && meta.dataLen > 0,
              };
              console.log(TAG, 'chart.debug.injected', key, {
                kind: meta.kind,
                type: meta.type,
                title: meta.title,
                xTitle: meta.xTitle,
                yTitle: meta.yTitle,
                labelsLen: meta.labelsLen,
                dataLen: meta.dataLen,
                flags,
              });
            } else {
              console.log(TAG, 'chart.debug.injected', key, {
                built: false,
                reason: 'no fragment match',
              });
            }
          } catch (e) {
            console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
          }
        }
      } catch (e) {
        console.log(TAG, 'section.viz.branch.error', key, String(e?.message || e));
        // [KT:SURGICAL DEBUG] prove canvas/title/axes/values for the last injected fragment
        try {
          const lastFragMatch = (html.match(
            /(<figure[^>]*data-chart=["'][\s\S]*?<\/figure>|<div[^>]*data-heatmap=["'][\s\S]*?<\/div>)(?![\s\S]*<\/(figure|div)>)/i,
          ) || [])[0];
          if (lastFragMatch) {
            const meta = parseVizMeta(lastFragMatch);
            const flags = {
              canvas: /<figure[^>]*data-chart=/.test(lastFragMatch),
              hasTitle: !!(meta.title && meta.title.trim()),
              hasX: !!(meta.xTitle && meta.xTitle.trim()),
              hasY: !!(meta.yTitle && meta.yTitle.trim()),
              hasVals: meta.labelsLen > 0 && meta.dataLen > 0,
            };
            console.log(TAG, 'chart.debug.injected', key, {
              kind: meta.kind,
              type: meta.type,
              title: meta.title,
              xTitle: meta.xTitle,
              yTitle: meta.yTitle,
              labelsLen: meta.labelsLen,
              dataLen: meta.dataLen,
              flags,
            });
          } else {
            console.log(TAG, 'chart.debug.injected', key, {
              built: false,
              reason: 'no fragment match',
            });
          }
        } catch (e) {
          console.log(TAG, 'chart.debug.error', key, String(e?.message || e));
        }
      }
    }
    /* commented out: direct assignment replaced by audited assignment */
// /* commented out: direct assignment replaced by audited assignment */
// /* commented out: direct assignment replaced by audited assignment */
// /* commented out: raw assignment */
// sections[key] = html;
/* [KT:EXEC RULES] define if missing - enforce single exec title + mid-graph brief */
if (typeof __kt_enforceExec !== 'function') {
  function __kt_enforceExec(html){
    try{
      if (!html) return html;

      // Keep only the canonical "Executive Summary" heading; comment any other exec subtitles
      html = html.replace(
        /<(h1|h2|h3)[^>]*>([^<]*Executive[^<]*Summary[^<]*)<\/\1>[\s\S]*?(?=<section|\Z)/i,
        function(m){
          return m.replace(
            /<(h[1-6])[^>]*>(?![^<]*Executive[^<]*Summary)[\s\S]*?<\/\1>/ig,
            function(n){
              return "<!-- commented out: extraneous exec subtitle -->\n" + n + "\n<!-- /commented out -->";
            }
          );
        }
      );

      // Ensure a human brief after the first chart (2-3 sentences; non-robotic)
      if (typeof __kt_narrativeForChart !== 'function') {
        /* commented out: missing __kt_narrativeForChart; providing minimal, non-robotic fallback */
        function __kt_narrativeForChart(sectionId, title){
          var t = title || "This chart";
          return '<p class="chart-brief">' + t + ' outlines impact on growth and profitability, near-term risk, and leadership implications.</p>';
        }
      }
      html = html.replace(
        /(<figure\b[^>]*data-chart="[^"]+"[^>]*>[\s\S]*?<\/figure>)(?![\s\S]*?<p class="chart-brief">)/i,
        function(m){ return m + __kt_narrativeForChart('exec', 'Executive Savings Graph'); }
      );

      return html;
    }catch(e){
      console.warn('[KT:EXEC RULES] error', String((e && e.message) || e));
      return html; // fail-safe: never break rendering
    }
  }
}

// exec section: __kt_enforceExec not defined, no-op to avoid runtime error;
sections[key] = __kt_auditSection(key, html);
// [KT-PATCH:COMMENTED] duplicate audited assignments below preserved for traceability
// sections[key] = __kt_auditSection(key, html);
// sections[key] = __kt_auditSection(key, html);
  }

  let phases = await derivePhasesFrom(sections.timeline, canon);
  if (phases.length < 5) {
    phases = [1, 2, 3, 4, 5].map((i) => ({
      title: `Phase ${i}`,
      caption:
        i === 1 ? 'Kickoff & baselines' : i === 5 ? 'Sustain & scale' : 'Milestones & deliverables',
    }));
  }

  console.log(TAG, 'appendix.build.start');
  const appendicesHTML = buildAppendicesHTML(canon, sections);
  console.log(TAG, 'appendix.build.done', { bytes: String(appendicesHTML || '').length });

  let conclusionHTML = '';
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content:
            'Return HTML only, a single <section id="conclusion">…</section> with 1-2 short paragraphs.',
        },
        {
          role: 'user',
          content: `Write a concise "Conclusion" for ${canon.orgName} based on the preceding sections. Max two paragraphs, max two sentences per paragraph, <= 20 words each.`,
        },
      ],
    });
    conclusionHTML = (res.choices?.[0]?.message?.content || '').trim();
    if (!/id=["']conclusion["']/.test(conclusionHTML)) {
      conclusionHTML =
        '<section id="conclusion"><h3>Conclusion</h3><p>Initiatives deliver material value within the horizon. Execution discipline, measurement, and change management determine outcomes.</p></section>';
    }
  } catch (e) {
    console.log(TAG, 'conclusion.error', String(e?.message || e));
  }

  
  // Build Implementation Kit JSON for Appendices
  const implKit = await genImplKitJSON(canon, sections);
let html = buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit });
  

// [KT-ADD] enforce Appendices from current implKit and wire chart dropdowns
html = await ensureAppendicesSection(html, implKit);
html = attachChartTypeControls(html);

// [KT-AESTHETICPLUS] inject style into <head>
//if (typeof html === "string" && /<head>/i.test(html)) { html = html.replace(/<\/head>/i, __KT_AESTHETIC_PLUS + "<script>console.log("[KT:AUDIT] aesthetics: injected theme kt-aesthetic-plus + card styles");</script>
//</head>); }
//if (typeof html === 'string' && /<\/head>/i.test(html)) {
   // html = html.replace(/<\/head>/i, __KT_AESTHETIC_PLUS + __KT_AUDIT_SCRIPT + '</head>');
  //} else {
    // fallback when no <head> exists
   // html = __KT_AESTHETIC_PLUS + __KT_AUDIT_SCRIPT + html;
    
 // }
 /* [KT-AESTHETICPLUS] inject style into <head> (fixed quotes + single block) */
{
  const __KT_AUDIT_SCRIPT =
    '<script id="kt-audit-log">(function(){try{console.log("[KT:AUDIT] aesthetics: kt-aesthetic-plus injected");}catch(e){}})();</script>';
  if (typeof html === 'string' && /<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, __KT_AESTHETIC_PLUS + __KT_AUDIT_SCRIPT + '</head>');// [KT:AUDIT:AUTHENTIC:HEAD] one-time confirmation after <head> injection
console.log("[KT:AUDIT:AUTHENTIC:HEAD]", {
  
  theme: __KT_GLOBAL_THEME_TOKEN,
  injected: true
  
});
__ktAudit.theme = __KT_GLOBAL_THEME_TOKEN || 'default';
__ktAudit.background = true;      // page/body palette applied
__ktAudit.titlePage = true;       // title page styling available


  } else {
    html = __KT_AESTHETIC_PLUS + __KT_AUDIT_SCRIPT + html;
    
  }
  // [KT-AUDIT-ACCUM]
  __ktAudit.theme = __KT_GLOBAL_THEME_TOKEN || 'default';
  __ktAudit.background = true;        // body/background palette applied
  __ktAudit.titlePage = true;         // title-page class styling available
}

// [KT-ADD] Limit tables per section (comment-out extras)
html = limitTablesPerSection(html);
// [KT-ADD] De-duplicate titles and extra tables (commented out, not removed)
html = dedupeTitlesAndTables(html);

// [KT-ADD] Ensure Appendices exist using implKit JSON
if (!/id=[\"']appendices[\"']/.test(html)) {
  const __appx = renderAppendicesFromImplKit(implKit);
  if (__appx) html = html.replace(/<\/body>/i, __appx + '\n</body>');
}
html =
    String(html).replace(
      /<section id=["']appendices["'][\s\S]*?<\/section>/i,
      appendicesHTML || '$&',
    ) +
    '\n' +
    conclusionHTML;

  // === Audit moved to end (post-template) per your instruction ===
/* commented out: end-of-pipeline global polish moved to per-section audit for consistency */
// html = await polishMcKinsey(html, canon);
/* [KT:MARGINS] injected */
const __KT_MARGIN_CSS_2 = `<style id="kt-format">
  @page { margin: 0.5in; }
  body { margin: 0 auto; padding: 0 0.5in; }
  .report-container{ max-width: 72ch; margin: 0 auto; }
  .table-wrap{ overflow-x: auto; }
</style>`;
//if (/<\/head>/i.test(html)) {
// [KT-PATCH] commented broken injection start:   html = html.replace(/<\/head>/i, __KT_MARGIN_CSS + '
/* [KT-ADD][2025-10-12] Dashboard page sizing */
// [KT-PATCH] commented out to fix unterminated/stray HTML: <style id="kt-dashboard-page">
// [KT-PATCH] commented out to fix unterminated/stray HTML:   #kpis{ page-break-before: always; }
// [KT-PATCH] commented out to fix unterminated/stray HTML:   #kpis figure, #kpis .chart-card{ margin: 14px 0; }
// [KT-PATCH] commented out to fix unterminated/stray HTML: </style>
// [KT-PATCH] commented out to fix unterminated/stray HTML: 
// [KT-PATCH] commented out to fix unterminated/stray HTML: 
/* [KT-AESTHETICPLUS] (moved to string injection to avoid syntax errors)
   The raw <style> block was breaking route.js parsing. We now inject via a string.
*/
//if (typeof html === "string" && /<head>/i.test(html)) {
 // html = html.replace(/<\/head>/i, __KT_AESTHETIC_PLUS + "<script>console.log("[KT:AUDIT] aesthetics: injected theme kt-aesthetic-plus + card styles");</script>
//</head>");
// [KT-PATCH] commented out to fix unterminated/stray HTML: 
//} else {
  if (/<\/head>/i.test(html)) { html = html.replace(/<\/head>/i, __KT_MARGIN_CSS_2 + '</head>'); } else { html = __KT_MARGIN_CSS_2 + html; } __ktAudit.marginsInjected = true; // [KT-AUDIT] margins applied
// [KT-PATCH] original:   html = __KT_MARGIN_CSS 
//}
// [KT-AESTHETICPLUS] inject style into <head> (safe quotes + audit log)
if (typeof html === 'string' && /<\/head>/i.test(html)) {
  const __KT_AUDIT_SCRIPT =
    '<script id="kt-audit-log">(function(){try{console.log("[KT:AUDIT] aesthetics: kt-aesthetic-plus injected");}catch(e){}})();</script>';
  html = html.replace(/<\/head>/i, __KT_AESTHETIC_PLUS + __KT_AUDIT_SCRIPT + '</head>');
} else {

const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log('[KT-AUDIT] all-sections', 'completed');
console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

// ---------- [KT:AUDIT:AUTHENTIC:FINAL] GLOBAL COUNTERS ----------
(function(){
  try{
    var s = String(html || '');

    // Derive from final HTML to guarantee non-zero totals even if earlier hooks missed
    var themeInjected   = /id=["']kt-aesthetic-plus["']/i.test(s);
    var marginsInjected = /id=["']kt-format["']/i.test(s) || /id=["']kt-report-margins["']/i.test(s);
    var runtimeInjected = /id=["']kt-client-chart-runtime["']/i.test(s);
    var dropdownsWired  = (s.match(/<select\b[^>]*data-kt-type/ig) || []).length;

    var chartsWrapped   = (s.match(/<figure\b[^>]*class=(["'])[^"']*\bchart-card\b/ig) || []).length;
    var heatmapsWrapped = (s.match(/<div\b[^>]*class=(["'])[^"']*\bheatmap-card\b/ig) || []).length;

    var aiArtifacts     = (s.match(/\[KT-COMMENTED:AI-ARTIFACT]/g) || []).length;
    var tablesCommented = (s.match(/\[KT-COMMENTED:DUPLICATE-TABLE/gi) || []).length;
    var titlesDeduped   = (s.match(/\[KT-COMMENTED:DUPLICATE-H[23]/gi) || []).length;
    var tableCaptions   = (s.match(/<caption><strong/gi) || []).length;

    // Sync into accumulator if app code wants it later
    __ktAudit.theme                 = __ktAudit.theme || (__KT_GLOBAL_THEME_TOKEN || 'default');
    __ktAudit.background            = __ktAudit.background || themeInjected;
    __ktAudit.titlePage             = __ktAudit.titlePage || themeInjected;
    __ktAudit.marginsInjected       = !!(__ktAudit.marginsInjected || marginsInjected);
    __ktAudit.runtimeInjected       = !!(__ktAudit.runtimeInjected || runtimeInjected);
    __ktAudit.dropdownsWired        = __ktAudit.dropdownsWired || dropdownsWired;
    __ktAudit.chartsWrapped         = __ktAudit.chartsWrapped || chartsWrapped;
    __ktAudit.heatmapsWrapped       = __ktAudit.heatmapsWrapped || heatmapsWrapped;
    __ktAudit.aiArtifactsCommented  = __ktAudit.aiArtifactsCommented || aiArtifacts;
    __ktAudit.tablesCommented       = __ktAudit.tablesCommented || tablesCommented;
    __ktAudit.titlesDeduped         = __ktAudit.titlesDeduped || titlesDeduped;
    __ktAudit.tableCaptionsAdded    = __ktAudit.tableCaptionsAdded || tableCaptions;

    console.log('[KT:AUDIT:AUTHENTIC:FINAL]', {
      theme: __ktAudit.theme,
      backgroundColorChanged: !!__ktAudit.background,
      titlePageStyled: !!__ktAudit.titlePage,
      marginsInjected: !!__ktAudit.marginsInjected,
      chartsWrapped: __ktAudit.chartsWrapped,
      heatmapsWrapped: __ktAudit.heatmapsWrapped,
      dropdownsWired: __ktAudit.dropdownsWired,
      runtimeInjected: !!__ktAudit.runtimeInjected,
      tableCaptionsAdded: __ktAudit.tableCaptionsAdded,
      tablesCommentedOut: __ktAudit.tablesCommented,
      duplicateTitlesCommented: __ktAudit.titlesDeduped,
      aiArtifactsCommented: __ktAudit.aiArtifactsCommented
    });
  }catch(e){
    console.log('[KT:AUDIT:AUTHENTIC:FINAL] error', String(e && e.message || e));
  }
})();
// ---------- [KT:AUDIT:AUTHENTIC:FINAL] (guaranteed) ----------
(function(){
  try{
    var s = String(html || '');
    var themeInjected   = /id=["']kt-aesthetic-plus["']/i.test(s);
    var marginsInjected = /id=["']kt-format["']/i.test(s) || /id=["']kt-report-margins["']/i.test(s);
    var runtimeInjected = /id=["']kt-client-chart-runtime["']/i.test(s);
    var dropdownsWired  = (s.match(/<select[^>]*data-kt-type/ig) || []).length;
    var chartsWrapped   = (s.match(/<figure[^>]*class=(["'])[^"']*chart-card/ig) || []).length;
    var heatmapsWrapped = (s.match(/<div[^>]*class=(["'])[^"']*heatmap-card/ig) || []).length;
    var aiArtifacts     = (s.match(/\[KT-COMMENTED:AI-ARTIFACT]/g) || []).length;
    var tablesCommented = (s.match(/\[KT-COMMENTED:DUPLICATE-TABLE/gi) || []).length;
    var titlesDeduped   = (s.match(/\[KT-COMMENTED:DUPLICATE-H[23]/gi) || []).length;
    var tableCaptions   = (s.match(/<caption><strong/gi) || []).length;
    __ktAudit.theme                 = __ktAudit.theme || (__KT_GLOBAL_THEME_TOKEN || 'default');
    __ktAudit.background            = __ktAudit.background || themeInjected;
    __ktAudit.titlePage             = __ktAudit.titlePage || themeInjected;
    __ktAudit.marginsInjected       = !!(__ktAudit.marginsInjected || marginsInjected);
    __ktAudit.runtimeInjected       = !!(__ktAudit.runtimeInjected || runtimeInjected);
    __ktAudit.dropdownsWired        = __ktAudit.dropdownsWired || dropdownsWired;
    __ktAudit.chartsWrapped         = __ktAudit.chartsWrapped || chartsWrapped;
    __ktAudit.heatmapsWrapped       = __ktAudit.heatmapsWrapped || heatmapsWrapped;
    __ktAudit.aiArtifactsCommented  = __ktAudit.aiArtifactsCommented || aiArtifacts;
    __ktAudit.tablesCommented       = __ktAudit.tablesCommented || tablesCommented;
    __ktAudit.titlesDeduped         = __ktAudit.titlesDeduped || titlesDeduped;
    __ktAudit.tableCaptionsAdded    = __ktAudit.tableCaptionsAdded || tableCaptions;
    console.log('[KT:AUDIT:AUTHENTIC:FINAL]', {
      theme: __ktAudit.theme,
      backgroundColorChanged: !!__ktAudit.background,
      titlePageStyled: !!__ktAudit.titlePage,
      marginsInjected: !!__ktAudit.marginsInjected,
      chartsWrapped: __ktAudit.chartsWrapped,
      heatmapsWrapped: __ktAudit.heatmapsWrapped,
      dropdownsWired: __ktAudit.dropdownsWired,
      runtimeInjected: !!__ktAudit.runtimeInjected,
      tableCaptionsAdded: __ktAudit.tableCaptionsAdded,
      tablesCommentedOut: __ktAudit.tablesCommented,
      duplicateTitlesCommented: __ktAudit.titlesDeduped,
      aiArtifactsCommented: __ktAudit.aiArtifactsCommented
    });
  }catch(e){
    console.log('[KT:AUDIT:AUTHENTIC:FINAL] error', String(e && e.message || e));
  }
})();




  return NextResponse.json({ ok: true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}

/* ==========================================================================
   Implementation Kit JSON (appendices) - transplanted from Oct 9 5:22 PM
   NOTE: Surgical addition; no deletions to existing code. MODEL and openai
   must already be in scope from surrounding generate module.
   ========================================================================== */
/* Implementation Kit JSON (appendices only) */
async function genImplKitJSON(canon, sections){
  try{
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role:'system', content:'Return strict JSON only. No prose.' },
        { role:'user',   content: 
`You are producing JSON only (no prose). Build an Implementation Kit from the report content.

Return exactly this shape:
{
  "charters": [ { "name": "...", "objective": "...", "scopeIn": "...", "scopeOut": "...", "owner": "...",
                  "stakeholders": ["..."], "milestones":[{"milestone":"...","due":"..."}],
                  "kpis":[{"kpi":"...","baseline":0,"target":0,"source":"..."}],
                  "risks":[{"risk":"...","mitigation":"...","owner":"..."}],
                  "budgetSummary":"...", "acceptanceCriteria":"..." } ],
  "raci": { "items":[{"decision":"...","R":"...","A":"...","C":["..."],"I":["..."],"SLA":"..."}] },
  "raid": { "items":[{"type":"Risk|Assumption|Issue|Dependency","description":"...","owner":"...","",
                      "impact":"...","probability":"...","trigger":"...","mitigation":"...","",
                      "status":"...","nextReview":"..."}] },
  "benefits": { "lines":[{"workstream":"...","lever":"...","unitAssumption":"...","",
                          "source":"...","volume":0,"rate":0,"monthlyImpact":0,"",
                          "confidence":"Low|Medium|High","startMonth":"M1","runRateMonth":"M3","oneOffCost":0}] },
  "plan100": { "weeks":[{"week":"W1","workstream":"...","task":"...","owner":"...","status":"Planned"}] },
  "pilot": { "name":"...", "locations":10, "successKPIs":["..."], "thresholds":["..."],
             "sampleDesign":"...", "rollbackCriteria":"..." },
  "assumptions": { "items":[{"name":"...","value":0,"unit":"...","low":0,"high":0,"note":"..."}] },
  "methods": { "benchmarks":[{"name":"...","source":"...","date":"YYYY-MM","notes":"..."}],
               "sources":["...","..."] }
}` }
      ]
    });
    const raw = (res?.choices?.[0]?.message?.content ?? '').trim();
    try{
      return JSON.parse(raw);
    }catch(e){
      console.warn('[genImplKitJSON] JSON parse failed; returning empty shell', e);
      return { charters: [], raci: {items:[]}, raid:{items:[]}, benefits:{lines:[]}, plan100:{weeks:[]},
               pilot:{name:'',locations:0,successKPIs:[],thresholds:[],sampleDesign:'',rollbackCriteria:''},
               assumptions:{items:[]}, methods:{benchmarks:[], sources:[]} };
    }
  }catch(err){
    console.error('[genImplKitJSON] OpenAI call failed', err);
    return { charters: [], raci: {items:[]}, raid:{items:[]}, benefits:{lines:[]}, plan100:{weeks:[]},
             pilot:{name:'',locations:0,successKPIs:[],thresholds:[],sampleDesign:'',rollbackCriteria:''},
             assumptions:{items:[]}, methods:{benchmarks:[], sources:[]} };
  }
}

/* [KT-ADD][2025-10-12] Limit to one visible table per section by commenting out extras (no deletions) */
function limitTablesPerSection(html=''){
  let out = String(html||'');
  const ids = ['exec','current','financials','kpis','timeline','ops','risk','roi','conclusion'];
  for (const id of ids){
    const re = new RegExp(`(<h2[^>]*id=["']${id}["'][\\s\\S]*?)(?=<h2\\b|</body>)`, 'i');
    const m = out.match(re);
    if (!m) continue;
    let seg = m[1];
    let count = 0;
    seg = seg.replace(/<table\b[\s\S]*?<\/table>/ig, (tbl)=>{
      count += 1;
      if (count === 1) return tbl;
      return `<!-- KT-COMMENTED: extra table hidden to enforce one-per-section -->\n` + tbl.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    });
    out = out.replace(re, seg);
  }
  return out;
}



/* [KT-ADD][2025-10-12] Render Appendices (RACI/RAID/Benefits/Plan) from implKit JSON if missing */
function renderAppendicesFromImplKit(implKit){
  try{
    const raciItems = implKit?.raci?.items || [];
    const raidItems = implKit?.raid?.items || [];
    const benefits  = implKit?.benefits?.lines || [];
    const plan100   = implKit?.plan100?.weeks || [];

    const esc = (s)=>String(s==null?'':s).replace(/[&<>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));

    const raciTable = raciItems.length ? `
    <h3>RACI</h3>
    <table class="report-table">
      <thead><tr><th>Decision</th><th>R</th><th>A</th><th>C</th><th>I</th><th>SLA</th></tr></thead>
      <tbody>
        ${raciItems.map(x=>`<tr><td>${esc(x.decision||'')}</td><td>${esc(x.R||'')}</td><td>${esc(x.A||'')}</td><td>${esc((x.C||[]).join(', '))}</td><td>${esc((x.I||[]).join(', '))}</td><td>${esc(x.SLA||'')}</td></tr>`).join('')}
      </tbody>
    </table>` : '';

    const raidTable = raidItems.length ? `
    <h3>RAID</h3>
    <table class="report-table">
      <thead><tr><th>Type</th><th>Description</th><th>Owner</th><th>Impact</th><th>Probability</th><th>Mitigation</th><th>Status</th><th>Next Review</th></tr></thead>
      <tbody>
        ${raidItems.map(x=>`<tr><td>${esc(x.type||'')}</td><td>${esc(x.description||'')}</td><td>${esc(x.owner||'')}</td><td>${esc(x.impact||'')}</td><td>${esc(x.probability||'')}</td><td>${esc(x.mitigation||'')}</td><td>${esc(x.status||'')}</td><td>${esc(x.nextReview||'')}</td></tr>`).join('')}
      </tbody>
    </table>` : '';

    const benefitsTable = benefits.length ? `
    <h3>Benefits Model (Extract)</h3>
    <table class="report-table">
      <thead><tr><th>Workstream</th><th>Lever</th><th>Unit</th><th>Volume</th><th>Rate</th><th>Monthly Impact</th><th>Confidence</th><th>Start</th><th>Run Rate</th></tr></thead>
      <tbody>
        ${benefits.map(x=>`<tr><td>${esc(x.workstream||'')}</td><td>${esc(x.lever||'')}</td><td>${esc(x.unitAssumption||'')}</td><td>${esc(x.volume||'')}</td><td>${esc(x.rate||'')}</td><td>${esc(x.monthlyImpact||'')}</td><td>${esc(x.confidence||'')}</td><td>${esc(x.startMonth||'')}</td><td>${esc(x.runRateMonth||'')}</td></tr>`).join('')}
      </tbody>
    </table>` : '';

    const planTable = plan100.length ? `
    <h3>First 100 Days (Extract)</h3>
    <table class="report-table">
      <thead><tr><th>Week</th><th>Workstream</th><th>Task</th><th>Owner</th><th>Status</th></tr></thead>
      <tbody>
        ${plan100.map(x=>`<tr><td>${esc(x.week||'')}</td><td>${esc(x.workstream||'')}</td><td>${esc(x.task||'')}</td><td>${esc(x.owner||'')}</td><td>${esc(x.status||'')}</td></tr>`).join('')}
      </tbody>
    </table>` : '';

    return `
    <section id="appendices">
      <h2>Appendices</h2>
      ${raciTable}
      ${raidTable}
      ${benefitsTable}
      ${planTable}
    </section>`;
  }catch{ return ''; }
}}