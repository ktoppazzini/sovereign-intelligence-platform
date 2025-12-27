// ===============================
// app/api/reform/generate/route.js
// Rev: Oct 7 – [KT:SURGICAL] Predictive selection: no-hints, retry-on-reject,
//               logs (keyword/type/titles/values), one standard + one predictive
//               + one AI table per section; audit can’t shorten or drop sections.
// NOTE: No deletions—any replaced lines are commented. Temperature pinned to 1.
// ===============================
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate';
import { planDiagramHTML } from '@/lib/implPlan';
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js'; // [KT:KEEP] not used here to avoid accidental renders

const TAG = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

function currencyUnitForCountry(country = '') {
  const c = String(country).toLowerCase();
  if (c.includes('canada') || c.includes('ca')) return 'CAD';
  if (c.includes('united states') || c.includes('usa') || c.includes('us')) return 'USD';
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('england')) return 'GBP';
  if (c.includes('india')) return 'INR';
  if (c.includes('euro')) return 'EUR';
  return 'CAD';
}

/* ========================================================================== */
/* Visual detection + JSON attribute parsing (entity-unescape)                 */
/* ========================================================================== */
const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const hasViz = (html = '') => HAS_VIZ_RE.test(String(html || ''));

function safeParseAttrJSON(s = '') {
  try {
    return JSON.parse(
      String(s)
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&'),
    );
  } catch {
    return null;
  }
}

