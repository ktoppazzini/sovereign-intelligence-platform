/* ===============================
   app/api/reform/generate/route.js
   Structure-first build (20k words target)
   =============================== */

import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate.js';
import { planDiagramHTML } from '@/lib/implPlan.js';
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js';

const TAG   = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------------- helpers ---------------------------------- */
const wc = (html='') =>
  String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ').trim().split(' ').filter(Boolean).length;

const clamp = (n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));

const SECTION_FLOORS = {
  exec:       2600,
  current:    3000,
  financials: 3000,
  kpis:       2600,
  timeline:   2600,
  ops:        3000,
  risk:       2200,
  roi:        2400,
  conclusion: 1200,
};
const TOTAL_FLOOR = Object.values(SECTION_FLOORS).reduce((a,b)=>a+b,0);

const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const hasViz = (html='') => HAS_VIZ_RE.test(String(html||''));

function safeParseAttrJSON(s=''){
  try {
    return JSON.parse(
      String(s)
        .replace(/&quot;/g,'\"')
        .replace(/&amp;/g,'&')
        .replace(/&#39;/g,"'")
    );
  } catch { return null; }
}
function toAttrJSON_RAW(obj){
  try { return JSON.stringify(obj).replace(/'/g,'&#39;').replace(/\s+/g,' '); } catch { return '{}'; }
}

/* ========================================================================== */
/* Section prompts                                                             */
/* ========================================================================== */
function noVisualsGuidance(){
  return `
Do NOT include any <figure> charts, <div data-heatmap>, or benchmark widgets in this section.
If numeric evidence is helpful, use ONE compact <table class="report-table">…</table> only.
`.trim();
}
function sectionPrompt(section, canon, minWords){
  return `
Audience: C‑suite. Tone: concise, pragmatic, evidence‑driven.
Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.
Company size: ${canon.companySize}. Time frame: ${canon.timeFrame}.

Discipline: paragraph blocks of 3–4 sentences. Avoid run‑ons and filler.
Use exactly one table if needed, marked <table class="report-table">…</table>.

Main section: ${section}.
Hard minimum words: ${minWords}.
${noVisualsGuidance()}
`.trim();
}
function expandPrompt(section, canon, remain){
  return `
Continue the SAME "${section}" section for ${canon.orgName} with NEW content only.
Target at least ${remain} words. Return valid HTML only.
Keep the discipline (3–4 sentence paragraphs) and at most one table.
${noVisualsGuidance()}
`.trim();
}

/* ========================================================================== */
/* Text generation core                                                        */
/* ========================================================================== */
function sanitizeNonPredictiveVisuals(section, html){
  let out = String(html||'')
    .replace(/<figure[^>]*data-widget=(["'])benchmark\1[\s\S]*?<\/figure>/ig, '')
    .replace(/<div[^>]*data-heatmap=(["'])([\s\S]*?)\1[\s\S]*?<\/div>/ig, '')
    .replace(/<figure[^>]*data-chart=(["'])([\s\S]*?)\1[\s\S]*?<\/figure>/ig, '');
  if (out !== html) console.log(TAG, 'section.viz.sanitized', section);
  return out;
}
async function genSectionFirstPass(section, canon, floor){
  console.log(TAG, 'section.start', section, { floor });
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role:'system', content:'You are a senior consultant. Return clean HTML fragments only.' },
      { role:'user',   content: sectionPrompt(section, canon, floor) },
    ],
  });
  let html = res.choices?.[0]?.message?.content?.trim() || '';
  html = sanitizeNonPredictiveVisuals(section, html);
  console.log(TAG, 'section.firstPass', section, wc(html));
  return html;
}
async function topUpSection(section, canon, currentHTML, floor){
  let html = currentHTML || '';
  let words = wc(html);
  let guard = 0;
  while (words < floor && guard < 6){
    const remaining = Math.max(300, floor - words);
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1,
      messages: [
        { role:'system', content:'Extend the section with NEW, non-duplicative content. Return HTML only.' },
        { role:'user',   content: expandPrompt(section, canon, remaining) },
      ],
    });
    const add = res.choices?.[0]?.message?.content?.trim() || '';
    html   += '\n' + sanitizeNonPredictiveVisuals(section, add);
    words   = wc(html);
    guard  += 1;
    console.log(TAG, 'section.topUp', section, { words, floor, pass:guard });
  }
  return html;
}

/* ========================================================================== */
/* Predictive visual — one per section                                         */
/* ========================================================================== */
function parseVizMeta(frag=''){
  const out = { kind:'', type:'', title:'', xTitle:'', yTitle:'' };
  const chart = frag.match(/<figure[^>]*data-chart=(["'])([\s\S]*?)\1/i);
  if (chart){ try {
    const json = safeParseAttrJSON(chart[2]) || {};
    out.kind='chart'; out.type=String(json.type||''); out.title=String(json.title||'');
    out.xTitle=String(json.xTitle||''); out.yTitle=String(json.yTitle||'');
  } catch{} }
  const heat = frag.match(/<div[^>]*data-heatmap=(["'])([\s\S]*?)\1/i);
  if (heat){ out.kind='heatmap'; out.type='heatmap'; out.title='Risk Heatmap'; out.xTitle='Columns'; out.yTitle='Rows'; }
  return out;
}
async function predictiveOne(section, canon){
  const years = /year/i.test(canon.timeFrame||'2 years');
  const labels = years ? ['Y1','Y2','Y3'] : ['M1','M2','M3','M4','M5','M6'];
  // ⬇️ replace from here …
const spec = ((k) => {
  const isYears = /year/i.test(String(canon?.timeFrame || ''));
  const xAxis = isYears ? 'Years' : 'Months';
  const cur = (typeof currencyForCountry === 'function')
    ? currencyForCountry(canon?.country)
    : 'USD';

  if (k === 'risk') return { heat: true, title: 'Risk Heatmap' };
  if (k === 'financials') return { type: 'line', title: 'Expenditures and Payback', xTitle: xAxis, yTitle: cur };
  if (k === 'kpis') return { type: 'bar', title: 'KPI: Savings vs Plan', xTitle: xAxis, yTitle: cur };
  if (k === 'ops') return { type: 'line', title: 'Operational Throughput Trend', xTitle: xAxis, yTitle: 'Index' };
  if (k === 'roi') return { type: 'line', title: 'ROI Trajectory', xTitle: xAxis, yTitle: 'Percent' };
  if (k === 'current') return { type: 'bar', title: 'Benchmark Position', xTitle: 'Peers', yTitle: 'Index' };
  if (k === 'timeline' || k === 'impl') return { type: 'bar', title: 'Milestone Velocity', xTitle: xAxis, yTitle: 'Milestones' };

  return { type: 'line', title: `${String(k).toUpperCase()} Forecast`, xTitle: xAxis, yTitle: 'Index' };
})(section);



  if (spec.heat){
    const rows = ['Supply','Demand','Ops','Regulatory','Competitive'];
    const cols = ['Impact','Likelihood','Velocity'];
    const data = rows.map(()=> cols.map(()=> Math.round(60 + Math.random()*30)));
    return `<div data-heatmap='${toAttrJSON_RAW({ title:'Risk Heatmap', rows, cols, data })}' data-origin="predictive"></div>`;
  }
  const data = labels.map((_,i)=> Math.round(500000 * (0.5 + i*0.3)));
  const frag = `<figure data-chart='${toAttrJSON_RAW({ ...spec, labels, datasets:[{ label:'Predicted', data }] })}' data-origin="predictive"></figure>`;
  return frag;
}
function dedupeByTitle(html=''){
  const titles = new Set();
  return String(html||'').replace(
    /<figure[^>]*data-chart=(["'])([\s\S]*?)\1[\s\S]*?<\/figure>/ig,
    (m, q, specRaw)=>{
      try{
        const t = (safeParseAttrJSON(specRaw)?.title||'').trim().toLowerCase();
        if (!t) return m;
        if (titles.has(t)) return '';
        titles.add(t);
        return m;
      } catch { return m; }
    }
  );
}

/* ========================================================================== */
/* Standard visuals per requirements                                           */
/* ========================================================================== */
function ensureStandardVisuals(html, canon){
  let out = String(html||'');

  if (typeof GRAPH_CSS === 'string' && !/id=["']graph-css["']/.test(out)) {
    out = out.replace(/<\/head>/i, `<style id="graph-css">${GRAPH_CSS}</style>\n</head>`);
  }
  const within = (id)=>{
    const re = new RegExp(`(<h2[^>]*id=["']${id}["'][\\s\\S]*?)(?=<h2\\b|<\/body>)`, 'i');
    const m = out.match(re); return { re, seg: m?m[1]:'' };
  };
  const inject = (id, titleRegex, frag)=>{
    const { re, seg } = within(id); if (!seg) return;
    if (titleRegex && titleRegex.test(seg)) return;
    out = out.replace(re, seg + '\n' + frag);
  };

  // Executive: Savings by Period
  {
    const years = /year/i.test(canon.timeFrame||'2 years');
    const labels = years? ['Y1','Y2','Y3'] : ['M1','M2','M3','M4','M5','M6'];
    const spec = { type:'line', title:'Savings by Period', xTitle: years?'Years':'Months', yTitle:'CAD',
      labels, datasets:[{ label:'Savings', data: labels.map((_,i)=>Math.round(canon.costSavingsGoal*(0.3+i*0.35)/(labels.length))) }] };
    inject('exec', /Savings by Period/i, `<figure data-chart='${toAttrJSON_RAW(spec)}' data-origin="standard"></figure>`);
  }

  // Financials: Expenditures + Payback
  {
    const labels = ['Y1','Y2','Y3'];
    const spend = { type:'bar', title:'Expenditures Over Time', xTitle:'Years', yTitle:'CAD',
      labels, datasets:[{ label:'Expenditures', data:[600000,400000,200000] }] };
    const pay = { type:'line', title:'Payback Curve', xTitle:'Years', yTitle:'Percent',
      labels, datasets:[{ label:'Payback %', data:[25,70,100] }] };
    const { re, seg } = within('financials'); if (seg){
      let inj = seg;
      if (!/Expenditures Over Time/i.test(seg)) inj += `\n<figure data-chart='${toAttrJSON_RAW(spend)}' data-origin="standard"></figure>`;
      if (!/Payback Curve/i.test(seg))        inj += `\n<figure data-chart='${toAttrJSON_RAW(pay)}' data-origin="standard"></figure>`;
      out = out.replace(re, inj);
    }
  }

  // KPI dashboard (4)
  {
    const labels = ['Y1','Y2','Y3'];
    const pieces = [
      { type:'bar',  title:'KPI: Savings (3‑Year)', xTitle:'Years', yTitle:'CAD', labels, datasets:[{label:'Savings', data:[500000,1200000,2000000]}] },
      { type:'line', title:'KPI: Payback',         xTitle:'Years', yTitle:'Percent', labels, datasets:[{label:'Payback', data:[30,65,95]}] },
      { type:'bar',  title:'KPI: AOV vs Benchmark', xTitle:'Years', yTitle:'Index', labels, datasets:[{label:'Index', data:[95,102,110]}] },
      { type:'bar',  title:'KPI: Conversion vs Benchmark', xTitle:'Years', yTitle:'Index', labels, datasets:[{label:'Index', data:[90,100,108]}] },
    ];
    const { re, seg } = within('kpis'); if (seg){
      let inj = seg;
      for (const p of pieces){
        if (!new RegExp(p.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i').test(seg)){
          inj += `\n<figure data-chart='${toAttrJSON_RAW(p)}' data-origin="standard"></figure>`;
        }
      }
      out = out.replace(re, inj);
    }
  }

  // Risk heatmap
  {
    const rows = ['Supply','Demand','Ops','Regulatory','Competitive'];
    const cols = ['Impact','Likelihood','Velocity'];
    const data = rows.map(()=> cols.map(()=> Math.round(60 + Math.random()*30)));
    inject('risk', /Risk Heatmap/i, `<div data-heatmap='${toAttrJSON_RAW({ title:'Risk Heatmap', rows, cols, data })}' data-origin="standard"></div>`);
  }

  return out;
}

/* ========================================================================== */
/* Notes & table titles                                                        */
/* ========================================================================== */
async function annotateAllVisuals(html, canon){
  let out = String(html||'');
  const re = /(<figure[^>]*data-chart[^>]*>[\s\S]*?<\/figure>|<div[^>]*data-heatmap=(["'])([\s\S]*?)\2[\s\S]*?<\/div>)/ig;
  const list = [...out.matchAll(re)];
  for (const m of list){
    const frag = m[0];
    const after = out.slice(m.index + frag.length, m.index + frag.length + 300);
    if (/class=["']chart-note["']/.test(after)) continue;

    const meta = parseVizMeta(frag);
    const res = await openai.chat.completions.create({
      model: MODEL, temperature: 1,
      messages:[
        { role:'system', content:'Return ONE HTML paragraph (<p class="chart-note">…</p>), 2–3 sentences, executive tone. Avoid numbers not visible in the chart.' },
        { role:'user',   content:`Write a brief note for "${meta.title}" (X:${meta.xTitle} / Y:${meta.yTitle}) for ${canon.orgName}. State what it measures and one implication.` }
      ]
    });
    const txt = (res.choices?.[0]?.message?.content || '').trim();
    const note = /^<p/i.test(txt) ? txt : `<p class="chart-note">${txt}</p>`;
    out = out.replace(frag, frag + '\n' + note);
  }
  return out;
}
async function annotateTablesWithTitles(html, canon){
  let out = String(html||'');
  const re = /(<table\b[^>]*class=["'][^"']*\breport-table\b[^"']*["'][\s\S]*?<\/table>)/ig;
  const parts = [];
  let last = 0, m;
  while ((m = re.exec(out)) !== null){
    const start = m.index, end = re.lastIndex;
    parts.push(out.slice(last, start));
    const before = out.slice(Math.max(0, start-700), start);
    let title = '';
    try{
      const r = await openai.chat.completions.create({
        model: MODEL, temperature: 1,
        messages:[
          { role:'system', content:'Return ONLY a short title (4–8 words). No punctuation.' },
          { role:'user',   content:`Suggest a precise table title for ${canon.orgName} based on the nearby paragraph:\n${before}` }
        ]
      });
      title = (r.choices?.[0]?.message?.content || '').trim().replace(/[.]+$/,'');
    }catch{}
    const caption = `<div class="table-title" style="font-weight:700;color:#000;margin:6px 0 4px;">${title || 'Summary Table'}</div>\n`;
    parts.push(caption + m[1]);
    last = end;
  }
  parts.push(out.slice(last));
  return parts.join('');
}

/* ========================================================================== */
/* One table per section                                                       */
/* ========================================================================== */
function keepFirstTablePerSection(id, html){
  const { seg, re } = (function(out){
    const rx = new RegExp(`(<h2[^>]*id=["']${id}["'][\\s\\S]*?)(?=<h2\\b|<\/body>)`,'i');
    const m = out.match(rx);
    return { re: rx, seg: m?m[1]:'' };
  })(html);
  if (!seg) return html;
  let seen = false;
  const trimmed = seg.replace(/(<table\b[\s\S]*?<\/table>)/ig, (m)=>{
    if (seen) return ''; seen = true; return m;
  });
  return html.replace(re, trimmed);
}
function enforceOneTableEverywhere(html){
  const ids = ['current','financials','kpis','timeline','ops','risk','roi'];
  let out = String(html||'');
  for (const id of ids) out = keepFirstTablePerSection(id, out);
  return out;
}

/* ========================================================================== */
/* Render plots to HTML                                                        */
/* ========================================================================== */
function upgradeChartsToHTML(html=''){
  let out = String(html||'');
  out = out.replace(
    /<figure[^>]*data-chart=(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/figure>/ig,
    (m, q, specRaw) => {
      const spec = safeParseAttrJSON(specRaw) || {};
      const t = String(spec.type||'line').toLowerCase();
      try{
        if (t === 'bar')  return barChartHTML(spec);
        if (t === 'line') return lineChartHTML(spec);
      }catch(e){
        console.log(TAG,'render.error', String(e?.message||e));
      }
      return m;
    }
  );
  out = out.replace(
    /<div[^>]*data-heatmap=(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/div>/ig,
    (m, q, specRaw) => {
      const spec = safeParseAttrJSON(specRaw) || {};
      try{ return heatmapHTML(spec); }catch{ return m; }
    }
  );
  return out;
}

/* ========================================================================== */
/* Conclusion                                                                  */
/* ========================================================================== */
async function genConclusion(canon){
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    messages: [
      { role:'system', content:'Return clean HTML only. Two short paragraphs, 3–4 sentences each.' },
      { role:'user',   content:
`Write the Conclusion for a transformation report for ${canon.orgName}.
Summarize executive takeaways, decision asks, and the next 90‑day focus.` }
    ]
  });
  return (res.choices?.[0]?.message?.content || '').trim();
}

/* ========================================================================== */
/* Appendices JSON (compact)                                                   */
/* ========================================================================== */
async function genImplKitJSON(canon, sections){
  try{
    const res = await openai.chat.completions.create({
      model: MODEL, temperature: 1,
      messages: [
        { role:'system', content:'Return strict JSON only. No prose.' },
        { role:'user',   content: 'Return {"charters":[],"raci":{"items":[]},"raid":{"items":[]},"benefits":{"lines":[]},"plan100":{"weeks":[]},"pilot":{"name":"","locations":0,"successKPIs":[],"thresholds":[],"sampleDesign":"","rollbackCriteria":""},"assumptions":{"items":[]},"methods":{"benchmarks":[],"sources":[]}}' }
      ]
    });
    const txt = res.choices?.[0]?.message?.content || '{}';
    return JSON.parse(txt);
  }catch{ return { charters:[], raci:{items:[]}, raid:{items:[]}, benefits:{lines:[]}, plan100:{weeks:[]}, pilot:{name:'',locations:0,successKPIs:[],thresholds:[],sampleDesign:'',rollbackCriteria:''}, assumptions:{items:[]}, methods:{benchmarks:[],sources:[]} };}
}

/* ========================================================================== */
/* POST                                                                        */
/* ========================================================================== */
export async function POST(req){
  const input = await req.json();
  const canon = {
    orgName:        input.orgName || 'Client',
    country:        input.country || 'Canada',
    companySize:    input.companySize || '5,001–10,000',
    timeFrame:      input.timeFrame || '2 years',
    costSavingsGoal: Number(input.costSavingsGoal || 2000000),
    desiredOutcome: input.desiredOutcome || 'Profitable growth with disciplined execution',
    minWords:       clamp(input.minWords || 20000, 12000, 80000)
  };
  canon.minWords = TOTAL_FLOOR;

  const order = ['exec','current','financials','kpis','timeline','ops','risk','roi','conclusion'];
  const sections = {};

  for (const key of order){
    if (key === 'conclusion'){ sections.conclusion = await genConclusion(canon); continue; }
    const floor = SECTION_FLOORS[key] || 2000;
    let html = await genSectionFirstPass(key, canon, floor);
    html      = await topUpSection(key, canon, html, floor);
    if (key !== 'exec'){
      const pred = await predictiveOne(key, canon);
      html += '\n' + pred;
    }
    sections[key] = dedupeByTitle(html);
  }

  const implKit = await genImplKitJSON(canon, sections);
  let html = buildReformReportHTML({ canon, sections, phases:[], planDiagramHTML, implKit });

  html = ensureStandardVisuals(html, canon);
  html = enforceOneTableEverywhere(html);
  html = await annotateTablesWithTitles(html, canon);
  html = await annotateAllVisuals(html, canon);
  html = upgradeChartsToHTML(html);

  if (!/id=["']kt-theme["']/.test(html)){
    html = html.replace(/<\/head>/i, `<style id="kt-theme">.table-title{font-family:inherit;font-weight:700}</style>\n</head>`);
  }

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords     = wc(html);
  console.log(TAG, 'generate.done', { sectionsWords, htmlWords, target: canon.minWords });

  return NextResponse.json({ ok:true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}