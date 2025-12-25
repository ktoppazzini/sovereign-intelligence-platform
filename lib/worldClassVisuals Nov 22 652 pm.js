/* ===========================================================
   [KT:WORLD-CLASS-VISUALS] Nov 7, 2025
   5 McKinsey-beating visualizations for world-class reports
   - Visual Timeline/Swimlane Roadmap
   - Radar Chart (Competitive Positioning)
   - Risk Heatmap (Risk Matrix)
   - Waterfall Chart (Value Bridge)
   - Executive Summary Infographic
   ===========================================================*/


// [KT:TRANSLATION] Simple translation function for future localization
// const t = (s) => s; // Replace with actual translation logic as needed

// [KT:TRANSLATION:INJECTABLE]
// New injectable translator so the main report translation system can drive all text.
// Usage from outside:
//   import { setWorldClassVisualsTranslator } from '.../worldClassVisuals';
//   setWorldClassVisualsTranslator(mainTranslatorFn);
let _translator = (s) => s;

export function setWorldClassVisualsTranslator(fn) {
  if (typeof fn === 'function') {
    _translator = fn;
  }
}

const t = (s) => _translator(s);

const esc = str =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * 1. VISUAL TIMELINE / SWIMLANE ROADMAP
 * Shows implementation phases with milestones, deliverables, and dependencies
 */