const extractVizFragment = (s = '') => {
  const str = String(s || '');
  const m1 = str.match(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/i);
  if (m1) return m1[0];
  const m2 = str.match(/<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>/i);
  if (m2) return m2[0];
  const m3 = str.match(/<div[^>]*data-heatmap=['"][\s\S]*?<\/div>/i);
  if (m3) return m3[0];
  return '';
};

function parseVizMeta(frag = '') {
  const out = { kind: '', type: '', title: '', xTitle: '', yTitle: '', labelsLen: 0, dataLen: 0 };
  if (!frag) return out;
  const chart = frag.match(/<figure[^>]*data-chart=['"]([\s\S]*?)['"]/i);
  if (chart) {
    out.kind = 'chart';
    try {
      const json = safeParseAttrJSON(chart[1]);
      out.type = String(json?.type || '');
      out.title = String(json?.title || '');
      out.xTitle = String(json?.xTitle || '');
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = Array.isArray(json?.labels) ? json.labels.length : 0;
      out.dataLen = Array.isArray(json?.datasets?.[0]?.data) ? json.datasets[0].data.length : 0;
    } catch {}
    return out;
  }
  const bench = frag.match(
    /<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([\s\S]*?)['"]/i,
  );
  if (bench) {
    out.kind = 'benchmark';
    try {
      const json = safeParseAttrJSON(bench[1]);
      out.type = 'benchmark';
      out.title = String(json?.title || '');
      out.xTitle = 'Measure';
      out.yTitle = String(json?.yTitle || '');
      out.labelsLen = 2;
      out.dataLen = 2;
    } catch {}
    return out;
  }
  const heat = frag.match(/<div[^>]*data-heatmap=['"]([\s\S]*?)['"]/i);
  if (heat) {
    out.kind = 'heatmap';
    try {
      const json = safeParseAttrJSON(heat[1]);
      out.type = 'heatmap';
      out.title = String(json?.title || '');
      out.xTitle = 'Columns';
      out.yTitle = 'Rows';
      out.labelsLen = Array.isArray(json?.cols) ? json.cols.length : 0;
      out.dataLen = Array.isArray(json?.data) ? json.data.length : 0;
    } catch {}
    return out;
  }
  return out;
}

function collectExistingVizMeta(html = '') {
  const titles = new Set();
  const sigs = new Set(); // kind|title
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
/* Standard-visual collision rules (predictive must avoid duplicating them)    */
/* ========================================================================== */
function isStandardSectionGraphDuplicate(section, meta) {
  if (!meta || !meta.title) return false;
  const t = meta.title.toLowerCase();
  if (section === 'exec' && /(saving|savings).*(month|year)|over time|by (month|year)/i.test(t))
    return true;
  if (section === 'financials' && /(payback|expenditure|expenditures|capex|opex)/i.test(t))
    return true;
  if (section === 'kpis' && /(savings|payback|benchmark)/i.test(t)) return true;
  return false;
}

/* ========================================================================== */
/* Predictive analytics (NO HINTS): keywords → JSON candidates → pick one      */
/* ========================================================================== */
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

/** Ask AI for a BATCH of candidate charts (no hints) */
async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords) {
  const yCur = currencyUnitForCountry(canon.country);
  const tf = String(canon.timeFrame || '2 years').toLowerCase();
  const years = /year/.test(tf);
  const labels = years ? ['Y1', 'Y2', 'Y3'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

  const user = `
From KEYWORDS, choose up to 12 of the best predictive analytics for the "${section}" section.
For each, return ONE JSON candidate chart (no tables) with:
- "keyword" (from KEYWORDS),
- "type" in ["line","bar","pie","doughnut"], or "heatmap" ONLY if section === "risk",
- "title" (clear and specific; if you omit it, that's fine — the system will synthesize),
- "xTitle" ("${years ? 'Years' : 'Months'}"),
- "yTitle" ("${section === 'financials' || section === 'exec' ? yCur : section === 'kpis' || section === 'roi' || section === 'current' ? 'Percent' : 'Index'}"),
- "labels": ${JSON.stringify(labels)},
- "datasets":[{"label":"Predicted","data":[numbers with same length as labels]}]
If you truly need a benchmark, include fields "current" and "benchmark" and set kind="benchmark".
Return STRICT JSON:
{"candidates":[{...},{...}]}

KEYWORDS:
${JSON.stringify(keywords).slice(0, 6000)}

CANON:
${JSON.stringify({ country: canon.country, currency: yCur, timeFrame: canon.timeFrame, costSavingsGoal: canon.costSavingsGoal })}

SECTION HTML (source for defensible numbers):
${sectionHtml}
`.trim();

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

function isGraphCandidateValid(section, c) {
  if (!c) return false;
  if (c.kind && /table/i.test(c.kind)) return false;
  const type = String(c.type || '').toLowerCase();
  if (
    !['line', 'bar', 'pie', 'doughnut', 'heatmap', 'benchmark'].includes(type) &&
    c.kind !== 'benchmark'
  )
    return false;
  if (type === 'heatmap' && section !== 'risk') return false;
  const labels = Array.isArray(c.labels) ? c.labels : [];
  const data = Array.isArray(c.datasets?.[0]?.data) ? c.datasets[0].data : [];
  if (!labels.length || !data.length || labels.length !== data.length) return false;
  return true;
}

function renderCandidateToFragment(section, c) {
  if (c.kind === 'benchmark' || c.type === 'benchmark') {
    const spec = {
      title: c.title || 'Benchmark Comparison',
      current: Number(c.current || 0),
      benchmark: Number(c.benchmark || 0),
      yTitle: c.yTitle || 'Index',
    };
    return `<figure data-widget="benchmark" data-spec='${JSON.stringify(spec)}'></figure>`;
  }
  if (String(c.type || '').toLowerCase() === 'heatmap' && section === 'risk') {
    const spec = {
      title: c.title || 'Risk Heat Map',
      rows: Array.isArray(c.rows) ? c.rows.slice(0, 12) : ['R1', 'R2', 'R3', 'R4', 'R5'],
      cols: Array.isArray(c.cols) ? c.cols.slice(0, 12) : ['C1', 'C2', 'C3', 'C4', 'C5'],
      data: Array.isArray(c.data)
        ? c.data
        : [
            [1, 2, 3, 4, 5],
            [2, 3, 4, 3, 2],
            [1, 2, 3, 2, 1],
            [2, 3, 4, 3, 2],
            [3, 2, 2, 3, 4],
          ],
    };
    return `<div data-heatmap='${JSON.stringify(spec)}'></div>`;
  }
  const spec = {
    type: String(c.type || 'line').toLowerCase(),
    title: c.title || 'Forecast',
    xTitle: c.xTitle || 'Periods',
    yTitle: c.yTitle || 'Index',
    labels: Array.isArray(c.labels) ? c.labels : ['P1', 'P2', 'P3'],
    datasets: Array.isArray(c.datasets) ? c.datasets : [{ label: 'Predicted', data: [1, 2, 3] }],
  };
  // align lengths
  spec.datasets = spec.datasets.map((ds) => ({
    label: ds.label || 'Predicted',
    data: (Array.isArray(ds.data) ? ds.data : []).slice(0, spec.labels.length),
  }));
  return `<figure data-chart='${JSON.stringify(spec)}'></figure>`;
}

function synthTitleIfMissing(section, frag) {
  return String(frag).replace(
    /(<figure[^>]*data-chart=['"])([\s\S]*?)(['"][^>]*>[\s\S]*?<\/figure>)/i,
    (m, pre, jsonRaw, post) => {
      const obj = safeParseAttrJSON(jsonRaw) || {};
      if (!String(obj.title || '').trim()) {
        obj.title = `${section.toUpperCase()} Predictive ${Math.floor(Math.random() * 900) + 100}`;
        console.log(TAG, 'predictive.titleSynth', section, { title: obj.title });
        return pre + JSON.stringify(obj) + post;
      }
      return m;
    },
  );
}

/** Choose one predictive fragment: iterate candidates; if rejected—move on */
async function choosePredictiveFragment(section, canon, sectionHtml, existingSigSet) {
  const keywords = await aiSuggestKeywords(section, canon, sectionHtml);
  if (!keywords.length) {
    console.log(TAG, 'predictive.fail.noKeywords', section);
    return '';
  }

  // batch request, no hints inside prompt
  const batch = await aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords);
  if (!batch.length) {
    console.log(TAG, 'predictive.fail.noBatch', section);
    return '';
  }

  const seenLocal = new Set();

  for (let i = 0; i < batch.length; i++) {
    const c = batch[i];
    const kind = String(c.kind || c.type || 'chart').toLowerCase();

    // shape validation
    if (!isGraphCandidateValid(section, c)) {
      console.log(TAG, 'predictive.reject.invalid', section, {
        idx: i + 1,
        reason: 'shape/labels/data',
        type: c.type,
        kind,
      });
      continue; // ← move on to next
    }

    // render → meta → collision tests
    let frag = renderCandidateToFragment(section, c);
    frag = synthTitleIfMissing(section, frag);
    const meta = parseVizMeta(frag);

    // avoid standard-visual duplication
    if (isStandardSectionGraphDuplicate(section, meta)) {
      console.log(TAG, 'predictive.reject.standardDup', section, { idx: i + 1, title: meta.title });
      continue; // ← move on
    }

    // de-dup within section (existing or already seen in batch)
    const sig = `${meta.kind}|${String(meta.title || '')
      .trim()
      .toLowerCase()}`;
    if (existingSigSet.has(sig) || seenLocal.has(sig)) {
      console.log(TAG, 'predictive.reject.duplicate', section, { idx: i + 1, sig });
      continue; // ← move on
    }

    // table check (predictive must be a graph)
    if (/<table[\s\S]*<\/table>/i.test(frag)) {
      console.log(TAG, 'predictive.reject.tableDetected', section, { idx: i + 1 });
      continue; // ← move on
    }

    // success — log all details
    const sample = Array.isArray(c.datasets?.[0]?.data) ? c.datasets[0].data.slice(0, 3) : [];
    console.log(TAG, 'predictive.select', section, {
      idx: i + 1,
      keyword: c.keyword || '(unspecified)',
      type: meta.type || kind,
      title: meta.title,
      xTitle: meta.xTitle,
      yTitle: meta.yTitle,
      labelsLen: meta.labelsLen,
      valuesSample: sample,
    });

    // add a crisp description (no hints)
    const desc = await predictiveDescription(section, canon, meta);
    seenLocal.add(sig);
    return frag + '\n' + desc;
  }

  console.log(TAG, 'predictive.fail.exhausted', section, { tried: batch.length });
  return '';
}

/* short description, not hints */
async function predictiveDescription(section, canon, meta) {
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: 'Return one short HTML paragraph only (<p>…</p>), no lists, no headings.',
        },
        {
          role: 'user',
          content: `Write a crisp 1–2 sentence description of the predictive chart for "${section}" titled "${meta.title}".
Mention the X and Y meanings and the executive decision it informs. Keep it factual and concise.
`,
        },
      ],
    });
    const p = (res.choices?.[0]?.message?.content || '').trim();
    return /^<p[\s>]/i.test(p) ? p : `<p>${p}</p>`;
  } catch {
    return '';
  }
}

/* ========================================================================== */
/* AI table requirement (exactly one per section except exec/current)          */
/* ========================================================================== */
function ensureOneTablePrompt(section) {
  return section === 'exec' || section === 'current'
    ? '' // none required here
    : 'Include exactly ONE compact, AI-generated table using <table class="report-table">…</table> (not more than 8 rows).';
}

/* ========================================================================== */
/* Final audit — can’t shorten or drop sections                                */
/* ========================================================================== */
async function auditAndMaybeRedesign(html, canon, sectionsWords) {
  const prompt = `
You are a world-class consulting presentation architect.
Audit the provided HTML report. If a rewrite is needed, return a redesigned HTML that is BETTER THAN MCKINSEY — but you MUST:
- KEEP the same structure and sections present (no removals).
- KEEP or EXCEED the current word count (do not shorten).
- KEEP all tables and visuals; you may reflow/retitle for clarity.
- Use only <h3>/<h4> headings inside sections (no <h1>/<h2>).

Return STRICT JSON only:
{
  "rewrite": true|false,
  "reasons": ["..."],
  "html": "<if rewrite true, full improved HTML; else empty string>"
}
`.trim();

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: 'Return valid JSON only. If rewrite=false, return empty html.' },
        {
          role: 'user',
          content: prompt + '\n\n--- REPORT HTML START ---\n' + html + '\n--- REPORT HTML END ---',
        },
      ],
    });
    let obj = {};
    try {
      obj = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    } catch {
      obj = {};
    }

    if (obj.rewrite && obj.html) {
      const newHTML = String(obj.html);
      const newWords = wc(newHTML);
      const hasAllSections =
        /id="exec"/i.test(newHTML) &&
        /id="current"/i.test(newHTML) &&
        /id="financials"/i.test(newHTML) &&
        /id="kpis"/i.test(newHTML) &&
        /id="timeline"/i.test(newHTML) &&
        /id="ops"/i.test(newHTML) &&
        /id="risk"/i.test(newHTML) &&
        /id="roi"/i.test(newHTML);

      if (hasAllSections && newWords >= sectionsWords) {
        console.log(TAG, 'report.redesigned', {
          redesigned: true,
          message: 'Report REDESIGNED to be better than McKinsey',
          words: newWords,
        });
        return { html: newHTML, redesigned: true };
      } else {
        console.log(TAG, 'report.redesign.rejected', {
          reason: hasAllSections ? 'shorter-content' : 'missing-sections',
          newWords,
          baseline: sectionsWords,
        });
        return { html, redesigned: false };
      }
    }
    console.log(TAG, 'report.redesigned', {
      redesigned: false,
      message: 'Report passed audit without full redesign',
    });
    return { html, redesigned: false };
  } catch (e) {
    console.log(TAG, 'report.audit.error', String(e?.message || e));
    return { html, redesigned: false };
  }
}

