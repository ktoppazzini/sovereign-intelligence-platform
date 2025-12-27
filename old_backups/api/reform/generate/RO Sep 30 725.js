// app/api/reform/generate/route.js
// Next.js App Router (Node runtime)

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// ✳️ STATIC import of the report template
import { buildReformReportHTML } from '@/lib/reportTemplate';

// i18n helpers expected by template
import { getUiTranslations, normalizeLang, isRTL } from '@/lib/i18nClient';

// ---- Config ------------------------------------------------------------------

export const runtime = 'nodejs';
const TAG = '[reform][generate]';

// Models & floors
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
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

// ---- SVG charts (inline) -----------------------------------------------------

function moneyShort(n) {
  const x = Math.round(n);
  if (x >= 1_000_000_000) return `$${(x / 1_000_000_000).toFixed(1)}B`;
  if (x >= 1_000_000) return `$${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `$${(x / 1_000).toFixed(1)}k`;
  return `$${x}`;
}

const graphs = {
  sparkline: '', // Remove pre-generated sparkline SVG
  bars: '', // Remove pre-generated bar chart SVG
};

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
  if (ok && json?.records?.[0]?.id) return json.records[0].id;
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

Write in clear, professional English without fluff. Each section must be original and not repeat prior sections. Ensure no content is repeated across sections; each section must introduce new, unique information. Include concrete, implementable detail, milestones, and quantified assumptions where reasonable. Provide extensive detail, including specific examples, case studies, quantified metrics, step-by-step plans, and actionable recommendations to ensure the content is rich and comprehensive. The total report length should be approximately 20,000 words with 90% of the content in the main body sections and only 10% in appendices. Only supplemental data should go into appendices. The content should be detailed enough that a client would have a step-by-step plan to implement recommendations and strategies covering everything. They should not need outside help to be successful.

To make this report irresistible and superior to McKinsey/Gartner reports:
- Include benchmarking against industry leaders and competitors with quantified comparisons.
- Add AI-driven predictive analytics for future trends and scenarios.
- Provide personalized recommendations based on the organization's profile.
- Embed interactive elements like ROI calculators and scenario planners.
- Integrate live data feeds for market trends and KPIs where applicable.
- Include multimedia placeholders for executive video summaries or infographics.
- Enable collaboration features with annotations and team input suggestions.
- Provide custom branding elements and executive dashboards with key metrics.

Ensure graphs and charts are included throughout the report, with clear labels, titles, and contrasting colors for readability.
Ensure the title page includes a large logo, organization name, and "Prepared for" and "Prepared by" fields prominently displayed.
Each section should have a shadowed box with commentary or summaries.
Avoid any duplication of data or content across sections.

Please include a detailed, step-by-step implementation roadmap section with phases, milestones, decision gates, RACI roles, and a detailed project plan.

+--------------------------+----------------------------------+------------------+
| **Domain**               | **Current State**               | **Observed Issue** |
+--------------------------+----------------------------------+------------------+
| Operations               | Process A requires 10 days      | Inefficient handoffs |
| Finance                  | Manual reporting only           | High error rate |
| Technology               | Legacy systems in use           | Poor integration |
+--------------------------+----------------------------------+------------------+

+-------------------+-------------------+-------------------+-------------+------------------+
| **Cost Category** | **Current Spend** | **Proposed Saving** | **Savings %** | **Timing (Q1–Q4)** |
+-------------------+-------------------+-------------------+-------------+------------------+
| IT Infrastructure | $2,500,000        | $750,000          | 30%         | Q2–Q4            |
| Procurement       | $5,000,000        | $1,000,000        | 20%         | Q1–Q3            |
| Facilities        | $1,800,000        | $300,000          | 17%         | Q3–Q4            |
+-------------------+-------------------+-------------------+-------------+------------------+

+--------------------------+-------------------------------+------------+-------------------------+--------------------+
| **KPI**                  | **Definition**                | **Target** | **Measurement Frequency** | **Responsible Owner** |
+--------------------------+-------------------------------+------------+-------------------------+--------------------+
| Cost per Unit            | Avg. cost to produce 1 unit   | $X by Q4   | Monthly                 | Head of Operations |
| Customer Satisfaction    | % rating ≥ 4/5                | 90%        | Quarterly               | CS Lead            |
| Cycle Time               | Days to complete process      | < 5 days   | Monthly                 | Process Manager    |
+--------------------------+-------------------------------+------------+-------------------------+--------------------+

+-----------+----------------------------+-----------------------+--------------+-----------+
| **Phase** | **Key Activities**         | **Milestones**        | **Timeline** | **Owner** |
+-----------+----------------------------+-----------------------+--------------+-----------+
| Phase 1   | Diagnostic assessment      | Report Complete       | Month 1      | Strategy  |
| Phase 2   | Pilot reforms in 1 region  | Pilot Go-Live         | Months 2–3   | Ops Mgr   |
| Phase 3   | Scale to all units         | Full Deployment       | Months 4–8   | COO       |
+-----------+----------------------------+-----------------------+--------------+-----------+

+--------------------------+----------------+----------------+----------------+----------------+
| **Activity / Decision**  | **Responsible**| **Accountable**| **Consulted**  | **Informed**   |
+--------------------------+----------------+----------------+----------------+----------------+
| Vendor Selection         | Procurement    | CFO            | IT, Legal      | All Managers   |
| Policy Approval          | Policy Team    | CEO            | HR, Compliance | All Staff      |
| Tech Implementation      | IT Manager     | COO            | Vendor, Finance| End Users      |
+--------------------------+----------------+----------------+----------------+----------------+
`;

  return [
    {
      key: 'exec',
      title: 'Executive Summary',
      min: 3000,
      ask: `${base}\nSection: Executive Summary. Minimum 3000 words.`,
    },
    {
      key: 'current',
      title: 'Current State & Problem Definition',
      min: 3000,
      ask: `${base}\nSection: Current State & Problem Definition. Minimum 3000 words.`,
    },
    {
      key: 'financials',
      title: 'Financial Baseline & Savings Model',
      min: 3000,
      ask: `${base}\nSection: Financial Baseline & Savings Model. Minimum 3000 words. Include specific cost drivers, sensitivity ranges, and phasing.`,
    },
    {
      key: 'kpis',
      title: 'KPIs & Measurement System',
      min: 2000,
      ask: `${base}\nSection: KPIs & Measurement System. Minimum 2000 words. Define operational KPIs, targets, and measurement cadence.`,
    },
    {
      key: 'ops',
      title: 'Operational Levers & Playbooks',
      min: 4000,
      ask: `${base}\nSection: Operational Levers & Playbooks. Minimum 4000 words. Describe specific process changes, tech enablers, and playbooks.`,
    },
    {
      key: 'risk',
      title: 'Risks & Mitigations',
      min: 1500,
      ask: `${base}\nSection: Risks & Mitigations. Minimum 1500 words. Identify top risks and concrete mitigations.`,
    },
    {
      key: 'roi',
      title: 'ROI & Business Case',
      min: 2000,
      ask: `${base}\nSection: ROI & Business Case. Minimum 2000 words. Show payback, NPV logic (qualitatively), and hard/soft benefits.`,
    },
    {
      key: 'implementation',
      title: 'Implementation Roadmap & Governance',
      min: 2000,
      ask: `${base}\nSection: Implementation Roadmap & Governance. Minimum 2000 words. Include phases, decision gates, RACI roles, and detailed project plan.`,
    },
  ];
}