export function visualTimelineHTML(phases = []) {
  if (!phases || phases.length === 0) {
    phases = [
      { name: 'Discovery', startWeek: 0, endWeek: 4, color: '#3B82F6', milestones: [{week: 2, title: 'Baseline'}, {week: 4, title: 'Analysis Complete'}], deliverables: ['Current State', 'Gap Analysis'] },
      { name: 'Design', startWeek: 4, endWeek: 8, color: '#10B981', milestones: [{week: 6, title: 'Blueprint'}, {week: 8, title: 'Sign-off'}], deliverables: ['Target Operating Model', 'Implementation Plan'] },
      { name: 'Pilot', startWeek: 8, endWeek: 12, color: '#F59E0B', milestones: [{week: 10, title: 'Launch'}, {week: 12, title: 'Review'}], deliverables: ['Pilot Results', 'Lessons Learned'] },
      { name: 'Scale', startWeek: 12, endWeek: 24, color: '#10B981', milestones: [{week: 16, title: 'Phase 1'}, {week: 20, title: 'Phase 2'}, {week: 24, title: 'Full Rollout'}], deliverables: ['Training Complete', 'Go-Live', 'Benefits Tracking'] }
    ];
  }
    // [KT:SURGICAL] Commented out stray 'o' for auditability and reversibility
    // o
  const totalWeeks = Math.max(...phases.map(p => p.endWeek || 24));
  const w = 960, h = 400, p = 60;
  const laneHeight = (h - 2*p) / phases.length;
  const weekWidth = (w - 2*p) / totalWeeks;

  // [KT:SURGICAL:PHASE-LABELS] Show 'Phase X - [Phase Name]' above each bar, dynamic and auditable, now wrapped in t() for translation
  const lanes = phases.map((phase, i) => {
    const y = p + i * laneHeight;
    const x1 = p + phase.startWeek * weekWidth;
    const x2 = p + phase.endWeek * weekWidth;
    const phaseWidth = x2 - x1;
    const isScale = /scale/i.test(phase.name);
    const labelFontSize = isScale ? 24 : 16;
    const phaseLabel = `<text x="${x1 + phaseWidth/2}" y="${y + laneHeight*0.18}" text-anchor="middle" fill="#FF3333" font-size="15" font-weight="bold">${t('Phase')} ${i+1} - ${esc(t(phase.name))}</text>`;
    const label = `<text x="${x1 + phaseWidth/2}" y="${y + laneHeight*0.5}" text-anchor="middle" fill="#FFFFFF" font-size="${labelFontSize}" font-weight="700">${esc(t(phase.name))}</text>`;
    const bar = `<rect x="${x1}" y="${y + laneHeight*0.2}" width="${phaseWidth}" height="${laneHeight*0.6}" fill="${phase.color}" fill-opacity="0.3" stroke="${phase.color}" stroke-width="2" rx="8"/>`;
    const milestones = (phase.milestones || []).map(m => {
      const mx = p + m.week * weekWidth;
      const my = y + laneHeight*0.5;
      const diamond = `<path d="M ${mx},${my-12} L ${mx+10},${my} L ${mx},${my+12} L ${mx-10},${my} Z" fill="${phase.color}" stroke="#FFFFFF" stroke-width="2"/>`;
      const mlabel = `<text x="${mx}" y="${my - 20}" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="600">${esc(t(m.title))}</text>`;
      return diamond + mlabel;
    }).join('');
    return bar + phaseLabel + label + milestones;
  }).join('');

  const timeAxis = Array.from({length: Math.ceil(totalWeeks/4) + 1}, (_, i) => i*4).map(week => {
    const x = p + week * weekWidth;
    return `<line x1="${x}" y1="${p}" x2="${x}" y2="${h-p}" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4,4"/>
            <text x="${x}" y="${p-10}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="12">${t('Week')} ${week}</text>`;
  }).join('');

  const separators = phases.map((_, i) => {
    if (i === 0) return '';
    const y = p + i * laneHeight;
    return `<line x1="${p}" y1="${y}" x2="${w-p}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
  }).join('');

  return `
    <figure class="chart-card timeline-card">
      <header class="chart-head">
        <h3 class="chart-title">${t('Implementation Roadmap')}</h3>
      </header>
      <div class="canvas-wrap">
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background:#000000; border-radius:12px;">
          <rect width="${w}" height="${h}" fill="#000000" rx="12"/>
          ${timeAxis}
          ${separators}
          ${lanes}
        </svg>
      </div>
      <p class="chart-note">${t('Visual timeline showing implementation phases, key milestones, and deliverables across')} ${totalWeeks} ${t('-week transformation program.')}</p>
    </figure>
  `;
}

// New: top Insights header to appear above the Current State visuals
export function topInsightsHeaderHTML() {
  return `
    <div class="top-insights-header" style="text-align:left; padding: 8px 12px; font-family: Georgia, 'Times New Roman', serif; font-weight:700; color:#fff;">
  <span style="background:#FF8C00; color:#000; padding:4px 8px; border-radius:4px; font-size:14px;">${t('Overall')}</span>
  <span style="margin-left:8px; font-size:14px; color:#fff;">&amp; ${t('Key Insights')}</span>
    </div>
  `;
}

/**
 * 2. RADAR CHART - Competitive Positioning
 */
export function radarChartHTML(dimensions = []) {
  if (!dimensions || dimensions.length === 0) {
    dimensions = [
      { name: 'Efficiency', company: 72, benchmark: 85, max: 100 },
      { name: 'Quality', company: 88, benchmark: 92, max: 100 },
      { name: 'Speed', company: 65, benchmark: 90, max: 100 },
      { name: 'Innovation', company: 70, benchmark: 80, max: 100 },
      { name: 'Cost', company: 60, benchmark: 75, max: 100 },
      { name: 'Customer Sat', company: 82, benchmark: 88, max: 100 }
    ];
  }

  const w = 500, h = 500;
  const cx = w/2, cy = h/2, radius = Math.min(w, h) * 0.35;
  const n = dimensions.length;
  const angleStep = (2 * Math.PI) / n;

  const companyPoints = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI/2;
    const r = (d.company / d.max) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const benchmarkPoints = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI/2;
    const r = (d.benchmark / d.max) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const companyPath = companyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
  const benchmarkPath = benchmarkPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  const gridCircles = [0.25, 0.5, 0.75, 1].map(factor => 
    `<circle cx="${cx}" cy="${cy}" r="${radius * factor}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`
  ).join('');

  const axes = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI/2;
    const x2 = cx + radius * 1.15 * Math.cos(angle);
    const y2 = cy + radius * 1.15 * Math.sin(angle);
    const labelX = cx + radius * 1.35 * Math.cos(angle);
    const labelY = cy + radius * 1.35 * Math.sin(angle);
    
    return `
      <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="${labelX}" y="${labelY}" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="600">${esc(d.name)}</text>
    `;
  }).join('');

  return `
    <figure class="chart-card radar-card">
      <header class="chart-head">
        <h3 class="chart-title">${t('Competitive Positioning Analysis')}</h3>
      </header>
      <div class="canvas-wrap">
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background:#000000; border-radius:12px;">
          <rect width="${w}" height="${h}" fill="#000000" rx="12"/>
          ${gridCircles}
          ${axes}
          <path d="${benchmarkPath}" fill="#3B82F6" fill-opacity="0.2" stroke="#3B82F6" stroke-width="2"/>
          <path d="${companyPath}" fill="#10B981" fill-opacity="0.3" stroke="#10B981" stroke-width="3"/>
          <circle cx="${w-80}" cy="30" r="8" fill="#10B981"/>
          <text x="${w-65}" y="35" fill="#FFFFFF" font-size="12">${t('Company')}</text>
          <circle cx="${w-80}" cy="50" r="8" fill="#3B82F6"/>
          <text x="${w-65}" y="55" fill="#FFFFFF" font-size="12">${t('Benchmark')}</text>
        </svg>
      </div>
      <p class="chart-note">${t('Multi-dimensional competitive analysis across')} ${n} ${t('key performance dimensions. Green area shows current state; blue shows industry benchmark.')}</p>
    </figure>
  `;
}