/* ========================================================================== */
/* Section prompts (surgical tweak: exactly one table per section where needed) */
/* ========================================================================== */
function sectionPrompt(section, canon, minWords) {
  const common =
    'Audience: C-suite. Tone: concise, evidence-driven, pragmatic. ' +
    `Organization: ${canon.orgName} (${canon.country}). ` +
    `Goal: ${canon.desiredOutcome}. Size: ${canon.companySize}. Time frame: ${canon.timeFrame}. ` +
    `${ensureOneTablePrompt(section)}`;

  const asks = {
    exec: 'Write an executive summary with 4–6 bullet takeaways and 2–3 tight paragraphs. Quantify headline savings and payback.',
    current: 'Describe current state, constraints, and pain points with concrete examples.',
    financials:
      'Lay out baseline costs, implementation costs, savings by lever, and payback. Make trade-offs explicit.',
    kpis: 'Define 6–10 KPIs with baselines and realistic targets. Explain why each matters.',
    timeline: 'Describe a plan grouped into exactly five phases with milestones and owners.',
    ops: 'Detail the operating model across people, process, data, and technology. Include change-management, training, and governance.',
    risk: 'List key risks with mitigation, triggers, and accountable owner.',
    roi: 'Explain ROI and non-financial benefits; close with a clear executive call-to-action and next steps.',
  };

  return `${common}
Section: ${section}.
${asks[section]}

HARD RULES:
- Do NOT repeat ideas already written in this section; add new content only.
- Stay strictly within this section’s scope; do NOT include other sections.
- No <h1>/<h2>; use only <h3>/<h4> if headings are needed.
- No appendix content here.

Minimum words: ${minWords}. Output valid HTML only.
`;
}

