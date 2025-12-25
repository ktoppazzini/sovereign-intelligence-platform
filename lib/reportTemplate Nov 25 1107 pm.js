// [KT:FIX] Ensure all required chart and utility imports are present
import {
  lineChartHTML,
  barChartHTML,
  heatmapHTML,
  benchmarkHTML,
  prioritizationMatrixHTML,
  GRAPH_CSS,
  TYPE_SWITCH_SCRIPT,
  renderChartFigure // Ensure renderChartFigure is exported from './reportGraphs.js'
} from './reportGraphs.js';
import { planDiagramHTML } from './implPlan.js';

// Import appendix HTML generators
import {
  chartersHTML, // Ensure this function is defined in appendixHTML.js
  raciHTML,
  raidHTML,
  benefitsHTML,
  plan100HTML,
  pilotHTML,
  assumptionsHTML,
  methodsSourcesHTML,
  implementationChecklistHTML,
  decisionFrameworkHTML,
  resourceRequirementsHTML
} from './implKitHtml.js';

// [KT:FIX] Define IMPLKIT_CSS as empty string if not imported elsewhere
const IMPLKIT_CSS = '';


/* ============================================================================
//   [LOCKED FILE — SOVEREIGN INTELLIGENCE]
//   ENFORCEMENT HEADER – DO NOT REMOVE
// ============================================================================
*/

// /lib/reportTemplate.js
// Surgical: adjust viewport width to remove inner scrollbar; keep letter portrait for print.
// [KT:I18N] translation helper import removed (translateReportLabels is not exported)
// Duplicate translateReportLabels function removed to avoid redeclaration error.
// [KT:I18N:INJECTABLE-TEMPLATE]
let __reportTranslator = (s) => s;

export function setReportTranslator(fn) {
  __reportTranslator = typeof fn === "function" ? fn : (s) => s;
}

const t = (s) => {
  try {
    return __reportTranslator(s);
  } catch {
    return s;
  }
};

export const DEFAULT_LABELS = {
  // Report Structure
  executiveSummary: "Executive Summary",
  tableOfContents: "Table of Contents",
  currentState: "Current State Analysis",
  financialAnalysis: "Financial Analysis",
  kpiAnalysis: "KPI & Performance Metrics",
  operationalAnalysis: "Operational Analysis",
  riskAssessment: "Risk Assessment",
  roiProjections: "ROI Projections",
  nextSteps: "Next Steps",
  appendices: "Appendices",
  
  // Executive Dashboard
  projectedROI: "Projected ROI",
  paybackPeriod: "Payback Period",
  annualSavings: "Annual Savings",
  timeline: "Timeline",
  confidenceLevel: "Confidence Level",
  strategicImpact: "Strategic Impact",
  industryBenchmark: "Industry benchmark",
  vsBaseline: "vs baseline",
  fasterThanAverage: "faster than industry average",
  bestInClassTiming: "Best-in-class timing",
  inAnnualValue: "in annual value",
  topQuartile: "Top quartile performance",
  implementationHorizon: "implementation horizon",
  acceleratedDelivery: "Accelerated delivery",
  dataSupported: "data-supported",
  highCertainty: "High certainty",
  transformationalChange: "Transformational change",
  acrossValue: "across value chain",
  
  // Prioritization Matrix
  prioritizationMatrix: "Initiative Prioritization Matrix",
  impact: "Impact",
  effort: "Effort",
  quickWins: "Quick Wins",
  strategicBets: "Strategic Bets",
  fillIns: "Fill-Ins",
  hardSlogs: "Hard Slogs",
  low: "Low",
  medium: "Medium",
  high: "High",
  
  // Appendix Labels
  appendix: "Appendix",
  projectCharters: "Initiative Charters",
  raciMatrix: "RACI & Decision SLAs",
  raidLog: "RAID (Risks, Assumptions, Issues, Dependencies)",
  benefitsRealization: "Benefits Realization Model",
  day100Plan: "First 100 Days Plan",
  pilotDesign: "Pilot Design",
  assumptions: "Assumptions & Constraints",
  methodsSources: "Methods & Data Sources",
  implementationChecklist: "Implementation Checklist",
  decisionFramework: "Decision Framework",
  resourceRequirements: "Resource Requirements",
  
  // Appendix Table Headers
  objective: "Objective",
  scopeIn: "Scope (In)",
  scopeOut: "Scope (Out)",
  ownerStakeholders: "Owner & Stakeholders",
  milestones: "Milestones",
  kpis: "KPIs",
  risks: "Risks",
  acceptance: "Acceptance",
  decision: "Decision",
  type: "Type",
  description: "Description",
  // note: 'impact' already defined above; reused key will just take last value in JS
  probability: "Prob.",
  trigger: "Trigger",
  mitigation: "Mitigation",
  nextReview: "Next review",
  workstream: "Workstream",
  lever: "Lever",
  unitAssumption: "Unit Assumption",
  source: "Source",
  volume: "Volume",
  rate: "Rate",
  monthlyImpact: "Monthly",
  confidence: "Confidence",
  start: "Start",
  runRate: "Run-rate",
  oneOffCost: "One-off",
  totalMonthlyImpact: "Total monthly impact (estimated)",
  tip: "Tip: copy as a one-pager per store/workstream.",
  
  // Common Terms
  confidential: "CONFIDENTIAL",
  preparedFor: "Prepared for",
  preparedBy: "Prepared by",
  date: "Date",
  page: "Page",
  of: "of",
  month: "Month",
  months: "mo",
  years: "years",
  year: "year",
  baseline: "Baseline",
  target: "Target",
  actual: "Actual",
  variance: "Variance",
  status: "Status",
  owner: "Owner",
  risk: "Risk",
  action: "Action",
  phase: "Phase",
  week: "Week",
  task: "Task",
  deliverable: "Deliverable",
  budget: "Budget",
  team: "Team",
  tools: "Tools",
  
  // Chart Labels
  projectedSavings: "Projected Savings Over Time",
  deliveryPenetration: "Delivery Penetration vs Market",
  savingsBreakdown: "Savings Breakdown",
  paybackAnalysis: "Payback Analysis",
  operatingExpenses: "Operating Expenses",
  kpiDashboard: "KPI Dashboard",
  riskHeatmap: "Risk Heatmap",
  
  // Additional Terms
  forInternalUseOnly: "FOR INTERNAL USE ONLY",
  contents: "Contents",
  quickWinsIn90Days: "Quick wins in 90 days",
  recurringAnnualBenefit: "Recurring annual benefit",
  potentialUpside: "potential upside",
  phasedRolloutAcross: "Phased rollout across",
  basedOnBenchmarks: "Based on benchmarks",
  transformsCoreOperations: "Transforms core operations",
  missionCriticalInitiative: "Mission-critical initiative"
};

// [KT:SURGICAL:I18N-LABELS] — server-side label translator via /api/gptTranslation
function __isEnglishReportLang(lang) {
  const v = String(lang || '').toLowerCase();
  return v === 'english' || v === 'en' || v.startsWith('en-');
}


// Duplicate translateReportLabels function removed to avoid redeclaration error.


