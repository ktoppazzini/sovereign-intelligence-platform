// [KT:FIX] Ensure all required chart and utility imports are present
import { translateContent, translateBatch } from './dynamicTranslation';
import {
  lineChartHTML,
  barChartHTML,
  heatmapHTML,
  benchmarkHTML,
  prioritizationMatrixHTML,
  setGraphTranslator,
  GRAPH_CSS,
  TYPE_SWITCH_SCRIPT
} from './reportGraphs.js';
import { planDiagramHTML } from './implPlan.js';

import {
  IMPLKIT_CSS,
  chartersHTML, raciHTML, raidHTML,
  benefitsHTML, plan100HTML, pilotHTML,
  assumptionsHTML, methodsSourcesHTML,
  implementationChecklistHTML, decisionFrameworkHTML, resourceRequirementsHTML
} from './implKitHtml.js';
// NOTE: setGraphTranslator is set dynamically in route.js when canon.lang is known

/* ============================================================================
//   [LOCKED FILE — SOVEREIGN INTELLIGENCE]
//   ENFORCEMENT HEADER – DO NOT REMOVE
// ============================================================================
*/

// /lib/reportTemplate.js
// Surgical: adjust viewport width to remove inner scrollbar; keep letter portrait for print.

export const DEFAULT_LABELS = {
  // Report Structure
  
  executiveSummary: "Executive Summary",
  tableOfContents: "Table of Contents",
  currentState: "Current State Analysis",
  financialAnalysis: "Financial Analysis",
  kpiAnalysis: "KPI & Performance Metrics",
  implementationTimeline: "Implementation Timeline",
  operationalAnalysis: "Operational Analysis",
  riskAssessment: "Risk Assessment",
  roiProjections: "ROI Projections",
  nextSteps: "Next Steps",
  predictiveIntelligence: "Predictive Intelligence",
  appendices: "Appendices",
  implementationPlan: "Implementation Plan",
  
  // Implementation Plan Phase Labels
  phase: "Phase",
  planningReadiness: "Planning & readiness",
  digitalBackbone: "Digital backbone & pilot markets",
  franchiseNetwork: "Franchise network & supply chain scale",
  brandMomentum: "Brand momentum & national penetration",
  optimization: "Optimization & continuous improvement",
  
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
  trendOutperform: "pp vs baseline",
  
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
  complexity: "Complexity",
  businessImpact: "Business Impact",
  majorProjects: "Major Projects",
  bigBets: "Big Bets",
  overall: "Overall",
  keyInsights: "Key Insights",
  initiativesDistributed: "Initiatives are distributed across quadrants, highlighting both quick wins and major projects.",
  highestImpact: "Highest impact: Digital transformation. Most efficient: Quick wins.",
  
  // Risk Assessment Labels
  riskHeatMap: "Risk Heat Map",
  riskAssessmentMatrix: "Risk Assessment Matrix",
  likelihood: "LIKELIHOOD",
  severity: "SEVERITY",
  rare: "Rare",
  unlikely: "Unlikely",
  possible: "Possible",
  likely: "Likely",
  almostCertain: "Almost Certain",
  negligible: "Negligible",
  minor: "Minor",
  moderate: "Moderate",
  major: "Major",
  critical: "Critical",
  risks: "Risks",
  noDescriptionProvided: "No description provided.",
  riskHeatmapVisualizes: "Risk heatmap visualizes",
  identifiedRisksBySeverity: "identified risks by severity (vertical) and likelihood (horizontal).",
  colorLegend: "Color legend:",
  redCritical: "Red = critical",
  orangeHigh: "Orange = high",
  greenMedium: "Green = medium",
  blueLow: "Blue = low",
  
  // Chart UI Labels
  type: "TYPE",
  line: "Line",
  bar: "Bar",
  pie: "Pie",
  doughnut: "Doughnut",
  predictive: "Predictive",
  years: "Years",
  months: "Months",
  weeks: "Weeks",
  index: "Index",
  percent: "Percent",
  
  // Appendix Labels
  appendix: "Appendix",
  projectCharters: "Initiative Charters",
  raciMatrix: "RACI & Decision SLAs",
  raidLog: "RAID (Risks, Assumptions, Issues, Dependencies)",
  benefitsRealization: "Benefits Realization Model",
  hundredDayPlan: "100-Day Plan (Week by Week)",
  pilotCharter: "Pilot Charter",
  assumptionsRanges: "Assumptions & Ranges",
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
  criteria: "Criteria",
  recommendation: "Recommended Action",
  rationale: "Rationale",
  type: "TYPE",
  description: "Description",
  impactHeader: "Impact",
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
  
  // Title Page
  transformationPlan: "Strategic Transformation & Value Creation Plan",
  forInternalUseOnly: "FOR INTERNAL USE ONLY",
  missionCriticalInitiative: "Transforming Operations with Precision",
  
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

  // === Chart Labels (standard + axes) ===
  projectedSavings: "Projected Savings Over Time",
  deliveryPenetration: "Delivery Penetration vs Market",
  savingsBreakdown: "Savings Breakdown",
  paybackAnalysis: "Payback Analysis",
  operatingExpenses: "Operating Expenses",
  kpiDashboard: "KPI Dashboard",
  riskHeatmap: "Risk Heatmap",
  opsThroughputTrend: "Ops Throughput Trend",

  // NEW – standard chart titles used in fallbacks
  implementationExpenditures: "Implementation Expenditures",
  cumulativePayback: "Cumulative Payback",
  roiTrend: "ROI Trend (AI)",

  // Chart UI / axes (used by standard + injected charts)
  chartTypeLabel: "Type",
  chartTypeLine: "Line",
  chartTypeBar: "Bar",
  chartTypeHeatmap: "Heatmap",

  savingsAxis: "Savings",
  spendAxis: "Spend",
  yearsAxis: "Years",
  monthsAxis: "Months",
  percent: "Percent",
  cumulativeAxis: "Cumulative",
  roiIndexAxis: "ROI Index",
  indexAxis: "Index",

  overallLabel: "Overall",
  keyInsightsLabel: "Key Insights",
  
  // Additional Terms
  forInternalUseOnly: "FOR INTERNAL USE ONLY",
  contents: "Contents",
  quickWinsIn90Days: "Quick wins in 90 days",
  recurringAnnualBenefit: "Recurring annual benefit",
  potentialUpside: "potential upside",
  phasedRolloutAcross: "Phased rollout across",
  basedOnBenchmarks: "Based on benchmarks",
  transformsCoreOperations: "Transforms core operations",
  missionCriticalInitiative: "Mission-critical initiative",
  atAGlance: "At a Glance",
  valueBridgeAnalysis: "Value Bridge Analysis",
  valueBridgeDescription: "Description: Waterfall / Value Bridge overview",
  
  // [SR:TRANSLATION-COMPLETENESS] Additional labels for full translation coverage
  executiveSummaryAtAGlance: "Executive Summary at a Glance",
  valuesShow: "Values show",
  trendFrom: "trend from",
  to: "to",
  achieved: "achieved",
  averagePerformance: "Average performance",
  peakValueOf: "Peak value of",
  increasing: "Increasing",
  decreasing: "Decreasing",
  stable: "Stable",
  trend: "trend",
  peak: "Peak",
  average: "Average",
  component: "Component",
  valueBridgeAnalysisGraph: "Value Bridge Analysis Graph",
  effortComplexity: "effort / complexity →",
  riskHeatMapLabel: "Risk Heat Map",
  processAutomation: "Process automation",
  cloudMigration: "Cloud migration",
  digitalTransformation: "Digital transformation",
  teamTraining: "Team training",
  vendorConsolidation: "Vendor consolidation",
  discovery: "Discovery",
  design: "Design",
  pilotPhase: "Pilot",
  scalePhase: "Scale",
  opsLabel: "Ops",
  salesLabel: "Sales",
  cxLabel: "CX",
  itLabel: "IT",
  peopleLabel: "People",
  keyInsight: "KEY INSIGHT",
  recommendationLabel: "Recommendation",
  
  waterfallChartShowing: "Waterfall chart showing value creation from current state",
  toTargetState: "to target state",
  withKeyValueDrivers: "with key value drivers.",
  currentState: "Current State",
  digitalBackbone: "Digital Backbone Growth",
  maintenanceOptimization: "Maintenance Optimization",
  implementationPhase: "Implementation Phase",
  marketExpansion: "Market Expansion",
  innovationCost: "Innovation Cost",
  targetState: "Target State",
  competitivePositioning: "Competitive Positioning",
  riskPriorityMatrix: "Risk Priority Matrix",
  activities: "Activities",
  successCriteria: "Success Criteria",
  chartType: "Type",
  line: "Line",
  bar: "Bar",
  pie: "Pie",
  doughnut: "Doughnut",
  keyInsight: "KEY INSIGHT",
  potentialValue: "potential value",
  million: "M",
  billion: "B",
  thousand: "K",
  currency: "$",
  currencyFormat: "${value}{unit}",
  // Table labels - for report tables (Table 1, Table 2, etc.)
  Table: "Table",
  tableCaption: "tableCaption",
  untitledTable: "Untitled Table",
  // Chart and Content Labels - These are often generated by AI and need translation
  'Chart takeaway': 'Chart takeaway',
  'Chart summary': 'Chart summary',
  'Key Finding': 'Key Finding',
  'Key finding': 'Key finding',
  'Summary': 'Summary',
  'Takeaway': 'Takeaway',
  'Key Highlights': 'Key Highlights',
  // [KT:CONTENT-TRANSLATION-FIX] Missing labels from user feedback - Dec 19, 2025
  'KEY INSIGHT': 'KEY INSIGHT',
  'Potential value': 'Potential value',
  'Go-to-market': 'Go-to-market',
  'Payback Period': 'Payback Period',
  'Payback/ROI': 'Payback/ROI',
  'Localized bundles': 'Localized bundles',
  'seasonal promotions': 'seasonal promotions',
  'margins': 'margins',
  'incremental value': 'incremental value',
  '(current)': '(current)',
  'current': 'current',
  // [KT:CHART-TITLES-FIX] Missing chart titles - Dec 19, 2025
  'Value Bridge Analysis Graph': 'Value Bridge Analysis Graph',
  'Savings Realization': 'Savings Realization',
  'Market share growth vs industry benchmark': 'Market share growth vs industry benchmark',
  // Priority Matrix / Prioritization Matrix labels
  'Initiatives Priority Matrix': 'Initiatives Priority Matrix',
  'First-Priority Matrix': 'First-Priority Matrix',
  'BIGBETS': 'BIGBETS',
  'QUICKWINS': 'QUICKWINS',
  'FILLINS': 'FILLINS',
  'MAJORPROJECTS': 'MAJORPROJECTS',
  'effort / complexity': 'effort / complexity',
  'businessImpact': 'businessImpact',
  // Risk Heat Map labels
  'Risk Heat Map': 'Risk Heat Map',
  'Risk levels': 'Risk levels',
  'Risk Assessment Matrix': 'Risk Assessment Matrix',
  'Description: Risk Heat Map': 'Description: Risk Heat Map',
  'Risk level': 'Risk level',
  'Low (green)': 'Low (green)',
  'Medium (orange)': 'Medium (orange)',
  'High (red)': 'High (red)',
  // Dropdown and chart type labels
  'Dropdown options': 'Dropdown options',
  'Chart type': 'Chart type',
};


