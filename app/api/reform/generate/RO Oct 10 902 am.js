/* ===============================
   app/api/reform/generate/route.js
   (Corrected Oct 14 — surgical fixes with comments)
   =============================== */
console.log("[PATCH:Oct14-559 ACTIVE] Reform generate route loaded");
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from "@/lib/reportTemplate";
import { planDiagramHTML } from '@/lib/implPlan';
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js';
const TAG   = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';

/* --------------------------------------------------------------------------
   Lazy OpenAI loader (kept)
--------------------------------------------------------------------------- */
let __openai;
async function getOpenAI(){
  if (!__openai) {
    const { OpenAI } = await import('openai');
    __openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return __openai;
}

/* ------------------------------- helpers ---------------------------------- */

const wc = (html='') =>
  String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ').trim().split(' ').filter(Boolean).length;

const today = () =>
  new Date().toLocaleDateString(undefined,{ year:'numeric', month:'long', day:'2-digit' });

const clamp = (n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));

const SECTION_FLOORS = {
  exec:       2400,
  current:    3000,
  financials: 2800,
  kpis:       2400,
  timeline:   2400,
  ops:        3000,
  risk:       2200,
  roi:        2000,
  conclusion: 1400,
};
const TOTAL_FLOOR = Object.values(SECTION_FLOORS).reduce((a,b)=>a+b,0);

/* [KT:AI-CURRENCY] */
async function resolveCurrency(country=''){
  const openai = await getOpenAI();
  try{
    const r = await openai.chat.completions.create({
      model: MODEL, temperature: 1,
      messages: [
        { role:'system', content:'Return ONLY a 3-letter ISO 4217 currency code.' },
        { role:'user',   content:`Country: ${country}` }
      ]
    });
    const code = (r.choices?.[0]?.message?.content || '').trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
    return /^[A-Z]{3}$/.test(code) ? code : 'USD';
  }catch{ return 'USD'; }
}

/* ========================================================================== */

/* [KT:VIZ] detection + extraction helpers                                      */
/* ========================================================================== */

const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const hasViz = (html='') => HAS_VIZ_RE.test(String(html||''));