/**
 * 3. RISK HEATMAP - Risk Matrix
 */
export function riskHeatmapHTML(risks = []) {
  // [KT:AUDIT:RISK-MATRIX] Logging received risks for auditability and debugging
  /* [KT:AUDIT:RISK-MATRIX] If risk names or descriptions are incorrect, check the risks array below. This log is for auditability and debugging only. */
  console.log('[KT:AUDIT][riskHeatmapHTML] risks:', risks);
  // Unified summary row for risk heatmap
  function chartSummaryRowRisk({ risks }) {
    // Remove duplicates by name
    const uniqueRisks = [];
    const seen = new Set();
    for (const r of risks) {
      if (!seen.has(r.name)) {
        uniqueRisks.push(r);
        seen.add(r.name);
      }
    }
    const topRisk = uniqueRisks && uniqueRisks.length ? uniqueRisks[0].name : t('N/A');
    const topDesc = uniqueRisks && uniqueRisks.length ? (uniqueRisks[0].description || t('No description provided.')) : '';
    // Remove checkbox and delete label (surgical)
    return `
      <div class="chart-summary" style="font-size:16px; color:#FFFFFF; margin-bottom:8px;">
        <div><span style="font-weight:bold;">${t('Overall')}:</span> <span style="color:#fff;">${t('Risk levels are distributed across the matrix, highlighting areas of concern.')}</span></div>
        <div><span style="font-weight:bold;">${t('Key Insights')}:</span> <span style="color:#fff;">${t('Top risk')}: ${esc(topRisk)}. ${esc(topDesc)}</span></div>
      </div>
    `;
  }
  if (!risks || risks.length === 0) {
    risks = [
      { name: 'Resource Availability', severity: 4, likelihood: 3, description: 'Limited access to key resources may delay project milestones.' },
      { name: 'Vendor Delays', severity: 3, likelihood: 4, description: 'External vendors may not deliver on time, impacting schedules.' },
      { name: 'Budget Overrun', severity: 5, likelihood: 2, description: 'Costs may exceed initial estimates due to unforeseen issues.' },
      { name: 'Stakeholder Resistance', severity: 4, likelihood: 4, description: 'Key stakeholders may resist changes, slowing adoption.' },
      { name: 'Technical Complexity', severity: 3, likelihood: 3, description: 'Complex technical requirements may introduce implementation risk.' },
      { name: 'Timeline Slippage', severity: 4, likelihood: 3, description: 'Project phases may take longer than planned.' },
      { name: 'Scope Creep', severity: 3, likelihood: 5, description: 'Uncontrolled changes or growth in project scope.' }
    ];
  }

  // Remove duplicate risks by name
  const uniqueRisks = [];
  const seen = new Set();
  for (const r of risks) {
    if (!seen.has(r.name)) {
      uniqueRisks.push(r);
      seen.add(r.name);
    }
  }

  const w = 600, h = 600, p = 80;
  const cellSize = (Math.min(w, h) - 2*p) / 5;

  const getRiskColor = (sev, lik) => {
    const score = sev * lik;
    if (score >= 20) return '#EF4444';
    if (score >= 15) return '#F59E0B';
    if (score >= 10) return '#F59E0B';
    if (score >= 6) return '#10B981';
    return '#3B82F6';
  };

  const cells = [];
  for (let sev = 1; sev <= 5; sev++) {
    for (let lik = 1; lik <= 5; lik++) {
      const x = p + (lik - 1) * cellSize;
      const y = h - p - sev * cellSize;
      const color = getRiskColor(sev, lik);
      cells.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" fill-opacity="0.15" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>`);
    }
  }

  const riskBubbles = uniqueRisks.map((r, i) => {
    const x = p + (r.likelihood - 0.5) * cellSize;
    const y = h - p - (r.severity - 0.5) * cellSize;
    const color = getRiskColor(r.severity, r.likelihood);
    return `
      <circle cx="${x}" cy="${y}" r="20" fill="${color}" fill-opacity="0.7" stroke="#FFFFFF" stroke-width="2"/>
      <text x="${x}" y="${y}" text-anchor="middle" fill="#FFFFFF" font-size="10" font-weight="700" dy="4">${i+1}</text>
    `;
  }).join('');

  const xLabels = ['', t('Rare'), t('Unlikely'), t('Possible'), t('Likely'), t('Almost Certain')].map((label, i) => {
    if (i === 0) return '';
    const x = p + (i - 0.5) * cellSize;
    return `<text x="${x}" y="${h - p + 30}" text-anchor="middle" fill="#FFFFFF" font-size="12">${label}</text>`;
  }).join('');

  const yLabels = ['', t('Negligible'), t('Minor'), t('Moderate'), t('Major'), t('Critical')].map((label, i) => {
    if (i === 0) return '';
    const y = h - p - (i - 0.5) * cellSize;
    return `<text x="${p - 10}" y="${y}" text-anchor="end" fill="#FFFFFF" font-size="12" dy="4">${label}</text>`;
  }).join('');

  const legend = uniqueRisks.map((r, i) => 
    `<text x="20" y="${20 + i*20}" fill="#FFFFFF" font-size="11">${i+1}. ${esc(r.name)}</text>`
  ).join('');

  // Risk list with short descriptions below SVG
  const riskList = `
    <div class="risk-list" style="margin-top:16px; color:#fff;">
      <strong>${t('Risks')}:</strong>
      <ol style="margin:8px 0 0 20px; padding:0;">
        ${uniqueRisks.map((r, i) => `<li style="margin-bottom:4px;"><span style="font-weight:bold;">${esc(r.name)}</span>: ${r.description ? esc(r.description) : t('No description provided.')}</li>`).join('')}
      </ol>
    </div>
  `;
  return `
    <figure class="chart-card risk-heatmap-card">
      ${chartSummaryRowRisk({ risks })}
      <header class="chart-head">
        <h3 class="chart-title">${t('Risk Assessment Matrix')}</h3>
      </header>
      <div class="canvas-wrap">
        <svg width="${w}" height="${h + 100}" viewBox="0 0 ${w} ${h + 100}" style="background:#000000; border-radius:12px;">
          <rect width="${w}" height="${h + 100}" fill="#000000" rx="12"/>
          <text x="${w/2}" y="${h - 20}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="14" font-weight="600">${t('LIKELIHOOD')} →</text>
          <text x="${25}" y="${h/2}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="14" font-weight="600" transform="rotate(-90 25 ${h/2})">← ${t('SEVERITY')}</text>
          ${cells.join('')}
          ${riskBubbles}
          ${xLabels}
          ${yLabels}
          <g transform="translate(0, ${h + 10})">
            ${legend}
          </g>
        </svg>
      </div>
      ${riskList}
      <!-- [KT:PATCH:RISK-NOTE] Updated risk matrix note for clarity and color legend -->
      <!-- Old: <p class="chart-note">${t('Risk heatmap showing')} ${risks.length} ${t('identified risks plotted by severity and likelihood. Red = critical, Orange = high, Green = medium, Blue = low.')}</p> -->
      <p class="chart-note">${t('Risk heatmap visualizes')} ${risks.length} ${t('identified risks by severity (vertical) and likelihood (horizontal).')} <span style="font-weight:bold;">${t('Color legend:')}</span> <span style="color:#EF4444;">${t('Red = critical')}</span>, <span style="color:#F59E0B;">${t('Orange = high')}</span>, <span style="color:#10B981;">${t('Green = medium')}</span>, <span style="color:#3B82F6;">${t('Blue = low')}</span>.</p>
    </figure>
  `;
}