// [KT:SURGICAL:I18N-LABELS] — server-side label translator via /api/gptTranslation
function __isEnglishReportLang(lang) {
  const v = String(lang || '').toLowerCase();
  return v === 'english' || v === 'en' || v.startsWith('en-');
}

async function translateReportLabels(baseLabels, lang) {
  // Fast-path: English → just return the base map
  if (__isEnglishReportLang(lang)) return baseLabels || {};

  const safeBase = baseLabels && typeof baseLabels === 'object' ? baseLabels : {};
  try {
    const payload = {
      mode: 'json',
      targetLang: lang || 'English',
      ui: safeBase,
    };

    const res = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SI-Debug': 'report-labels-json:' + String(lang || 'English'),
      },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.warn('[SR:REPORT:I18N] label parse error', e, raw.slice(0, 160));
    }

    if (res.ok && json && json.translation && typeof json.translation === 'object') {
      // Merge over base so any missing keys fall back cleanly
      const merged = { ...safeBase, ...json.translation };
      return merged;
    }

    console.warn('[SR:REPORT:I18N] label translate fallback → base', {
      status: res.status,
      err: json && json.error,
    });
  } catch (err) {
    console.warn('[SR:REPORT:I18N] label translate exception', err);
  }

  return safeBase;
}


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

/**
 * reportSectionWithChart
 * Builds a section with a normalized figure. We keep wording 2-sentence max,
 * outside the Executive Summary per your rules.
 */
