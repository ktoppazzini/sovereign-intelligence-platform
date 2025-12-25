// @ts-nocheck
/**
 * Clean replacement of app/api/reform/generate/route.js
 * (compile-safe, minimal drift)
 */

import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import buildReformReportHTML from '@/lib/reportTemplate.js';
import { planDiagramHTML } from '@/lib/implPlan.js';
import { lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS } from '@/lib/reportGraphs.js';

void [lineChartHTML, barChartHTML, heatmapHTML, GRAPH_CSS];

const TAG = '[SR:REFORM]';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const wc = (html='') => String(html).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(Boolean).length;
const clamp = (n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const today = () => new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'2-digit'});

const SECTION_FLOORS = { exec:2400, current:2800, financials:2800, kpis:2400, timeline:2400, ops:3000, risk:2200, roi:2000 };
const TOTAL_FLOOR = Object.values(SECTION_FLOORS).reduce((a,b)=>a+b,0);

// --- visuals helpers
const HAS_VIZ_RE = /(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i;
const hasViz = (html='') => HAS_VIZ_RE.test(String(html||''));

function toAttrJSON(obj){ try{ return JSON.stringify(obj).replace(/"/g,'&quot;'); }catch{ return '{}'; } }
function safeParseAttrJSON(s=''){ try{ return JSON.parse(String(s).replace(/&quot;/g,'\"').replace(/&amp;/g,'&')); }catch{ return null; } }

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
  const mBench = frag.match(/<figure[^>]*data-widget=["']benchmark["'][^>]*data-spec=["']([\s\S]*?)["'][^>]*>[\s\S]*?<\/figure>/i);
  if (mBench){
    out.kind='benchmark';
    const json = safeParseAttrJSON(mBench[1]) || {};
    out.type='benchmark';
    out.title=String(json.title||'');
    out.xTitle='Measure'; out.yTitle=String(json.yTitle||'');
    out.labelsLen=2; out.dataLen=2;
    return out;
  }
  const mHeat = frag.match(/<div[^>]*data-heatmap=["']([\s\S]*?)["'][^>]*>[\s\S]*?<\/div>/i);
  if (mHeat){
    out.kind='heatmap';
    const json = safeParseAttrJSON(mHeat[1]) || {};
    out.type='heatmap';
    out.title=String(json.title||'');
    out.xTitle='Columns'; out.yTitle='Rows';
    out.labelsLen = Array.isArray(json.cols) ? json.cols.length : 0;
    out.dataLen = Array.isArray(json.data) ? json.data.length : 0;
    return out;
  }
  return out;
}

function collectExistingVizMeta(html=''){
  const titles = new Set(); const sigs = new Set();
  const all = String(html||'').match(/(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<figure[^>]*data-widget=['"]benchmark['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi) || [];
  for (const frag of all){
    const m = parseVizMeta(frag);
    const t = (m.title||'').trim().toLowerCase() || '(untitled)';
    titles.add(t); sigs.add(`${m.kind}|${t}`);
  }
  return { titles, sigs };
}

// deterministic notes for normal charts
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
        const title=(meta.title||'Performance trend').trim();
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

// legacy paragraph commenter after visuals
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

// table title injection
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

    const r = await openai.chat.completions.create({ model: MODEL, temperature: 1, messages:[
      { role:'system', content: sys }, { role:'user', content: usr }
    ]});
    let t=(r.choices?.[0]?.message?.content||'').trim();
    t=t.replace(/^["'«»]+|["'«»]+$/g,'').replace(/\s+/g,' ').trim();
    if (!t || /^table$/i.test(t) || t.length<4) return '';
    return t;
  }catch(e){ console.log(TAG,'table.title.ai.error',String(e?.message||e)); return ''; }
}

async function injectTableTitles(html, canon){
  try{
    const s = String(html||''); const re=/<table\b[^>]*class=(["'])(?:(?:(?!\1).)*\s)?report-table(?:(?:(?!\1).)*)\1[^>]*>[\s\S]*?<\/table>/gi;
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
      const titleDiv = `<div class="table-title" style="font-weight:bold;color:#000;margin-bottom:.4rem;">${title}</div>`;
      out += titleDiv + '\n' + tableStr;
      cur=end;
      console.log(TAG,'table.title.injected',{section:sectionHint||'(unknown)', title});
    }
    out += s.slice(cur);
    return out;
  }catch(e){ console.log(TAG,'injectTableTitles.error',String(e?.message||e)); return html; }
}

// content helpers
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
  const res = await openai.chat.completions.create({ model: MODEL, temperature: 1, messages:[
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
  while(words<floor && guard<6){
    const remaining=Math.max(200,floor-words);
    const res = await openai.chat.completions.create({ model: MODEL, temperature: 1, messages:[
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

// predictive (minimal guard)
async function aiSuggestKeywords(section, canon, sectionHtml){
  try{
    const r = await openai.chat.completions.create({ model: MODEL, temperature: 1, messages:[
      { role:'system', content:'Return JSON array only.' },
      { role:'user', content: `Return JSON array of short predictive keywords for section ${section}.` }
    ]});
    return JSON.parse(r.choices?.[0]?.message?.content || '[]');
  }catch{ return []; }
}
async function aiBatchPredictiveCandidates(section, canon, sectionHtml, keywords){
  try{
    const labels = ['Y1','Y2','Y3'];
    const r = await openai.chat.completions.create({ model: MODEL, temperature: 1, messages:[
      { role:'system', content:'Return JSON with "candidates":[...] only.' },
      { role:'user', content: JSON.stringify({want:'candidates', labels}) }
    ]});
    const obj = JSON.parse(r.choices?.[0]?.message?.content || '{}');
    return Array.isArray(obj.candidates) ? obj.candidates : [];
  }catch{ return []; }
}
function _isValidType(type){ return ['line','bar','pie','doughnut'].includes(String(type||'').toLowerCase()); }
function mergeSynth(section, canon, c){
  const merged = JSON.parse(JSON.stringify(c||{}));
  merged.type = _isValidType(merged.type)?merged.type:'line';
  merged.title = merged.title || `${String(section).toUpperCase()} Forecast`;
  merged.xTitle = merged.xTitle || 'Years';
  merged.yTitle = merged.yTitle || (section==='financials'?'CAD':'Percent');
  const labels = Array.isArray(merged.labels) && merged.labels.length ? merged.labels : ['Y1','Y2','Y3'];
  merged.labels = labels;
  merged.datasets = Array.isArray(merged.datasets) && merged.datasets.length ? merged.datasets : [{ label:'Predicted', data:[1,2,3] }];
  return merged;
}
function renderCandidateToFragment(section, c){
  const spec = {
    type: String(c.type||'line').toLowerCase(),
    title: c.title, xTitle: c.xTitle, yTitle: c.yTitle,
    labels: c.labels, datasets: c.datasets
  };
  return `<figure data-chart="${toAttrJSON(spec)}" data-origin="predictive"></figure>`;
}
async function choosePredictiveFragment(section, canon, sectionHtml, sigSet){
  try{
    const kws = await aiSuggestKeywords(section, canon, sectionHtml);
    const batch = await aiBatchPredictiveCandidates(section, canon, sectionHtml, kws);
    for (const c of batch){
      const m = mergeSynth(section, canon, c);
      const frag = renderCandidateToFragment(section, m);
      const meta = parseVizMeta(frag);
      const sig = `${meta.kind}|${(meta.title||'').trim().toLowerCase()}`;
      if (sigSet.has(sig)) continue;
      const note = `<p class="chart-note">${meta.title} shows ${meta.yTitle} vs ${meta.xTitle} across the horizon.</p>`;
      return frag + '\n' + note;
    }
    return '';
  }catch{ return ''; }
}

// appendices
function buildAppendicesHTML(canon, sections){
  try{
    const keys = Object.keys(sections||{});
    const rows = keys.map(k=>{
      const html=String(sections[k]||'');
      const words=wc(html);
      const charts=(html.match(/data-chart=/g)||[]).length;
      const heatmaps=(html.match(/data-heatmap=/g)||[]).length;
      const bms=(html.match(/data-widget=['"]benchmark['"]/g)||[]).length;
      const tables=(html.match(/<table\b/gi)||[]).length;
      return `<tr><td>${k}</td><td>${words}</td><td>${charts}</td><td>${heatmaps}</td><td>${bms}</td><td>${tables}</td></tr>`;
    }).join('');
    return `<section id="appendices"><h3>Appendices</h3>
<table class="report-table"><thead><tr><th>Section</th><th>Words</th><th>Charts</th><th>Heatmaps</th><th>Benchmarks</th><th>Tables</th></tr></thead><tbody>${rows}</tbody></table>
</section>`;
  }catch{ return '<section id="appendices"><h3>Appendices</h3></section>'; }
}

// main
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
    sections[key] = html;
  }

  let phases = [];

  const appendicesHTML = buildAppendicesHTML(canon, sections);
  let html = String(await buildReformReportHTML({ canon, sections, phases, planDiagramHTML, implKit: {} }) || '');
  const conclusionHTML = '<section id="conclusion"><h3>Conclusion</h3><p>This report outlines a practical plan with measurable milestones.</p></section>';
  html = String(html).replace(/<section id=["']appendices["'][\s\S]*?<\/section>/i, appendicesHTML) + '\n' + conclusionHTML;

  html = await injectTableTitles(html, canon);
  html = commentOutLegacyVisualNotes(html);
  html = injectStdChartNotes(html);

  const sectionsWords = wc(Object.values(sections).join(' '));
  const htmlWords = wc(html);
  console.log(TAG,'generate.done',{sectionsWords, htmlWords, target: canon.minWords});

  return NextResponse.json({ ok:true, html, wordCount: sectionsWords, htmlWordCount: htmlWords });
}
