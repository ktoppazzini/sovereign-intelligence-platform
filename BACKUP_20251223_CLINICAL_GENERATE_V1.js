// app/api/clinical/generate/route.js
// [KT:CLINICAL-PLAN] Generates comprehensive pharmaceutical go-to-market analysis
// Uses GPT-5-nano-2025-08-07 with MANDATORY temperature: 1 and max_completion_tokens

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for comprehensive report

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate unique record ID
function generateRid() {
  return 'CP-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

// Store record in Airtable
async function createAirtableRecord(rid, form, lang) {
  try {
    const atApiKey = process.env.AIRTABLE_API_KEY || '';
    const atBaseId = process.env.AIRTABLE_BASE_ID || '';
    const atTable = process.env.AIRTABLE_CLINICAL_TABLE_NAME || 'Clinical Plans';

    if (!atApiKey || !atBaseId) {
      console.warn('[clinical/generate] Missing Airtable credentials');
      return null;
    }

    const atUrl = `https://api.airtable.com/v0/${atBaseId}/${encodeURIComponent(atTable)}`;
    
    const fields = {
      'Request ID': rid,
      'Drug Name': form.drugName || '',
      'Indication': form.indication || '',
      'Therapeutic Area': form.therapeuticArea || '',
      'Phase': form.phase || '',
      'Trial Type': form.trialType || '',
      'Regulatory Pathway': form.regulatoryPathway || '',
      'Country': form.country || '',
      'Sponsor': form.sponsor || '',
      'Prepared For': form.preparedFor || '',
      'Prepared By': form.preparedBy || '',
      'Language': lang || 'English',
      'Status': 'Generated',
      'Generated At': new Date().toISOString(),
    };

    const response = await fetch(atUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${atApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[clinical/generate] Airtable record created:', data.id);
      return data.id;
    } else {
      console.warn('[clinical/generate] Airtable create failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('[clinical/generate] Airtable error:', error.message);
    return null;
  }
}

// Build the comprehensive prompt based on research findings
function buildPharmaPrompt(form, lang) {
  const drugInfo = form.drugName || 'the therapeutic candidate';
  const indication = form.indication || 'the target indication';
  const phase = form.phase || 'clinical development';
  const therapeuticArea = form.therapeuticArea || 'therapeutic area';
  const trialType = form.trialType || 'clinical trial';
  const regulatory = form.regulatoryPathway || 'standard regulatory pathway';
  const country = form.country || 'global markets';
  const sponsor = form.sponsor || 'the sponsor organization';
  const enrollment = form.estimatedEnrollment || 'target enrollment';
  const sites = form.plannedSites || 'planned trial sites';
  const duration = form.trialDuration || 'trial duration';
  const primaryEndpoint = form.primaryEndpoint || 'primary endpoint';
  const secondaryEndpoints = form.secondaryEndpoints || 'secondary endpoints';
  const cost = form.estimatedCost || 'estimated budget';

  return `You are a world-class pharmaceutical consulting expert specializing in clinical development strategy, regulatory affairs, and go-to-market acceleration. Generate a COMPREHENSIVE, ACTIONABLE consulting-style analysis and roadmap for the following pharmaceutical development program.

## CLIENT PROGRAM DETAILS:
- **Drug/Compound:** ${drugInfo}
- **Primary Indication:** ${indication}
- **Therapeutic Area:** ${therapeuticArea}
- **Development Phase:** ${phase}
- **Trial Type:** ${trialType}
- **Regulatory Pathway:** ${regulatory}
- **Target Markets:** ${country}
- **Sponsor Organization:** ${sponsor}
- **Planned Sites:** ${sites}
- **Target Enrollment:** ${enrollment}
- **Trial Duration:** ${duration}
- **Primary Endpoint:** ${primaryEndpoint}
- **Secondary Endpoints:** ${secondaryEndpoints}
- **Estimated Budget:** ${cost}

## GENERATE A COMPREHENSIVE REPORT WITH THESE SECTIONS:

### 1. EXECUTIVE SUMMARY
- Program overview and strategic positioning
- Key success factors and critical path items
- Top 3 risks and mitigation strategies
- Expected timeline and major milestones

### 2. CLINICAL TRIAL ACCELERATION STRATEGY
**Patient Recruitment & Enrollment Optimization**
- AI-powered patient identification strategies
- Site selection recommendations based on patient density
- Enrollment forecasting and contingency planning
- Diversity and inclusion strategies for regulatory compliance
- Digital recruitment channel recommendations

**Trial Design Optimization**
- Protocol design recommendations
- Adaptive trial design opportunities
- Endpoint selection validation
- Inclusion/exclusion criteria optimization
- Sample size justification

### 3. REGULATORY STRATEGY & TIMELINE
**Regulatory Pathway Analysis**
- Recommended pathway (505(b)(1), 505(b)(2), BLA, etc.)
- Pre-submission meeting strategy
- Rolling submission opportunities
- Expedited pathways assessment (Breakthrough, Fast Track, Priority Review, Accelerated Approval)
- Health authority engagement plan

**Submission Timeline**
- Database lock to filing timeline optimization
- Document generation automation opportunities
- Health Authority Query (HAQ) preparation
- Advisory committee preparation

### 4. MANUFACTURING & SUPPLY CHAIN READINESS
- Scale-up timeline and risk assessment
- Tech transfer requirements
- Quality system readiness
- Cold chain requirements (if applicable)
- CMO/CDMO selection criteria
- Supply chain risk mitigation

### 5. MARKET ACCESS & COMMERCIALIZATION STRATEGY
**Payer Strategy**
- Value proposition development
- Health economics evidence requirements
- Payer engagement timeline
- Pricing strategy considerations
- Reimbursement pathway by market

**Launch Readiness**
- Pre-launch activities timeline
- KOL engagement strategy
- Medical affairs preparation
- Sales force planning
- Distribution channel strategy

### 6. RISK ANALYSIS & MITIGATION
Present as a detailed table:
| Risk Category | Specific Risk | Probability | Impact | Mitigation Strategy | Owner |
Include clinical, regulatory, manufacturing, commercial, and financial risks.

### 7. INVESTMENT & ROI ANALYSIS
- Total program investment estimate
- Timeline to market authorization
- Peak revenue potential
- NPV sensitivity analysis
- Key value inflection points

### 8. AI & DIGITAL ACCELERATION OPPORTUNITIES
Specific recommendations for:
- AI-powered patient matching
- Regulatory document automation
- Real-world evidence generation
- Pharmacovigilance automation
- Commercial analytics

### 9. ACTIONABLE ROADMAP
Present a detailed Gantt-style timeline with:
- Major workstreams
- Key milestones
- Decision gates
- Critical path dependencies
- Resource requirements

### 10. APPENDIX: REGULATORY TEMPLATES & CHECKLISTS
- Pre-IND meeting request outline
- Breakthrough Therapy Designation request checklist
- Fast Track eligibility criteria
- Priority Review voucher considerations

## FORMATTING REQUIREMENTS:
- Use proper HTML with semantic tags
- Include data visualization placeholders for charts
- Use tables for structured data
- Include executive-ready formatting
- Provide comprehensive, detailed content for each section
- Write in ${lang || 'English'}
- Be specific, actionable, and quantitative where possible
- Include industry benchmarks and best practices
- Reference relevant FDA/EMA guidance where applicable`;
}

export async function POST(req) {
  const startTime = Date.now();
  let body = {};
  
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const form = body?.form || body || {};
  const lang = body?.lang || form?.lang || 'English';
  const minWords = body?.minWords || 15000;

  console.log('[clinical/generate] Starting generation:', {
    drugName: form.drugName,
    indication: form.indication,
    phase: form.phase,
    lang,
  });

  // Generate unique record ID
  const rid = generateRid();

  // Create Airtable record first
  const airtableRecordId = await createAirtableRecord(rid, form, lang);

  try {
    const prompt = buildPharmaPrompt(form, lang);

    // [MANDATORY] GPT-5-nano-2025-08-07 with temperature: 1 and max_completion_tokens
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
      temperature: 1, // MANDATORY
      max_completion_tokens: 100000, // MANDATORY parameter name - GPT-5-nano supports large outputs
      messages: [
        {
          role: 'system',
          content: `You are a senior pharmaceutical consulting partner with 25+ years of experience at McKinsey, BCG, or Deloitte Life Sciences practice. You provide detailed, actionable strategic advice to pharmaceutical executives. Your analyses are known for being comprehensive, data-driven, and immediately actionable. Always write in ${lang}.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const reportContent = completion.choices?.[0]?.message?.content || '';
    
    if (!reportContent || reportContent.length < 1000) {
      throw new Error('Generated content too short');
    }

    // Build full HTML report
    const fullHtml = buildReportHtml(form, reportContent, rid, lang);
    const wordCount = (fullHtml.match(/\w+/g) || []).length;

    console.log('[clinical/generate] Generation complete:', {
      rid,
      wordCount,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      ok: true,
      rid,
      recordId: airtableRecordId || rid,
      report: fullHtml,
      html: fullHtml,
      wordCount,
      lang,
    });

  } catch (error) {
    console.error('[clinical/generate] Error:', error);
    
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Generation failed',
      rid,
    }, { status: 500 });
  }
}

function buildReportHtml(form, content, rid, lang) {
  const title = form.drugName 
    ? `Clinical Development Strategy: ${form.drugName}`
    : `Clinical Development Strategy: ${form.indication || 'Pharmaceutical Program'}`;
  
  const date = new Date().toLocaleDateString(lang === 'English' ? 'en-US' : undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="${lang === 'English' ? 'en' : lang.slice(0, 2).toLowerCase()}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --primary: #0891b2;
      --primary-dark: #0e7490;
      --secondary: #6366f1;
      --accent: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --border: #334155;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      line-height: 1.7;
      padding: 0;
    }
    
    .report-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 32px;
    }
    
    .report-header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      padding: 48px 40px;
      border-radius: 16px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }
    
    .report-header::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      transform: translate(30%, -30%);
    }
    
    .report-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 16px;
      position: relative;
    }
    
    .report-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      font-size: 0.95rem;
      opacity: 0.9;
    }
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .meta-item strong {
      opacity: 0.8;
    }
    
    .section {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 24px;
      border: 1px solid var(--border);
    }
    
    h2 {
      color: var(--primary);
      font-size: 1.75rem;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--primary);
    }
    
    h3 {
      color: var(--accent);
      font-size: 1.35rem;
      margin: 24px 0 16px 0;
    }
    
    h4 {
      color: var(--text-primary);
      font-size: 1.15rem;
      margin: 20px 0 12px 0;
    }
    
    p {
      margin-bottom: 16px;
      color: var(--text-secondary);
    }
    
    ul, ol {
      margin: 16px 0;
      padding-left: 24px;
    }
    
    li {
      margin-bottom: 8px;
      color: var(--text-secondary);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 0.9rem;
    }
    
    th {
      background: var(--primary-dark);
      color: white;
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text-secondary);
    }
    
    tr:hover td {
      background: rgba(8, 145, 178, 0.1);
    }
    
    .highlight-box {
      background: linear-gradient(135deg, rgba(8, 145, 178, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
      border-left: 4px solid var(--primary);
      padding: 20px 24px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    
    .risk-high { color: var(--danger); font-weight: 600; }
    .risk-medium { color: var(--warning); font-weight: 600; }
    .risk-low { color: var(--accent); font-weight: 600; }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 24px 0;
    }
    
    .kpi-card {
      background: var(--bg-dark);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      border: 1px solid var(--border);
    }
    
    .kpi-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary);
    }
    
    .kpi-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 8px;
    }
    
    .footer {
      text-align: center;
      padding: 32px;
      color: var(--text-secondary);
      font-size: 0.85rem;
      border-top: 1px solid var(--border);
      margin-top: 40px;
    }
    
    @media print {
      body { background: white; color: #1e293b; }
      .section { border: 1px solid #e2e8f0; }
      .report-header { background: #0891b2; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>🧬 ${title}</h1>
      <div class="report-meta">
        <div class="meta-item"><strong>Sponsor:</strong> ${form.sponsor || 'N/A'}</div>
        <div class="meta-item"><strong>Indication:</strong> ${form.indication || 'N/A'}</div>
        <div class="meta-item"><strong>Phase:</strong> ${form.phase || 'N/A'}</div>
        <div class="meta-item"><strong>Date:</strong> ${date}</div>
        <div class="meta-item"><strong>Report ID:</strong> ${rid}</div>
      </div>
    </div>
    
    <div class="section">
      ${content}
    </div>
    
    <div class="footer">
      <p><strong>Sovereign Intelligence</strong> — AI-Powered Pharmaceutical Consulting</p>
      <p>Prepared for ${form.preparedFor || 'Client'} by ${form.preparedBy || 'Sovereign Intelligence'}</p>
      <p>Report ID: ${rid} | Generated: ${date}</p>
      <p style="margin-top: 16px; font-size: 0.75rem; opacity: 0.7;">
        This report is generated using advanced AI analysis and should be reviewed by qualified professionals before implementation.
        All recommendations are subject to further validation based on specific program requirements.
      </p>
    </div>
  </div>
</body>
</html>`;
}