/**
 * 4. WATERFALL CHART - Value Bridge
 */
export function waterfallChartHTML(components = [], currency = '$') {
  // [KT:SURGICAL:VBRIDGE-CURRENCY] default to dollars and format scale
  const cur = (currency && String(currency).trim()) || '$';
  // helper used for y-ticks and labels
  const fmt = (n) => `${cur}${Number(n || 0).toLocaleString()}`;
  // [KT:AUDIT:VALUE-BRIDGE] Logging received components and currency for auditability and debugging
  /* [KT:AUDIT:VALUE-BRIDGE] If the Value Bridge chart is missing or incorrect, check the components and currency below. This log is for auditability and debugging only. */
  console.log('[KT:AUDIT][waterfallChartHTML] components:', components, 'currency:', currency);
  // Unified summary row for value bridge (render only the main summary row, not the duplicate)
  function chartSummaryRowValueBridge({ components, currency }) {
    const firstVal = components && components.length ? components[0].value : 0;
    const lastVal = components && components.length ? components[components.length-1].value : 0;
    const change = lastVal - firstVal;
    const changePercent = firstVal !== 0 ? ((change / firstVal) * 100).toFixed(1) : 0;
    let trend = t('none');
    if (change > 0) trend = t('increasing');
    else if (change < 0) trend = t('decreasing');
    else if (change === 0) trend = t('stable');
    let icon = '✔️';
    if (trend === t('increasing')) icon = '📈';
    else if (trend === t('decreasing')) icon = '📉';
    else if (trend === t('stable') || trend === t('flat')) icon = '➡️';
    const maxVal = Math.max(...(components || []).map(c => c.value || 0));
    const avgVal = (components || []).reduce((a, c) => a + (c.value || 0), 0) / (components && components.length ? components.length : 1);
    // Render the main summary row (do NOT comment this out)
    // [KT:PATCH:VBRIDGE-SUMMARY] Improved summary wording for clarity
    // Old summary row:
    // <div class="chart-summary" style="font-size:16px; color:#FFFFFF; margin-bottom:8px;">
    //   <div><span style="font-weight:bold;">${t('Overall')}:</span> <span style="color:#fff;">${icon} ${t('Values show')} ${trend} ${t('trend from')} ${currency}${firstVal} ${t('to')} ${currency}${lastVal} (${changePercent > 0 ? '+' : ''}${changePercent}%).</span></div>
    //   <div><span style="font-weight:bold;">${t('Key Insights')}:</span> <span style="color:#fff;">${t('Peak value of')} ${currency}${maxVal} ${t('achieved. Average performance:')} ${currency}${Math.round(avgVal)}.</span></div>
    // </div>
    return `
      <div class="chart-summary" style="font-size:16px; color:#FFFFFF; margin-bottom:8px;">
        <div><span style="font-weight:bold;">${t('Overall')}:</span> <span style="color:#fff;">${icon} ${t('The chart shows a')} ${trend} ${t('trend from')} ${currency}${firstVal} ${t('to')} ${currency}${lastVal} (${changePercent > 0 ? '+' : ''}${changePercent}%).</span></div>
        <div><span style="font-weight:bold;">${t('Key Insights')}:</span> <span style="color:#fff;">${t('Peak value reached:')} ${currency}${maxVal}. ${t('Average:')} ${currency}${Math.round(avgVal)}.</span></div>
      </div>
    `;
  }

  // Dropdown for chart type
  const typeDropdown = `
    <label class="chart-type"><span>${t('Type')}:</span>
      <select class="chart-type-select" aria-label="${t('Chart type')}">
        <option value="line" selected>${t('Line')}</option>
        <option value="bar">${t('Bar')}</option>
        <option value="pie">${t('Pie')}</option>
        <option value="doughnut">${t('Doughnut')}</option>
      </select>
    </label>
  `;
  if (!components || components.length === 0) {
    components = [
      { name: 'Current State', value: 1000, type: 'total' },
      { name: 'Process Automation', value: 250, type: 'positive' },
      { name: 'Waste Reduction', value: 180, type: 'positive' },
      { name: 'Implementation Cost', value: -120, type: 'negative' },
      { name: 'Efficiency Gains', value: 340, type: 'positive' },
      { name: 'Quality Improvements', value: 150, type: 'positive' },
      { name: 'Target State', value: 1800, type: 'total' }
    ];
  }

  const w = 800, h = 500, p = 80;

  let runningTotal = 0;
  const bars = components.map((c, i) => {
    if (c.type === 'total') {
      // For totals (first and last), show the full column from 0
      if (i === 0) {
        runningTotal = c.value;
        return { ...c, start: 0, end: c.value, x: i };
      } else {
        // Last total should equal running total
        return { ...c, start: 0, end: runningTotal, value: runningTotal, x: i };
      }
    } else {
      // For positive/negative increments, show the change
      const start = runningTotal;
      const end = runningTotal + c.value;
      runningTotal = end;
      return { ...c, start, end, x: i };
    }
  });

  const maxValue = Math.max(...bars.map(b => Math.max(Math.abs(b.start), Math.abs(b.end))));
  const minValue = Math.min(...bars.map(b => Math.min(b.start, b.end)), 0);
  const range = maxValue - minValue;
  const barWidth = (w - 2*p) / components.length * 0.7;
  const spacing = (w - 2*p) / components.length;

  const yScale = (val) => h - p - ((val - minValue) / range) * (h - 2*p);

  const barElements = bars.map((bar, i) => {
    const x = p + i * spacing + (spacing - barWidth) / 2;
    const y1 = yScale(bar.start);
    const y2 = yScale(bar.end);
    const barHeight = Math.abs(y2 - y1);
    const y = Math.min(y1, y2);
    let color = '#10B981';
    if (bar.type === 'negative') color = '#EF4444';
    if (bar.type === 'total') color = '#3B82F6';
    const connector = i < bars.length - 1 ? 
      `<line x1="${x + barWidth}" y1="${y2}" x2="${x + spacing}" y2="${y2}" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-dasharray="4,4"/>` : '';
    // Make x-axis label larger and bolder
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" fill-opacity="0.8" stroke="${color}" stroke-width="2" rx="4"/>
      <text x="${x + barWidth/2}" y="${y - 10}" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="700">${fmt(Math.abs(bar.value))}</text>
      <text x="${x + barWidth/2}" y="${h - p + 32}" text-anchor="middle" fill="#FFFFFF" font-size="18" font-weight="700" transform="rotate(-45 ${x + barWidth/2} ${h - p + 32})">${esc(bar.name)}</text>
      ${connector}
    `;
  }).join('');

  const zeroY = yScale(0);
  const zeroLine = minValue < 0 ? `<line x1="${p}" y1="${zeroY}" x2="${w-p}" y2="${zeroY}" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-dasharray="2,2"/>` : '';

  // [KT:SURGICAL:VBRIDGE-AXES] add simple axes + ticks for analysis chart
  const yTicks = 5;
  const yMin = 0;
  const yMax = Math.max(...components.map(c => Number(c?.value||0)), 0) * 1.15 || 1;
  const plotH = h - 2*p, plotW = w - 2*p;
  const tick = (i) => {
    const val = yMin + (i * (yMax - yMin) / yTicks);
    const y = h - p - (i * plotH / yTicks);
    return `<line x1="${p}" y1="${y}" x2="${w-p}" y2="${y}" stroke="rgba(255,255,255,.15)"/>
            <text x="${p-8}" y="${y+4}" text-anchor="end" fill="#FFFFFF" font-size="11">${fmt(val)}</text>`;
  };
  const xLabels = components.map((c,i) => {
    const x = p + (i * (plotW / Math.max(components.length-1,1)));
    return `<text x="${x}" y="${h-p+18}" text-anchor="middle" fill="#FFFFFF" font-size="11"
            transform="rotate(-45 ${x} ${h-p+18})">${esc(c.name||`T${i+1}`)}</text>`;
  });
  const axes = `
    <line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" stroke="rgba(255,255,255,.5)" />
    <line x1="${p}" y1="${p}"   x2="${p}"   y2="${h-p}" stroke="rgba(255,255,255,.5)" />
    ${Array.from({length:yTicks+1},(_,i)=>tick(i)).join('')}
    ${xLabels.join('')}
  `;
  // --- SVGs for each chart type ---
  // LINE (default): Only show the line, no bars, when 'Line' is selected
  const lineSVG = `
    <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Value Bridge Analysis" style="display: block;">
      <rect width="${w}" height="${h}" fill="#000000" rx="12"/>
      ${axes}
      ${zeroLine}
      <polyline points="${bars.map((bar, i) => `${p + i * spacing + spacing/2},${yScale(bar.end)}`).join(' ')}" fill="none" stroke="#10B981" stroke-width="4"/>
    </svg>
  `;
  // Y Axis (values)
  const yTicksBar = 6;
  // [KT:PATCH:VBRIDGE-YAXIS] Increase Y-axis tick font size and bold for accessibility
  const yAxisTicks = Array.from({length: yTicksBar}, (_, i) => {
    const v = minValue + (range * (yTicksBar - 1 - i)) / (yTicksBar - 1);
    const y = yScale(v);
    // Old: font-size="13"
    // return `<text x="${p - 16}" y="${y + 4}" text-anchor="end" fill="#B6C2E2" font-size="13">${fmt(v)}</text>`;
    return `<text x="${p - 16}" y="${y + 4}" text-anchor="end" fill="#B6C2E2" font-size="16" font-weight="bold">${fmt(v)}</text>`;
  }).join('');
  // Y Axis line
  const yAxisLine = `<line x1="${p - 8}" y1="${p}" x2="${p - 8}" y2="${h - p}" stroke="#B6C2E2" stroke-width="2"/>`;
  // Y Axis label
  const yAxisLabel = `<text x="${p - 48}" y="${(h) / 2}" text-anchor="middle" fill="#B6C2E2" font-size="15" transform="rotate(-90 ${p - 48},${(h) / 2})">${cur} Value</text>`;
  // X Axis label
  const xAxisLabel = `<text x="${w / 2}" y="${h - p + 70}" text-anchor="middle" fill="#B6C2E2" font-size="15">Component</text>`;
  // BAR
  const barSVG = `
    <svg class="plot bar" width="${w}" height="${h + 80}" viewBox="0 0 ${w} ${h + 80}" role="img" aria-label="Value Bridge Analysis" style="display: none;">
      <rect width="${w}" height="${h}" fill="#000000" rx="12"/>
      ${zeroLine}
      ${yAxisLine}
      ${yAxisTicks}
      ${yAxisLabel}
      ${barElements}
      ${xAxisLabel}
    </svg>
  `;
  // PIE (dummy data for illustration)
  const pieSVG = `
    <svg class="plot pie" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Value Bridge Analysis" style="display: none;">
      <rect width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
      ${(() => {
        const cx = w/2, cy = h/2, R = Math.min(w, h) * 0.35;
        let a0 = -Math.PI/2;
        const vals = components.map(c => Math.abs(c.value));
        const sum = vals.reduce((a, b) => a + b, 0) || 1;
        return vals.map((v, i) => {
          const a1 = a0 + 2 * Math.PI * (v / sum);
          const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
          const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
          const large = (a1 - a0) > Math.PI ? 1 : 0;
          const col = `hsl(${30 + (i * 18) % 160},80%,60%)`;
          const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
          a0 = a1;
          return `<path d="${d}" fill="${col}"/>`;
        }).join('');
      })()}
    </svg>
  `;
  // DOUGHNUT (dummy data for illustration)
  const doughnutSVG = `
    <svg class="plot doughnut" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Value Bridge Analysis" style="display: none;">
      <rect width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
      ${(() => {
        const cx = w/2, cy = h/2, R = Math.min(w, h) * 0.35;
        let a0 = -Math.PI/2;
        const vals = components.map(c => Math.abs(c.value));
        const sum = vals.reduce((a, b) => a + b, 0) || 1;
        const slices = vals.map((v, i) => {
          const a1 = a0 + 2 * Math.PI * (v / sum);
          const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
          const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
          const large = (a1 - a0) > Math.PI ? 1 : 0;
          const col = `hsl(${30 + (i * 18) % 160},80%,60%)`;
          const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
          a0 = a1;
          return `<path d="${d}" fill="${col}"/>`;
        }).join('');
        return `${slices}<circle cx="${w/2}" cy="${h/2}" r="${(Math.min(w, h) * 0.35 * 0.55).toFixed(1)}" fill="#000000" stroke="#FFFFFF" />`;
      })()}
    </svg>
  `;

  return `
    <figure class="chart-card waterfall-card" data-type="line" data-widget="series">
      ${chartSummaryRowValueBridge({ components, currency })}
      <header class="chart-head">
        <h3 class="chart-title">${t('Value Bridge Analysis Graph')}</h3>
        ${typeDropdown}
      </header>
      <div class="canvas-wrap">
        ${lineSVG}
        ${barSVG}
        ${pieSVG}
        ${doughnutSVG}
      </div>
      <!-- [KT:SURGICAL:INLINE-SCRIPT-DISABLED]
           The old per-card debug script caused comment leakage and CSS parse errors.
           We rely on the single injected TYPE_SWITCH_SCRIPT from the template. -->
      <p class="chart-note">${t('Waterfall chart showing value creation from current state')} (${fmt(components[0]?.value || 0)}) ${t('to target state')} (${fmt(components[components.length-1]?.value || 0)}) ${t('with key value drivers.')}</p>
    </figure>
  `;
}

/**
 * 5. EXECUTIVE SUMMARY INFOGRAPHIC
 */
export function executiveSummaryInfographicHTML(summary = {}) {
  const {
    roi = '267%',
    payback = '8 months',
    savings = '$2.4M',
    timeline = '18 months',
    confidence = '92%',
    impact = 'High',
    quickWins = 3,
    phases = 4
  } = summary;

  return `
    <div class="executive-infographic" style="background: linear-gradient(135deg, #0B1A3D 0%, #1e3a5f 100%); padding: 2rem 1.5rem; border-radius: 16px; margin: 2rem 0; max-width: 100%; box-sizing: border-box;">
      <h2 style="text-align: center; color: #10B981; font-size: 2rem; margin-bottom: 2rem; font-weight: 700;">${t('Executive Summary at a Glance')}</h2>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; max-width: 100%;">
        <div style="background: rgba(16,185,129,0.1); border: 2px solid #10B981; border-radius: 8px; padding: 1.25rem 1rem; text-align: center;">
          <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">${t('Projected ROI')}</div>
          <div style="font-size: 2.5rem; color: #10B981; font-weight: 700; font-family: Georgia, serif; line-height: 1;">${esc(roi)}</div>
        </div>
        <div style="background: rgba(59,130,246,0.1); border: 2px solid #3B82F6; border-radius: 8px; padding: 1.25rem 1rem; text-align: center;">
          <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">${t('Payback Period')}</div>
          <div style="font-size: 2.5rem; color: #3B82F6; font-weight: 700; font-family: Georgia, serif; line-height: 1;">${esc(payback)}</div>
        </div>
        <div style="background: rgba(245,158,11,0.1); border: 2px solid #F59E0B; border-radius: 8px; padding: 1.25rem 1rem; text-align: center;">
          <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">${t('Annual Savings')}</div>
          <div style="font-size: 2.5rem; color: #F59E0B; font-weight: 700; font-family: Georgia, serif; line-height: 1;">${esc(savings)}</div>
        </div>
      </div>

      <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 1.5rem 1rem; margin-bottom: 1.5rem;">
        <h3 style="color: #FFFFFF; font-size: 1.2rem; margin-bottom: 1rem; text-align: center;">${t('Implementation Approach')}</h3>
        <div style="display: flex; justify-content: space-between; align-items: center; max-width: 100%;">
          <div style="flex: 1; text-align: center; min-width: 0;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: #3B82F6; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #FFFFFF; font-weight: 700;">1</div>
            <div style="color: #FFFFFF; font-size: 0.75rem; font-weight: 600;">${t('Discovery')}</div>
            <div style="color: rgba(255,255,255,0.6); font-size: 0.95rem; margin-top: 0.5rem;">4 ${t('weeks')}</div>
          </div>
          <div style="flex: 0 0 30px; text-align: center;">
            <svg width="30" height="16" viewBox="0 0 30 16">
              <path d="M 0 8 L 25 8 M 20 4 L 25 8 L 20 12" stroke="#10B981" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div style="flex: 1; text-align: center; min-width: 0;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: #10B981; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #FFFFFF; font-weight: 700;">2</div>
            <div style="color: #FFFFFF; font-size: 0.75rem; font-weight: 600;">${t('Design')}</div>
            <div style="color: rgba(255,255,255,0.6); font-size: 0.95rem; margin-top: 0.25rem;">4 ${t('weeks')}</div>
          </div>
          <div style="flex: 0 0 30px; text-align: center;">
            <svg width="30" height="16" viewBox="0 0 30 16">
              <path d="M 0 8 L 25 8 M 20 4 L 25 8 L 20 12" stroke="#10B981" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div style="flex: 1; text-align: center; min-width: 0;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: #F59E0B; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #FFFFFF; font-weight: 700;">3</div>
            <div style="color: #FFFFFF; font-size: 0.75rem; font-weight: 600;">${t('Pilot')}</div>
            <div style="color: rgba(255,255,255,0.6); font-size: 0.95rem; margin-top: 0.25rem;">4 ${t('weeks')}</div>
          </div>
          <div style="flex: 0 0 30px; text-align: center;">
            <svg width="30" height="16" viewBox="0 0 30 16">
              <path d="M 0 8 L 25 8 M 20 4 L 25 8 L 20 12" stroke="#10B981" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div style="flex: 1; text-align: center; min-width: 0;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: #10B981; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #FFFFFF; font-weight: 700;">4</div>
            <div style="color: #FFFFFF; font-size: 0.75rem; font-weight: 600;">${t('Scale')}</div>
            <div style="color: rgba(255,255,255,0.6); font-size: 0.95rem; margin-top: 0.25rem;">12 ${t('weeks')}</div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; max-width: 100%;">
        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="font-size: 2rem; color: #10B981; font-weight: 700; line-height: 1;">${quickWins}</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin-top: 0.5rem;">${t('Quick Wins')}</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="font-size: 2rem; color: #3B82F6; font-weight: 700; line-height: 1;">${phases}</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin-top: 0.5rem;">${t('Phases')}</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="font-size: 2rem; color: #F59E0B; font-weight: 700; line-height: 1;">${esc(timeline)}</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin-top: 0.5rem;">${t('Timeline')}</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="font-size: 2rem; color: #10B981; font-weight: 700; line-height: 1;">${esc(confidence)}</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin-top: 0.5rem;">${t('Confidence')}</div>
        </div>
      </div>
    </div>
  `;
}