export function reportSectionWithChart({section, meta, description}){
  const fig = renderChartFigure({ ...meta, section }, description || '');
  return `
<section data-section="${section}">
  ${fig}
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
  if (!s) return '/images/secure.png';
  // If already has leading slash, return as-is (absolute public path)
  if (s.startsWith('/')) return s;
  // If starts with public/, strip it and add leading slash (public folder IS the root)
  if (/^public\//i.test(s)) return '/' + s.replace(/^public\//i, '');
  // If just filename, add /images/ prefix
  if (!s.includes('/')) return '/images/' + s;
  // Default: return with leading slash
  return '/' + s;
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
          const decoded = c[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&apos;/g,"'").replace(/&#39;/g,"'");
          const o = JSON.parse(decoded);
          return 'chart|' + String(o.title || '').toLowerCase() + '|' + String(o.type || '').toLowerCase();
        }
        const h = frag.match(/data-heatmap=['"]([\s\S]*?)['"]/i);
        if (h) {
          const decoded = h[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&apos;/g,"'").replace(/&#39;/g,"'");
          const o = JSON.parse(decoded);
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
  try {
    // Decode all common HTML entities before parsing JSON
    const decoded = String(s)
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x2F;/g, '/')
      .replace(/&#x27;/g, "'");
    
    return JSON.parse(decoded);
  } catch (e) {
    console.log('[SR:REFORM] safeParseAttrJSON.failed', {
      preview: String(s).slice(0, 100),
      error: String(e?.message || e),
    });
    return null;
  }
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
  // [KT:AI-SUMMARY] Now passes aiSummary from spec to chart functions
  html = html.replace(/<figure[^>]*data-chart=['"]([^'"]+)['"][^>]*?(?:data-origin=['"]([^'"]+)['"])?[^>]*>[\s\S]*?<\/figure>/gi,
    function(_m, specRaw, origin){
      const spec = safeParseAttrJSON(specRaw) || {};
      const type  = (spec.type || 'line').toLowerCase();
      const title = spec.title || 'Chart';
      const ds    = Array.isArray(spec.datasets) && spec.datasets[0] ? spec.datasets[0] : { data: [] };
      const series = Array.isArray(ds.data) && ds.data.length ? ds.data : mkDefaultSeries(labels.length, 100);
      const xTitle = spec.xTitle || (labels[0]?.startsWith('Y') ? 'Years' : 'Months');
      const yTitle = spec.yTitle || 'Value';
      // [KT:AI-SUMMARY] Extract aiSummary from spec if pre-generated
      const aiSummary = spec.aiSummary || null;
      let fig;
      if (type === 'bar')  fig = barChartHTML({ title, labels, series, xTitle, yTitle, aiSummary });
      else if (type === 'pie') fig = lineChartHTML({ title, labels, series, xTitle, yTitle, aiSummary });
      else if (type === 'doughnut') fig = lineChartHTML({ title, labels, series, xTitle, yTitle, aiSummary });
      else fig = lineChartHTML({ title, labels, series, xTitle, yTitle, aiSummary });
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

function injectSmartWidgets(html, { labels, canon, L }) {
  if (!html) return { html: '', injected: false };

  // [KT:SURGICAL:I18N-REPORT-GRAPHS]
  // Use translated label set if provided; fall back to DEFAULT_LABELS for English.
  const LL =
    L ||
    (typeof DEFAULT_LABELS !== 'undefined' ? DEFAULT_LABELS : {}) ||
    {};

  // === Chart titles (STANDARD CHARTS) ======================================
  // These are the ones we care about most for standard (non-predictive) charts.
  const projectedSavingsTitle =
    LL.projectedSavings || 'Projected Savings Over Time';
  const implementationSpendTitle =
    LL.operatingExpenses || LL.implementationExpenditures || 'Implementation Expenditures';
  const deliveryPenTitle =
    LL.deliveryPenetration || 'Delivery Penetration vs Market';
  const riskHeatmapTitle =
    LL.riskHeatMap || LL['Risk Heat Map'] || 'Risk Heat Map';

  // === Axes & common labels (from dynamic label map) =======================
  const savingsAxis  = LL.savingsAxis  || 'Savings';
  const spendAxis    = LL.spendAxis    || 'Spend';
  const yearsAxis    = LL.yearsAxis    || 'Years';
  const monthsAxis   = LL.monthsAxis   || 'Months';
  const percentAxis  = LL.percent      || 'Percent';

  // Optional: localized category labels for heatmap rows/cols (fallback to English).
  const riskRowOps    = LL.riskRowOps    || 'Ops';
  const riskRowSales  = LL.riskRowSales  || 'Sales';
  const riskRowCX     = LL.riskRowCX     || 'CX';
  const riskRowIT     = LL.riskRowIT     || 'IT';
  const riskRowPeople = LL.riskRowPeople || 'People';

  const riskColQ1 = LL.riskColQ1 || 'Q1';
  const riskColQ2 = LL.riskColQ2 || 'Q2';
  const riskColQ3 = LL.riskColQ3 || 'Q3';
  const riskColQ4 = LL.riskColQ4 || 'Q4';
  const riskColQ5 = LL.riskColQ5 || 'Q5';

  // Debug log so you can see what the standard-chart labels are in the log.
  console.log('[SR:REFORM] std.charts.i18n.labels', {
    lang: canon?.lang,
    projectedSavingsTitle,
    implementationSpendTitle,
    deliveryPenTitle,
    riskHeatmapTitle,
    savingsAxis,
    spendAxis,
    yearsAxis,
    monthsAxis,
    percentAxis,
  });

  const blocks = splitParas(html);
  let injected = false;

  const make = (kind) => {
    // Default series (used for simple line charts)
    const series = mkDefaultSeries(
      labels.length,
      canon?.costSavingsGoal || 100
    );

    switch (kind) {
      case 'bar': {
        // EXPENDITURES: Front-loaded pattern (different from savings)
        const spendSeries = labels.map((_, i) => {
          const baseSpend = (canon?.costSavingsGoal || 100) * 0.25;
          const timeFactor = 1 - (i / Math.max(labels.length - 1, 1)) * 0.6;
          return Math.round(
            baseSpend * timeFactor * (0.9 + Math.random() * 0.2)
          );
        });

        return barChartHTML({
          title: implementationSpendTitle,            // <== localized title
          labels,
          // ReportGraphs barChartHTML expects simple numeric series
          series: spendSeries,
          xTitle: labels[0]?.startsWith('Y')         // <== localized X axis
            ? yearsAxis
            : monthsAxis,
          yTitle: spendAxis,                         // <== localized Y axis
        });
      }

      case 'heat':
        return heatmapHTML({
          title: riskHeatmapTitle,                   // <== localized title
          rows: [                                    // <== optionally localized row labels
            riskRowOps,
            riskRowSales,
            riskRowCX,
            riskRowIT,
            riskRowPeople,
          ],
          cols: [                                    // <== optionally localized column labels
            riskColQ1,
            riskColQ2,
            riskColQ3,
            riskColQ4,
            riskColQ5,
          ],
          data: Array.from({ length: 5 }, () =>
            Array.from(
              { length: 5 },
              () => Math.floor(Math.random() * 5) + 1
            )
          ),
        });

      case 'benchmark':
        return benchmarkHTML({
          title: deliveryPenTitle,                   // <== localized title
          current: Number(canon?.metrics?.deliveryShare ?? 28),
          benchmark: Number(canon?.metrics?.marketDelivery ?? 34),
          yTitle: percentAxis,                       // <== localized Y axis
        });

      default:
        // Standard projected savings line chart
        return lineChartHTML({
          title: projectedSavingsTitle,              // <== localized title
          labels,
          series,
          xTitle: labels[0]?.startsWith('Y')         // <== localized X axis
            ? yearsAxis
            : monthsAxis,
          yTitle: savingsAxis,                       // <== localized Y axis
        });
    }
  };

  const kindFromText = (t) => {
    const text = t.toLowerCase();
    if (/\bheat\s*map\b/.test(text)) return 'heat';
    if (/\bimplementation.*expenditure|\bspend\b/.test(text)) return 'bar';
    if (/\bdelivery\b.*\bmarket share|\bmarket\b.*\bdelivery/.test(text))
      return 'benchmark';
    if (/\brecommended\s+benchmark\s+visualization\b/.test(text))
      return 'benchmark';
    if (
      /\binteractive\s+element\b|\bvisual\s+element\b|\bplaceholder\b|\bai\s+generated\b/.test(
        text
      )
    )
      return 'line';
    if (/\broi\b|\bpayback\b/.test(text)) return 'line';
    if (/\bprojected\s+savings|\bover\s+time\b/.test(text)) return 'line';
    return 'line';
  };

  const replaced = blocks
    .map((raw) => {
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
    })
    .join('\n');

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
    // [KT:FIX:2025-12-20] Extract appendicesHTML from opts directly - this is the new AI-generated appendix HTML
    // [KT:DYNAMIC-SECTIONS] Added sectionOrder for AI-driven section selection
    const { canon, sections = {}, phases = [], implKit, translatedLabels, labels: labelsPassed, worldClassVisuals = {}, appendicesHTML: optsAppendicesHTML, sectionOrder: optsSectionOrder } = (opts || {});
    
    // [KT:AI-SECTION-ORDER] Use AI-determined section order if provided, otherwise use default
    const DEFAULT_SECTION_ORDER = ['exec', 'current', 'financials', 'kpis', 'timeline', 'ops', 'risk', 'roi', 'nextSteps'];
    const sectionOrder = optsSectionOrder && Array.isArray(optsSectionOrder) ? optsSectionOrder : DEFAULT_SECTION_ORDER;
    console.log('[SR:TEMPLATE] Using section order:', sectionOrder.join(' → '));
    
    // [KT:APPENDIX-PRIORITY] Use appendicesHTML from opts first (new AI system), then fallback to implKit/sections
    let appendicesHTML = optsAppendicesHTML || '';
    if (!appendicesHTML && implKit && implKit.appendicesHTML) {
    appendicesHTML = implKit.appendicesHTML;
  } else if (!appendicesHTML && typeof sections !== 'undefined' && sections && sections.appendicesHTML) {
    appendicesHTML = sections.appendicesHTML;
  }
  // [KT:SURGICAL:APPENDIX-WINDOW-GUARD] Avoid bare window access on server
  // else if (typeof window !== 'undefined' && window.appendicesHTML) {
  //   appendicesHTML = window.appendicesHTML;
  // }
  else if (
    typeof globalThis !== 'undefined' &&
    globalThis.window &&
    globalThis.window.appendicesHTML
  ) {
    appendicesHTML = globalThis.window.appendicesHTML;
  }

  let reportHtml = '';

  const logo = normalizeLogoPath(canon?.logoUrl || '/images/secure.png');
  const labels = labelsForPeriod(canon?.timeFrame || '2 years');
  
  // Use translated labels if provided, otherwise use defaults
  const L = labelsPassed || translatedLabels || DEFAULT_LABELS;
  
  // [KT:TRANSLATION-DIAGNOSTIC] Log which labels source is being used
  console.log('[SR:TEMPLATE] 🔍 TRANSLATION DIAGNOSTIC:', {
    lang: canon?.lang,
    hasLabelsPassed: !!labelsPassed && Object.keys(labelsPassed || {}).length > 0,
    hasTranslatedLabels: !!translatedLabels && Object.keys(translatedLabels || {}).length > 0,
    usingSource: labelsPassed ? 'labelsPassed' : (translatedLabels ? 'translatedLabels' : 'DEFAULT_LABELS'),
    sampleLabels: {
      preparedFor: L?.preparedFor,
      preparedBy: L?.preparedBy,
      confidential: L?.confidential,
      executiveSummary: L?.executiveSummary,
      currentState: L?.currentState,
      transformationPlan: L?.transformationPlan
    }
  });
  
  // Detect RTL languages
  const isRTLLang = isRTL(canon?.lang);
  const direction = isRTLLang ? 'rtl' : 'ltr';
  
  // [KT:SURGICAL:TITLE-PAGE-HELPER] Define title page renderer before use
  function __kt_renderTitlePage(canon, L) {
    try {
      // [KT:I18N:TITLE-PAGE] Use AI-generated title if available, otherwise construct from organization name
      // The aiTitle is generated by __kt_generateReportTitle() in route.js and is already in target language
      let headline;
      if (canon?.aiTitle && canon.aiTitle.trim()) {
        // Use the AI-generated title (already translated by SovereignAI)
        headline = canon.aiTitle;
        console.log('[KT:TITLE-PAGE] Using AI-generated title:', headline);
      } else {
        // Fallback to organization name + transformation plan label (for backward compatibility)
        // [KT:SOVEREIGN-AI] If aiTitle is missing, it means title generation failed - log this
        console.warn('[KT:TITLE-PAGE] aiTitle not found in canon, using fallback');
        headline = `${canon?.orgName || "Organization"} ${L.transformationPlan || "Strategic Transformation & Value Creation Plan"}`;
      }

      // Translate timeFrame (e.g., "3 years" -> "3 ans" for French)
      let subtitle = canon?.timeFrame || "";
      if (subtitle && L?.years) {
        // Replace English time unit keywords with translated ones
        subtitle = subtitle
          .replace(/\byears\b/gi, L.years || 'years')
          .replace(/\bmonths\b/gi, L.months || 'months')
          .replace(/\bweeks\b/gi, L.weeks || 'weeks');
      }

      const preparedFor = canon?.preparedFor || canon?.orgName || "";
      const preparedBy = canon?.preparedBy || "Sovereign Intelligence";
      
      // Convert language name to locale code (e.g., "French" -> "fr", "Scandinavia" -> "sv")
      const localeMap = {
        'french': 'fr',
        'scandinavia': 'sv',
        'scandinavian': 'sv',
        'swedish': 'sv',
        'norwegian': 'no',
        'danish': 'da',
        'german': 'de',
        'spanish': 'es',
        'italian': 'it',
        'portuguese': 'pt',
        'dutch': 'nl',
        'polish': 'pl',
        'russian': 'ru',
        'chinese': 'zh',
        'japanese': 'ja',
        'korean': 'ko',
        'arabic': 'ar'
      };
      const locale = localeMap[String(canon?.lang || '').toLowerCase()] || 'en';
      const dateStr = new Date().toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const logoPath = canon?.logoUrl 
        ? normalizeLogoPath(String(canon.logoUrl).replace(/\\/g, "/"))
        : "/images/secure.png";

      // [KT:I18N:TITLE-PAGE] Translate all labels from L object
      const confidentialLabel = L?.confidential || "Confidential";
      const brandTagline = L?.missionCriticalInitiative || "Transforming Operations with Precision";
      const preparedForLabel = L?.preparedFor || "Prepared For";
      const preparedByLabel = L?.preparedBy || "Prepared By";
      const dateLabel = L?.date || "Date";
      const forInternalUseLabel = L?.forInternalUseOnly || "FOR INTERNAL USE ONLY";

      return `
      <section class="title-page">
        <div class="title-header">
          <div class="title-logo">
            <img src="${logoPath}" alt="Sovereign Intelligence Logo" class="brand-icon"/>
            <div class="brand-text">
              <div class="brand-name">SOVEREIGN INTELLIGENCE</div>
              <div class="brand-tagline">${brandTagline}</div>
            </div>
          </div>
          <div class="title-divider"></div>
        </div>

        <div class="title-main">
          <div class="title-headline">${headline}</div>
          ${subtitle ? `<div class="title-subtitle">${subtitle}</div>` : ""}
          <div class="title-accent-bar"></div>
        </div>

        <div class="title-footer">
          <div class="title-meta-grid">
            <div class="meta-item">
              <div class="meta-label">${preparedForLabel}</div>
              <div class="meta-value">${preparedFor}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${preparedByLabel}</div>
              <div class="meta-value">${preparedBy}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${dateLabel}</div>
              <div class="meta-value">${dateStr}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${confidentialLabel}</div>
              <div class="meta-value">${forInternalUseLabel}</div>
            </div>
          </div>
          <div class="title-confidential">${confidentialLabel}</div>
        </div>
      </section>`;
    } catch (e) {
      console.warn("[KT:TITLE-PAGE] fallback triggered:", e);
      return `<section class="title-page"><h1>${L?.confidential || "Confidential"}</h1></section>`;
    }
  }
  
  // [KT:SURGICAL:TITLE-PAGE-INSERT] Render title page first
  reportHtml += __kt_renderTitlePage(canon, L);
  
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
    //const { html: withWidgets, injected } = injectSmartWidgets(html, { labels, canon });//
    const { html: withWidgets, injected } = injectSmartWidgets(html, { labels, canon, L });

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
    predictiveIntelligence: sections.predictiveIntelligence || '', // [KT:PREDICTIVE-INTELLIGENCE] AI-powered predictions
  };

  const ensureOne = (already, fallbackHTML) => already ? '' : fallbackHTML;

  // Fallback HTML for Executive Summary section if no injected content
  const execFallback = `
    <div class="exec-fallback">
      <p>${L.dashboardDescription || "This section summarizes the key findings, projected ROI, payback period, and strategic impact. Please refer to the dashboard above for headline metrics."}</p>
    </div>
  `;

    // [KT:SURGICAL:SECTION-FALLBACKS] Standard visual fallbacks for non-exec sections.
  const currentFallback = benchmarkHTML({
    title: L.deliveryPenetration || "Delivery Penetration vs Market",
    current: Number(canon?.metrics?.deliveryShare ?? 28),
    benchmark: Number(canon?.metrics?.marketDelivery ?? 34),
    yTitle: L.percent || "Percent",
  });

  const finSpend = barChartHTML({
    title: L.implementationExpenditures || "Implementation Expenditures",
    labels,
    // EXPENDITURES: front-loaded spending pattern (higher initial investment, tapering off)
    series: labels.map((_, i) => {
      const baseSpend = (canon?.costSavingsGoal || 100) * 0.25;
      const timeFactor =
        1 - (i / (labels.length - 1 || 1)) * 0.6; // decreases ~60% over time
      return Math.round(
        baseSpend * timeFactor * (0.9 + Math.random() * 0.2)
      ); // small variation
    }),
    xTitle: labels[0].startsWith("Y") ? (L.years || "Years") : (L.months || "Months"),
    yTitle: L.spendAxis || "Spend",
  });

  const finPayback = lineChartHTML({
    title: L.cumulativePayback || "Cumulative Payback",
    labels,
    // PAYBACK: cumulative growth pattern (accelerating returns over time)
    series: labels.map((_, i) => {
      const maxPayback = canon?.costSavingsGoal || 100;
      const progress = (i + 1) / (labels.length || 1);
      return Math.round(
        maxPayback * progress * progress * (0.95 + Math.random() * 0.1)
      ); // quadratic growth
    }),
    xTitle: labels[0].startsWith("Y") ? (L.years || "Years") : (L.months || "Months"),
    yTitle: L.cumulativeAxis || "Cumulative",
  });

  // KPI section: no “pretty” fallback – all 4 charts come from AI generation.
  // Keep an empty string so ensureOne(...) never blows up.
  const kpiDash = "";

  const riskHeat = heatmapHTML({
    title: "Risk Heat Map",
    rows: [L.riskRowOps || 'Ops', L.riskRowSales || 'Sales', L.riskRowCX || 'CX', L.riskRowIT || 'IT', L.riskRowPeople || 'People'],
    cols: ["Q1", "Q2", "Q3", "Q4", "Q5"],
    data: Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => Math.floor(Math.random() * 5) + 1)
    ),
  });

  const roiMini = lineChartHTML({
    title: L.roiTrend || "ROI Trend (AI)",
    labels,
    series: mkDefaultSeries(labels.length, 100),
    xTitle: labels[0].startsWith("Y") ? (L.years || "Years") : (L.months || "Months"),
    yTitle: L.roiIndexAxis || "ROI Index",
  });

  // Reverted horizon to single-phase view for readability; used where `${roadmap}` is injected.
  const roadmap = planDiagramHTML(phases || [], L.implementationPlan, L);


  // BEYOND MCKINSEY: Generate executive dashboard with key metrics
  function generateExecDashboard(canon) {
    const roi = canon?.roi || '250%';
    const payback = canon?.paybackMonths || '18 months';
    const savings = canon?.costSavingsGoal || 2500000;
    const timeframe = canon?.timeFrame || '24 months';
    const confidence = canon?.confidence || '85%';
    
    // Calculate AI-based benchmark comparisons (translatable)
    // Parse ROI value to calculate benchmark gap
    const roiNum = parseInt(String(roi)) || 250;
    const benchmarkROI = Math.round(roiNum * 0.72); // Typical benchmark is ~72% of projected
    const roiOutperformance = roiNum - benchmarkROI;
    
    // Parse payback value
    const paybackNum = parseInt(String(payback)) || 18;
    const benchmarkPayback = Math.round(paybackNum * 1.2); // Benchmark takes 20% longer
    const paybackImprovement = Math.round(((benchmarkPayback - paybackNum) / benchmarkPayback) * 100);
    
    return `
    <div class="exec-dashboard">
      <div class="metric-card">
        <div class="metric-label">${L.projectedROI}</div>
        <div class="metric-value">${roiNum}<span class="metric-unit">%</span></div>
        <div class="metric-context">${L.industryBenchmark}: ${benchmarkROI}%</div>
        <div class="metric-trend">+${roiOutperformance} ${L.trendOutperform || 'pp vs baseline'}</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">${L.paybackPeriod}</div>
        <div class="metric-value">${paybackNum}<span class="metric-unit">${L.months}</span></div>
        <div class="metric-context">${paybackImprovement}% ${L.fasterThanAverage}</div>
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
        <div class="metric-value">${String(confidence).replace('%', '')}<span class="metric-unit">%</span></div>
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

  /*const DEFAULT_LABELS = {
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
  hundredDayPlan: "100-Day Plan (Week by Week)",
  pilotCharter: "Pilot Charter",
  assumptionsRanges: "Assumptions & Ranges",
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
  impactHeader: "Impact",
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

  // === Chart Labels (standard + axes) ===
  projectedSavings: "Projected Savings Over Time",
  deliveryPenetration: "Delivery Penetration vs Market",
  savingsBreakdown: "Savings Breakdown",
  paybackAnalysis: "Payback Analysis",
  operatingExpenses: "Operating Expenses",
  kpiDashboard: "KPI Dashboard",
  riskHeatmap: "Risk Heatmap",
  opsThroughputTrend: "Ops Throughput Trend",

  // NEW – standard chart titles used in fallbacks
  implementationExpenditures: "Implementation Expenditures",
  cumulativePayback: "Cumulative Payback",
  roiTrend: "ROI Trend (AI)",

  // Chart UI / axes (used by standard + injected charts)
  chartTypeLabel: "Type",
  chartTypeLine: "Line",
  chartTypeBar: "Bar",
  chartTypeHeatmap: "Heatmap",

  savingsAxis: "Savings",
  spendAxis: "Spend",
  yearsAxis: "Years",
  monthsAxis: "Months",
  percent: "Percent",
  cumulativeAxis: "Cumulative",
  roiIndexAxis: "ROI Index",
  indexAxis: "Index",

  overallLabel: "Overall",
  keyInsightsLabel: "Key Insights",
  
  // Additional Terms
  forInternalUseOnly: "FOR INTERNAL USE ONLY",
  contents: "Contents",
  quickWinsIn90Days: "Quick wins in 90 days",
  recurringAnnualBenefit: "Recurring annual benefit",
  potentialUpside: "potential upside",
  phasedRolloutAcross: "Phased rollout across",
  basedOnBenchmarks: "Based on benchmarks",
  transformsCoreOperations: "Transforms core operations",
  missionCriticalInitiative: "Mission-critical initiative",
  atAGlance: "At a Glance",
  valueBridgeAnalysis: "Value Bridge Analysis",
  valueBridgeDescription: "Description: Waterfall / Value Bridge overview",
  competitivePositioning: "Competitive Positioning",
  riskPriorityMatrix: "Risk Priority Matrix",
};
*/

  // === MCKINSEY-BEATING: Add Executive Infographic after title page ===
    if (worldClassVisuals.execInfographic) {
    reportHtml += `
      <section class="executive-infographic-section">
        <!-- [KT:I18N:EXEC-INFOGRAPHIC-H2] -->
        <h2>${L.atAGlance}</h2>
        ${worldClassVisuals.execInfographic}
      </section>
    `;
  }

  // [KT:SURGICAL:TOC-BUILDER] Localized table of contents items
  // [KT:DYNAMIC-TOC] Now builds TOC based on AI-selected sectionOrder
  const sectionLabelMap = {
    exec: L.executiveSummary,
    current: L.currentState,
    financials: L.financialAnalysis,
    kpis: L.kpiAnalysis,
    timeline: L.implementationTimeline || L.timeline || 'Implementation Timeline',
    ops: L.operationalAnalysis,
    risk: L.riskAssessment,
    roi: L.roiProjections,
    nextSteps: L.nextSteps,
    predictiveIntelligence: L.predictiveIntelligence || 'Predictive Intelligence',
  };
  
  console.log('📖 [TOC-BUILDER] Building Table of Contents:', {
    sectionOrderLength: sectionOrder?.length || 0,
    sectionOrder: sectionOrder,
    sectionsKeys: Object.keys(sections || {}),
    labelMapKeys: Object.keys(sectionLabelMap),
    tableOfContentsLabel: L.tableOfContents
  });
  
  const tocItems = sectionOrder
    .filter(id => sectionLabelMap[id] && sections[id]) // Only include sections that exist
    .map(id => `<li><a href="#${id}">${sectionLabelMap[id]}</a></li>`)
    .join('');
  
  console.log('📖 [TOC-BUILDER] TOC items generated:', {
    tocItemsCount: tocItems.split('</li>').length - 1,
    tocItemsLength: tocItems.length,
    hasContent: tocItems.length > 0
  });
    /* [KT:SURGICAL:TOC-TRANSLATION]
   TOC labels are translated via L object passed to generateFullReport.
   No additional runtime translation needed here.
*/


  // Define execDashboard before using it
  const execDashboard = generateExecDashboard(canon);
  

// [KT:SURGICAL:TITLE-PAGE-RENDER] Function moved earlier in file (now defined before use)


  reportHtml += `
    <section class="toc">
      <h2>${L.tableOfContents}</h2>
      <ol class="toc-list">${tocItems}</ol>
    </section>
`;

  // [KT:DYNAMIC-SECTIONS] Render sections based on AI-determined order
  // Each section has custom visualization handling
  const renderSection = (sectionId) => {
    const secData = SEC[sectionId];
    if (!secData && sectionId !== 'predictiveIntelligence' && sectionId !== 'timeline') return '';
    
    switch(sectionId) {
      case 'exec':
        return `
    <section>
      <h2 id="exec">${L.executiveSummary}</h2>
      ${execDashboard}
      ${ensureOne(secData?.injected, execFallback)}
      ${secData?.html || ''}
      <figure data-widget="series" data-chart-id="exec-savings"></figure>
    </section>`;
      
      case 'current':
        return `
    <section>
      <h2 id="current">${L.currentState}</h2>
      ${ensureOne(secData?.injected, currentFallback)}
      ${secData?.html || ''}
    </section>`;
      
      case 'financials':
        return `
    <section>
      <h2 id="financials">${L.financialAnalysis}</h2>
      ${ensureOne(secData?.injected, finSpend + finPayback)}
      <figure data-widget="waterfall" data-chart-id="value-bridge-auto"></figure>
      ${worldClassVisuals.waterfallChart ? `
        <div class="chart-desc" style="font-size:14px; color:#e5e7eb; margin:0 0 6px 0;">${L.valueBridgeDescription}</div>
        <h3>${L.valueBridgeAnalysis}</h3>
        ${worldClassVisuals.waterfallChart}
      ` : ''}
      ${secData?.html || ''}
    </section>`;
      
      case 'kpis':
        return `
    <section>
      <h2 id="kpis">${L.kpiAnalysis}</h2>
      <figure data-widget="series" data-chart-id="kpi-savings"></figure>
      ${ensureOne(secData?.injected, kpiDash)}
      ${worldClassVisuals.radarChart ? `
      <h3>${L.competitivePositioning}</h3>
      ${worldClassVisuals.radarChart}
      ` : ''}
      ${secData?.html || ''}
    </section>`;
      
      case 'timeline':
        return `
    ${roadmap}
    <section>
      <h2 id="timeline">${L.implementationTimeline || L.timeline || 'Implementation Timeline'}</h2>
      ${secData?.html || ''}
    </section>`;
      
      case 'ops':
        return `
    <section>
      <h2 id="ops">${L.operationalAnalysis}</h2>
      ${worldClassVisuals.prioritizationMatrix ? `
      <h3>${L.prioritizationMatrix}</h3>
      ${worldClassVisuals.prioritizationMatrix}
      ` : ''}
      ${ensureOne(secData?.injected, lineChartHTML({ title: L.opsThroughputTrend || 'Ops Throughput Trend', labels, series: mkDefaultSeries(labels.length, 100), xTitle: labels[0].startsWith('Y') ? (L.years || 'Years') : (L.months || 'Months'), yTitle: L.indexAxis || 'Index' }))}
      ${secData?.html || ''}
    </section>`;
      
      case 'risk':
        return `
    <section>
      <h2 id="risk">${L.riskAssessment}</h2>
      ${ensureOne(secData?.injected, riskHeat)}
      ${worldClassVisuals.riskHeatmap ? `
      <h3>${L.riskPriorityMatrix}</h3>
      ${worldClassVisuals.riskHeatmap}
      ` : ''}
      ${secData?.html || ''}
    </section>`;
      
      case 'roi':
        return `
    <section>
      <h2 id="roi">${L.roiProjections}</h2>
      ${ensureOne(secData?.injected, roiMini)}
      ${secData?.html || ''}
    </section>`;
      
      case 'predictiveIntelligence':
        return SEC.predictiveIntelligence ? `
    <section id="predictiveIntelligence" class="report-section">
      ${SEC.predictiveIntelligence}
    </section>` : '';
      
      case 'nextSteps':
        return `
    <section id="nextSteps" class="report-section">
      <h2>${L.nextSteps}</h2>
      ${secData?.html || ''}
    </section>`;
      
      default:
        // Generic section for any custom sections
        return secData?.html ? `
    <section id="${sectionId}" class="report-section">
      <h2>${sectionLabelMap[sectionId] || sectionId}</h2>
      ${secData.html}
    </section>` : '';
    }
  };

  // Render all sections in AI-determined order
  reportHtml += `<article class="report" dir="${direction}">`;
  sectionOrder.forEach(sectionId => {
    reportHtml += renderSection(sectionId);
  });
  reportHtml += `</article>`;

  reportHtml += `
  <style>
    /* [KT:WORLD-CLASS-FONTS-v1.0] Premium Typography for Executive Reports */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&display=swap');
    
    /* McKinsey-style professional layout with WORLD-CLASS fonts and visible margins */
    .report{ 
      box-sizing:border-box;
      max-width: 1100px; /* [KT:SURGICAL:REPORT-WIDTH] was 960px, widened for better readability */
      width: 100%;
      margin: 0 auto;
      padding: 0.75in 0.75in 0.75in 0.75in;
      overflow-x: hidden;
      color-scheme: dark;
      background: #0a0e1a;
      color: #e8eefb;
      min-height: 11in;
      font-family: 'Merriweather', 'Georgia', serif !important;
      font-feature-settings: 'kern' 1, 'liga' 1;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .report section{ 
      margin:2.5rem 0 3rem; 
      page-break-inside: avoid;
    }
    .report section h2{
      font-family: 'Merriweather', 'Georgia', serif;
      font-size: 2rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 1.5rem 0;
      padding-bottom: 0.75rem;
      border-bottom: 3px solid #3B82F6; /* Royal blue = trust & intelligence */
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
    .report section h3{
      font-family: 'Merriweather', 'Georgia', serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: #10B981; /* Emerald green = growth */
      margin: 2rem 0 1rem 0;
      letter-spacing: -0.005em;
      line-height: 1.35;
    }
    .report section h4{
      font-family: 'Inter', sans-serif;
      font-size: 1.1rem;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      margin: 1.5rem 0 0.75rem 0;
      letter-spacing: 0.01em;
    }
    .report p{
      font-family: 'Georgia', serif !important;
      line-height: 1.7;
      margin: 0 0 1.25rem 0;
      color: rgba(255,255,255,0.95);
      font-size: 1.05rem;
    }
    .report ul, .report ol{
      font-family: 'Georgia', serif !important;
      line-height: 1.7;
      margin: 0 0 1.25rem 0;
      padding-left: 1.75rem;
    }
    .report li{
      font-family: 'Georgia', serif !important;
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
      font-family: 'Merriweather', serif !important;
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
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #10B981; /* Emerald green = insight label */
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    .insight-callout-title {
      font-family: 'Merriweather', serif !important;
      font-size: 1.35rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 1rem 0;
      line-height: 1.3;
    }
    .insight-callout-body {
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      line-height: 1.6;
      color: rgba(255,255,255,0.9);
      margin: 0;
      font-weight: 400;
    }
    .insight-callout-impact {
      font-size: 2rem;
      font-weight: 700;
      color: #10B981; /* Emerald green = positive impact metric */
      margin: 1rem 0 0.5rem;
      font-family: 'Merriweather', serif !important;
    }
    .insight-callout-implication {
      font-family: 'Merriweather', 'Georgia', serif;
      color: rgba(255,255,255,0.8);
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(16,185,129,0.2); /* Subtle green divider */
    }
    .insight-callout-implication em {
      font-style: italic;
      font-family: 'Merriweather', 'Georgia', serif;
    }

    ${GRAPH_CSS}
    ${IMPLKIT_CSS}

    /* Global Appendix-style table theme — World-class McKinsey standards */
    .table{ 
      width:100%; 
      border-collapse:separate; 
      border-spacing: 0;
      background:#000000; 
      color:#FFFFFF;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      border-radius: 8px;
      overflow: hidden;
      margin: 1.2rem 0;
    }
    .table th, .table td{ 
      border:1px solid rgba(255,255,255,0.15); 
      padding: 0.95rem 1rem; 
      vertical-align: middle; 
      font-size:0.95rem;
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
    }
    .table th{ 
      background: linear-gradient(180deg, #0d0d0d 0%, #000 100%);
      color:#FFFFFF; 
      font-weight: 700; 
      text-align:left;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 3px solid #3B82F6 !important;
      padding: 1.1rem 1rem;
    }
    .table tbody tr:nth-child(even) td{ background:rgba(255,255,255,.02); }
    .table tbody tr:hover { background: rgba(59,130,246,0.08); transition: background-color 0.2s ease; }
    .table tbody td:first-child { font-weight: 600; color: #FFFFFF; }
    .table caption{ 
      caption-side:top; 
      text-align:left; 
      color:#FFFFFF; 
      font-weight: 800; 
      padding: 0 0 0.75rem 0;
      font-size: 1.15rem;
      font-family: 'Merriweather', serif !important;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
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

    /* [KT:SURGICAL] Report tables — McKinsey-level styling with world-class fonts */
    .report .report-table{ 
      background:#000; 
      color:#fff; 
      border-collapse:separate; 
      border-spacing:0; 
      /* width:100%;  [KT:LEGACY:TAB-WIDTH] commented to allow clamped layout */
      margin: 1.2rem 0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      font-family: 'Inter', sans-serif;
      border-radius: 8px;
      overflow: hidden;
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
      border:1px solid rgba(255,255,255,0.15) !important; 
      padding: 0.95rem 1rem;
      text-align: left;
      vertical-align: middle;
      line-height: 1.6;
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
    }
    .report .report-table thead th{ 
      background: linear-gradient(180deg, #0d0d0d 0%, #000 100%);
      font-weight: 700; 
      color: #FFFFFF;
      font-size: 0.9rem;
      font-family: 'Inter', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 3px solid #3B82F6 !important; /* Royal blue = data credibility */
      padding: 1.1rem 1rem;
    }
    .report .report-table tbody tr{ 
      transition: background-color 0.2s ease; 
    }
    .report .report-table tbody tr:nth-child(even){ 
      background: rgba(255,255,255,0.02); 
    }
    .report .report-table tbody tr:hover{ 
      background: rgba(59,130,246,0.08); 
    }
    .report .report-table tbody td:first-child{ 
      font-weight: 600; 
      color: #FFFFFF;
    }
    .report .report-table tbody td[style*="text-align: right"], 
    .report .report-table tbody td[style*="text-align:right"]{ 
      font-family: 'Courier New', monospace; 
      font-weight: 500;
      text-align: right;
      color: #10B981;
    }
    .report .report-table caption{ 
      caption-side: top; 
      color: #fff; 
      font-weight: 800; 
      margin-bottom: 0.75rem; 
      font-size: 1.15rem;
      font-family: 'Merriweather', serif !important;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
      /* [KT:SURGICAL:APPX-TABLE-TITLES] reinforce white/bold titles across all appendix tables with world-class fonts */
      .report .report-table caption,
      .report .report-table .table-title {
        font-weight: 800;
        color: #FFFFFF !important;
        text-align: left;
        margin-bottom: 0.5rem;
        font-size: 1.15rem;
        font-family: 'Merriweather', serif !important;
        letter-spacing: -0.01em;
      }
    /* Make injected table titles bold and white with world-class fonts */
    .report .table-title {
      font-weight: 800;
      color: #FFFFFF !important;
      margin-bottom: 0.5rem;
      font-family: 'Merriweather', serif;
      font-size: 1.15rem;
      letter-spacing: -0.01em;
    }

    /* [KT:SURGICAL] Chart UI pin + dark card */
    .report figure[data-chart]{ background:#0b0b0b; color:#fff; border:1px solid #2a2a2a; border-radius:14px; padding:16px 14px 14px; }
    .report figure[data-chart] .chart-ui select{ background:#111; color:#fff; border:1px solid #444; border-radius:8px; padding:.2rem .4rem; }
    .report figure[data-chart] .chart-desc{ color:#eaeaea; }
    
    /* [KT:FIX:APPENDIX-I-TABLE-WIDTHS] Fixed column widths for Implementation Checklist (4-column table) to prevent header overlap */
    .report section.appendix .report-table {
      table-layout: fixed;
      width: 100%;
    }
    /* Target 4-column tables in appendices: Phase, Activities, Owner, Success Criteria */
    .report section.appendix .report-table thead tr > th:nth-child(1) {
      width: 12% !important;
      word-wrap: break-word;
      word-break: break-word;
    }
    .report section.appendix .report-table thead tr > th:nth-child(2) {
      width: 45% !important;
      word-wrap: break-word;
      word-break: break-word;
    }
    .report section.appendix .report-table thead tr > th:nth-child(3) {
      width: 18% !important;
      word-wrap: break-word;
      word-break: break-word;
    }
    .report section.appendix .report-table thead tr > th:nth-child(4) {
      width: 25% !important;
      word-wrap: break-word;
      word-break: break-word;
    }
    .report section.appendix .report-table tbody tr > td {
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    
    /* [KT:FIX:APPENDIX-D-TABLE-WIDTHS] Fixed column widths for Benefits Realization (11-column table) to prevent header overlap */
    .report section.appendix:has(h3:contains("D —")) .report-table,
    .report section.appendix h3 ~ .report-table {
      table-layout: fixed;
      width: 100%;
    }
    /* Distribute 11 columns in Appendix D */
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(1) { width: 8% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(2) { width: 8% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(3) { width: 10% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(4) { width: 8% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(5) { width: 8% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(6) { width: 8% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(7) { width: 10% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(8) { width: 8% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(9) { width: 8% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(10) { width: 10% !important; }
    .report section.appendix h3 ~ .report-table thead tr > th:nth-child(11) { width: 10% !important; }
    
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
      /* [KT:FIX:HORIZONTAL-XAXIS-LABELS] Keep X-axis labels horizontal instead of rotated */
      .x-axis-label { 
        word-wrap: break-word; 
        word-break: break-word;
        text-anchor: middle;
        dominant-baseline: hanging;
      }
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
 // [KT:SURGICAL:WIDTH-GUARD:FINAL] — final override so report is full-width and half-inch margin
reportHtml += `\n<style>
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
  .table-wrapper, section > .report-table, .report .table, .report-table, table {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    margin: 1rem 0;
    border-radius: 8px;
    display: block;
    width: 100%;
    max-width: 100%;
  }
  /* Force table cells to have reasonable min/max widths */
  .report-table th, .report-table td, table th, table td {
    min-width: 80px;
    max-width: 300px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
  }
  
  /* Appendix tables - column width fixes to prevent header overlap */
  #appendices table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  
  /* Appendix A (Charters/Budget & Acceptance) - 2 columns */
  #appendices table:nth-of-type(1) th,
  #appendices table:nth-of-type(1) td {
    width: 50%;
  }
  
  /* Appendix C (RAID) - 9 columns: Headers on one line, content wraps */
  #appendices table:nth-of-type(3) {
    width: 100%;
  }
  
  #appendices table:nth-of-type(3) th {
    width: 11.11%;
    white-space: nowrap;
    font-size: 11px;
    padding: 8px 4px;
    font-weight: bold;
    vertical-align: middle;
    overflow: visible;
  }
  
  #appendices table:nth-of-type(3) td {
    width: 11.11%;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    font-size: 11px;
    padding: 6px 4px;
  }
  
  /* Appendices D-K (10+ columns): Headers on one line, content wraps */
  #appendices table:nth-of-type(n+4) th {
    white-space: nowrap;
    font-weight: bold;
    padding: 8px 6px;
    font-size: 10px;
    vertical-align: middle;
    min-width: 80px;
    overflow: visible;
  }
  
  #appendices table:nth-of-type(n+4) td {
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    padding: 6px 6px;
    font-size: 10px;
  }
  
  /* All appendix table cells - general wrapping rules */
  #appendices table th, 
  #appendices table td {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
