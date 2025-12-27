// @ts-nocheck
/**
 * app/api/reform/generate/route.js
 * Fixes:
 * - Strip nested <section> wrappers (prevents duplicate Exec/others)
 * - Skip malformed predictive candidates; guaranteed predictive fallback
 * - Global chart fallback if none present
 * - Log figures.count pre-return
 * - Existing logs retained for fast triage
 */

import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate.js';

const TAG = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getOpenAI(){ try { return openai || null; } catch { return null; } }

// ---------- utils ----------
const wc = (html='') => String(html).replace(/<[^>]*>/g,' ')
  .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().split(' ')
  .filter(Boolean).length;
const clamp = (n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const today = () => new Date().toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'2-digit'});

// Section word floors (keep your original targets here)
const SECTION_FLOORS = { exec:2400, current:2800, financials:2800, kpis:2400, timeline:2400, ops:3000, risk:2200, roi:2000 };
const TOTAL_FLOOR = Object.values(SECTION_FLOORS).reduce((a,b)=>a+b,0);

// ---------- fragment scrubbers ----------
function stripSectionWrappers(html){
  try{
    let out = String(html||'').replace(/<\/?section\b[^>]*>/gi, '');
    // If the model injected a section <h2> as the first tag, drop duplicates
    out = out.replace(/^(\s*<h2[^>]*>[^<]*<\/h2>\s*)+/i, '');
    return out;
  }catch(e){ console.log(TAG,'stripSectionWrappers.error', String(e?.message||e)); return html; }
}

function countFigures(html){
  const all = String(html||'').match(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/gi) || [];
  return all.length;
}