function expandPrompt(section, canon, remainingWords) {
  return `Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Write 2–3 short paragraphs (no headings above <h3>). Avoid repeating earlier text.
Stay strictly within "${section}". Target at least ${remainingWords} words. Output valid HTML only.
Use <table class="report-table"> for the single required table if not already present.
`;
}

/* ========================================================================== */
/* Implementation Kit JSON (kept)                                              */
/* ========================================================================== */
async function genImplKitJSON(canon, sections) {
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

Constraints:
- Derive entries from the report sections (Current, Financials, Timeline, Ops, Risk, ROI, KPIs).
- Keep counts tight and use consistent units.
- Output PURE JSON only.

--- CANON ---
Org: ${canon.orgName} (${canon.country})  Size: ${canon.companySize}  Time frame: ${canon.timeFrame}

--- SECTIONS (HTML) ---
CURRENT:
${sections.current}
FINANCIALS:
${sections.financials}
TIMELINE:
${sections.timeline}
OPS:
${sections.ops}
RISK:
${sections.risk}
ROI:
${sections.roi}
KPIS:
${sections.kpis}
`.trim();

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role: 'system', content: 'Return valid JSON only. No markdown, no prose.' },
      { role: 'user', content: body },
    ],
  });

  try {
    return JSON.parse(res.choices?.[0]?.message?.content || '{}');
  } catch {
    return {};
  }
}

/* ========================================================================== */
/* generation core                                                             */
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
  const html = res.choices?.[0]?.message?.content?.trim() || '';
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
    html += '\n' + add;
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

// ---------------- API route ----------------
export async function POST(req) {
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

    // Generate and top-up THIS section before moving on
    let html = await genSectionFirstPass(key, canon, floor);
    html = await topUpSection(key, canon, html, floor);

    const { sigs: existingSigs } = collectExistingVizMeta(html);
    console.log(TAG, 'section.viz.precheck', key, {
      has: hasViz(html),
      htmlLen: html.length,
      words: wc(html),
    });

    // Add exactly one predictive graph per main section (not exec/current)
    if (key !== 'exec' && key !== 'current') {
      try {
        const frag = await choosePredictiveFragment(key, canon, html, existingSigs);
        if (frag) {
          html += '\n' + frag;
          console.log(TAG, 'section.vizInjected', key, { mode: 'predictive', count: 1 });
        } else {
          console.log(TAG, 'section.viz.predictive.none', key);
        }
      } catch (e) {
        console.log(TAG, 'section.viz.predictive.error', key, String(e?.message || e));
      }
    }

    sections[key] = html;
  }

  // Build roadmap phases
  let phases = await derivePhasesFrom(sections.timeline, canon);
  if (phases.length < 5) {
    phases = [1, 2, 3, 4, 5].map((i) => ({
      title: `Phase ${i}`,
      caption:
        i === 1 ? 'Kickoff & baselines' : i === 5 ? 'Sustain & scale' : 'Milestones & deliverables',
    }));
  }

  // Implementation Kit JSON (appendices driven elsewhere)
  const implKit = await genImplKitJSON(canon, sections);

  // Assemble full HTML (template lays out title page + sections + standard graphs)
  const initialHTML = buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit });

  // Audit with safeguards (can’t shorten/drop)
  const sectionsWords = wc(Object.values(sections).join(' '));
  const audit = await auditAndMaybeRedesign(initialHTML, canon, sectionsWords);
  const html = audit.html;

  const htmlWords = wc(html);
  console.log(TAG, 'generate.summary', {
    redesigned: audit.redesigned,
    message: audit.redesigned
      ? 'Report REDESIGNED to be better than McKinsey'
      : 'Report passed audit without full redesign',
    words: { sectionsWords, htmlWords, target: canon.minWords },
  });

  return NextResponse.json({
    ok: true,
    html,
    wordCount: sectionsWords,
    htmlWordCount: htmlWords,
    redesigned: audit.redesigned,
  });
}