async function genSection({ key, title, ask }) {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a senior transformation consultant. Return valid HTML fragments (<p>, <ul>, <ol>, <table>, <h3> etc.). Do NOT include a section heading; content only. Do NOT include <html> or <body> wrappers.',
      },
      { role: 'user', content: ask },
    ],
    temperature: 0.35,
  });

  const raw = res.choices?.[0]?.message?.content?.trim() || '';
  const html = cleanSectionHTML(raw, title);
  return { key, title, html, words: wc(html) };
}

async function forceToFloor(sections, targetWords, canon) {
  // Keep appending "supplemental data" until targetWords met or round cap reached
  // Limit appendices to 10% of total content (approximately 2000 words)
  const maxAppendixWords = Math.min(2000, targetWords * 0.1);
  let total = sections.reduce((n, s) => n + (s?.words || 0), 0);
  let appendixWords = 0;
  let rounds = 0;

  while (
    total < targetWords &&
    appendixWords < maxAppendixWords &&
    sections.length < REPORT_MAX_EXPANSION_ROUNDS
  ) {
    rounds++;
    const ask = `
You are adding supplemental data to an appendix for a reform strategy report for ${canon.orgName}.
Write concise supplemental information of at least 200 words covering only additional supporting details that complement the main body sections:
- Additional reference materials
- Supplementary data tables
- Extended examples or case studies
- Technical specifications or templates
- Glossary of terms
Do NOT repeat or duplicate any content from the main body sections. This appendix should contain ONLY supplemental data that enhances but does not replace the comprehensive content in the main report. Return HTML fragment only.`;

    const extra = await genSection({
      key: `appendix-${sections.length + 1}`,
      title: 'Appendix – Supplemental Data',
      ask,
    });

    // If the model returns anemic output (e.g., <10 words), immediately try again with a stronger prompt.
    if (extra.words < 50 && sections.length < REPORT_MAX_EXPANSION_ROUNDS) {
      const retry = await genSection({
        key: `appendix-${sections.length + 1}-retry`,
        title: 'Appendix – Additional References',
        ask:
          ask +
          '\nFocus on providing reference materials, templates, and supporting documentation only.',
      });
      sections.push(retry);
      total += retry.words;
      appendixWords += retry.words;
    } else {
      sections.push(extra);
      total += extra.words;
      appendixWords += extra.words;
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
  const tMap = await getUiTranslations(lang).catch(() => ({}));
  const rtl = isRTL(lang);

  // ---- Graph data ------------------------------------------------------------
  const years = Math.max(1, Number(String(canon.timeFrame).match(/\d+/)?.[0] || 3));
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

  // Remove usage of sparklineSVG and barChartSVG here since they are not defined in this module
  // The reportTemplate.js handles graph rendering now

  const graphs = {
    // sparkline: sparklineSVG(trend, { title: 'Financial trend (projected savings)' }),
    // bars: barChartSVG(kpis, { title: 'Key Performance Indicators' }),
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

  for (let i = 0; i < prompts.length && sections.length < REPORT_MAX_EXPANSION_ROUNDS; i++) {
    console.log(`${TAG}`, 'gen.start', {
      section: prompts[i].key,
      title: prompts[i].title,
      idx: i + 1,
      total: prompts.length,
    });
    const s = await genSection(prompts[i]);

    // inject graphs into specific sections
    if (prompts[i].key === 'financials') {
      s.html += `<figure class="graph sparkline" aria-describedby="financial-trend"><figcaption id="financial-trend">Financial trend (projected savings)</figcaption>${graphs.sparkline}</figure>`;
    }
    if (prompts[i].key === 'kpis') {
      s.html += `<figure class="graph kpi-bars" aria-describedby="kpi-bars"><figcaption id="kpi-bars">Key Performance Indicators</figcaption>${graphs.bars}</figure>`;
    }
    if (prompts[i].key === 'timeline') {
      const tl = phases.map((p) => `<span style="margin-right:1rem">${p.label}</span>`).join('');
      s.html += `<figure class="graph timeline"><figcaption>Implementation Timeline</figcaption><div>${tl}</div></figure>`;
    }

    sections.push(s);
    totalWords += s.words;
    console.log(`${TAG}`, 'gen.done', { section: prompts[i].key, words: s.words });

    if (totalWords >= canon.minWords) break;
    if (i === prompts.length - 1 && totalWords < canon.minWords) {
      prompts.push({
        key: `deep-dive-${prompts.length + 1}`,
        title: 'Operational Deep Dive – Additional Detail',
        min: 700,
        ask: `${prompts[0].ask}\nWrite an additional *non-redundant* operational deep dive focusing on process redesign, automation, and change management levers. Minimum 700 words. Do not repeat earlier sections.`,
      });
    }
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
      case 'risk':
        sectionMap.risks = s.html;
        break;
      case 'roi':
        sectionMap.conclusion = s.html;
        break;
      default:
        sectionMap.appendices += `<div>${s.html}</div>`;
    }
  }

  const rawHtml = sections.map((s) => `<section><h2>${s.title}</h2>${s.html}</section>`).join('\n');

  // Build final HTML via template
  const ctx = {
    lang,
    tMap,
    rtl,
    origin,
    logoUrl: canon.logoUrl,
    currentYear: new Date().getFullYear(),
    canon, // Pass the full canon object for field replacement
    financialsData: trend, // Pass financial trend data for graphs
    kpiValues: kpis.map((k) => k.value), // Pass KPI values for graphs
    kpiLabels: kpis.map((k) => k.label), // Pass KPI labels for graphs
    financialsLabels: Array.from({ length: points }, (_, i) => `Month ${i + 1}`), // Generate labels for financial data
  };

  const dataForTemplate = {
    sections: sectionMap,
    rawHtml,
    financialTable: null,
    kpiTable: null,
    logoUrl: canon.logoUrl,
    reportDate: new Date().toLocaleDateString(),
  };

  let finalHTML = await buildReformReportHTML(dataForTemplate, ctx);

  // remove stray duplicated "Executive Summary" headings beyond the first
  finalHTML = finalHTML.replace(
    /(<h2[^>]*>\s*Executive Summary\s*<\/h2>)/gi,
    (m, _g, offset, str) => (str.indexOf(m) === offset ? m : ''),
  );

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
      .filter((s) => s.key.startsWith('appendix'))
      .map((s) => `<div>${s.html}</div>`)
      .join('\n');
    dataForTemplate.rawHtml = rebuiltRaw;

    finalHTML = await buildReformReportHTML(dataForTemplate, ctx);
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
    if (!upsert.ok && upsert.json?.error?.type === 'INVALID_RECORD_ID' && !rid) {
      // retry without HTML first to dodge size issues on first create
      const retryFields = { ...fields };
      delete retryFields[F_HTML];
      upsert = await createOrUpdateRequest(retryFields, rid);
      if (upsert.ok && upsert.json?.id) {
        rid = upsert.json.id;
        await createOrUpdateRequest({ [F_HTML]: finalHTML }, rid);
      }
    } else if (upsert.ok && upsert.json?.id) {
      rid = upsert.json.id;
    }

    if (!upsert.ok) {
      console.error(`${TAG}`, 'fatal', {
        stage: 'AIRTABLE_UPSERT',
        message: upsert.json?.error?.message || 'Unknown Airtable error',
      });
      // Continue with report generation even if Airtable upsert fails
    } else {
      console.log(`${TAG}`, 'final.update.ok', {});
    }
  }

  const ms_total = Date.now() - started;
  console.log(`${TAG}`, 'ok', { rid, ms_total, finalWordCount, min: canon.minWords });

  return NextResponse.json({
    ok: true,
    rid,
    wordCount: finalWordCount,
    html: finalHTML,
    currentYear: new Date().getFullYear(),
    logoUrl: canon.logoUrl,
  });
}