export function injectGraphCSSOnce(html){
  // Idempotent: add a single <style> if not present.
  if (html.includes('id="graph-css-theme"')) return html;
  const styleTag = `<style id="graph-css-theme">${GRAPH_CSS}</style>`;
  // Place before closing head if present, else at top.
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`);
  }
  return `${styleTag}\n${html}`;
}

/*
 * reportSectionWithChart
 * Builds a section with a normalized figure. We keep wording 2-sentence max,
 * outside the Executive Summary per your rules.
 */
export function reportSectionWithChart({ section, meta, description }) {
  const fig = renderChartFigure({ ...meta, section }, description || '');
  return `
<section data-section="${section || 'default-section'}">
  ${fig || ''}
</section>
`.trim();
}

/* 
[KT:SURGICAL NOTES]
- We centralize GRAPH_CSS injection here (head or top). 
- The figure HTML comes from GraphTemplate and is already black-themed.
- No deletions; only additive structure + idempotent guard.
*/


const esc = (s='') => String(s);

function normalizeLogoPath(raw) {
  let s = (raw || '').trim().replace(/\\/g, '/');
  if (!s) return '/public/images/secure.png';
  if (s.startsWith('/')) return s;
  if (/^public\/images\//i.test(s)) return '/' + s;
  if (/^images\//i.test(s)) return '/public/' + s;
  return '/public/images/' + s.split('/').pop();
}

const splitParas = (html='') => {
  const text = String(html)
    .replace(/<\s*br\s*\/?>(?!\s*<)/gi, '\n')
    .replace(/<\/p>/gi, '</p>\n');
  return text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
};
const wrapIfPlain = p => /<\/?[a-z]/i.test(p) ? p : `<p>${esc(p)}</p>`;

// Force Appendix class onto ALL tables in sections.
//function unifyTables(html='') {//
// return String(html).replace(/<table(\s|>)/gi, '<table class="table"$1');//
//}//




/* [KT:SURGICAL:DEDUP-HELPERS] Helper to remove duplicate charts/heatmaps across the report */
function __kt_dedupeVisuals(html = '') {
  try {
    const src = String(html || '');
    const re = /(<figure[^>]*data-chart=['"][\s\S]*?<\/figure>)|(<div[^>]*data-heatmap=['"][\s\S]*?<\/div>)/gi;
    const seen = new Set(); let out = '', last = 0, m;
    const sig = (frag) => {
      try {
        const c = frag.match(/data-chart=['"]([\s\S]*?)['"]/i);
        if (c) {
          const o = JSON.parse(c[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
          return 'chart|' + String(o.title || '').toLowerCase() + '|' + String(o.type || '').toLowerCase();
        }
        const h = frag.match(/data-heatmap=['"]([\s\S]*?)['"]/i);
        if (h) {
          const o = JSON.parse(h[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
          return 'heatmap|' + String(o.title || '').toLowerCase();
        }
      } catch {}
      return '';
    };
    while ((m = re.exec(src)) !== null) {
      const start = m.index, end = re.lastIndex, frag = m[0];
      out += src.slice(last, start);
      const s = sig(frag);
      if (s && seen.has(s)) {
        // skip duplicate
      } else {
        if (s) seen.add(s);
        out += frag;
      }
      last = end;
    }
    out += src.slice(last);
    return out;
  } catch {
    return html;
  }
}

function labelsForPeriod(timeFrame='') {
  const s = (timeFrame||'').toLowerCase();
  let months = 24;
  const num = Number((s.match(/([\d.]+)/)||[])[1]||0);
  if (s.includes('month')) months = Math.max(1, Math.round(num||12));
  if (s.includes('year'))  months = Math.max(1, Math.round((num||2)*12));
  if (months <= 12) return Array.from({length:months}, (_,i)=>`M${i+1}`);
  const years = Math.ceil(months/12);
  return Array.from({length:years}, (_,i)=>`Y${i+1}`);
}
const mkDefaultSeries = (len, total=100) =>
  Array.from({length:len}, (_,i)=>Math.round((i+1)*total/len));

function _wrapFigureWithSpec(figHTML, attrs) {
  try {
    return String(figHTML||'').replace(/<figure\b([^>]*)>/i, function(m,rest){
      var add = '';
      if (attrs['data-chart'])   add += " data-chart='" + attrs['data-chart'] + "'"
      if (attrs['data-origin'])  add += " data-origin=\"" + attrs['data-origin'] + "\"";
      if (attrs['data-widget'])  add += " data-widget=\"" + attrs['data-widget'] + "\"";
      if (attrs['data-spec'])    add += " data-spec='" + attrs['data-spec'] + "'";
      return '<figure' + rest + add + '>';
    });
  } catch(e){ return figHTML; }
}
function safeParseAttrJSON(s='') {
  try { return JSON.parse(String(s).replace(/&quot;/g,'"').replace(/&amp;/g,'&')); }
  catch { return null; }
}

/* [KT:SURGICAL:STANDARD-DESC:A] — begin
   Adds attribute-safe JSON + tags standard <figure class="chart-card"> so generate/route can
   inject exec notes like predictive visuals. Also adds debug logging counts. */

/** HTML-attribute-safe JSON (quotes escaped as &quot;) */
function __kt_toAttrJSON(obj){
  try { return JSON.stringify(obj).replace(/"/g,'&quot;'); } catch { return '{}'; }
}

/**
 * Finds <figure class="chart-card" ...>…</figure> without data-* spec and
 * adds minimal data-chart so downstream description injector can attach a
 * <p class="chart-note">. Logs counts and a sample.
 */
function __kt_tagStandardCharts(html='', labels=[], canon={}){
  try{
    const src = String(html||'');
    const re  = /<figure\b([^>]*class=["'][^"']*chart-card[^"']*["'][^>]*)>([\s\S]*?)<\/figure>/gi;
    let out = '', last = 0, m;
    let scanned = 0, upgraded = 0;
    let sample = [];

    while((m = re.exec(src))!==null){
      scanned++;
      const start = m.index, end = re.lastIndex;
      const open  = m[1] || '';
      const inner = m[2] || '';

      // already tagged? pass-through
      if (/(data-chart|data-widget\s*=\s*["']benchmark["']|data-heatmap)/i.test(open)) {
        out += src.slice(last, end); last = end; continue;
      }

      // derive safe title and type
      const h3 = (inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)||[])[1] || '';
      const title = h3.replace(/<[^>]*>/g,'').trim() || 'Chart';
      const type  = ((open.match(/data-type=["']([^"']+)/i)||[])[1]||'line').toLowerCase();
      const xTitle = labels[0]?.startsWith('Y') ? 'Years' : 'Months';
      const yTitle = /percent|%/i.test(title) ? 'Percent'
                    : /payback/i.test(title) ? 'Cumulative'
                    : /savings|revenue|spend|capex|opex/i.test(title) ? 'Value'
                    : 'Index';

      const spec = {
        type, title, xTitle, yTitle,
        labels: Array.isArray(labels) ? labels : [],
        datasets: [{ label: title, data: (labels||[]).map((_,i)=>i+1) }]
      };

      const upgradedOpen =
        open + " data-chart='" + __kt_toAttrJSON(spec) + "' data-origin=\"standard\"";

      out += src.slice(last, start) + '<figure' + upgradedOpen + '>' + inner + '</figure>';
      last = end;
      upgraded++;
      if (sample.length < 3) sample.push(title);
    }
    out += src.slice(last);

    // [KT:SURGICAL:LOGS] precise, additive debug
    console.log('[SR:REFORM] std.charts.tagged', { scanned, upgraded, sample });

    return out;
  }catch(e){
    console.log('[SR:REFORM] std.charts.tag.error', String(e?.message||e));
    return html;
  }
}
// [KT:SURGICAL:STANDARD-DESC:A] — end


function toAttrJSON(obj){
  try { return JSON.stringify(obj).replace(/"/g,'&quot;'); } catch { return '{}'; }
}

function renderDataBlocks(html='', labels) {
  // Preserve raw data-* specs while rendering visual HTML
  html = html.replace(/<figure[^>]*data-chart=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/figure>/gi,
    function(_m, specRaw, origin){
      const spec = safeParseAttrJSON(specRaw) || {};
      const type  = (spec.type || 'line').toLowerCase();
      const title = spec.title || 'Chart';
      const ds    = Array.isArray(spec.datasets) && spec.datasets[0] ? spec.datasets[0] : { data: [] };
      const series = Array.isArray(ds.data) && ds.data.length ? ds.data : mkDefaultSeries(labels.length, 100);
      const xTitle = spec.xTitle || (labels[0]?.startsWith('Y') ? 'Years' : 'Months');
      const yTitle = spec.yTitle || 'Value';
      let fig;
      if (type === 'bar')  fig = barChartHTML({ title, labels, series, xTitle, yTitle });
      else if (type === 'pie') fig = lineChartHTML({ title, labels, series, xTitle, yTitle });
      else if (type === 'doughnut') fig = lineChartHTML({ title, labels, series, xTitle, yTitle });
      else fig = lineChartHTML({ title, labels, series, xTitle, yTitle });
      return _wrapFigureWithSpec(fig, { 'data-chart': specRaw, 'data-origin': origin||'predictive' });
    });

  html = html.replace(/<figure[^>]*data-widget=['"]benchmark['"][^>]*data-spec=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/figure>/gi,
    function(_m, specRaw, origin){
      const spec = safeParseAttrJSON(specRaw) || {};
      const fig = benchmarkHTML({
        title: spec.title || 'Benchmark',
        current: Number(spec.current || 0),
        benchmark: Number(spec.benchmark || 0),
        yTitle: spec.yTitle || 'Percent'
      });
      return _wrapFigureWithSpec(fig, { 'data-widget': 'benchmark', 'data-spec': specRaw, 'data-origin': origin||'predictive' });
    });

  html = html.replace(/<div[^>]*data-heatmap=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/div>/gi,
    function(_m, specRaw, origin){
      const spec = safeParseAttrJSON(specRaw) || {};
      const inner = heatmapHTML({
        title: spec.title || 'Risk Heat Map',
        rows: Array.isArray(spec.rows) ? spec.rows : ['R1','R2','R3','R4','R5'],
        cols: Array.isArray(spec.cols) ? spec.cols : ['C1','C2','C3','C4','C5'],
        data: Array.isArray(spec.data) ? spec.data
             : Array.from({length:5},() => Array.from({length:5},() => Math.floor(Math.random()*5)+1))
      });
      return "<div data-heatmap='" + specRaw + "' " + (origin?("data-origin=\"" + origin + "\""):"") + ">" + inner + "</div>";
    });

  return html;
}

function injectSmartWidgets(html, { labels, canon }) {
  if (!html) return { html: '', injected: false };

  const blocks = splitParas(html);
  let injected = false;

  const make = (kind) => {
    const series = mkDefaultSeries(labels.length, (canon?.costSavingsGoal || 100));
    switch (kind) {
      case 'bar':
        // EXPENDITURES: Front-loaded pattern (different from savings)
        const spendSeries = labels.map((_, i) => {
          const baseSpend = (canon?.costSavingsGoal || 100) * 0.25;
          const timeFactor = 1 - (i / (labels.length - 1)) * 0.6;
          return Math.round(baseSpend * timeFactor * (0.9 + Math.random() * 0.2));
        });
        return barChartHTML({
          title: 'Implementation Expenditures',
          labels, series: spendSeries,
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'Spend'
        });
      case 'heat':
        return heatmapHTML({
          title: 'Risk Heat Map',
          rows: ['Ops','Sales','CX','IT','People'],
          cols: ['Q1','Q2','Q3','Q4','Q5'],
          data: Array.from({length:5},() => Array.from({length:5},() => Math.floor(Math.random()*5)+1))
        });
      case 'benchmark':
        return benchmarkHTML({
          title: "Delivery Penetration vs Market",
          current: Number(canon?.metrics?.deliveryShare ?? 28),
          benchmark: Number(canon?.metrics?.marketDelivery ?? 34),
          yTitle: 'Percent'
        });
      default:
        return lineChartHTML({
          title: 'Projected Savings Over Time',
          labels, series,
          xTitle: labels[0].startsWith('Y') ? 'Years' : 'Months',
          yTitle: 'Savings'
        });
    }
  };

  const kindFromText = (t) => {
    const text = t.toLowerCase();
    if (/\bheat\s*map\b/.test(text)) return 'heat';
    if (/\bimplementation.*expenditure|\bspend\b/.test(text)) return 'bar';
    if (/\bdelivery\b.*\bmarket share|\bmarket\b.*\bdelivery/.test(text)) return 'benchmark';
    if (/\brecommended\s+benchmark\s+visualization\b/.test(text)) return 'benchmark';
    if (/\binteractive\s+element\b|\bvisual\s+element\b|\bplaceholder\b|\bai\s+generated\b/.test(text)) return 'line';
    if (/\broi\b|\bpayback\b/.test(text)) return 'line';
    if (/\bprojected\s+savings|\bover\s+time\b/.test(text)) return 'line';
    return 'line';
  };

  const replaced = blocks.map((raw) => {
    const p = raw.replace(/\s+/g, ' ').trim();
    const isPlaceholder =
      /^notes\s+on\s+the\s+chart\s+below/i.test(p) ||
      /^the\s+following\s+chart\s+is\s+presented/i.test(p) ||
      /\bchart\s+below\b/i.test(p) ||
      /\bthe\s+following\s+chart\b/i.test(p) ||
      /\brecommended\s+(?:benchmark|visualization)\b/i.test(p) ||
      /\binteractive\s+element\b/i.test(p) ||
      /\bvisual\s+element\b/i.test(p) ||
      /\bplaceholder\b/i.test(p) ||
      /\bai\s+generated\b/i.test(p);
    if (isPlaceholder) {
      injected = true;
      return make(kindFromText(p));
    }
    return wrapIfPlain(raw);
  }).join('\n');

  return { html: replaced, injected };
}

/* ---------- Main exported builder ---------- */

// RTL language detection for 207 languages
function isRTL(lang) {
  if (!lang) return false;
  const rtlLanguages = ['arabic', 'hebrew', 'urdu', 'persian', 'farsi', 'pashto', 'ar', 'he', 'ur', 'fa', 'ps'];
  return rtlLanguages.some(rtl => String(lang).toLowerCase().includes(rtl));
}

export default function buildReformReportHTML(opts) {
    // [KT:SURGICAL:APPENDIX-PLACEMENT-ADD] Render appendices before conclusion (additive, no deletions)
    // This block is additive and does not remove or replace any existing code.
    const { canon, sections = {}, phases = [], implKit, translatedLabels, worldClassVisuals = {} } = (opts || {});
    let appendicesHTML = '';
    if (implKit && implKit.appendicesHTML) {
      appendicesHTML = implKit.appendicesHTML;
    } else if (typeof sections !== 'undefined' && sections && sections.appendicesHTML) {
      appendicesHTML = sections.appendicesHTML;
    } else if (typeof window !== 'undefined' && window.appendicesHTML) {
      appendicesHTML = window.appendicesHTML;
    }
  let reportHtml = '';

  const logo = normalizeLogoPath(canon?.logoUrl || 'public\\images\\secure.png');
  const labels = labelsForPeriod(canon?.timeFrame || '2 years');
  
  // Use translated labels if provided, otherwise use defaults
 /* const L = translatedLabels || DEFAULT_LABELS;*/
 const L = translatedLabels && typeof translatedLabels === "object"
  ? { ...DEFAULT_LABELS, ...translatedLabels }
  : DEFAULT_LABELS;
  
  // Detect RTL languages
  const isRTLLang = isRTL(canon?.lang);
  const direction = isRTLLang ? 'rtl' : 'ltr';
  
  // Currency localization for appendix
  const currencySymbol = (() => {
    const c = String(canon?.country || '').toUpperCase();
    if (c.includes('CANADA') || c.includes('CAN')) return 'C$';
    if (c.includes('UK') || c.includes('BRITAIN') || c.includes('UNITED KINGDOM')) return '£';
    if (c.includes('EURO') || c === 'DE' || c === 'FR' || c === 'IT') return '€';
    return '$'; // USD default
  })();
  
// Force Appendix-style theme on all tables across sections
function unifyTables(html = '') {
  try {
    // add class="table" to every <table>
    return String(html).replace(/<table(\s|>)/gi, '<table class="table"$1');
  } catch {
    return html;
  }
}

  const prep = (s) => {
    const preRendered = renderDataBlocks(String(s||''), labels);
    const html = unifyTables(splitParas(preRendered).map(wrapIfPlain).join('\n'));
    const { html: withWidgets, injected } = injectSmartWidgets(html, { labels, canon });

    // [KT:SURGICAL:STANDARD-DESC:B] — tag standard charts then log counts
    let postHTML = withWidgets;
    try {
      postHTML = __kt_tagStandardCharts(postHTML, labels, canon);
      // log emitted inside __kt_tagStandardCharts
    } catch(e) {
      console.log('[SR:REFORM] std.charts.tag.error', String(e?.message||e));
    }

    // [KT:SURGICAL:WIDTH-GUARD] — moved to final assembly (see bottom)

    return { html: postHTML, injected };
  };

  const SEC = {
    exec: prep(sections.exec),
    current: prep(sections.current),
    financials: prep(sections.financials),
    kpis: prep(sections.kpis),
    ops: prep(sections.ops),
    risk: prep(sections.risk),
    roi: prep(sections.roi),
    nextSteps: prep(sections.nextSteps),
  };

  const ensureOne = (already, fallbackHTML) => already ? '' : fallbackHTML;

    // BEYOND MCKINSEY: Generate executive dashboard with key metrics
  function generateExecDashboard(canon) {
    const roi = canon?.roi || 250;
    const payback = canon?.paybackMonths || 18;
    const savings = canon?.costSavingsGoal || 2500000;
    const timeframe = canon?.timeFrame || '24 months';
    const confidence = 85; // Could be calculated from data quality
    
    return `
    <div class="exec-dashboard">
      <div class="metric-card">
        <div class="metric-label">${L.projectedROI}</div>
        <div class="metric-value">${roi}<span class="metric-unit">%</span></div>
        <div class="metric-context">${L.industryBenchmark}: 180%</div>
        <div class="metric-trend">+70pp ${L.vsBaseline}</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">${L.paybackPeriod}</div>
        <div class="metric-value">${payback}<span class="metric-unit">${L.months}</span></div>
        <div class="metric-context">25% ${L.fasterThanAverage}</div>
        <div class="metric-trend">${L.bestInClassTiming}</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">${L.annualSavings}</div>
        <div class="metric-value">${currencySymbol}${(savings/1000000).toFixed(1)}<span class="metric-unit">M</span></div>
        <div class="metric-context">${L.inAnnualValue}</div>
        <div class="metric-trend">+${((savings/1000000)*0.15).toFixed(1)}M ${L.topQuartile}</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">${L.timeline}</div>
        <div class="metric-value">${timeframe.split(' ')[0]}<span class="metric-unit">${timeframe.split(' ')[1] || L.months}</span></div>
        <div class="metric-context">${L.implementationHorizon}</div>
        <div class="metric-trend">${L.acceleratedDelivery}</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">${L.confidenceLevel}</div>
        <div class="metric-value">${confidence}<span class="metric-unit">%</span></div>
        <div class="metric-context">${L.dataSupported}</div>
        <div class="metric-trend">${L.highCertainty}</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">${L.strategicImpact}</div>
        <div class="metric-value">${L.high}<span class="metric-unit"></span></div>
        <div class="metric-context">${L.transformationalChange}</div>
        <div class="metric-trend">${L.acrossValue}</div>
      </div>
    </div>
    `;
  }

  const execDashboard = generateExecDashboard(canon);

  const execFallback = lineChartHTML({
    title: t('Projected Savings Over Time'),
    labels,
    series: mkDefaultSeries(labels.length, canon?.costSavingsGoal || 100),
    xTitle: labels[0].startsWith('Y') ? t('Years') : t('Months'),
    yTitle: t('Savings')
  });

  const currentFallback = benchmarkHTML({
    title: t('Delivery Penetration vs Market'),
    current: Number(canon?.metrics?.deliveryShare ?? 28),
    benchmark: Number(canon?.metrics?.marketDelivery ?? 34),
    yTitle: t('Percent')
  });

  const finSpend = barChartHTML({
    title: t('Implementation Expenditures'),
    labels,
    // EXPENDITURES: Front-loaded spending pattern (higher initial investment, tapering off)
    series: labels.map((_, i) => {
      const baseSpend = (canon?.costSavingsGoal || 100) * 0.25;
      const timeFactor = 1 - (i / (labels.length - 1)) * 0.6; // Decreases 60% over time
      return Math.round(baseSpend * timeFactor * (0.9 + Math.random() * 0.2)); // Add slight variation
    }),
    xTitle: labels[0].startsWith('Y') ? t('Years') : t('Months'),
    yTitle: t('Spend')
  });

  const finPayback = lineChartHTML({
    title: t('Cumulative Payback'),
    labels,
    // PAYBACK: Cumulative growth pattern (accelerating returns over time)
    series: labels.map((_, i) => {
      const maxPayback = (canon?.costSavingsGoal || 100);
      const progress = (i + 1) / labels.length;
      return Math.round(maxPayback * progress * progress * (0.95 + Math.random() * 0.1)); // Quadratic growth
    }),
    xTitle: labels[0].startsWith('Y') ? t('Years') : t('Months'),
    yTitle: t('Cumulative')
  });

  // KPI section: NO fallback - all 4 charts come from AI generation
  // (2 standard: Savings + Payback, plus 2 AI-selected benchmarks)
  const kpiDash = '';

  const riskHeat = heatmapHTML({
    title: t('Risk Heat Map'),
    rows: ['Ops', 'Sales', 'CX', 'IT', 'People'].map(t),
    cols: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map(t),
    data: Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => Math.floor(Math.random() * 5) + 1)
    )
  });

  const roiMini = lineChartHTML({
    title: t('ROI Trend (AI)'),
    labels,
    series: mkDefaultSeries(labels.length, 100),
    xTitle: labels[0].startsWith('Y') ? t('Years') : t('Months'),
    yTitle: t('ROI Index')
  });


  // Reverted horizon to single-phase view for readability
   const roadmap = planDiagramHTML(
    phases || [],
    t('Implementation Plan') // translated label passed into diagram
  );

  let html = '';
  html += `
  <section>
    <h2 id="timeline">${t('Implementation Plan')}</h2>
    <div style="font-size:2rem; font-weight:700;">${roadmap}</div>
    ${worldClassVisuals.visualTimeline ? `
    <h3>${t('Visual Timeline')}</h3>
    ${worldClassVisuals.visualTimeline}
    ` : ''}
  </section>
`;

  const tocItems = [
    'Executive Summary',
    'Current State',
    'Financials',
    'KPIs & Targets',
    'Implementation Plan',
    'Operating Model',
    'Risks & Mitigations',
    'ROI',
    'Next Steps'
  ]
    .map((label) => `<li>${t(label)}</li>`)
    .join('');


  reportHtml = `
  <article class="report" dir="${direction}" lang="${esc(canon?.lang || 'en')}">
    <section class="title-page">
      <div class="title-header">
        <div class="title-logo">
          <svg class="brand-icon" width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <!-- UNIVERSAL INTELLIGENCE PLATFORM: Global neural network symbol -->
            <defs>
              <!-- Premium gradient: Emerald to Royal Blue -->
              <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" /> <!-- Emerald = growth -->
                <stop offset="50%" style="stop-color:#3B82F6;stop-opacity:1" /> <!-- Blue = intelligence -->
                <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" /> <!-- Deep blue = trust -->
              </linearGradient>
              
              <!-- Gold accent for premium positioning -->
              <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#D97706;stop-opacity:1" />
              </linearGradient>
              
              <!-- Advanced glow effect -->
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <!-- Pulse animation effect -->
              <radialGradient id="pulse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#10B981;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:0" />
              </radialGradient>
            </defs>
            
            <!-- Background pulse (suggests global reach) -->
            <circle cx="60" cy="60" r="50" fill="url(#pulse)" opacity="0.4" />
            
            <!-- Outer orbital ring (global network) -->
            <circle cx="60" cy="60" r="48" 
                    fill="none" 
                    stroke="url(#brandGradient)" 
                    stroke-width="2.5"
                    stroke-dasharray="8,4"
                    filter="url(#glow)" 
                    opacity="0.7"/>
            
            <!-- Globe latitude lines (207 languages) -->
            <ellipse cx="60" cy="60" rx="48" ry="18" 
                     fill="none" 
                     stroke="url(#brandGradient)" 
                     stroke-width="1.5" 
                     opacity="0.5"/>
            <ellipse cx="60" cy="60" rx="48" ry="32" 
                     fill="none" 
                     stroke="url(#brandGradient)" 
                     stroke-width="1.5" 
                     opacity="0.5"/>
            
            <!-- Globe longitude line -->
            <ellipse cx="60" cy="60" rx="18" ry="48" 
                     fill="none" 
                     stroke="url(#brandGradient)" 
                     stroke-width="1.5" 
                     opacity="0.5"/>
            
            <!-- Inner hexagon (precision, strategy) -->
            <polygon points="60,20 88,35 88,65 60,80 32,65 32,35" 
                     fill="rgba(16,185,129,0.08)" 
                     stroke="url(#brandGradient)" 
                     stroke-width="2.5"
                     filter="url(#glow)" />
            
            <!-- Neural network nodes (AI intelligence) -->
            <circle cx="60" cy="28" r="3" fill="url(#brandGradient)" opacity="0.9"/>
            <circle cx="82" cy="40" r="3" fill="url(#brandGradient)" opacity="0.9"/>
            <circle cx="82" cy="60" r="3" fill="url(#brandGradient)" opacity="0.9"/>
            <circle cx="60" cy="72" r="3" fill="url(#brandGradient)" opacity="0.9"/>
            <circle cx="38" cy="60" r="3" fill="url(#brandGradient)" opacity="0.9"/>
            <circle cx="38" cy="40" r="3" fill="url(#brandGradient)" opacity="0.9"/>
            
            <!-- Central "SI" monogram with gold accent -->
            <circle cx="60" cy="50" r="16" fill="rgba(16,185,129,0.15)" stroke="url(#goldAccent)" stroke-width="2"/>
            <text x="60" y="58" 
                  font-family="'SF Pro Display', 'Segoe UI', system-ui, sans-serif" 
                  font-size="22" 
                  font-weight="800" 
                  fill="url(#brandGradient)" 
                  text-anchor="middle"
                  letter-spacing="-1">SI</text>
            
            <!-- Orbital connection lines (universal connectivity) -->
            <line x1="60" y1="28" x2="82" y2="40" stroke="url(#brandGradient)" stroke-width="1" opacity="0.3"/>
            <line x1="82" y1="40" x2="82" y2="60" stroke="url(#brandGradient)" stroke-width="1" opacity="0.3"/>
            <line x1="82" y1="60" x2="60" y2="72" stroke="url(#brandGradient)" stroke-width="1" opacity="0.3"/>
            <line x1="60" y1="72" x2="38" y2="60" stroke="url(#brandGradient)" stroke-width="1" opacity="0.3"/>
            <line x1="38" y1="60" x2="38" y2="40" stroke="url(#brandGradient)" stroke-width="1" opacity="0.3"/>
            <line x1="38" y1="40" x2="60" y2="28" stroke="url(#brandGradient)" stroke-width="1" opacity="0.3"/>
            
            <!-- Premium shine highlights -->
            <circle cx="48" cy="32" r="2" fill="rgba(245,158,11,0.8)" opacity="0.9" />
            <circle cx="72" cy="38" r="1.5" fill="rgba(255,255,255,0.7)" opacity="0.8" />
          </svg>
          
         <div class="brand-text">
            <!-- Brand name kept as fixed mark, not translated -->
            <div class="brand-name">SOVEREIGN INTELLIGENCE</div>
            <!-- Tagline translated -->
            <div class="brand-tagline">${t('Strategic Advisory')}</div>
          </div>
        </div>
        <div class="title-divider"></div>
      </div>
      
      <div class="title-main">
        <!-- KT: original translated orgName preserved for rollback
        <h1 class="title-headline">${t(esc(canon?.orgName || 'Client'))}</h1>
        -->
        <h1 class="title-headline">${esc(canon?.orgName || 'Client')}</h1>
        <h2 class="title-subtitle">${t('Strategic Transformation & Value Creation Plan')}</h2>
        <div class="title-accent-bar"></div>
      </div>

      <div class="title-footer">
        <div class="title-meta-grid">
          <div class="meta-item">
            <span class="meta-label">${t(L.preparedFor)}</span>
            <span class="meta-value">${esc(canon?.preparedFor || '—')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${t('Prepared by')}</span>
            <span class="meta-value">${esc(canon?.preparedBy || 'Sovereign Intelligence')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${t(L.timeline)}</span>
            <span class="meta-value">${esc(canon?.timeFrame || '—')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${t(L.date)}</span>
            <span class="meta-value">${esc(canon?.reportDate || new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }))}</span>
          </div>
        </div>
        <div class="title-confidential">${t(L.confidential)} | ${t('FOR INTERNAL USE ONLY')}</div>
      </div>
    </section>
`;

    // === MCKINSEY-BEATING: Add Executive Infographic after title page ===
  if (worldClassVisuals.waterfallChart) {
  worldClassVisuals.waterfallChart = worldClassVisuals.waterfallChart
    .replace(/Value Bridge/g, t("Value Bridge"))
    .replace(/Net impact of levers on steady-state cost base/g, t("Net impact of levers on steady-state cost base"));
}
  
    if (worldClassVisuals.execInfographic) {
    reportHtml += `
    <section class="executive-infographic-section">
      <h2 class="ataglance-title">${t('At a Glance')}</h2>
      ${worldClassVisuals.execInfographic}
    </section>
`;
  }

  reportHtml += `
    <section class="toc">
      <h2>${t(L.tableOfContents)}</h2>
      <ol class="toc-list">${tocItems}</ol>
    </section>

    <section>
      <h2 id="exec">${t(L.executiveSummary)}</h2>
      ${execDashboard}
      ${ensureOne(SEC.exec.injected, execFallback)}
      ${SEC.exec.html}
    </section>

    <section>
      <h2 id="current">${t(L.currentState)}</h2>
      ${ensureOne(SEC.current.injected, currentFallback)}
      ${SEC.current.html}
    </section>
// [KT:SURGICAL:VISUALS-TITLE-TRANSLATION]
if (worldClassVisuals.waterfallChart) {
  worldClassVisuals.waterfallChart = worldClassVisuals.waterfallChart
    .replace(/Value Bridge/g, t("Value Bridge"))
    .replace(/Net impact of levers on steady-state cost base/g, t("Net impact of levers on steady-state cost base"));
}

    <section>
      <h2 id="financials">${t(L.financialAnalysis)}</h2>
      ${ensureOne(SEC.financials.injected, finSpend + finPayback)}
      ${worldClassVisuals.waterfallChart ? (() => {
        console.log('[KT:AUDIT][reportTemplate] worldClassVisuals.waterfallChart:', worldClassVisuals.waterfallChart);
        return `
        <div class="chart-desc" style="font-size:14px; color:#e5e7eb; margin:0 0 6px 0;">${t('Description')}: ${t('Waterfall / Value Bridge overview')}</div>
        <h3>${t('Value Bridge Analysis')}</h3>
        ${worldClassVisuals.waterfallChart}
        <h3>${t('Value Bridge Analysis')}</h3>
        `;
      })() : ''}
      ${SEC.financials.html}
    </section>

    <section>
      <h2 id="kpis">${t(L.kpiAnalysis)}</h2>
      ${ensureOne(SEC.kpis.injected, kpiDash)}
      ${worldClassVisuals.radarChart ? `
      <h3>${t('Competitive Positioning')}</h3>
      ${worldClassVisuals.radarChart}
      ` : ''}
      ${SEC.kpis.html}
    </section>

    ${roadmap}

    <section>
      <h2 id="ops">${t(L.operationalAnalysis)}</h2>
      ${prioritizationMatrixHTML({ title: t(L.prioritizationMatrix) })}
      ${ensureOne(
        SEC.ops.injected,
        lineChartHTML({
          title: t('Ops Throughput Trend'),
          labels,
          series: mkDefaultSeries(labels.length, 100),
          xTitle: labels[0].startsWith('Y') ? t('Years') : t('Months'),
          yTitle: t('Index')
        })
      )}
      ${SEC.ops.html}
    </section>

    <section>
      <h2 id="risk">${t(L.riskAssessment)}</h2>
      ${ensureOne(SEC.risk.injected, riskHeat)}
      ${worldClassVisuals.riskHeatmap ? `
      <h3>${t('Risk Priority Matrix')}</h3>
      ${worldClassVisuals.riskHeatmap}
      ` : ''}
      ${SEC.risk.html}
    </section>

    <section>
      <h2 id="roi">${t(L.roiProjections)}</h2>
      ${ensureOne(SEC.roi.injected, roiMini)}
      ${SEC.roi.html}
    </section>

    <!-- [KT:SURGICAL:NEXT-STEPS-MOVED-INTO-TEMPLATE] -->
    <section id="nextSteps" class="report-section">
      ${SEC.nextSteps.html}
    </section>
  </article>
`;


  reportHtml += `
  <style>
    /* McKinsey-style professional layout with visible margins */
    .report{ 
      box-sizing:border-box;
      max-width: 960px; /* [KT:SURGICAL:REPORT-WIDTH] was 8.5in/800px */
      width: 100%;
      margin: 0 auto;
      padding: 0.75in 0.75in 0.75in 0.75in;
      overflow-x: hidden;
      color-scheme: dark;
      background: #0a0e1a;
      color: #e8eefb;
      min-height: 11in;
    }
    .report section{ 
      margin:2.5rem 0 3rem; 
      page-break-inside: avoid;
    }
    .report section h2{
      font-size: 2rem;
      font-weight: 600;
      color: #FFFFFF;
      margin: 0 0 1.5rem 0;
      padding-bottom: 0.75rem;
      border-bottom: 3px solid #3B82F6; /* Royal blue = trust & intelligence */
      letter-spacing: -0.01em;
    }
    .report section h3{
      font-size: 1.4rem;
      font-weight: 600;
      color: #10B981; /* Emerald green = growth */
      margin: 2rem 0 1rem 0;
      letter-spacing: -0.005em;
    }
    .report section h4{
      font-size: 1.1rem;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      margin: 1.5rem 0 0.75rem 0;
    }
    .report p{
      line-height: 1.7;
      margin: 0 0 1.25rem 0;
      color: rgba(255,255,255,0.95);
      font-size: 1.05rem;
    }
    .report ul, .report ol{
      line-height: 1.7;
      margin: 0 0 1.25rem 0;
      padding-left: 1.75rem;
    }
    .report li{
      margin-bottom: 0.6rem;
      color: rgba(255,255,255,0.95);
    }
    .report strong{
      font-weight: 700;
      color: #FFFFFF;
    }
    .report img, .report svg{ max-width:100%; height:auto; }

    /* McKinsey-style title page - EXECUTIVE BUY-IN OPTIMIZED */
    .title-page{ 
      background: linear-gradient(135deg, #0B1A3D 0%, #1e3a5f 100%); /* Deep navy → Royal blue for trust */
      color:#FFFFFF; 
      border-radius:0; 
      padding: 3rem 3rem 2.5rem; 
      min-height: 10in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .title-header{ 
      display: flex;
      align-items: center;
      gap: 2rem;
      margin-bottom: 2rem;
    }
    .title-logo{ 
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .brand-icon{ 
      height:100px; 
      width:100px; 
      flex-shrink: 0;
      filter: drop-shadow(0 4px 12px rgba(255,165,0,0.4));
    }
    .brand-text{
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .brand-name{
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #FFFFFF;
      line-height: 1;
    }
    .brand-tagline{
      font-size: 0.75rem;
      font-weight: 400;
      letter-spacing: 0.1em;
      color: #10B981; /* Emerald green = premium growth advisory */
      text-transform: uppercase;
    }
    .title-divider{
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, #10B981 0%, transparent 100%); /* Green gradient = forward momentum */
    }
    .title-main{
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 2rem 0;
    }
    .title-headline{ 
      margin:0 0 1rem; 
      font-size: 3.5rem; 
      font-weight: 300;
      letter-spacing: -0.02em;
      line-height: 1.1;
      color: #FFFFFF;
    }
    .title-subtitle{ 
      margin:0.5rem 0 1.5rem; 
      font-size: 1.75rem; 
      font-weight: 600;
      color: #10B981; /* Emerald green = growth/transformation */
      letter-spacing: -0.01em;
    }
    .title-accent-bar{
      width: 120px;
      height: 4px;
      background: linear-gradient(90deg, #10B981 0%, #3B82F6 100%); /* Green to blue = growth + trust */
      margin-top: 1rem;
      box-shadow: 0 2px 12px rgba(16, 185, 129, 0.4); /* Green glow for success */
    }
    .title-footer{
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 2rem;
    }
    .title-meta-grid{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem 3rem;
      margin-bottom: 2rem;
    }
    .meta-item{
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .meta-label{
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.6);
      font-weight: 600;
    }
    .meta-value{
      font-size: 1.1rem;
      color: #FFFFFF;
      font-weight: 400;
    }
    .title-confidential{
      text-align: center;
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: rgba(255,255,255,0.5);
      font-weight: 600;
      padding-top: 1rem;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .toc .toc-list{ padding-left:1.25rem; }
    .toc .toc-list li{ margin:.3rem 0; }

    /* BEYOND MCKINSEY: Executive dashboard - visual at-a-glance metrics */
    .exec-dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0 3rem;
      padding: 2rem;
      background: linear-gradient(135deg, rgba(255,165,0,0.03) 0%, transparent 100%);
      border-radius: 12px;
      border: 1px solid rgba(255,165,0,0.15);
    }
    .metric-card {
      background: linear-gradient(135deg, #1a2332 0%, #0f1419 100%);
      border: 1px solid rgba(16,185,129,0.3); /* Emerald green = growth */
      border-radius: 10px;
      padding: 1.75rem 1.5rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #10B981 0%, #3B82F6 100%); /* Green to blue = growth + trust */
    }
    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(16,185,129,0.3); /* Green glow on hover */
      border-color: #10B981; /* Emerald green highlight */
    }
    .metric-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.6);
      font-weight: 600;
      margin-bottom: 0.75rem;
    }
    .metric-value {
      font-size: 2.75rem;
      font-weight: 700;
      color: #10B981; /* Emerald green = profit/growth */
      line-height: 1;
      margin-bottom: 0.5rem;
      font-family: 'Georgia', serif;
    }
    .metric-unit {
      font-size: 1.25rem;
      color: rgba(255,255,255,0.8);
      font-weight: 400;
    }
    .metric-context {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.7);
      margin-top: 0.75rem;
      line-height: 1.4;
    }
    .metric-trend {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: #4CAF50;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .metric-trend.negative {
      color: #F44336;
    }
    .metric-trend::before {
      content: '↑';
      font-size: 1.2rem;
    }
    .metric-trend.negative::before {
      content: '↓';
    }

    /* McKinsey-style callout boxes for key insights */
    .insight-callout {
      background: linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%); /* Green glow = growth insight */
      border-left: 4px solid #10B981; /* Emerald green = key insight */
      border-radius: 0 8px 8px 0;
      padding: 1.5rem 1.75rem;
      margin: 2rem 0;
      box-shadow: 0 2px 12px rgba(16,185,129,0.3); /* Green shadow = positive impact */
    }
    .insight-callout-header {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #10B981; /* Emerald green = insight label */
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    .insight-callout-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 1rem 0;
      line-height: 1.3;
    }
    .insight-callout-body {
      font-size: 1rem;
      line-height: 1.6;
      color: rgba(255,255,255,0.9);
      margin: 0;
    }
    .insight-callout-impact {
      font-size: 2rem;
      font-weight: 700;
      color: #10B981; /* Emerald green = positive impact metric */
      margin: 1rem 0 0.5rem;
      font-family: 'Georgia', serif;
    }
    .insight-callout-implication {
      font-style: italic;
      color: rgba(255,255,255,0.8);
      margin-top: 1rem;
      padding-top: 1rem;
    ${GRAPH_CSS}
    ${typeof IMPLKIT_CSS !== 'undefined' ? IMPLKIT_CSS : ''}

    /* Global Appendix-style table theme */
    ${IMPLKIT_CSS}

    /* Global Appendix-style table theme */
    .table{ width:100%; border-collapse:collapse; background:linear-gradient(180deg,#0B2036,#08192B); color:#FFFFFF; }
    .table th, .table td{ border:1px solid rgba(230,240,255,.15); padding:8px 10px; vertical-align:top; font-size:0.95rem; }
    .table th{ background:#000000; color:#FFFFFF; font-weight:700; text-align:left; }
    .table tbody tr:nth-child(even) td{ background:rgba(255,255,255,.02); }
    .table caption{ caption-side:top; text-align:left; color:#BFE1FF; font-weight:700; padding:6px 2px; }
table.title.ai caption {
  font-weight: 800;
  color: #FFFFFF !important;
  text-align: left;
  padding-bottom: 0.35rem;
  caption-side: top;
  /* White, bold AI-inferred table captions (works for both <caption> and .table-title) */
.report .table caption,
.report .table .table-title{
  font-weight:800;
  color:#FFFFFF !important;
  text-align:left;
  padding-bottom:0.35rem;
  caption-side:top;
}

}


    .kpi-grid{ display:grid; grid-template-columns:1fr; gap:10px; }
    @media (min-width: 900px){ .kpi-grid{ grid-template-columns:1fr 1fr; } }

    @media print {
      @page { size: Letter portrait; margin: 0.75in; }
      .report{ max-width: 100%; padding:0; }
      .report section{ break-inside: avoid; page-break-inside: avoid; }
    }

    /* [KT:SURGICAL] Report tables — McKinsey-level styling */
    .report .report-table{ 
      background:#000; 
      color:#fff; 
      border-collapse:separate; 
      border-spacing:0; 
      /* width:100%;  [KT:LEGACY:TAB-WIDTH] commented to allow clamped layout */
      margin: 1.2rem 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      /* [KT:SURGICAL:APPX-TABLE-CLAMP] clamp table width inside page, but allow horizontal scroll if needed */
  }
  .report .table-wrapper,
  .report section > .report-table {
    max-width: 100%;
    margin-inline: auto;
  }
  .report section > .report-table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    }
    .report .report-table th, .report .report-table td{
      border:1px solid rgba(255,255,255,0.2) !important; 
      padding:.7rem .8rem;
      text-align: left;
      vertical-align: top;
      line-height: 1.5;
    }
    .report .report-table thead th{ 
      background: linear-gradient(180deg, #1a1a1a 0%, #111 100%);
      font-weight:700; 
      color:#fff; 
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #3B82F6 !important; /* Royal blue = data credibility */
      padding: 0.9rem 0.8rem;
    }
    .report .report-table tbody tr:nth-child(even){ background:#070707; }
    .report .report-table tbody tr:hover{ background:#0d0d0d; transition: background 0.15s ease; }
    .report .report-table tbody td:first-child{ font-weight: 600; }
    .report .report-table tbody td[style*="text-align: right"], 
    .report .report-table tbody td[style*="text-align:right"]{ font-family: 'Courier New', monospace; }
    .report .report-table caption{ caption-side:top; color:#fff; font-weight:800; margin-bottom:.6rem; font-size: 1.1rem; }
      /* [KT:SURGICAL:APPX-TABLE-TITLES] reinforce white/bold titles across all appendix tables */
      .report .report-table caption,
      .report .report-table .table-title {
        font-weight: 800;
        color: #FFFFFF !important;
        text-align: left;
        margin-bottom: 0.35rem;
        font-size: 1.05rem;
      }
    /* Make injected table titles bold and white */
    .report .table-title {
      font-weight: 800;
      color: #FFFFFF !important;
      margin-bottom: 0.4rem;
    }

    /* [KT:SURGICAL] Chart UI pin + dark card */
    .report figure[data-chart]{ background:#0b0b0b; color:#fff; border:1px solid #2a2a2a; border-radius:14px; padding:16px 14px 14px; }
    .report figure[data-chart] .chart-ui select{ background:#111; color:#fff; border:1px solid #444; border-radius:8px; padding:.2rem .4rem; }
    .report figure[data-chart] .chart-desc{ color:#eaeaea; }
    
    /* RTL Language Support - 207 Languages */
    .report[dir="rtl"] {
      text-align: right;
    }
    .report[dir="rtl"] ul, .report[dir="rtl"] ol {
      padding-right: 1.75rem;
      padding-left: 0;
    }
    .report[dir="rtl"] .title-header {
      flex-direction: row-reverse;
    }
    .report[dir="rtl"] .title-logo {
      flex-direction: row-reverse;
    }
    .report[dir="rtl"] .exec-dashboard {
      direction: rtl;
    }
    .report[dir="rtl"] .metric-card {
      text-align: right;
    }
    .report[dir="rtl"] .title-meta-grid {
      direction: rtl;
    }
    .report[dir="rtl"] .meta-item {
      text-align: right;
    }
    .report[dir="rtl"] table th,
    .report[dir="rtl"] table td {
      text-align: right;
    }
  </style>

  <script>
  (function csvExport(){
    document.querySelectorAll('section.appendix .table').forEach((tbl, idx) => {
      const btn=document.createElement('button');
      btn.textContent='Download CSV';
      btn.style.cssText='margin:6px 0; padding:6px 10px; border-radius:6px; background:#000000; color:#fff; border:1px solid rgba(255,255,255,.15)';
      tbl.parentNode.insertBefore(btn, tbl);
      btn.addEventListener('click', () => {
        const csv=[...tbl.querySelectorAll('tr')].map(tr =>
          [...tr.children].map(td => '"' + td.innerText.replace(/"/g,'""') + '"').join(',')
        ).join('\n');
        const a=document.createElement('a');
        a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
        a.download=(tbl.closest('section.appendix')?.querySelector('h3')?.textContent||'table') + '-' +(idx+1) + '.csv';
        a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
      });
    });
  })();
  </script>
  `;
  

  // [KT:SURGICAL:STANDARD-DESC:B — ORIGINAL GLOBAL CALL COMMENTED]
  // The following global-scope call caused ReferenceError/duplication in some builds.
  // Keeping it for history, but disabled to avoid out-of-scope mutation.
  // postHTML = tagStandardVisualsWithDataAttrs(postHTML);

  // [KT:SURGICAL] **Move style block into function** (valid JS string). Appended before return.
  const __kt_styled = `
    <style>
      #report { max-width: 900px; margin: 0 auto; padding: 0 8px; overflow-x: hidden; }
      .report { box-sizing: border-box; background:#000; color:#fff; padding: 16px; border-radius: 16px; }
      figure[data-chart] { position: relative; background:#0b0b0b; border:1px solid #2a2a2a; border-radius:14px; padding:16px 14px 14px; }
      figure[data-chart] .chart-ui select { background:#111; color:#fff; border:1px solid #444; border-radius:8px; padding:.2rem .4rem; }
      p.chart-note { margin:.5rem 0 1rem; font-size:.95rem; line-height:1.35; }
      .report-table { 
        width:100%; 
        border-collapse: separate; 
        border-spacing: 0; 
        background:#000; 
        color:#fff; 
        margin: 1.2rem 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      .report-table th, .report-table td { 
        border: 1px solid rgba(255,255,255,0.2); 
        padding:.7rem .8rem;
        text-align: left;
        vertical-align: top;
        line-height: 1.5;
      }
      .report-table thead th { 
        background: linear-gradient(180deg, #1a1a1a 0%, #111 100%);
        font-weight:700; 
        color:#fff;
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid #3B82F6 !important; /* Royal blue = data credibility */
        padding: 0.9rem 0.8rem;
      }
      .report-table tbody tr:hover{ background:#0d0d0d; transition: background 0.15s ease; }
      .report-table tbody td:first-child{ font-weight: 600; }
      .report-table caption, .table-title { caption-side: top; color:#fff; font-weight:800; margin-bottom:.6rem; font-size: 1.1rem; }
    </style>
  `;

  // [KT:SURGICAL:WIDTH-GUARD:FINAL] — final override so report is full-width and half-inch margin
  html += `\n<style>
    /* [KT:SURGICAL:WIDTH-GUARD-SIMPLIFIED] Only prevent accidental overflow on inner canvases; let .report control its own max-width. */
    .report-canvas, .report-body {
      max-width: 100% !important;
    }
    @media print {
      @page { size: Letter portrait; margin: 0.5in; } /* [KT:SURGICAL] Half-inch margin for investor print */
      .report{ max-width: 100%; padding:0; }
      .report section{ break-inside: avoid; page-break-inside: avoid; }
    }
    .report .table-title {
      font-weight: 800;
      color: #FFFFFF !important;
      margin-bottom: 0.4rem;
      font-size: 1.1rem;
      background: none;
      border: none;
      padding: 0;
      text-align: left;
    }
    /* Table overflow fix - prevent tables from breaking page layout */
    .table-wrapper, section > .report-table, .report .table, .report-table {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
      margin: 1rem 0;
      border-radius: 8px;
      display: block;
      width: 100%;
      max-width: 100vw;
    }
  </style>`;
  console.log('[SR:REFORM] width.guard.injected@final [KT:SURGICAL:HALF-INCH-MARGIN]');


  // --- APPENDIX SECTION: Always render Appendix A–K, with main title, correct order, and style ---
    if (implKit) {
    // [KT:SURGICAL:I18N-TRANSLATION-LOG]
    try {
      console.log(
        '[TRANSLATION] Language:',
        L && L.lang ? L.lang : '(unknown)',
        'Sample title:',
        L && L.title ? L.title : '(no title)'
      );
    } catch (e) {
      console.warn('[TRANSLATION] Log failed', e);
    }

    reportHtml +=
      `\n<section id="appendices" class="report-section"><h2>${t(L.appendix || 'Appendix')}</h2>\n` +

      [
        (() => {
          if (
            !implKit.charters ||
            !Array.isArray(implKit.charters.items) ||
            implKit.charters.items.length === 0
          ) {
            console.log('[APPENDIX-A] Not injected: charters missing or empty', {
              charters: implKit?.charters || null,
            });
            return chartersHTML(implKit.charters); // Will render empty table or message
          } else {
            console.log('[APPENDIX-A] ✔️ Data injected: charters', {
              count: implKit.charters.items.length,
            });
            return chartersHTML(implKit.charters);
          }
        })(),
        raciHTML(implKit.raci),
        raidHTML(implKit.raid),
        benefitsHTML(implKit.benefits),
        plan100HTML(implKit.plan100),
        (() => {
          if (!implKit.pilot || Object.keys(implKit.pilot).length === 0) {
            console.log('[APPENDIX-F] Not injected: pilot missing or empty', {
              pilot: implKit.pilot,
            });
            return pilotHTML(implKit.pilot); // Will render empty table or message
          } else {
            // Check if at least one field is non-empty
            const hasData = Object.values(implKit.pilot).some(
              (v) => v && String(v).trim() !== ''
            );
            if (hasData) {
              console.log('[APPENDIX-F] ✔️ Data injected: pilot', {
                pilot: implKit.pilot,
              });
            } else {
              console.log('[APPENDIX-F] Not injected: pilot fields all empty', {
                pilot: implKit.pilot,
              });
            }
            return pilotHTML(implKit.pilot);
          }
        })(),
        (() => {
          if (
            !implKit.assumptions ||
            !Array.isArray(implKit.assumptions.items) ||
            implKit.assumptions.items.length === 0
          ) {
            console.log(
              '[APPENDIX-G] Not injected: assumptions missing or empty',
              { assumptions: implKit.assumptions }
            );
            return assumptionsHTML(implKit.assumptions); // Will render empty table or message
          } else {
            console.log('[APPENDIX-G] ✔️ Data injected: assumptions', {
              count: implKit.assumptions.items.length,
            });
            return assumptionsHTML(implKit.assumptions);
          }
        })(),
        methodsSourcesHTML(implKit.methods),
        /* [KT:SURGICAL:COMMENTED-OUT-DUPLICATE-APPENDIX-J] decisionFrameworkHTML(implKit.decisionFramework), */
        implementationChecklistHTML(implKit.implementationChecklist),
        decisionFrameworkHTML(implKit.decisionFramework),
        resourceRequirementsHTML(implKit.resourceRequirements),
      ]
        .filter(Boolean)
        .join('\n') +
      `\n</section>`;
  }


  // [KT:SURGICAL:NEXT-STEPS-BEFORE-APPENDICES]
  /*if (SEC.nextSteps && SEC.nextSteps.html){
   reportHtml += `\n<section><h2 id="nextSteps">${L.nextSteps}</h2>${SEC.nextSteps.html}</section>\n`;
  }*/

  // [KT:SURGICAL:COMMENTED-OUT-APPENDIX-NEXT-STEPS]
  /*
  // [KT:SURGICAL:NEXT-STEPS-IN-APPENDIX] (Commented out to dedupe Next Steps)
  if (appendicesHTML && appendicesHTML.includes('Next Steps')) {
    // This block rendered Next Steps in the appendix. It is now commented out to avoid duplication.
    // reportHtml += ...
  }
  */

  // [KT:SURGICAL:APPENDIX-PLACEMENT-ADD] Insert appendices before conclusion (additive, no deletions)
  /* [KT:SURGICAL:COMMENTED-OUT-LEGACY-APPENDICES]
  if (appendicesHTML) {
    reportHtml += `\n${appendicesHTML}\n`;
  }
  */

  // ...existing code for dark theme, type switch, dedupe, and style...
  reportHtml += `
  <style>
  .report{ background:#000000; color:#e8eefb; color-scheme:dark; }
  .report h1, .report h2, .report h3{ color:#e8eefb; }
  .report .table{ background:#000000; color:#e8eefb; }
  .report .table th, .report .table td{ border:1px solid #FFFFFF !important; }
  .report .table th{ background:#000000; color:#d9e6ff; }
  .report-table th, .report-table td{ border:1px solid #FFFFFF !important; }
  
  /* Table overflow fix - prevent tables from breaking page layout */
  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 1rem 0;
    border-radius: 8px;
  }
  section > .report-table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  </style>`;
  
  console.log('[SR:REFORM] ✅ [TABLE-FIX] Table overflow CSS injected');

  /* [KT:SURGICAL:TYPE-SWITCH] Inject SVG-based type switcher from reportGraphs.js */
  reportHtml += `\n<scr` + `ipt>\n${TYPE_SWITCH_SCRIPT}\n</scr` + `ipt>`;
  console.log('[SR:REFORM] ✅ [DROPDOWN-FIX] TypeSwitch script injected, length:', TYPE_SWITCH_SCRIPT.length, 'chars');
  
  // Verify the script has the fixed querySelector with .chart-ui select
  if (TYPE_SWITCH_SCRIPT.includes(".chart-ui select") && TYPE_SWITCH_SCRIPT.includes("select.chart-type-select")) {
    console.log('[SR:REFORM] ✅ [DROPDOWN-FIX] Script contains ENHANCED multi-fallback selector pattern');
  } else if (TYPE_SWITCH_SCRIPT.includes("querySelector('.chart-type select') || card.querySelector('.chart-type-select')")) {
    console.error('[SR:REFORM] ❌ [DROPDOWN-FIX] ERROR: Script still has OLD querySelector (OR logic)!');
  } else {
    console.warn('[SR:REFORM] ⚠️ [DROPDOWN-FIX] WARNING: Cannot verify querySelector pattern - may not include .chart-ui select');
  }

  /* [KT:SURGICAL:DEDUP-AT-RETURN] Remove duplicate visuals at final assembly */
  try {
    html = __kt_dedupeVisuals(html);
  } catch (e) {
    console.log('[report] visuals.dedupe.error', String(e?.message || e));
  }

  // [KT:SURGICAL] Append scoped style at final return
  return reportHtml + __kt_styled;
}


/* ============================================================================
   [KT:SURGICAL][2025-10-30_00-11-29_EDT] — Width & contrast + table styling + chart card polish
============================================================================ */

// Post-process function exported for optional use (kept in-file).
// Moves chart notes / injects chart head select safely.

export function __kt_postprocess_report_html(html){
  try{
    let src = String(html||'');

    // helper to decode attribute JSON safely
    function _parseAttrJSON(s){ try{ return JSON.parse(String(s).replace(/&quot;/g,'"').replace(/&amp;/g,'&')); }catch(_){ return null; } }

    // 1) Move paragraph + inject head/select inside figure
    // NOTE: corrected regular expressions to avoid invalid character class ranges
    src = src.replace(/<figure([^\>]*data-chart=['"][^'"\>]+['"][^\>]*)\>([\s\S]*?)<\/figure\>(\s*<p\>([\s\S]*?)<\/p>)?/gi,
      function(_m, open, inner, afterPWhole, afterPText){
        // If already has a head and a chart-note, keep as-is
        // Use safer regex patterns that do not include unescaped bracket sequences inside character classes
        if (/<div[^\>]*class=(?:['"])[^'"]*chart-head[^'"]*(?:['"])[^\>]*>/i.test(inner) && /<p[^\>]*class=(?:['"])[^'"]*chart-note[^'"]*(?:['"])[^\>]*>/i.test(inner)){
          return '<figure'+open+'>' + inner + '</figure>' + (afterPWhole||'');
        }

        // Try to extract chart title from data-chart spec
        const specMatch = open.match(/data-chart=(?:['"])([^'"]+)(?:['"])/i);
        let title = 'Chart';
        if (specMatch){
          const spec = _parseAttrJSON(specMatch[1]);
          if (spec && spec.title) title = String(spec.title);
        
        }
        

        // Build the header + note; white label for Type
        const head =
          '' +
          '<div class="chart-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.35rem;">' +
            '<div class="chart-title" style="font-weight:700;color:#FFFFFF;">' + title.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>' +
            '<div class="chart-ui" style="display:flex;align-items:center;gap:.4rem;">' +
              '<span style="color:#E6F0FF;opacity:.9;font-size:.85rem">Type:</span>' +
              '<select class="chart-type-select" style="background:#14324f;color:#E6F0FF;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:.2rem .45rem;font-size:.85rem">' +
                '<option value="line">Line</option><option value="area">Area</option><option value="bar">Bar</option>' +
              '</select>' +
            '</div>' +
          '</div>';

        // Prefer the “full” paragraph after the figure; if none, try to find any inline short note
        let noteText = (afterPText||'').trim();
        if (!noteText){
          const inlineNote = inner.match(/<p[^\>]*class=(?:['"])([^'"]*chart-note[^'"]*)(?:['"])[^\>]*\>([\s\S]*?)<\/p>/i);
          if (inlineNote) noteText = inlineNote[2].replace(/<[^>]*>/g, '').trim();
        }
        if (!noteText) noteText = 'This visual presents the key performance trend. Use the pattern and variance to inform next-quarter decisions.';

        // Remove any existing inline short note to avoid duplicates
        inner = inner.replace(/<p[^\>]*class=(?:['"])[^'"]*chart-note[^'"]*(?:['"])[^\>]*\>[\s\S]*?<\/p>/gi, '');

        const note = '<p class="chart-note" style="margin:.35rem 0 .25rem;color:#cfe7ff;font-size:.9rem;">' +
          noteText.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>';

        // Build the new figure with head + note injected at the top
        const rebuilt = '<figure' + open + '>' + head + note + inner + '</figure>';

        // Hide legacy paragraph (after figure) without deleting it
        let legacy = afterPWhole || '';
        if (legacy){ legacy = legacy.replace(/^\<p\>/i, '<p data-kt-legacy-note="hidden" style="display:none">'); }

        return rebuilt + legacy;
      }
    );

    // 2) Guarantee a tiny style helper (idempotent)
    if (!/\.chart-head/.test(src)){
      src += '\n<style>.chart-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.35rem}</style>';
    }
    
    // 3) Add chart summary styling
    if (!/\.chart-summary/.test(src)){
      src += `\n<style>
.chart-summary{
  background:linear-gradient(135deg,rgba(16,185,129,0.1) 0%,rgba(59,130,246,0.1) 100%);
  border-left:4px solid #10B981;
  padding:0.75rem 1rem;
  margin:0 0 1rem 0;
  border-radius:6px;
}
.chart-summary p{margin:0.25rem 0;font-size:0.95rem;line-height:1.5;color:#e5e7eb;}
.summary-result{font-size:1rem;}
.summary-highlights{color:#d1d5db;font-size:0.9rem;}
</style>`;
    }
    
    return src;
  }catch(e){
    console.warn('[KT] postprocess error', e);
    return html;
  }
}

/* ===========================================================
   ADDED: Safe Table Title Generator (non-destructive)
   - If a table has <caption>, we create .table-title (visible) before the table.
   - The original <caption> is hidden and marked with data-kt-legacy="hidden".
   - This is idempotent and will not delete content.
   ===========================================================*/
(function(){
  try{
    if (typeof document === 'undefined') {
      // server-side rendering path: nothing to do
    } else {
      var ensure = function(){
        document.querySelectorAll('table').forEach(function(tbl){
          if(tbl.dataset.ktTitleProcessed) return;
          var cap = tbl.querySelector('caption');
          if(cap){
            var txt = cap.textContent.trim();
            if(txt && (!tbl.previousElementSibling || !tbl.previousElementSibling.classList.contains('table-title'))){
              var t = document.createElement('div');
              t.className = 'table-title';
              t.textContent = txt;
              t.setAttribute('data-kt-generated','true');
              tbl.parentNode.insertBefore(t, tbl);
            }
            cap.setAttribute('data-kt-legacy','hidden');
            cap.style.display = 'none';
          }
          tbl.dataset.ktTitleProcessed = '1';
        });
      };
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure);
      else ensure();
    }
  }catch(e){ console.warn('[KT] ensureTableTitles failed', e); }
})();

/**
 * Asynchronously builds the reform report HTML with translation support.
 */
export async function buildReformReportHTMLWithTranslation(opts) {
  const safeOpts = opts || {};
  const canon = safeOpts.canon || {};
  const lang = canon.lang || 'English';

  // Honor any pre-computed translatedLabels if they’re passed in
  let translatedLabels = safeOpts.translatedLabels;
  // If translation is needed, you must implement or import translateReportLabels elsewhere.
  // For now, fallback to DEFAULT_LABELS.
  if (!translatedLabels || typeof translatedLabels !== 'object') {
    translatedLabels = DEFAULT_LABELS;
  }

  // Reuse your existing template logic; no changes inside
  return buildReformReportHTML({
    ...safeOpts,
    translatedLabels,
  });
}

/* ============================================================================
   End of reportTemplate.js
============================================================================ */