</style>`;
console.log('[SR:REFORM] width.guard.injected@final [KT:SURGICAL:HALF-INCH-MARGIN]');



  // --- APPENDIX SECTION: Use new AI-generated appendicesHTML ---
  // [KT:FIX:APPENDIX-DEDUP:2025-12-20] ONLY use new AI-generated appendices, old system COMMENTED OUT
  if (appendicesHTML && appendicesHTML.trim().length > 0) {
    // [KT:NEW-APPENDIX] Render new AI-generated appendices with McKinsey styling
    console.log('[APPENDIX-NEW-AI] ✔️ Using AI-generated appendices (', appendicesHTML.length, ' bytes)');
    reportHtml += `\n<section id="appendices"><h2>${L.appendix || L.appendices || 'Appendices'}</h2>\n${appendicesHTML}\n</section>`;
  }
  /* [KT:OLD-APPENDIX-COMMENTED-OUT:2025-12-20] Old implKit appendix system commented out in favor of new AI system
  else if (implKit) {
    // [KT:OLD-APPENDIX-FALLBACK] Fallback to old system only if no new appendices
    console.log('[APPENDIX-OLD-FALLBACK] Using legacy appendix system (implKit)');
    // [KT:SURGICAL:I18N-TRANSLATION-LOG]
    try {
      console.log('[TRANSLATION] Language:', L && L.lang ? L.lang : '(unknown)', 'Sample title:', L && L.title ? L.title : '(no title)');
    } catch (e) {
      console.warn('[TRANSLATION] Log failed', e);
    }
    
    reportHtml += `\n<section id="appendices"><h2>${L.appendix}</h2>\n` + [
      (() => {
        if (!implKit.charters || !Array.isArray(implKit.charters.items) || implKit.charters.items.length === 0) {
          console.log('[APPENDIX-A] Not injected: charters missing or empty', { charters: implKit.charters });
          return chartersHTML(implKit.charters, L); // Will render empty table or message
        } else {
          console.log('[APPENDIX-A] ✔️ Data injected: charters', { count: implKit.charters.items.length });
          return chartersHTML(implKit.charters, L);
        }
      })(),
      raciHTML(implKit.raci, L),
      raidHTML(implKit.raid, L),
      benefitsHTML(implKit.benefits, L),
      plan100HTML(implKit.plan100, L),
      (() => {
        if (!implKit.pilot || Object.keys(implKit.pilot).length === 0) {
          console.log('[APPENDIX-F] Not injected: pilot missing or empty', { pilot: implKit.pilot });
          return pilotHTML(implKit.pilot, L); // Will render empty table or message
        } else {
          // Check if at least one field is non-empty
          const hasData = Object.values(implKit.pilot).some(v => v && String(v).trim() !== '');
          if (hasData) {
            console.log('[APPENDIX-F] ✔️ Data injected: pilot', { pilot: implKit.pilot });
          } else {
            console.log('[APPENDIX-F] Not injected: pilot fields all empty', { pilot: implKit.pilot });
          }
          return pilotHTML(implKit.pilot, L);
        }
      })(),
      (() => {
        if (!implKit.assumptions || !Array.isArray(implKit.assumptions.items) || implKit.assumptions.items.length === 0) {
          console.log('[APPENDIX-G] Not injected: assumptions missing or empty', { assumptions: implKit.assumptions });
          return assumptionsHTML(implKit.assumptions, L); // Will render empty table or message
        } else {
          console.log('[APPENDIX-G] ✔️ Data injected: assumptions', { count: implKit.assumptions.items.length });
          return assumptionsHTML(implKit.assumptions, L);
        }
      })(),
      methodsSourcesHTML(implKit.methods, L),
      // [KT:APPENDIX-ORDER-I-J-K] Appendices I, J, K in correct order with translations
      implementationChecklistHTML(implKit.implementationChecklist, L), // Appendix I
      decisionFrameworkHTML(implKit.decisionFramework, L), // Appendix J
      resourceRequirementsHTML(implKit.resourceRequirements, L) // Appendix K
    ].filter(Boolean).join('\n') + `\n
    </section>`;
  }
  // [KT:END-OLD-APPENDIX-COMMENTED-OUT] */


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
  .report .table{ 
    background:#000000; 
    color:#e8eefb; 
    font-family: 'Inter', sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    border-radius: 8px;
    max-width: 100%;
    table-layout: fixed;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .report .table th, .report .table td{ 
    border:1px solid rgba(255,255,255,0.15) !important;
    padding: 0.95rem 1rem;
    font-family: 'Inter', sans-serif;
  }
  .report .table th{ 
    background: linear-gradient(180deg, #0d0d0d 0%, #000 100%); 
    color:#FFFFFF;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    border-bottom: 3px solid #3B82F6 !important;
  }
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
    reportHtml = __kt_dedupeVisuals(reportHtml);
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
    function _parseAttrJSON(s){ 
      try{ 
        const decoded = String(s)
          .replace(/&quot;/g,'"')
          .replace(/&amp;/g,'&')
          .replace(/&apos;/g,"'")
          .replace(/&#39;/g,"'")
          .replace(/&lt;/g,'<')
          .replace(/&gt;/g,'>')
          .replace(/&#x2F;/g,'/')
          .replace(/&#x27;/g,"'");
        return JSON.parse(decoded);
      }catch(_){ return null; } 
    }

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

    // [KT:SURGICAL:FONT-RESTORATION] Restore world-class fonts after translation
    // If translation stripped font-family rules, re-inject the complete cascade
    if (!/body\s*\{[^}]*font-family|\.report\s*\{[^}]*font-family/.test(src)){
      src += `\n<style>