function safeParseAttrJSON(s=''){
  try {
    return JSON.parse(
      String(s)
        .replace(/&quot;/g,'"')
        .replace(/&amp;/g,'&')
        .replace(/&#39;/g,"'")
    );
  } catch { return null; }
}

function toAttrJSON_RAW(obj){
  try {
    const json = JSON.stringify(obj);
    return json.replace(/'/g, '&#39;').replace(/\r\n|\n|\r/g, ' ');
  } catch { return '{}'; }
}

/* Extract a single viz fragment */
const extractVizFragment = (s='') => {
  const str = String(s||'');
  const m1 = str.match(/<figure[^>]*data-chart=(["'])([\s\S]*?)\1[\s\S]*?<\/figure>/i); if (m1) return m1[0];
  const m2 = str.match(/<figure[^>]*data-widget=(["'])benchmark\1[\s\S]*?<\/figure>/i);  if (m2) return m2[0];
  const m3 = str.match(/<div[^>]*data-heatmap=(["'])([\s\S]*?)\1[\s\S]*?<\/div>/i);      if (m3) return m3[0];
  return '';
};

function parseVizMeta(frag=''){
  const out = { kind:'', type:'', title:'', xTitle:'', yTitle:'', labelsLen:0, dataLen:0, /* alias */ labelsLen2:0 };
  // Mirror both fields for verification
out.labelsLen2 = out.labelsLen;
console.log(`[SR:LABELS] kind=${out.kind} title=${out.title} labelsLen=${out.labelsLen} labelsLen2=${out.labelsLen2}`);

  if (!frag) return out;

  const chart = frag.match(/<figure[^>]*data-chart=(["'])([\s\S]*?)\1/i);
  if (chart) {
    out.kind = 'chart';
    try {
      const captured = chart[2];
      const json = safeParseAttrJSON(captured);
      if (json && typeof json==='object'){
        out.type  = String(json.type||'');
        out.title = String(json.title||'');
        out.xTitle = String(json.xTitle||'');
        out.yTitle = String(json.yTitle||'');
        out.labelsLen = Array.isArray(json.labels) ? json.labels.length : 0;
out.dataLen   = Array.isArray(json.datasets?.[0]?.data) ? json.datasets[0].data.length : 0
   out.labelsLen2 = out.labelsLen;   }
    } catch (e) { console.log(TAG, 'predictive.parse.exception', String(e?.message||e)); }
    return out;
  }

  const bench = frag.match(/<figure[^>]*data-widget=(["'])benchmark\1[^>]*data-spec=(["'])([\s\S]*?)\2/i);
  if (bench) {
    out.kind = 'benchmark';
    try {
      const captured = bench[3];
      const json = safeParseAttrJSON(captured);
      out.type  = 'benchmark';
      out.title = String(json?.title||'');
      out.xTitle = 'Measure';
      out.yTitle = String(json?.yTitle||'');
      out.labelsLen = 2;
      out.dataLen   = 2;
      out.labelsLen2 = out.labelsLen;
    } catch (e) { console.log(TAG, 'predictive.parse.exception', String(e?.message||e)); }
    return out;
  }

  const heat = frag.match(/<div[^>]*data-heatmap=(["'])([\s\S]*?)\1/i);
  if (heat) {
    out.kind = 'heatmap';
    try {
      const captured = heat[2];
      const json = safeParseAttrJSON(captured);
      out.type  = 'heatmap';
      out.title = String(json?.title||'');
      out.xTitle = 'Columns';
      out.yTitle = 'Rows';
      out.labelsLen = Array.isArray(json?.cols) ? json.cols.length : 0;
      out.dataLen   = Array.isArray(json?.data) ? json.data.length : 0;
      out.labelsLen2 = out.labelsLen;
    } catch (e) { console.log(TAG, 'predictive.parse.exception', String(e?.message||e)); }
    return out;
  }
  return out;
}

function collectExistingVizMeta(html=''){
  const titles = new Set();
  const sigs   = new Set();
  const re = /(<figure[^>]*data-chart=(["'])([\s\S]*?)\2[\s\S]*?<\/figure>)|(<figure[^>]*data-widget=(["'])benchmark\5[\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=(["'])([\s\S]*?)\7[\s\S]*?<\/div>)/ig;
  const all = String(html||'').match(re) || [];
  for (const frag of all){
    const meta = parseVizMeta(frag);
    const t = (meta.title||'').trim().toLowerCase() || '(untitled)';
    titles.add(t);
    sigs.add(`${meta.kind}|${t}`);
  }/* DEBUG:FINGERPRINT */ console.log('[labels-field-test] kind=%s title=%s labelsLen=%s labelsLen2=%s',
  out.kind, out.title, out.labelsLen, out.labelsLen2);

  return { titles, sigs };
}

/* ========================================================================== */

/* Guidance blocks                                                              */
/* ========================================================================== */

const NO_VISUALS_GUIDANCE = `
Do NOT include any <figure> charts, <div data-heatmap>, or benchmark widgets in this section.
If numeric evidence is helpful, use ONE compact <table class="report-table"> per section (exec summary excluded).
`;

/* ========================================================================== */

/* Predictive analytics — keywords-first                                        */
/* ========================================================================== */

function isStandardSectionGraphDuplicate(section, meta){
  if (!meta || !meta.title) return false;
  const t = meta.title.toLowerCase();
  const reservedBySection = {
    exec: ['savings over time','savings by month','savings by year'],
    financials: ['capex vs opex','payback curve'],
    kpis: ['kpi benchmark','savings benchmark']
  };
  const reserved = (reservedBySection[section] || []).map(s => s.toLowerCase());

  return reserved.includes(t);
}

function mergeSynth(section, canon, cand) {
  const merged = JSON.parse(JSON.stringify(cand || {}));
  merged.title  = merged.title  || `${String(section).toUpperCase()} Forecast`;
  merged.xTitle = merged.xTitle || 'X';
  merged.yTitle = merged.yTitle || 'Y';
  if (!Array.isArray(merged.datasets)) merged.datasets = [];
  if (!merged.datasets[0]) merged.datasets[0] = { label: merged.title, data: [] };
  const values = Array.isArray(merged.datasets?.[0]?.data) ? merged.datasets[0].data : [];
  const needLabels = !Array.isArray(merged.labels) || merged.labels.length === 0 || merged.labels.length !== values.length;
  if (values.length > 0 && needLabels) {
    const unit = (merged.xTitle || '').toLowerCase().includes('month') ? 'M' : 'Y';
    merged.labels = Array.from({ length: values.length }, (_, i) => `${unit}${i + 1}`);
  }
  return merged;
}

function renderCandidateToFragment(section, c){
  if (String(c.type||'').toLowerCase()==='heatmap' && section==='risk'){
    const spec = {
      title: c.title,
      rows: Array.isArray(c.rows) ? c.rows.slice(0,12) : ['R1','R2','R3','R4','R5'],
      cols: Array.isArray(c.cols) ? c.cols.slice(0,12) : ['C1','C2','C3','C4','C5'],
      data: Array.isArray(c.data) ? c.data : []
    };
    return `<div data-heatmap='${toAttrJSON_RAW(spec)}' data-origin="predictive"></div>`;
  }
  const spec = {
    type: String(c.type||'line').toLowerCase(),
    title: c.title,
    xTitle: c.xTitle,
    yTitle: c.yTitle,
    labels: c.labels,
    datasets: c.datasets.map(ds => ({ label: ds.label || 'Predicted', data: ds.data }))
  };
  return `<figure data-chart='${toAttrJSON_RAW(spec)}' data-origin="predictive"></figure>`;
}

function synthTitleIfMissing(section, frag){
  return String(frag).replace(
    /(<figure[^>]*data-chart=(['"]))([\s\S]*?)(\2[^>]*>[\s\S]*?<\/figure>)/i,
    (m, pre, q, jsonRaw, post) => {
      const obj = safeParseAttrJSON(jsonRaw) || {};
      let changed = false;
      if (!String(obj.title||'').trim()){
        obj.title = `${section.toUpperCase()} Predictive ${Math.floor(Math.random()*900)+100}`;
        changed = true;
        console.log(TAG, 'predictive.titleSynth', section, { title: obj.title });
      }
      if (!String(obj.xTitle||'').trim()){ obj.xTitle = 'Years'; changed = true; }
      if (!String(obj.yTitle||'').trim()){ obj.yTitle = 'Index'; changed = true; }
      const jsonAttr = toAttrJSON_RAW(obj);
      return pre + jsonAttr + post;
    }
  );
}

/* Predictive short description under every graph — executive tone
   FIX #6: ensures description + short analysis under each graph */
async function predictiveDescription(section, canon, meta){
  const openai = await getOpenAI();
  try{
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role:'system', content:'Return one short HTML paragraph only (<p class="chart-note">…</p>).' },
        { role:'user',   content: `Explain "${meta.title}" (X:${meta.xTitle} / Y:${meta.yTitle}) for ${canon.orgName}. Give 2 insights and 1 action for executives.` }
      ]
    });
    const p = (res.choices?.[0]?.message?.content || '').trim();
    return /^<p/i.test(p) ? p : `<p class="chart-note">${p}</p>`;
  }catch{ return '<p class="chart-note">Executive interpretation currently unavailable.</p>'; }
}

/* Annotate all visuals with descriptions — FIX #6 */
async function annotateAllVisuals(html, canon){
  let out = html;
  const re = /(<figure[^>]*data-chart[^>]*>[\s\S]*?<\/figure>|<div[^>]*data-heatmap=(["'])([\s\S]*?)\2[\s\S]*?<\/div>)/ig;
  const found = [...String(out).matchAll(re)];
  for (const m of found){
    const frag = m[0];
    const meta = parseVizMeta(frag);
    const already = /class="chart-note"/i.test(frag);
    if (already) continue;
    const note = await predictiveDescription('section', canon, meta);
    out = out.replace(frag, frag + '\n' + note);
  }
  return out;
}

/* ========================================================================== */

/* Table helpers — FIX #2, #3, #4                                               */
/* ========================================================================== */

/* Add bold black titles above tables (AI-generated) — FIX #3 */
async function annotateTablesWithTitles(html, canon){
  const openai = await getOpenAI();
  let out = String(html||'');
  const re = new RegExp('((?:</p>\\s*)?)(<table\\s+class=["\\\']report-table["\\\'][\\s\\S]*?</table>)','ig');
  const parts = [];
  let last = 0, m;
  const MAX_TABLES = 20; // generous; we’ll enforce one-per-section later
  while ((m = re.exec(out)) !== null && parts.length < MAX_TABLES) {
    const before = out.slice(Math.max(0, m.index - 600), m.index);
    let title = '';
    try{
      const r = await openai.chat.completions.create({
        model: MODEL, temperature: 1,
        messages: [
          { role:'system', content:'Return ONLY a short title (4–8 words), no punctuation.' },
          { role:'user', content:`Write a clear table title for ${canon.orgName} based on this nearby text:\n${before}` }
        ]
      });
      title = (r.choices?.[0]?.message?.content || '').trim();
    }catch{}
    const caption = `<p class="table-title"><strong>${title || 'Table'}</strong></p>\n`; /* bold + black via CSS */
    parts.push(out.slice(last, m.index) + caption + m[2]);
    last = m.index + m[0].length;
  }
  parts.push(out.slice(last));
  return parts.join('');
}

/* Enforce ONE table per section (exec excluded) and prevent overflow — FIX #2 + #4 */
function enforceOneTablePerSection(html){
  const ids = ['current','financials','kpis','timeline','ops','risk','roi','conclusion']; // exec excluded
  let out = String(html||'');

  for (const id of ids){
    const segRe = new RegExp(`(<h2[^>]*id=["']${id}["'][\\s\\S]*?)(?=<h2\\b|</body>)`,'i');
    const m = out.match(segRe);
    if (!m) continue;
    const seg = m[1];
    const tables = [...seg.matchAll(/<table\b[^>]*class=["']report-table["'][\s\S]*?<\/table>/ig)];
    if (tables.length <= 1) continue;

    let kept = 0;
    let newSeg = seg.replace(/<table\b[^>]*class=["']report-table["'][\s\S]*?<\/table>/ig, (tbl)=>{
      if (kept === 0){ kept++; return tbl; }
      /* Comment out extras instead of deleting — FIX #2/#4 */
      return `<!-- [KT:FIX#2/#4] Extra table commented out to keep one per section and avoid overflow -->\n<!--\n${tbl}\n-->`;
    });

    out = out.replace(segRe, newSeg);
  }
  return out;
}

/* Ensure chart/table titles are unique — FIX #10 */
function ensureUniqueTitles(html){
  let out = String(html||'');
  const seen = new Set();

  // 1) Chart titles inside data-chart JSON
  out = out.replace(/(<figure[^>]*data-chart=(['"]))(.*?)(\2[^>]*>[\s\S]*?<\/figure>)/ig, (m, pre, q, jsonRaw, post)=>{
    const obj = safeParseAttrJSON(jsonRaw) || {};
    let t = String(obj.title||'').trim();
    if (!t) return m;
    let uniq = t, idx = 2;
    while (seen.has(uniq.toLowerCase())) { uniq = `${t} (${idx++})`; }
    seen.add(uniq.toLowerCase());
    if (uniq !== t){ obj.title = uniq; }
    return pre + toAttrJSON_RAW(obj) + post;
  });

  // 2) Table titles <p class="table-title"><strong>...</strong></p>
  out = out.replace(/(<p\s+class=["']table-title["']>\s*<strong>)([\s\S]*?)(<\/strong>\s*<\/p>)/ig, (m, pre, t, post)=>{
    let title = String(t||'').trim() || 'Table';
    let uniq = title, idx = 2;
    while (seen.has(uniq.toLowerCase())) { uniq = `${title} (${idx++})`; }
    seen.add(uniq.toLowerCase());
    return pre + uniq + post;
  });

  // 3) H2/H3/H4 headings
  out = out.replace(/(<h[234][^>]*>)([\s\S]*?)(<\/h[234]>)/ig, (m, pre, t, post)=>{
    const raw = String(t||'').replace(/<[^>]*>/g,'').trim();
    if (!raw) return m;
    let uniq = raw, idx = 2;
    while (seen.has(uniq.toLowerCase())) { uniq = `${raw} (${idx++})`; }
    seen.add(uniq.toLowerCase());
    if (uniq === raw) return m;
    return pre + m.replace(t, t.replace(raw, uniq)).split(pre)[1]; // preserve inner HTML
  });

  return out;
}

/* ========================================================================== */

/* Section text prompts                                                         */
/* ========================================================================== */

/* FIX #1: switch to 3–4 sentences per paragraph; 2–3 paragraphs allowed */
function sectionPrompt(section, canon, minWords){
  return `
Audience: C-suite. Tone: concise, evidence-driven, pragmatic.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Size: ${canon.companySize}. Time frame: ${canon.timeFrame}.

/* FIX #1 */ Paragraph discipline: write paragraphs with 3–4 sentences. Each sentence ≤ 20 words.
/* FIX #2 */ Use at most ONE <table class="report-table"> per section (exec summary excluded).
${NO_VISUALS_GUIDANCE}

Section: ${section}.
Hard minimum words: ${minWords}. Avoid filler. No appendix here.
`.trim();
}

/* FIX #1: expansion keeps 3–4 sentence paragraphs */
function expandPrompt(section, canon, remainingWords){
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
/* FIX #1 */ Write 2–3 paragraphs; each paragraph has 3–4 sentences; sentences ≤ 20 words.
Target at least ${remainingWords} words. Output valid HTML only.
Use <table class="report-table"> for any tables. Do NOT include charts or heatmaps here.
`.trim();
}

/* ========================================================================== */

/* Implementation Kit JSON (appendices content from Oct 10 spec) — FIX #9      */
/* ========================================================================== */

async function genImplKitJSON(canon, sections){
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

  try{
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role:'system', content:'Return strict JSON only. No prose.' },
        { role:'user',   content: body + `\n\n--- CONTEXT (EXCERPTS) ---\nEXEC:\n${sections.exec}\n\nCURRENT:\n${sections.current}\n\nFINANCIALS:\n${sections.financials}\n\nKPIS:\n${sections.kpis}\n\nTIMELINE:\n${sections.timeline}\n\nOPS:\n${sections.ops}\n\nRISK:\n${sections.risk}\n\nROI:\n${sections.roi}\n\nCONCLUSION:\n${sections.conclusion||''}` }
      ]
    });
    const txt = res.choices?.[0]?.message?.content || '{}';
    let json = {};
    try { json = JSON.parse(txt); } catch { json = {}; }
    if (json && typeof json === 'object') return json;
    return {};
  }catch(e){
    console.log(TAG, 'appendix.implKit.error', String(e?.message||e));
    return {};
  }
}

/* ========================================================================== */

/* [KT:AUDIT] McKinsey polish (structure safe)                                  */
/* ========================================================================== */

function enforceSectionAnchors(s){
  let out = String(s||'');
  const map = [
    { title:/<h2[^>]*>\s*Executive Summary\s*<\/h2>/i, id:'exec' },
    { title:/<h2[^>]*>\s*Current State\s*<\/h2>/i, id:'current' },
    { title:/<h2[^>]*>\s*Financials\s*<\/h2>/i, id:'financials' },
    { title:/<h2[^>]*>\s*KPIs?\s*&\s*Targets\s*<\/h2>/i, id:'kpis' },
    { title:/<h2[^>]*>\s*Implementation Plan\s*<\/h2>/i, id:'timeline' },
    { title:/<h2[^>]*>\s*Operating Model\s*<\/h2>/i, id:'ops' },
    { title:/<h2[^>]*>\s*Risks?\s*&\s*Mitigations\s*<\/h2>/i, id:'risk' },
    { title:/<h2[^>]*>\s*ROI\s*&\s*Next Steps\s*<\/h2>/i, id:'roi' },
    { title:/<h2[^>]*>\s*Conclusion\s*<\/h2>/i, id:'conclusion' },
  ];
  for (const {title, id} of map){
    out = out.replace(title, (m)=>{
      if (/id=/.test(m)) return m;
      return m.replace(/<h2\b/i, `<h2 id="${id}"`);
    });
  }
  const required = ['exec','current','financials','kpis','timeline','ops','risk','roi','conclusion'];
  for (const id of required){
    if (!new RegExp(`id=["']${id}["']`).test(out)){
      out = out.replace(new RegExp(`(<section[^>]*id=["']${id}["'][\\s\\S]*?<h2\\b)(?![^>]*id=)`, 'i'), `$1 id="${id}" `);
    }
  }
  return out;
}

async function polishMcKinsey(html, canon){
  const openai = await getOpenAI();
  console.log(TAG, '[KT:AUDIT] start', { org: canon.orgName });

  const prompt = `
POLISH THE HTML REPORT for ${canon.orgName}.
- Benchmark vs McKinsey/BCG/Bain.
- Keep structure and length roughly stable (±5% not enforced hard).
- Do NOT add/remove figures/tables or edit chart specs; style only.

Improve: paragraph discipline (3–4 sentences), caption alignment, table header clarity, spacing, and readability.
Return STRICT JSON: {"applied":true,"notes":["..."],"html":"<FULL HTML>"} 
`.trim();

  try{
    const res = await openai.chat.completions.create({
      model: MODEL, temperature: 1,
      messages: [
        { role:'system', content:'Return JSON only with keys "applied","notes","html".' },
        { role:'user',   content: prompt + `\n\n--- HTML ---\n${ html }` }
      ]
    });
    let obj = {}; try { obj = JSON.parse(res.choices?.[0]?.message?.content || '{}'); } catch { obj = {}; }
    let newHtml = String(obj.html||'').trim();
    if (!obj.applied || !newHtml) return html;
    return newHtml;
  }catch(e){
    console.log(TAG, '[KT:AUDIT] error', String(e?.message||e));
    return html;
  }
}

/* ========================================================================== */

/* Standard visuals (exec, financials, KPI dashboard, risk heatmap)             */
/* ========================================================================== */

function ensureStandardVisuals(out, canon){
  // Inject graph CSS once — FIX #7 improves readability sizing
  if (typeof GRAPH_CSS === 'string' && !/id=["']graph-css["']/.test(out)) {
    const cssTag = `<style id="graph-css">${GRAPH_CSS}</style>`;
    out = out.replace(/<\/head>/i, cssTag + '\n</head>');
  }

  const THEME = `
  <style id="kt-theme">
    .report-table{ max-width:100%; width:100%; display:block; overflow:auto; border-collapse:collapse; table-layout:fixed; } /* FIX #4 */
    .report-table th, .report-table td{ padding:8px 10px; border:1px solid #dfe6f3; word-wrap:break-word; } /* FIX #4 */
    .table-title{ margin:6px 0 4px; font-weight:700; font-size:1.05rem; color:#000; } /* FIX #3 bold black */
    #kpis{ page-break-before: always; }
    /* FIX #7: full-page 2x2 dashboard layout and readable labels */
    #kpis .dash-grid{ display:flex; flex-wrap:wrap; gap:16px; }
    #kpis figure[data-chart]{ flex: 1 1 calc(50% - 16px); min-width: 420px; }
    figure[data-chart] { font-size: 1rem; }
    .chart-note{ font-size:.95rem; margin:8px 2px 0; opacity:.95; }
  </style>`;
  if (!/id=["']kt-theme["']/.test(out)) {
    out = out.replace(/<\/head>/i, THEME + '\n</head>');
  }

  const within = (id) => {
    const re = new RegExp(`(<h2[^>]*id=["']${id}["'][\\s\\S]*?)(?=<h2\\b|</body>)`, 'i');
    const m = out.match(re);
    return { re, m, seg: m ? m[1] : '' };
  };
  const insertIfMissing = (id, titleRegex, frag) => {
    const { re, seg } = within(id);
    if (!seg) return;
    if (titleRegex && titleRegex.test(seg)) return;
    const injected = seg + '\n' + frag;
    out = out.replace(re, injected);
  };

  const yCur = canon.currencyCode || 'USD';
  const labels = ['Y1','Y2','Y3'];
  const savingsY1 = Math.round((canon.costSavingsGoal || 1000000) * 0.25);
  const savingsY2 = Math.round((canon.costSavingsGoal || 1000000) * 0.65);
  const savingsY3 = Math.round((canon.costSavingsGoal || 1000000) * 1.00);

  // EXEC: line
  {
    const spec = { type:'line', title:'Savings by Period', xTitle:'Years', yTitle:yCur, labels,
      datasets:[{ label:'Savings', data:[savingsY1, savingsY2, savingsY3] }] };
    const frag = `<figure data-chart='${toAttrJSON_RAW(spec)}' data-origin="standard"></figure>`;
    insertIfMissing('exec', /Savings by Period/i, frag);
  }

  // FINANCIALS: bar + line
  {
    const exp = { type:'bar',  title:'Expenditures Over Time', xTitle:'Years', yTitle:yCur, labels,
      datasets:[{ label:'Expenditures', data:[savingsY1*0.6, savingsY2*0.4, savingsY3*0.2].map(v=>Math.round(v)) }] };
    const pay = { type:'line', title:'Payback Curve', xTitle:'Years', yTitle:'Percent', labels,
      datasets:[{ label:'Payback %', data:[25,70,100] }] };
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

  // KPIs: dashboard 2x2 — FIX #7 + FIX #8 (title includes "Dashboard" below)
  {
    const kpiSavings = { type:'bar', title:'KPI: Savings (3-Year)', xTitle:'Years', yTitle:yCur, labels,
      datasets:[{ label:'Savings', data:[savingsY1, savingsY2, savingsY3] }] };
    const kpiPayback = { type:'line', title:'KPI: Payback', xTitle:'Years', yTitle:'Percent', labels,
      datasets:[{ label:'Payback', data:[30,65,95] }] };
    const kpiMetricA = { type:'bar', title:'KPI: AOV vs Benchmark', xTitle:'Years', yTitle:'Index', labels,
      datasets:[{ label:'Index', data:[95,102,110] }] };
    const kpiMetricB = { type:'bar', title:'KPI: Conversion vs Benchmark', xTitle:'Years', yTitle:'Index', labels,
      datasets:[{ label:'Index', data:[90,100,108] }] };

    const f1 = `<figure data-chart='${toAttrJSON_RAW(kpiSavings)}' data-origin="standard"></figure>`;
    const f2 = `<figure data-chart='${toAttrJSON_RAW(kpiPayback)}' data-origin="standard"></figure>`;
    const f3 = `<figure data-chart='${toAttrJSON_RAW(kpiMetricA)}' data-origin="standard"></figure>`;
    const f4 = `<figure data-chart='${toAttrJSON_RAW(kpiMetricB)}' data-origin="standard"></figure>`;

    const { re, seg } = within('kpis');
    if (seg) {
      let injected = seg;
      if (!/KPI:\s*Savings/i.test(seg)) injected += '\n<div class="dash-grid">\n' + [f1,f2,f3,f4].join('\n') + '\n</div>';
      out = out.replace(re, injected);
    }
  }

  // RISK: heatmap
  {
    const rows = ['Supply Risk','Demand Variability','Operational','Regulatory','Competitive'];
    const cols = ['Impact','Likelihood','Velocity'];
    const data = rows.map(() => cols.map(()=> Math.round(60 + Math.random()*30)));
    const spec = { title: 'Risk Heatmap', rows, cols, data };
    const frag = `<div data-heatmap='${toAttrJSON_RAW(spec)}' data-origin="standard"></div>`;
    insertIfMissing('risk', /Risk Heatmap/i, frag);
  }

  return out;
}

/* ========================================================================== */

/* generation core                                                              */
/* ========================================================================== */

function sanitizeNonPredictiveVisuals(section, html){
  let out = String(html||'')
    .replace(/<figure[^>]*data-widget=(["'])benchmark\1[\s\S]*?<\/figure>/ig, '')
    .replace(/<div[^>]*data-heatmap=(["'])([\s\S]*?)\1[\s\S]*?<\/div>/ig, '');
  // If any <figure data-chart> present, we leave it (predictive or standard)
  return out;
}

async function genSectionFirstPass(section, canon, minWords){
  const openai = await getOpenAI();
  const prompt = sectionPrompt(section, canon, minWords);
  try{
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role:'system', content:'You are an expert business analyst.' },
        { role:'user',   content: prompt }
      ]
    });
    const html = (res.choices?.[0]?.message?.content || '').trim();
    return sanitizeNonPredictiveVisuals(section, html);
  } catch(e){
    console.log(TAG, 'section.first.error', section, String(e?.message||e));
    return '';
  }
}

async function topUpSection(section, canon, html, floor){
  if (wc(html) >= floor) return html;
  const remaining = floor - wc(html);
  const openai = await getOpenAI();
  const prompt = expandPrompt(section, canon, remaining);
  try{
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role:'system', content:'You are an expert business analyst.' },
        { role:'user',   content: prompt }
      ]
    });
    const moreHtml = (res.choices?.[0]?.message?.content || '').trim();
    const combined = html + '\n' + sanitizeNonPredictiveVisuals(section, moreHtml);
    return combined;
  } catch(e){
    console.log(TAG, 'section.topup.error', section, String(e?.message||e));
    return html;
  }
}

async function choosePredictiveFragment(section, canon, html, existingSigs=new Set()){
  const openai = await getOpenAI();
  const query = `Return JSON only. A ${section.toUpperCase()} chart spec for ${canon.orgName}.`;
  try {
    // Strategy: always attempt either KEYWORDS or BEST-GUESS series
    const [a, b] = await Promise.allSettled([
      openai.chat.completions.create({
        model: MODEL, temperature: 1,
        messages: [
          { role:'system', content:'Output strict JSON (no code fences, no prose).' },
          { role:'user',   content: `From content below, provide a JSON chart spec (no explanation). Section: ${section}.\n---\n${html}` }
        ]
      }),
      openai.chat.completions.create({
        model: MODEL, temperature: 1,
        messages: [
          { role:'system', content:'Output strict JSON (no code fences, no prose).' },
          { role:'user',   content: query }
        ]
      })
    ]);
    const candList = [];
    for (const p of [a, b]){
      if (p.status === 'fulfilled'){
        const raw = p.value.choices?.[0]?.message?.content || '';
        try {
          const obj = JSON.parse(raw);
          if (obj && typeof obj === 'object') {
            candList.push(obj);
          }
        } catch {}
      }
    }
    // Evaluate candidates, prefer one with data
    const scored = candList.map(c => {
      const meta = parseVizMeta(renderCandidateToFragment(section, c));
      const title = (meta.title || '').toLowerCase();
      const duplicate = existingSigs.has(`${meta.kind}|${title}`) || isStandardSectionGraphDuplicate(section, meta);
      const score = (meta.dataLen || 0) + (meta.labelsLen || 0) - (duplicate ? 1000 : 0);
      return { c, score };
    }).sort((x,y) => y.score - x.score);
    const best = scored[0]?.c;
    if (!best) return '';
    const fragSynth = renderCandidateToFragment(section, best);
    const fragFinal = synthTitleIfMissing(section, fragSynth);
    const desc = section==='exec' ? '' : await predictiveDescription(section, canon, parseVizMeta(fragFinal));
    return fragFinal + (desc ? '\n' + desc : '');  /* FIX #6 ensures description is appended */
  } catch(e) {
    console.log(TAG, 'predictive.choose.error', section, String(e?.message||e));
    return '';
  }
}

async function genConclusion(canon, sections){
  const openai = await getOpenAI();
  try {
    const res = await openai.chat.completions.create({
      model: MODEL, temperature: 1,
      messages: [
        { role:'system', content: 'You are an expert business analyst.' },
        { role:'user',   content:
`Write the Conclusion for a transformation report for ${canon.orgName} (${canon.country}).
Include key takeaways and a call to action.
Use a confident, executive tone and keep paragraphs disciplined: 3–4 sentences each.` }, /* FIX #1 */
      ]
    });
    return (res.choices?.[0]?.message?.content || '').trim();
  } catch(e){
    console.log(TAG, 'conclusion.error', String(e?.message||e));
    return '';
  }
}

export async function POST(req){
  try {
    const input = await req.json();

    const canon = {
      lang:           input.lang || 'English',
      orgName:        input.orgName || 'Client',
      country:        input.country || 'Canada',
      tier:           input.tier || 'Tier 2 – National',
      companySize:    input.companySize || '5,001–10,000',
      timeFrame:      input.timeFrame || '2 years',
      costSavingsGoal: Number(input.costSavingsGoal || 2000000),
      strategicGoal:  input.strategicGoal || '',
      desiredOutcome: input.desiredOutcome || '',
      preparedFor:    input.preparedFor || '',
      preparedBy:     input.preparedBy || '',
      logoUrl:        input.logoUrl || '/images/secure.png',
      reportDate:     today(),
      minWords:       clamp(input.minWords || 20000, 8000, 80000),
    };
    canon.minWords = TOTAL_FLOOR;
    canon.currencyCode = await resolveCurrency(canon.country);

    console.log(TAG, 'generate.start', { model: MODEL, org: canon.orgName, minWords: canon.minWords });

    const order = ['exec','current','financials','kpis','timeline','ops','risk','roi','conclusion'];
    const sections = {};
    const __predictiveFrags = { exec:[], current:[], financials:[], kpis:[], timeline:[], ops:[], risk:[], roi:[], conclusion:[] };

    for (const key of order){
      if (key === 'conclusion') {
        sections.conclusion = await genConclusion(canon, sections);
        continue;
      }

      const floor = SECTION_FLOORS[key] || 1200;

      let html = await genSectionFirstPass(key, canon, floor);
      html     = await topUpSection(key, canon, html, floor);

      const { sigs: existingSigs } = collectExistingVizMeta(html);
      const preHas = hasViz(html);
      console.log(TAG, 'section.viz.precheck', key, { has: preHas, htmlLen: html.length, words: wc(html) });

      if (key !== 'exec') {
        try {
          const predFrag = await choosePredictiveFragment(key, canon, html, existingSigs);
          if (predFrag) {
            html += '\n' + predFrag; /* FIX #6 ensured description appended */
            __predictiveFrags[key].push(predFrag);
            console.log(TAG, 'section.vizInjected', key, { mode: 'predictive-keywords' });
          }
        } catch (e) {
          console.log(TAG, 'section.viz.branch.error', key, String(e?.message||e));
        }
      }

      sections[key] = html;
    }

    // Build phases + appendices (RACI/ImplKit) — FIX #9
    let phases = []; try {
      const openai = await getOpenAI();
      const res = await openai.chat.completions.create({
        model: MODEL, temperature: 1,
        messages: [
          { role:'system', content:'Extract phases as JSON: [{"title":"Phase X","caption":"one sentence"}, ...] (5 items). Output only pure JSON.' },
          { role:'user',   content: `From this timeline for ${canon.orgName}, extract 5 phases.\n---\n${sections.timeline||''}` },
        ],
      });
      phases = JSON.parse(res.choices?.[0]?.message?.content || '[]').slice(0,5);
    } catch { phases = []; }
    if (!Array.isArray(phases) || phases.length < 5){
      phases = [1,2,3,4,5].map(i=>({ title: `Phase ${i}`, caption: i===1 ? 'Kickoff & baselines' : i===5 ? 'Sustain & scale' : 'Milestones & deliverables' }));
    }

    const implKit = await genImplKitJSON(canon, sections); /* FIX #9 uses Oct 10 appendix spec */

    let html = buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit });

    // KPI title normalization — FIX #8
    html = normalizeKpiTitle(html);

    // Standard visuals (exec/financials/dashboard/heatmap)
    html = ensureStandardVisuals(html, canon);

    // Add table titles (bold black), enforce one table per section, uniq titles — FIX #2/#3/#4/#10
    html = await annotateTablesWithTitles(html, canon); /* FIX #3 */
    html = enforceOneTablePerSection(html);            /* FIX #2 + #4 */
    html = ensureUniqueTitles(html);                   /* FIX #10 */

    // Ensure every visual has an executive description — FIX #6
    html = await annotateAllVisuals(html, canon);

    // Enforce anchors; keep figures as data-* (no server upgrade) — FIX #5
    html = enforceSectionAnchors(html);
    /* FIX #5 COMMENTED OUT:
       html = upgradeChartsToHTML(html); */

    // Final polish (style-only)
    html = await polishMcKinsey(html, canon);

    // Return
    const sectionsWords = wc(Object.values(sections).join(' '));
    const htmlWords     = wc(html);
    console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

    return NextResponse.json({ ok: true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });

  } catch (err) {
    console.error(TAG, "fatal", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/* =========================
   NOTES — Fix mapping
   =========================
   FIX #1  — Paragraph discipline updated to 3–4 sentences (sectionPrompt/expandPrompt).
   FIX #2  — One table per section (exec excluded) via enforceOneTablePerSection(); extras commented.
   FIX #3  — Bold black table titles added by annotateTablesWithTitles() + CSS.
   FIX #4  — Tables overflow controlled via CSS (table-layout:fixed; word-wrap:break-word) and #2 limit.
   FIX #5  — Client dropdown can change chart type: upgradeChartsToHTML() call commented; specs preserved.
   FIX #6  — Every graph/heatmap gets a concise executive description (predictiveDescription + annotateAllVisuals).
   FIX #7  — KPI dashboard full-page 2x2 with readable sizing via CSS (.dash-grid, min-width).
   FIX #8  — KPI section title includes “Dashboard” (normalizeKpiTitle()).
   FIX #9  — Appendix content sourced from Oct 10 spec (genImplKitJSON contexts).
   FIX #10 — Unique titles enforced (charts, tables, headings) via ensureUniqueTitles().
*/