// ---------- visuals helpers ----------
const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const toAttrJSON = (obj)=>{ try{ return JSON.stringify(obj).replace(/"/g,'&quot;'); }catch{ return '{}'; } };
const safeParseAttrJSON = (s='')=>{ try{ return JSON.parse(String(s).replace(/&quot;/g,'"').replace(/&amp;/g,'&')); }catch{ return null; } };

function parseVizMeta(frag=''){
  const out = { kind:'', type:'', title:'', xTitle:'', yTitle:'', labelsLen:0, dataLen:0 };
  if (!frag) return out;
  const mChart = frag.match(/<figure[^>]*data-chart=["']([\s\S]*?)["'][^>]*>[\s\S]*?<\/figure>/i);
  if (mChart){
    out.kind='chart';
    const json = safeParseAttrJSON(mChart[1]) || {};
    out.type = String(json.type||'');
    out.title = String(json.title||'');
    out.xTitle = String(json.xTitle||'');
    out.yTitle = String(json.yTitle||'');
    out.labelsLen = Array.isArray(json.labels) ? json.labels.length : 0;
    out.dataLen = Array.isArray(json.datasets?.[0]?.data) ? json.datasets[0].data.length : 0;
    return out;
  }
  return out;
}

function collectExistingVizMeta(html=''){
  const sigs = new Set();
  const all = String(html||'').match(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/gi) || [];
  for (const frag of all){
    const m = parseVizMeta(frag);
    const t = (m.title||'').trim().toLowerCase() || '(untitled)';
    sigs.add(`${m.kind}|${t}`);
  }
  return { sigs };
}

// Guaranteed note for standard charts if missing
function injectStdChartNotes(html){
  try{
    const src = String(html||''); const re = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)/gi;
    let m, out='', cur=0, injected=0;
    while((m=re.exec(src))!==null){
      const start=m.index, frag=m[0], end=re.lastIndex;
      out += src.slice(cur,start) + frag;
      const isPred = /\bdata-origin=["']predictive["']/.test(frag);
      const tail = src.slice(end, end+800);
      const hasNote = /^(?:\s|<!--[\s\S]*?-->)*<p\b[^>]*class=["']chart-note["'][^>]*>[\s\S]*?<\/p>/i.test(tail);
      if (!isPred && !hasNote){
        const meta = parseVizMeta(frag);
        const title=(meta.title||'Performance Trend').trim();
        const x=(meta.xTitle||'X-axis').trim();
        const y=(meta.yTitle||'Y-axis').trim();
        let direction='a stable pattern';
        try{
          const obj = safeParseAttrJSON((frag.match(/data-chart=["']([\s\S]*?)["']/i)||[])[1]||'')||{};
          const arr = Array.isArray(obj.datasets?.[0]?.data) ? obj.datasets[0].data : [];
          if (arr.length>=2){
            const a=Number(arr[0]), b=Number(arr[arr.length-1]);
            if (isFinite(a)&&isFinite(b)) direction = b>a ? 'an upward trajectory' : b<a ? 'a downward trajectory' : 'a flat trend';
          }
        }catch{}
        const note = `<p class="chart-note">${title} charts ${y} against ${x}. The series indicates ${direction} and guides near-term actions.</p>`;
        out += '\n' + note + '\n'; injected++;
      }
      cur=end;
    }
    out += src.slice(cur);
    if (injected) console.log(TAG,'std.chart.notes.injected',{injected});
    return out;
  }catch(e){ console.log(TAG,'std.chart.notes.error',String(e?.message||e)); return html; }
}

// Comment out legacy paragraphs following visuals
function commentOutLegacyVisualNotes(html){
  try{
    let out = String(html||''); let count=0;
    const re = /((?:<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(?:<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(?:<div[^>]*data-heatmap=['"][\s\S]*?<\/div>))(\s*)(<(?!!--)p\b(?![^>]*class=["']chart-note["'])[\s\S]*?<\/p>)/i;
    let guard = 0;
    while (re.test(out) && guard < 2000){
      out = out.replace(re, (m,vis,ws,para)=> `${vis}${ws}<!-- [LEGACY NOTE COMMENTED]\n${para}\n-->`);
      count++; guard++;
    }
    console.log(TAG,'chart.notes.legacy.commented',{count});
    return out;
  }catch(e){ console.log(TAG,'chart.notes.legacy.error',String(e?.message||e)); return html; }
}

// Remove placeholder XX / TBD in tables
function scrubPlaceholders(html){
  try{
    let out = String(html||'');
    out = out.replace(/(<t[dh][^>]*>)([\s\-]*X{1,5}[\s\-]*|TBD|N\/A|NA)(<\/t[dh]>)/gi, (m,a,b,c)=> `${a}0${c}`);
    console.log(TAG,'tables.placeholders.scrubbed');
    return out;
  }catch(e){ console.log(TAG,'tables.placeholders.error',String(e?.message||e)); return html; }
}

// ---------- table title (OOM-safe) ----------
async function aiTitleForTable(tableHTML, canon, sectionHint=''){
  try{
    const thead = (tableHTML.match(/<thead[\s\S]*?<\/thead>/i)||[''])[0];
    const tbody = (tableHTML.match(/<tbody[\s\S]*?<\/tbody>/i)||[''])[0] || tableHTML;
    const firstRow = (thead && thead.match(/<tr[\s\S]*?<\/tr>/i)?.[0]) || (tbody && tbody.match(/<tr[\s\S]*?<\/tr>/i)?.[0]) || '';
    const headers = Array.from(firstRow.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)).map(m=>m[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()).filter(Boolean);
    const bodyRows = Array.from(tbody.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map(m=>m[0]).slice(0,3);
    const samples = bodyRows.map(row => Array.from(row.matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map(m=>m[2].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()).filter(Boolean).join(' | '));

    const sys = 'Return ONLY a short table title, max 12 words, title case.';
    const usr = [
      `Organization: ${canon.orgName} (${canon.country}), Section: ${sectionHint||'n/a'}`,
      `Headers: ${headers.join(' · ') || '(none)'}`,
      `Samples: ${samples.join(' || ') || '(none)'}`,
      'Create a precise executive title (no word "table").'
    ].join('\n');

    const oi = await getOpenAI();
    if (!oi) return '';
    const r = await oi.chat.completions.create({ model: MODEL, temperature: 1, messages:[
      { role:'system', content: sys }, { role:'user', content: usr }
    ]});
    let t=(r.choices?.[0]?.message?.content||'').trim();
    t=t.replace(/^[\"'«»]+|[\"'«»]+$/g,'').replace(/\s+/g,' ').trim();
    if (!t || /^table$/i.test(t) || t.length<4) return '';
    return t;
  }catch(e){ console.log(TAG,'table.title.ai.error',String(e?.message||e)); return ''; }
}

async function injectTableTitles(html, canon){
  try{
    const s = String(html||'');
    const re = /<table\b[^>]*class=["'][^"']*\breport-table\b[^"']*["'][^>]*>[\s\S]*?<\/table>/gi;

    let out='', cur=0, m;
    while((m=re.exec(s))!==null){
      const start=m.index, end=re.lastIndex, tableStr=m[0];
      out += s.slice(cur,start);
      const before = s.slice(Math.max(0,start-400), start);
      if (/\btable-title\b/i.test(before)){ out += tableStr; cur=end; continue; }
      const sectionScan = s.slice(Math.max(0,start-5000), start);
      const secMatch = [...sectionScan.matchAll(/<section[^>]*\bid=["']([^"']+)["']/gi)].pop();
      const sectionHint = secMatch ? String(secMatch[1]) : '';
      let title = await aiTitleForTable(tableStr, canon, sectionHint);
      if (!title) title='(Untitled Table)';
      title = title.replace(/<[^>]*>/g,'').trim() || '(Untitled Table)';
      title = title.split(' ').map(w=> w.length ? (w[0].toUpperCase()+w.slice(1)) : w ).join(' ');
      const titleDiv = `<div class="table-title" style="font-weight:bold;color:#fff;margin-bottom:.4rem;">${title}</div>`;
      out += titleDiv + '\n' + tableStr;
      cur=end;
      console.log(TAG,'table.title.injected',{section:sectionHint||'(unknown)', title});
    }
    out += s.slice(cur);
    return out;
  }catch(e){ console.log(TAG,'injectTableTitles.error',String(e?.message||e)); return html; }
}

// ---------- content generation ----------
function sanitizeNonPredictiveVisuals(section, html){
  let out = String(html||'')
    .replace(/<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>/gi,'')
    .replace(/<div[^>]*data-heatmap=['"][\s\S]*?<\/div>/gi,'')
    .replace(/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/gi,'');
  if (out!==html) console.log(TAG,'section.viz.sanitized',section);
  return out;
}
function sectionPrompt(section, canon, minWords){
  return [
    `Audience: C-suite. Organization: ${canon.orgName} (${canon.country}). Goal: ${canon.desiredOutcome}.`,
    `Time frame: ${canon.timeFrame}. Minimum words: ${minWords}.`,
    'Use <table class="report-table"> for any tables. Do NOT include charts.'
  ].join('\n');
}
function expandPrompt(section, canon, remainingWords){
  return [
    `Continue "${section}" for ${canon.orgName}. Only new content.`,
    `Target at least ${remainingWords} words. HTML only. No charts.`
  ].join('\n');
}
async function genSectionFirstPass(section, canon, floor){
  console.log(TAG,'section.start',section,{floor});
  const oi = await getOpenAI();
  if (!oi) return '';
  const res = await oi.chat.completions.create({ model: MODEL, temperature: 1, messages:[
    { role:'system', content:'Return clean HTML fragments only.' },
    { role:'user', content: sectionPrompt(section, canon, floor) }
  ]});
  let html = res.choices?.[0]?.message?.content?.trim() || '';
  html = sanitizeNonPredictiveVisuals(section, html);
  console.log(TAG,'section.firstPass',section,wc(html));
  return html;
}
async function topUpSection(section, canon, currentHTML, floor){
  let html=currentHTML||''; let words=wc(html); let guard=0;
  const oi = await getOpenAI();
  while(words<floor && guard<6 && oi){
    const remaining=Math.max(200,floor-words);
    const res = await oi.chat.completions.create({ model: MODEL, temperature: 1, messages:[
      { role:'system', content:'Extend with NEW non-duplicative content. HTML only.' },
      { role:'user', content: expandPrompt(section, canon, remaining) }
    ]});
    const add = res.choices?.[0]?.message?.content?.trim() || '';
    html += '\n' + sanitizeNonPredictiveVisuals(section, add);
    words = wc(html); guard++;
    console.log(TAG,'section.topUp',section,{words,floor,pass:guard});
  }
  return html;
}

// ---------- predictive helpers ----------
async function predictiveDescription(section, canon, meta){
  try{
    const oi = await getOpenAI();
    if (!oi) return `<p class="chart-note">${meta.title} summarizes directionality.</p>`;
    const res = await oi.chat.completions.create({
      model: MODEL, temperature: 1,
      messages: [
        { role:'system', content:'Return one short <p class="chart-note">…</p>.' },
        { role:'user', content:`Explain "${meta.title}" for ${canon.orgName}. Define axes, trend, one decision next quarter.` }
      ]
    });
    const p = (res.choices?.[0]?.message?.content || '').trim();
    return /^<p/i.test(p) ? p : `<p class="chart-note">${p}</p>`;
  }catch{ return `<p class="chart-note">${meta.title} summarizes directionality for decisions this quarter.</p>`; }
}
function _isValidType(type){ return ['line','bar','pie','doughnut'].includes(String(type||'').toLowerCase()); }
function mergeSynth(section, canon, c){
  const merged = JSON.parse(JSON.stringify(c||{}));
  merged.type = _isValidType(merged.type)?merged.type:'line';
  merged.title = merged.title || `${String(section).toUpperCase()} Forecast`;
  merged.xTitle = merged.xTitle || 'Months';
  merged.yTitle = merged.yTitle || (section==='financials'?'CAD':'Percent');
  merged.labels = Array.isArray(merged.labels) && merged.labels.length ? merged.labels : ['M1','M2','M3','M4','M5','M6'];
  merged.datasets = Array.isArray(merged.datasets) && merged.datasets.length ? merged.datasets : [{ label:'Predicted', data:[5,8,12,14,18,22] }];
  return merged;
}
function renderCandidateToFragment(section, c){
  const first = (Array.isArray(c.datasets) && c.datasets[0]) ? c.datasets[0] : {};
  const styled = {
    label: first.label || 'Projected',
    data: Array.isArray(first.data) ? first.data : [5,8,12,14,18,22],
    borderColor: first.borderColor || '#ff7a00',
    backgroundColor: first.backgroundColor || 'rgba(255,122,0,0.15)',
    pointRadius: typeof first.pointRadius === 'number' ? first.pointRadius : 3,
    tension: typeof first.tension === 'number' ? first.tension : 0.35,
    fill: typeof first.fill === 'boolean' ? first.fill : true
  };
  const spec = {
    type: String(c.type || 'line').toLowerCase(),
    title: c.title || 'Projected Savings Over Time',
    xTitle: c.xTitle || 'Months',
    yTitle: c.yTitle || 'Percent',
    labels: Array.isArray(c.labels) && c.labels.length ? c.labels : ['M1','M2','M3','M4','M5','M6'],
    datasets: [ styled ],
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  };
  return `<figure data-chart="${JSON.stringify(spec).replace(/"/g,'&quot;')}" data-origin="predictive"></figure>`;
}
async function aiSuggestKeywords(section, canon, sectionHtml){
  try{
    const oi = await getOpenAI();
    if (!oi) return [];
    const r = await oi.chat.completions.create({ model: MODEL, temperature: 1, messages:[
      { role:'system', content:'Return JSON array only.' },
      { role:'user', content: `Return JSON array of short predictive keywords for section ${section}.` }
    ]});
    return JSON.parse(r.choices?.[0]?.message?.content || '[]');
  }catch{ return []; }
}
async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords){
  try{
    const oi = await getOpenAI();
    if (!oi) return [];
    const labels = ['M1','M2','M3','M4','M5','M6'];
    const r = await oi.chat.completions.create({ model: MODEL, temperature: 1, messages:[
      { role:'system', content:'Return JSON with "candidates":[...] only.' },
      { role:'user', content: JSON.stringify({want:'candidates', labels, section}) }
    ]});
    const obj = JSON.parse(r.choices?.[0]?.message?.content || '{}');
    return Array.isArray(obj.candidates) ? obj.candidates : [];
  }catch{ return []; }
}
function fallbackPredictiveFragment(section){
  const c = mergeSynth(section, {}, {});
  const frag = renderCandidateToFragment(section, c);
  const meta = parseVizMeta(frag);
  const note = `<p class="chart-note">${meta.title} shows ${meta.yTitle} by ${meta.xTitle}. The trend guides next-quarter actions.</p>`;
  return frag + '\n' + note;
}
async function choosePredictiveFragment(section, canon, sectionHtml, sigSet){
  try{
    const kws = await aiSuggestKeywords(section, canon, sectionHtml);
    const batch = await aiBatchPredictiveCandidates(section, canon, sectionHtml, kws);
    for (const c of batch){
      if (!c || typeof c !== 'object') continue;  // <-- skip strings like 'M1'
      const m = mergeSynth(section, canon, c);
      const frag = renderCandidateToFragment(section, m);
      const meta = parseVizMeta(frag);
      const sig = `${meta.kind}|${(meta.title||'').trim().toLowerCase()}`;
      if (sigSet.has(sig)) continue;
      const note = await predictiveDescription(section, canon, meta);
      return frag + '\n' + note;
    }
    //console.log(TAG,'predictive.batch.empty',section);
    //return fallbackPredictiveFragment(section);
    console.log(TAG,'predictive.batch.empty', section);
// [KT:PREDICTIVE:legacy-restore]
const plan  = VISUAL_PLAN?.[section] || {};
const built = _buildLegacyBatch(section, sectionHtml, plan);
if (built.chosen.length) {
const spec = built.chosen[0];
const frag = renderCandidateToFragment(section, spec);
const meta = parseVizMeta(frag);
const note = await predictiveDescription(section, canon, meta);
console.log(TAG,'predictive.batch.restored', section, { count: built.chosen.length });
return frag + '\n' + note;
}
console.log(TAG,'predictive.legacy.empty', section, { rejected: built.rejected });
return fallbackPredictiveFragment(section);
  }catch(e){
    console.log(TAG,'predictive.error',section,String(e?.message||e));
    return fallbackPredictiveFragment(section);
  }
}

// ---------- appendices ----------
function buildAppendicesHTML(canon, sections){
  try{
    return `
<section id="appendices">
  <h3>Pilot</h3>
  <table class="report-table"><thead><tr><th>Site</th><th>Scope</th><th>Success KPIs</th></tr></thead>
  <tbody><tr><td>Location A</td><td>Wave-1</td><td>NPS, On-time, Unit Cost</td></tr></tbody></table>

  <h3>RACI</h3>
  <table class="report-table"><thead><tr><th>Decision</th><th>R</th><th>A</th><th>C</th><th>I</th></tr></thead>
  <tbody><tr><td>Go-live Cutover</td><td>Ops Lead</td><td>COO</td><td>IT, Finance</td><td>Stores</td></tr></tbody></table>
</section>`;
  }catch{ return '<section id="appendices"><h3>Appendices</h3></section>'; }
}

// ---------- post-build cleanup ----------
function dedupeExecutive(html){
  try{
    const s = String(html||'');
    const parts = s.split(/(<section id=["']executive-summary["'][\s\S]*?<\/section>)/i);
    if (parts.length <= 2) return s;
    let seen=false, out='';
    for (let i=0;i<parts.length;i++){
      const chunk = parts[i];
      if (i%2===1){
        if (seen){ console.log(TAG,'exec.duplicate.removed'); continue; }
        seen=true; out+=chunk;
      } else { out+=chunk; }
    }
    return out;
  }catch(e){ console.log(TAG,'exec.dedupe.error',String(e?.message||e)); return html; }
}

// ---------- main ----------
export async function POST(req){
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
  // Lock to declared floors
  canon.minWords = TOTAL_FLOOR;

  console.log(TAG,'generate.start',{model:MODEL, org:canon.orgName, minWords:canon.minWords});

  const order = ['exec','current','financials','kpis','timeline','ops','risk','roi'];
  const sections = {};
  for (const key of order){
    const floor = SECTION_FLOORS[key] || 1200;
    let html = await genSectionFirstPass(key, canon, floor);
    html = await topUpSection(key, canon, html, floor);

    const { sigs } = collectExistingVizMeta(html);
    if (key !== 'exec'){
      const pred = await choosePredictiveFragment(key, canon, html, sigs);
      if (pred){ html += '\n' + pred; console.log(TAG,'section.vizInjected',key); }
    }
    sections[key] = scrubPlaceholders(stripSectionWrappers(html));  // <-- critical to stop duplicates
  }

  let phases = [];
  let html = String(await buildReformReportHTML({ canon, sections, phases, chartRegistry: [] }) || '');

  // Insert appendices
  const appendicesHTML = buildAppendicesHTML(canon, sections);
  html = String(html).replace(/<section id=["']appendices["'][\s\S]*?<\/section>/i, appendicesHTML);

  // Final passes
  html = await injectTableTitles(html, canon);
  html = commentOutLegacyVisualNotes(html);
  html = injectStdChartNotes(html);
  html = dedupeExecutive(html);

  // Global chart fallback + figure count
  if (!/<figure[^>]*data-chart=['"][\s\S]*?<\/figure>/i.test(html)) {
    const fallback = fallbackPredictiveFragment('financials');
    html = html.replace(/(<section id=["']financials["'][\s\S]*?>)/i, ($0)=> $0 + "\n" + fallback);
    console.log(TAG,'global.viz.fallback.injected');
  }
  console.log(TAG,'figures.count', { count: countFigures(html) });

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG,'generate.done',{sectionsWords, htmlWords, target: canon.minWords});

  return NextResponse.json({ ok:true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}