/* [KT:FONT-RESTORATION] World-class font cascade - restored post-translation */
body, .report, p, div, span, h1, h2, h3, h4, h5, h6 {
  font-family: 'Georgia', 'Garamond', 'Times New Roman', serif !important;
}
.report {
  font-family: 'Georgia', 'Garamond', 'Times New Roman', serif !important;
}
.report p, .report div, .report span {
  font-family: 'Georgia', 'Garamond', 'Times New Roman', serif !important;
}
.report h1, .report h2, .report h3, .report h4, .report h5, .report h6 {
  font-family: 'Georgia', 'Garamond', serif !important;
  font-weight: 600;
}
section p, section div, section span {
  font-family: 'Georgia', 'Garamond', 'Times New Roman', serif !important;
}
/* Ensure list items and table content use proper fonts */
li, td, th, table {
  font-family: 'Georgia', 'Garamond', 'Times New Roman', serif !important;
}
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
// [KT:FORCE-AI-TABLE-TITLES] Always inject AI-generated, language-specific table titles
(function(){
  try{
    if (typeof document === 'undefined') {
      // server-side rendering path: nothing to do
    } else {
      var ensure = function(){
        // Try to get AI-generated table titles from a global or window context
        var aiTableTitles = (window.canon && window.canon.aiTableTitles) || (window.aiTableTitles) || [];
        document.querySelectorAll('table').forEach(function(tbl, idx){
          if(tbl.dataset.ktTitleProcessed) return;
          var cap = tbl.querySelector('caption');
          var aiTitle = (aiTableTitles && aiTableTitles[idx]) || 'Table';
          // If no caption, or caption is empty or says Untitled Table, inject AI title
          if(!cap || !cap.textContent.trim() || /\(Untitled Table\)/i.test(cap.textContent.trim())){
            if(cap) cap.remove();
            cap = document.createElement('caption');
            cap.textContent = aiTitle;
            tbl.insertBefore(cap, tbl.firstChild);
          } else if (/(Untitled Table)/i.test(cap.textContent.trim())) {
            cap.textContent = aiTitle;
          }
          // Always create a visible .table-title before the table
          if(!tbl.previousElementSibling || !tbl.previousElementSibling.classList.contains('table-title')){
            var t = document.createElement('div');
            t.className = 'table-title';
            t.textContent = cap.textContent.trim();
            t.setAttribute('data-kt-generated','true');
            tbl.parentNode.insertBefore(t, tbl);
          }
          cap.setAttribute('data-kt-legacy','hidden');
          cap.style.display = 'none';
          tbl.dataset.ktTitleProcessed = '1';
        });
      };
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure);
      else ensure();
    }
  } catch (e) {
    console.warn('[KT] ensureTableTitles failed', e);
  }
})();
// ✅ Drop this in lib/reportTemplate.js, replacing the existing implementation
// ✅ Drop this in lib/reportTemplate.js, replacing the existing implementation
export async function buildReformReportHTMLWithTranslation(opts) {
  // Safe defaults so we never blow up if caller omits fields
  const {
    canon = {},
    sections = {},
    phases = {},
    predictive = {},
    labelMap = {},         // preferred: dynamic label map from GPT (route)
    translatedLabels = {}, // backwards-compat: if route still uses this name
    planDiagramHTML,
    implKit,
    appendicesHTML,        // [KT:FIX:APPENDIX-DEDUP] Pass through appendicesHTML from route
    sectionOrder,          // [KT:DYNAMIC-SECTIONS] AI-determined section order
    worldClassVisuals,
  } = opts || {};

  // [KT:TRANSLATION-DIAGNOSTIC] Log incoming parameters
  console.log('[SR:TEMPLATE-WRAPPER] 🔍 buildReformReportHTMLWithTranslation ENTRY:', {
    lang: canon?.lang,
    labelMapKeys: Object.keys(labelMap || {}).length,
    translatedLabelsKeys: Object.keys(translatedLabels || {}).length,
    optsLabelKeys: Object.keys(opts?.labels || {}).length,
    sampleFromLabelMap: {
      preparedFor: labelMap?.preparedFor,
      executiveSummary: labelMap?.executiveSummary
    },
    sampleFromTranslatedLabels: {
      preparedFor: translatedLabels?.preparedFor,
      executiveSummary: translatedLabels?.executiveSummary
    }
  });

  // Base English labels for all charts / widgets
  // (already defined earlier in this file and exported)
  const baseLabels =
    typeof DEFAULT_LABELS === 'object' && DEFAULT_LABELS !== null
      ? DEFAULT_LABELS
      : {};

  // Merge in any translated label maps supplied by the route.
  // Nothing is hard-coded: if caller gives Albanian, French, etc.,
  // those strings flow straight through.
  const mergedLabels = {
    ...baseLabels,
    ...(labelMap || {}),
    ...(translatedLabels || {}),
  };

  // [KT:TRANSLATION-DIAGNOSTIC] Log merged labels before passing to builder
  console.log('[SR:TEMPLATE-WRAPPER] 🔍 MERGED LABELS:', {
    totalKeys: Object.keys(mergedLabels).length,
    isDefaultEnglish: mergedLabels.preparedFor === 'Prepared For',
    sample: {
      preparedFor: mergedLabels.preparedFor,
      preparedBy: mergedLabels.preparedBy,
      confidential: mergedLabels.confidential,
      executiveSummary: mergedLabels.executiveSummary,
      currentState: mergedLabels.currentState,
      transformationPlan: mergedLabels.transformationPlan
    }
  });

  // Always delegate to the core builder with the merged labels.
  // Standard charts (exec widgets, ROI, ops, etc.) will pick up
  // localized titles + axis labels via injectSmartWidgets/LL.
  return buildReformReportHTML({
    canon,
    sections,
    phases,
    predictive,
    planDiagramHTML,
    implKit,
    appendicesHTML,        // [KT:FIX:APPENDIX-DEDUP] Pass appendicesHTML to core builder
    sectionOrder,          // [KT:DYNAMIC-SECTIONS] Pass section order to core builder
    worldClassVisuals,
    // [KT:I18N:DYNAMIC-LABELS] Pass merged labels via all expected param names for title page & at a glance
    labels: mergedLabels,
    translatedLabels: mergedLabels,
  });
}