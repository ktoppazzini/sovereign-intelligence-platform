/* ===========================================================
   [KT:WORLD-CLASS-VISUALS] Nov 7, 2025
   5 McKinsey-beating visualizations for world-class reports
   - Visual Timeline/Swimlane Roadmap
   - Radar Chart (Competitive Positioning)
   - Risk Heatmap (Risk Matrix)
   - Waterfall Chart (Value Bridge)
   - Executive Summary Infographic
   ========================================================== */

// [KT:TRANSLATION-FIX-v3.0.0] 2025-12-08
// Central translator used by all visuals. Caller wires it to the main
// report translation system (e.g., GPT / /api/gptTranslation).
let _translator = (s) => s;

console.log('🎨 [WORLDCLASS-VISUALS] v3.0.0 loaded - Translation-ready');

// [KT:SAFE-L:DUAL-MODE]
let L = (typeof window !== "undefined" && window.L) ? window.L : {};

// If L is not already a function, wrap the labels map in a callable fn
if (typeof L !== "function") {
  const labels = (L && typeof L === "object") ? L : {};
  const fn = (key) => {
    if (!key) return "";
    return labels[key] || key;
  };
  // Preserve object-style access like L.overall, L.keyInsights, etc.
  Object.assign(fn, labels);
  L = fn;
}

export function setWorldClassVisualsTranslator(fn) {
  if (typeof fn === "function") {
    _translator = fn;
    console.log('✅ [WORLDCLASS-VISUALS-v3.0] Translator function activated');
    // Test translation
    const testPhrase = _translator('Discovery');
    console.log('🔍 [TRANSLATOR-TEST]', { input: 'Discovery', output: testPhrase, isTranslated: testPhrase !== 'Discovery' });
  }
}

const t = (s) => _translator(s);

const esc = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ======================================================================
 * 1. VISUAL TIMELINE / SWIMLANE ROADMAP
 * Shows implementation phases with milestones, deliverables, dependencies
 * ==================================================================== */
export function visualTimelineHTML(phases = []) {
  if (!phases || phases.length === 0) {
    phases = [
      {
        name: "Discovery",
        startWeek: 0,
        endWeek: 4,
        color: "#3B82F6",
        milestones: [
          { week: 2, title: "Baseline" },
          { week: 4, title: "Analysis Complete" },
        ],
        deliverables: ["Current State", "Gap Analysis"],
      },
      {
        name: "Design",
        startWeek: 4,
        endWeek: 8,
        color: "#10B981",
        milestones: [
          { week: 6, title: "Blueprint" },
          { week: 8, title: "Sign-off" },
        ],
        deliverables: ["Target Operating Model", "Implementation Plan"],
      },
      {
        name: "Pilot",
        startWeek: 8,
        endWeek: 12,
        color: "#F59E0B",
        milestones: [
          { week: 10, title: "Launch" },
          { week: 12, title: "Review" },
        ],
        deliverables: ["Pilot Results", "Lessons Learned"],
      },
      {
        name: "Scale",
        startWeek: 12,
        endWeek: 24,
        color: "#10B981",
        milestones: [
          { week: 16, title: "Phase 1" },
          { week: 20, title: "Phase 2" },
          { week: 24, title: "Full Rollout" },
        ],
        deliverables: ["Training Complete", "Go-Live", "Benefits Tracking"],
      },
    ];
  }

  const totalWeeks = Math.max(...phases.map((p) => p.endWeek || 24));
  const w = 960;
  const h = 400;
  const p = 60;
  const laneHeight = (h - 2 * p) / phases.length;
  const weekWidth = (w - 2 * p) / totalWeeks;

  // Phases rendered as “Phase X – [Name]” plus colored bar & milestones
  const lanes = phases
    .map((phase, i) => {
      const y = p + i * laneHeight;
      const x1 = p + phase.startWeek * weekWidth;
      const x2 = p + phase.endWeek * weekWidth;
      const phaseWidth = x2 - x1;
      const isScale = /scale/i.test(phase.name);
      const labelFontSize = isScale ? 24 : 16;

      const phaseLabel = `<text x="${
        x1 + phaseWidth / 2
      }" y="${y + laneHeight * 0.18}" text-anchor="middle" fill="#FF3333" font-size="15" font-weight="bold">${t(
        "Phase"
      )} ${i + 1} - ${esc(t(phase.name))}</text>`;

      const label = `<text x="${
        x1 + phaseWidth / 2
      }" y="${y + laneHeight * 0.5}" text-anchor="middle" fill="#FFFFFF" font-size="${labelFontSize}" font-weight="700">${esc(
        t(phase.name)
      )}</text>`;

      const bar = `<rect x="${x1}" y="${y + laneHeight * 0.2}" width="${phaseWidth}" height="${
        laneHeight * 0.6
      }" fill="${phase.color}" fill-opacity="0.3" stroke="${
        phase.color
      }" stroke-width="2" rx="8"/>`;

      const milestones = (phase.milestones || [])
        .map((m) => {
          const mx = p + m.week * weekWidth;
          const my = y + laneHeight * 0.5;
          const diamond = `<path d="M ${mx},${my - 12} L ${
            mx + 10
          },${my} L ${mx},${my + 12} L ${
            mx - 10
          },${my} Z" fill="${phase.color}" stroke="#FFFFFF" stroke-width="2"/>`;
          const mlabel = `<text x="${mx}" y="${
            my - 20
          }" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="600">${esc(
            t(m.title)
          )}</text>`;
          return diamond + mlabel;
        })
        .join("");

      return bar + phaseLabel + label + milestones;
    })
    .join("");

  const timeAxis = Array.from(
    { length: Math.ceil(totalWeeks / 4) + 1 },
    (_, i) => i * 4
  )
    .map((week) => {
      const x = p + week * weekWidth;
      return `<line x1="${x}" y1="${p}" x2="${x}" y2="${h - p}" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4,4"/>
              <text x="${x}" y="${p - 10}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="12">${t(
                "Week"
              )} ${week}</text>`;
    })
    .join("");

  const separators = phases
    .map((_, i) => {
      if (i === 0) return "";
      const y = p + i * laneHeight;
      return `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    })
    .join("");

  return `
    <figure class="chart-card timeline-card">
      <header class="chart-head">
        <h3 class="chart-title">${t("Implementation Roadmap")}</h3>
      </header>
      <div class="canvas-wrap">
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background:#000000; border-radius:12px;">
          <rect width="${w}" height="${h}" fill="#000000" rx="12"/>
          ${timeAxis}
          ${separators}
          ${lanes}
        </svg>
      </div>
      <p class="chart-note">${t(
        "Visual timeline showing implementation phases, key milestones, and deliverables across"
      )} ${totalWeeks} ${t("-week transformation program.")}</p>
    </figure>
  `;
}

// Top Insights header (used above current-state visuals)
export function topInsightsHeaderHTML() {
  // [KT:SURGICAL:TOP-INSIGHTS-I18N]
  // Use translator for clean dynamic translation
  const overallLabel = t('Overall');
  const keyInsightsLabel = t('Key Insights');

  return `
    <div class="top-insights-header" style="text-align:left; padding: 8px 12px; font-family: 'Merriweather', 'Georgia', serif; font-weight:700; color:#fff;">
      <span style="background:#FF8C00; color:#000; padding:4px 8px; border-radius:4px; font-size:14px;">${overallLabel}</span>
      <span style="margin-left:8px; font-size:14px; color:#fff;">&amp; ${keyInsightsLabel}</span>
    </div>
  `;
}

/* ===========================================================
 * 2. RADAR CHART - Competitive Positioning
 * ========================================================= */
export function radarChartHTML(dimensions = []) {
  if (!dimensions || dimensions.length === 0) {
    // [KT:I18N:RADAR-DEFAULTS] All default dimension names will be translated via t()
    dimensions = [
      { name: t("Efficiency"), company: 72, benchmark: 85, max: 100 },
      { name: t("Quality"), company: 88, benchmark: 92, max: 100 },
      { name: t("Speed"), company: 65, benchmark: 90, max: 100 },
      { name: t("Innovation"), company: 70, benchmark: 80, max: 100 },
      { name: t("Cost"), company: 60, benchmark: 75, max: 100 },
      { name: t("Customer Sat"), company: 82, benchmark: 88, max: 100 },
    ];
  }

  const w = 500;
  const h = 500;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.35;
  const n = dimensions.length;
  const angleStep = (2 * Math.PI) / n;

  const companyPoints = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.company / d.max) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const benchmarkPoints = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.benchmark / d.max) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const companyPath =
    companyPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";

  const benchmarkPath =
    benchmarkPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";

  const gridCircles = [0.25, 0.5, 0.75, 1]
    .map(
      (factor) =>
        `<circle cx="${cx}" cy="${cy}" r="${
          radius * factor
        }" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`
    )
    .join("");

  const axes = dimensions
    .map((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x2 = cx + radius * 1.15 * Math.cos(angle);
      const y2 = cy + radius * 1.15 * Math.sin(angle);
      const labelX = cx + radius * 1.35 * Math.cos(angle);
      const labelY = cy + radius * 1.35 * Math.sin(angle);

      return `
        <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        <text x="${labelX}" y="${labelY}" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="600">${esc(
          t(d.name)
        )}</text>
      `;
    })
    .join("");

  return `
    <figure class="chart-card radar-card">
      <header class="chart-head">
        <h3 class="chart-title">${t("Competitive Positioning Analysis")}</h3>
      </header>
      <div class="canvas-wrap">
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background:#000000; border-radius:12px;">
          <rect width="${w}" height="${h}" fill="#000000" rx="12"/>
          ${gridCircles}
          ${axes}
          <path d="${benchmarkPath}" fill="#3B82F6" fill-opacity="0.2" stroke="#3B82F6" stroke-width="2"/>
          <path d="${companyPath}" fill="#10B981" fill-opacity="0.3" stroke="#10B981" stroke-width="3"/>
          <circle cx="${w - 80}" cy="30" r="8" fill="#10B981"/>
          <text x="${w - 65}" y="35" fill="#FFFFFF" font-size="12">${t("Company")}</text>
          <circle cx="${w - 80}" cy="50" r="8" fill="#3B82F6"/>
          <text x="${w - 65}" y="55" fill="#FFFFFF" font-size="12">${t("Benchmark")}</text>
        </svg>
      </div>
      <p class="chart-note">${t(
        "Multi-dimensional competitive analysis across"
      )} ${n} ${t(
    "key performance dimensions. Green area shows current state; blue shows industry benchmark."
  )}</p>
    </figure>
  `;
}

/* ===========================================================
 * 3. RISK HEATMAP - Risk Matrix
 * ========================================================= */
export function riskHeatmapHTML(risks = []) {
  // [KT:AUDIT:RISK-MATRIX]
  console.log("[KT:AUDIT][riskHeatmapHTML] risks:", risks);

  function chartSummaryRowRisk({ risks }) {
    // Deduplicate by name
    const uniqueRisks = [];
    const seen = new Set();
    for (const r of risks) {
      if (!seen.has(r.name)) {
        uniqueRisks.push(r);
        seen.add(r.name);
      }
    }

    // Note: Risk names and descriptions are data values (not translation keys)
    // so we do NOT attempt to translate them via t(). They come from the API
    // and are already in the appropriate language context from the canon data.

    const topRisk =
      uniqueRisks && uniqueRisks.length ? uniqueRisks[0].name : t("N/A");
    const topDesc =
      uniqueRisks && uniqueRisks.length
        ? uniqueRisks[0].description || t("No description provided.")
        : "";

    return `
      <div class="chart-summary" style="font-size:16px; color:#FFFFFF; margin-bottom:8px;">
        <div>
          <span style="font-weight:bold;">${t('Overall')}:</span>
          <span style="color:#fff;">${t(
            "Risk levels are distributed across the matrix, highlighting areas of concern."
          )}</span>
        </div>
        <div>
          <span style="font-weight:bold;">${t('Key Insights')}:</span>
          <span style="color:#fff;">${t("Top risk")}: ${esc(
            topRisk
          )}. ${esc(topDesc)}</span>
        </div>
      </div>
    `;
  }

  if (!risks || risks.length === 0) {
    // [KT:RISK-FALLBACK-TRANSLATION] Use t() function to translate all fallback risk labels
    risks = [
      {
        name: t("Resource Availability"),
        severity: 4,
        likelihood: 3,
        description: t(
          "Limited access to key resources may delay project milestones."
        ),
      },
      {
        name: t("Vendor Delays"),
        severity: 3,
        likelihood: 4,
        description: t(
          "External vendors may not deliver on time, impacting schedules."
        ),
      },
      {
        name: t("Budget Overrun"),
        severity: 5,
        likelihood: 2,
        description: t(
          "Costs may exceed initial estimates due to unforeseen issues."
        ),
      },
      {
        name: t("Stakeholder Resistance"),
        severity: 4,
        likelihood: 4,
        description: t(
          "Key stakeholders may resist changes, slowing adoption."
        ),
      },
      {
        name: t("Technical Complexity"),
        severity: 3,
        likelihood: 3,
        description: t(
          "Complex technical requirements may introduce implementation risk."
        ),
      },
      {
        name: t("Timeline Slippage"),
        severity: 4,
        likelihood: 3,
        description: t("Project phases may take longer than planned."),
      },
    ];
    
    // [KT:RISK-FALLBACK-DIAGNOSTIC] Log when fallback risks are used with translations
    console.log('[KT:RISK-FALLBACK-DIAGNOSTIC]', {
      reason: 'No risks provided, using translated fallback risks',
      count: risks.length,
      translated_names: risks.map(r => r.name),
      lang: typeof t === 'function' ? 'active' : 'fallback'
    });
  } else {
    // [KT:RISK-REAL-DATA-DIAGNOSTIC] Log actual risks received
    console.log('[KT:RISK-REAL-DATA-DIAGNOSTIC]', {
      reason: 'Real risks data received and will be used',
      count: risks.length,
      risk_names: risks.map(r => r.name),
      risk_ids: risks.map(r => r.id),
      first_risk: risks[0] || null
    });
  }

  // Deduplicate and translate
  const uniqueRisks = [];
  const seen = new Set();
  for (const r of risks) {
    if (!seen.has(r.name)) {
      uniqueRisks.push(r);
      seen.add(r.name);
    }
  }

  // Translate risk names and descriptions (for rendering bubbles and legend)
  if (typeof t === "function") {
    uniqueRisks.forEach((r) => {
      try {
        r.name = t(r.name || "");
        r.description = r.description
          ? t(r.description)
          : t("noDescriptionProvided");
      } catch (e) {
        console.log(
          "[KT:I18N-RISK] translation.error.render",
          String(e?.message || e)
        );
      }
    });
  }

  const w = 600;
  const h = 600;
  const p = 120; // [KT:TASK-4-FIX] Increased from 80 to 120 to accommodate longer Y-axis labels (French translations)
  const cellSize = (Math.min(w, h) - 2 * p) / 5;

  const getRiskColor = (sev, lik) => {
    const score = sev * lik;
    if (score >= 20) return "#EF4444";
    if (score >= 15) return "#F59E0B";
    if (score >= 10) return "#F59E0B";
    if (score >= 6) return "#10B981";
    return "#3B82F6";
  };

  const cells = [];
  for (let sev = 1; sev <= 5; sev++) {
    for (let lik = 1; lik <= 5; lik++) {
      const x = p + (lik - 1) * cellSize;
      const y = h - p - sev * cellSize;
      const color = getRiskColor(sev, lik);
      cells.push(
        `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" fill-opacity="0.15" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>`
      );
    }
  }

  const riskBubbles = uniqueRisks
    .map((r, i) => {
      const x = p + (r.likelihood - 0.5) * cellSize;
      const y = h - p - (r.severity - 0.5) * cellSize;
      const color = getRiskColor(r.severity, r.likelihood);
      return `
        <circle cx="${x}" cy="${y}" r="20" fill="${color}" fill-opacity="0.7" stroke="#FFFFFF" stroke-width="2"/>
        <text x="${x}" y="${y}" text-anchor="middle" fill="#FFFFFF" font-size="10" font-weight="700" dy="4">${t(
          String(i + 1)
        )}</text>
      `;
    })
    .join("");

  const xLabels = [
    "",
    "rare",
    "unlikely",
    "possible",
    "likely",
    "almostCertain",
  ]
    .map((label, i) => {
      if (i === 0) return "";
      const x = p + (i - 0.5) * cellSize;
      return `<text x="${x}" y="${
        h - p + 30
      }" text-anchor="middle" fill="#FFFFFF" font-size="12">${t(
        label
      )}</text>`;
    })
    .join("");

  const yLabels = ["", "negligible", "minor", "moderate", "major", "critical"]
    .map((label, i) => {
      if (i === 0) return "";
      const y = h - p - (i - 0.5) * cellSize;
      // [KT:TASK-4-FIX] Adjusted x position and font size for better Y-axis label visibility with translations
      return `<text x="${p - 20}" y="${y}" text-anchor="end" fill="#FFFFFF" font-size="11" dy="4">${t(
        label
      )}</text>`;
    })
    .join("");

  // [KT:RISK-RENDERING-DIAGNOSTIC] Log unique risks being rendered in legend and bubbles
  console.log('[KT:RISK-RENDERING-DIAGNOSTIC]', {
    total_unique_risks: uniqueRisks.length,
    risks_to_render: uniqueRisks.map(r => ({
      id: r.id,
      name: r.name,
      severity: r.severity,
      likelihood: r.likelihood,
      description: r.description ? r.description.substring(0, 50) + '...' : 'N/A'
    })),
    first_risk_being_rendered: uniqueRisks[0] || 'NONE'
  });

  const legend = uniqueRisks
    .map(
      (r, i) =>
        `<text x="20" y="${
          20 + i * 20
        }" fill="#FFFFFF" font-size="11">${t(String(i + 1))}. ${esc(
          r.name
        )}</text>`
    )
    .join("");

  const riskList = `
    <div class="risk-list" style="margin-top:16px; color:#fff;">
      <strong>${t("risks")}:</strong>
      <ol style="margin:8px 0 0 20px; padding:0;">
        ${uniqueRisks
          .map(
            (r) =>
              `<li style="margin-bottom:4px;"><span style="font-weight:bold;">${esc(
                r.name
              )}</span>: ${
                r.description
                  ? esc(r.description)
                  : t("noDescriptionProvided")
              }</li>`
          )
          .join("")}
      </ol>
    </div>
  `;
  // [KT:SURGICAL:I18N-RISK-LABELS] Use t() for proper translation
  const translatedOverall = t('Overall');
  const translatedKeyInsights = t('Key Insights');



  return `
    <figure class="chart-card risk-heatmap-card">
      ${chartSummaryRowRisk({ risks })}
      <header class="chart-head">
        <h3 class="chart-title">${t("riskAssessmentMatrix")}</h3>
      </header>
      <div class="canvas-wrap">
        <svg width="${w + 40}" height="${h + 100}" viewBox="-40 0 ${w + 40} ${
    h + 100
  }" style="background:#000000; border-radius:12px;">
          <rect width="${w + 40}" height="${h + 100}" fill="#000000" rx="12"/>
          <text x="${w / 2}" y="${
    h - 20
  }" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="14" font-weight="600">${t(
    "likelihood"
  )} →</text>
          <text x="25" y="${h / 2}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="14" font-weight="600" transform="rotate(-90 25 ${
    h / 2
  })">← ${t("severity")}</text>
          ${cells.join("")}
          ${riskBubbles}
          ${xLabels}
          ${yLabels}
        </svg>
      </div>
      ${riskList}
      <p class="chart-note">
        ${t("riskHeatmapVisualizes")} ${uniqueRisks.length} ${t(
    "identifiedRisksBySeverity"
  )}
        <span style="font-weight:bold;">${t("colorLegend")}</span>
        <span style="color:#EF4444;">${t("redCritical")}</span>,
        <span style="color:#F59E0B;">${t("orangeHigh")}</span>,
        <span style="color:#10B981;">${t("greenMedium")}</span>,
        <span style="color:#3B82F6;">${t("blueLow")}</span>.
      </p>
    </figure>
  `;
}

/* ===========================================================
 * 4. WATERFALL CHART - Value Bridge
 * ========================================================= */
export function waterfallChartHTML(components = [], currency = "$") {
  const cur = (currency && String(currency).trim()) || "$";
  const fmt = (n) => `${cur}${Number(n || 0).toLocaleString()}`;

  console.log('\n' + '💧'.repeat(40));
  console.log('💧 [WATERFALL-CHART-v3.0] Generating value bridge');
  console.log(
    "[KT:AUDIT][waterfallChartHTML] components:",
    components,
    "currency:",
    currency
  );
  console.log('🔤 [WATERFALL-TRANSLATION]', {
    Type: t('Type'),
    Waterfall: t('Waterfall'),
    Component: t('Component'),
    Value: t('Value')
  });
  console.log('💧'.repeat(40) + '\n');

  function chartSummaryRowValueBridge({ components, currency }) {
    const firstVal = components && components.length ? components[0].value : 0;
    const lastVal =
      components && components.length
        ? components[components.length - 1].value
        : 0;
    const change = lastVal - firstVal;
    const changePercent =
      firstVal !== 0 ? ((change / firstVal) * 100).toFixed(1) : 0;

    // Logic key for trend; translation applied separately.
    let trendKey = "none";
    if (change > 0) trendKey = "increasing";
    else if (change < 0) trendKey = "decreasing";
    else trendKey = "stable";

    const trend = t(trendKey);
    let icon = "✔️";
    if (trendKey === "increasing") icon = "📈";
    else if (trendKey === "decreasing") icon = "📉";
    else if (trendKey === "stable") icon = "➡️";

    const maxVal = Math.max(...(components || []).map((c) => c.value || 0));
    const avgVal =
      (components || []).reduce((a, c) => a + (c.value || 0), 0) /
      (components && components.length ? components.length : 1);

    return `
      <div class="chart-summary" style="font-size:16px; color:#FFFFFF; margin-bottom:8px;">
        <div>
         <span style="font-weight:bold;">${t('Overall')}:</span>
          <span style="color:#fff;">
            ${icon}
            ${t("The chart shows a")} ${trend} ${t("trend from")} ${fmt(
      firstVal
    )} ${t("to")} ${fmt(lastVal)} (${
      changePercent > 0 ? "+" : ""
    }${changePercent}%).
          </span>
        </div>
        <div>
          <span style="font-weight:bold;">${t('Key Insights')}:</span>
          <span style="color:#fff;">
            ${t("Peak value reached")}: ${fmt(maxVal)}.
            ${t("Average")}: ${fmt(Math.round(avgVal))}.
          </span>
        </div>
      </div>
    `;
  }

  // Chart type dropdown (translated)
  const typeDropdown = `
    <label class="chart-type"><span>${t("Type")}:</span>
      <select class="chart-type-select" aria-label="${t("Chart type")}">
        <option value="line" selected>${t("Line")}</option>
        <option value="bar">${t("Bar")}</option>
        <option value="pie">${t("Pie")}</option>
        <option value="doughnut">${t("Doughnut")}</option>
      </select>
    </label>
  `;

  if (!components || components.length === 0) {
    components = [
      { name: "Current State", value: 1000, type: "total" },
      { name: "Process Automation", value: 250, type: "positive" },
      { name: "Waste Reduction", value: 180, type: "positive" },
      { name: "Implementation Cost", value: -120, type: "negative" },
      { name: "Efficiency Gains", value: 340, type: "positive" },
      { name: "Quality Improvements", value: 150, type: "positive" },
      { name: "Target State", value: 1800, type: "total" },
    ];
  }

  const w = 800;
  const h = 500;
  const p = 80;

  let runningTotal = 0;
  const bars = components.map((c, i) => {
    if (c.type === "total") {
      if (i === 0) {
        runningTotal = c.value;
        return { ...c, start: 0, end: c.value, x: i };
      } else {
        return {
          ...c,
          start: 0,
          end: runningTotal,
          value: runningTotal,
          x: i,
        };
      }
    } else {
      const start = runningTotal;
      const end = runningTotal + c.value;
      runningTotal = end;
      return { ...c, start, end, x: i };
    }
  });

  const maxValue = Math.max(
    ...bars.map((b) => Math.max(Math.abs(b.start), Math.abs(b.end)))
  );
  const minValue = Math.min(
    ...bars.map((b) => Math.min(b.start, b.end)),
    0
  );
  const range = maxValue - minValue;
  const barWidth = ((w - 2 * p) / components.length) * 0.7;
  const spacing = (w - 2 * p) / components.length;

  const yScale = (val) =>
    h - p - ((val - minValue) / range) * (h - 2 * p || 1);

  const barElements = bars
    .map((bar, i) => {
      const x = p + i * spacing + (spacing - barWidth) / 2;
      const y1 = yScale(bar.start);
      const y2 = yScale(bar.end);
      const barHeight = Math.abs(y2 - y1);
      const y = Math.min(y1, y2);

      let color = "#10B981";
      if (bar.type === "negative") color = "#EF4444";
      if (bar.type === "total") color = "#3B82F6";

      const connector =
        i < bars.length - 1
          ? `<line x1="${x + barWidth}" y1="${y2}" x2="${
              x + spacing
            }" y2="${y2}" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-dasharray="4,4"/>`
          : "";

      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" fill-opacity="0.8" stroke="${color}" stroke-width="2" rx="4"/>
        <text x="${x + barWidth / 2}" y="${
        y - 10
      }" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="700">${fmt(
        Math.abs(bar.value)
      )}</text>
        <text x="${x + barWidth / 2}" y="${
        h - p + 32
      }" text-anchor="middle" fill="#FFFFFF" font-size="20" font-weight="700" transform="rotate(-45 ${
        x + barWidth / 2
      } ${h - p + 32})">${esc(t(bar.name))}</text>
        ${connector}
      `;
    })
    .join("");

  const zeroY = yScale(0);
  const zeroLine =
    minValue < 0
      ? `<line x1="${p}" y1="${zeroY}" x2="${w - p}" y2="${zeroY}" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-dasharray="2,2"/>`
      : "";

  // Simple axis grid for the line view
  const yTicks = 5;
  const yMin = 0;
  const yMax =
    Math.max(...components.map((c) => Number(c?.value || 0)), 0) * 1.15 || 1;
  const plotH = h - 2 * p;
  const plotW = w - 2 * p;

  const tick = (i) => {
    const val = yMin + (i * (yMax - yMin)) / yTicks;
    const y = h - p - (i * plotH) / yTicks;
    return `<line x1="${p}" y1="${y}" x2="${
      w - p
    }" y2="${y}" stroke="rgba(255,255,255,.15)"/>
            <text x="${p - 8}" y="${y + 4}" text-anchor="end" fill="#FFFFFF" font-size="11">${fmt(
              val
            )}</text>`;
  };

  const xLabels = components.map((c, i) => {
    const x = p + (i * (plotW / Math.max(components.length - 1, 1)));
    return `<text x="${x}" y="${h - p + 8}" text-anchor="middle" fill="#FFFFFF" font-size="11" transform="rotate(-45 ${x} ${
      h - p + 8
    })">${esc(t(c.name || `T${i + 1}`))}</text>`;
  });

  const axes = `
    <line x1="${p}" y1="${h - p}" x2="${
    w - p
  }" y2="${h - p}" stroke="rgba(255,255,255,.5)" />
    <line x1="${p}" y1="${p}"   x2="${p}"   y2="${h - p}" stroke="rgba(255,255,255,.5)" />
    ${Array.from({ length: yTicks + 1 }, (_, i) => tick(i)).join("")}
    ${xLabels.join("")}
  `;

  const lineSVG = `
    <svg class="plot line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${t(
      "Value Bridge Analysis"
    )}" style="display: block;">
      <rect width="${w}" height="${h}" fill="#000000" rx="12"/>
      ${axes}
      ${zeroLine}
      <polyline points="${bars
        .map(
          (bar, i) =>
            `${p + i * spacing + spacing / 2},${yScale(bar.end)}`
        )
        .join(" ")}" fill="none" stroke="#10B981" stroke-width="4"/>
    </svg>
  `;

  // BAR view axes
  const yTicksBar = 6;
  const yAxisTicks = Array.from({ length: yTicksBar }, (_, i) => {
    const v = minValue + (range * (yTicksBar - 1 - i)) / (yTicksBar - 1 || 1);
    const y = yScale(v);
    return `<text x="${p - 16}" y="${y + 4}" text-anchor="end" fill="#B6C2E2" font-size="18" font-weight="bold">${fmt(
      v
    )}</text>`;
  }).join("");

  const yAxisLine = `<line x1="${p - 8}" y1="${p}" x2="${
    p - 8
  }" y2="${h - p}" stroke="#B6C2E2" stroke-width="2"/>`;
  const yAxisLabel = `<text x="${p - 48}" y="${
    h / 2
  }" text-anchor="middle" fill="#B6C2E2" font-size="15" transform="rotate(-90 ${
    p - 48
  },${h / 2})">${cur} ${t("Value")}</text>`;
  const xAxisLabel = `<text x="${w / 2}" y="${
    h - p + 70
  }" text-anchor="middle" fill="#B6C2E2" font-size="15">${t(
    "Component"
  )}</text>`;

  const barSVG = `
    <svg class="plot bar" width="${w}" height="${h + 80}" viewBox="0 0 ${w} ${
    h + 80
  }" role="img" aria-label="${t(
    "Value Bridge Analysis"
  )}" style="display: none;">
      <rect width="${w}" height="${h}" fill="#000000" rx="12"/>
      ${zeroLine}
      ${yAxisLine}
      ${yAxisTicks}
      ${yAxisLabel}
      ${barElements}
      ${xAxisLabel}
    </svg>
  `;

  const pieSVG = `
    <svg class="plot pie" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${t(
      "Value Bridge Analysis"
    )}" style="display: none;">
      <rect width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
      ${(() => {
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.min(w, h) * 0.35;
        let a0 = -Math.PI / 2;
        const vals = components.map((c) => Math.abs(c.value));
        const sum = vals.reduce((a, b) => a + b, 0) || 1;
        return vals
          .map((v, i) => {
            const a1 = a0 + (2 * Math.PI * v) / sum;
            const x0 = cx + R * Math.cos(a0);
            const y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1);
            const y1 = cy + R * Math.sin(a1);
            const large = a1 - a0 > Math.PI ? 1 : 0;
            const col = `hsl(${(30 + (i * 18) % 160)},80%,60%)`;
            const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0 = a1;
            return `<path d="${d}" fill="${col}"/>`;
          })
          .join("");
      })()}
    </svg>
  `;

  const doughnutSVG = `
    <svg class="plot doughnut" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${t(
      "Value Bridge Analysis"
    )}" style="display: none;">
      <rect width="${w}" height="${h}" rx="12" ry="12" fill="#000000"/>
      ${(() => {
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.min(w, h) * 0.35;
        let a0 = -Math.PI / 2;
        const vals = components.map((c) => Math.abs(c.value));
        const sum = vals.reduce((a, b) => a + b, 0) || 1;
        const slices = vals
          .map((v, i) => {
            const a1 = a0 + (2 * Math.PI * v) / sum;
            const x0 = cx + R * Math.cos(a0);
            const y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1);
            const y1 = cy + R * Math.sin(a1);
            const large = a1 - a0 > Math.PI ? 1 : 0;
            const col = `hsl(${(30 + (i * 18) % 160)},80%,60%)`;
            const d = `M ${cx},${cy} L ${x0},${y0} A ${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
            a0 = a1;
            return `<path d="${d}" fill="${col}"/>`;
          })
          .join("");
        return `${slices}<circle cx="${w / 2}" cy="${h / 2}" r="${(
          Math.min(w, h) *
          0.35 *
          0.55
        ).toFixed(1)}" fill="#000000" stroke="#FFFFFF" />`;
      })()}
    </svg>
  `;

  return `
    <figure class="chart-card waterfall-card" data-type="line" data-widget="series">
      ${chartSummaryRowValueBridge({ components, currency })}
      <header class="chart-head">
        <h3 class="chart-title">${t("Value Bridge Analysis Graph")}</h3>
        ${typeDropdown}
      </header>
      <div class="canvas-wrap">
        ${lineSVG}
        ${barSVG}
        ${pieSVG}
        ${doughnutSVG}
      </div>
      <p class="chart-note">
        ${t("Waterfall chart showing value creation from current state")} (${fmt(
    components[0]?.value || 0
  )})
        ${t("to target state")} (${fmt(
    components[components.length - 1]?.value || 0
  )}) ${t("with key value drivers.")}
      </p>
    </figure>
  `;
}

/* ===========================================================
 * 5. EXECUTIVE SUMMARY INFOGRAPHIC
 * ========================================================= */
export function executiveSummaryInfographicHTML(summary = {}) {
  const {
    roi = "267%",
    payback = "8 months",
    savings = "$2.4M",
    timeline = "18 months",
    confidence = "92%",
    impact = "High",
    quickWins = 3,
    phases = 4,
    phasesData = [],
    lang = 'English',
    translatedLabels = {}
  } = summary;
  
  // Translate impact level (High, Medium, Low, etc.)
  // This will use getLabel function defined below
  let translatedImpact = impact;
  
  // Helper function to get translated label with fallback to English
  const getLabel = (key, fallback = key) => {
    if (translatedLabels && translatedLabels[key]) {
      return translatedLabels[key];
    }
    // Try case variants: lowercase, uppercase, capitalize
    if (translatedLabels && translatedLabels[key.toLowerCase()]) {
      return translatedLabels[key.toLowerCase()];
    }
    if (translatedLabels && translatedLabels[key.toUpperCase()]) {
      return translatedLabels[key.toUpperCase()];
    }
    // Fallback to t() function if it exists (client-side), otherwise use English fallback
    const result = (typeof t === 'function' ? t(key) : fallback);
    return result;
  };
  
  // Helper to translate time unit strings like "8 months" to "8 mois" in French
  const translateTimeString = (str) => {
    if (!str) return str;
    const match = str.match(/^(\d+)\s*(weeks?|months?|years?|days?|hours?|minutes?)$/i);
    if (!match) {
      console.log(`[TRANSLATE-TIME] No match for "${str}", returning as-is`);
      return str;
    }
    const num = match[1];
    const unit = match[2].toLowerCase();
    
    // Normalize unit to singular for lookup
    let unitKey = unit.endsWith('s') ? unit.slice(0, -1) : unit;
    const translatedUnit = getLabel(unitKey, unitKey);
    
    // Add plural 's' if num > 1 and language uses plurals
    const finalUnit = num > 1 && !translatedUnit.endsWith('s') ? translatedUnit + 's' : translatedUnit;
    const result = `${num} ${finalUnit}`;
    console.log(`[TRANSLATE-TIME] "${str}" → "${result}"`);
    return result;
  };
  
  // Extract unit (year/month) and value from timeline string
  const extractTimeUnit = (timeStr) => {
    const match = String(timeStr || '').match(/(\d+)\s*(year|month|week)s?/i);
    if (!match) {
      console.log(`[TIME-UNIT] No match for "${timeStr}", defaulting to 4 weeks`);
      return { value: 4, unit: 'weeks', label: getLabel('weeks') };
    }
    const num = parseInt(match[1], 10);
    const unitStr = match[2].toLowerCase();
    let unit = 'weeks';
    let label = getLabel('weeks');
    if (unitStr.startsWith('y')) {
      unit = 'years';
      label = getLabel('years');
    } else if (unitStr.startsWith('m') && !unitStr.startsWith('w')) {
      unit = 'months';
      label = getLabel('months');
    }
    console.log(`[TIME-UNIT] Parsed "${timeStr}" → ${num} ${unit} (label: "${label}")`);
    return { value: num, unit, label };
  };
  
  // Build phase timeline from actual phase data or fallback to hardcoded
  let phaseElements = '';
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
  
  if (phasesData && phasesData.length > 0) {
    // Use actual phase data from report
    phaseElements = phasesData.map((p, i) => {
      const phaseName = p.title || p.name || `${getLabel('Phase')} ${i + 1}`;
      const phaseCaption = p.caption || `${i + 1}`;
      const durationStr = p.duration || '4 weeks';
      const durationInfo = extractTimeUnit(durationStr);
      const color = colors[i % colors.length];
      
      return `
        <div style="flex: 1; text-align: center; min-width: 80px; display: flex; flex-direction: column; align-items: center;">
          <div style="height: 70px; display: flex; align-items: center; justify-content: center; width: 100%;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #FFFFFF; font-weight: 700; flex-shrink: 0;">${i + 1}</div>
          </div>
          <div style="color: #FFFFFF; font-size: 0.75rem; font-weight: 600; word-break: break-word; max-width: 100%;">${esc(phaseName)}</div>
          <div style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.25rem; white-space: nowrap;">${durationInfo.value} ${durationInfo.label}</div>
        </div>
        ${i < phasesData.length - 1 ? `
          <div style="flex: 0 0 auto; height: 70px; text-align: center; display: flex; align-items: center; justify-content: center; padding: 0 5px;">
            <svg width="25" height="14" viewBox="0 0 30 16" style="flex-shrink: 0;">
              <path d="M 0 8 L 25 8 M 20 4 L 25 8 L 20 12" stroke="#10B981" stroke-width="2" fill="none"/>
            </svg>
          </div>
        ` : ''}
      `;
    }).join('');
  } else {
    // Fallback to hardcoded phases with translations
    const defaultPhases = [
      { name: getLabel('Discovery'), duration: '4 weeks', color: colors[0] },
      { name: getLabel('Design'), duration: '4 weeks', color: colors[1] },
      { name: getLabel('Pilot'), duration: '4 weeks', color: colors[2] },
      { name: getLabel('Scale'), duration: '12 weeks', color: colors[3] }
    ];
    
    phaseElements = defaultPhases.map((p, i) => {
      const durationInfo = extractTimeUnit(p.duration);
      return `
        <div style="flex: 1; text-align: center; min-width: 80px; display: flex; flex-direction: column; align-items: center;">
          <div style="height: 70px; display: flex; align-items: center; justify-content: center; width: 100%;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: ${p.color}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #FFFFFF; font-weight: 700; flex-shrink: 0;">${i + 1}</div>
          </div>
          <div style="color: #FFFFFF; font-size: 0.75rem; font-weight: 600; word-break: break-word; max-width: 100%;">${p.name}</div>
          <div style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.25rem; white-space: nowrap;">${durationInfo.value} ${durationInfo.label}</div>
        </div>
        ${i < defaultPhases.length - 1 ? `
          <div style="flex: 0 0 auto; height: 70px; text-align: center; display: flex; align-items: center; justify-content: center; padding: 0 5px;">
            <svg width="25" height="14" viewBox="0 0 30 16" style="flex-shrink: 0;">
              <path d="M 0 8 L 25 8 M 20 4 L 25 8 L 20 12" stroke="#10B981" stroke-width="2" fill="none"/>
            </svg>
          </div>
        ` : ''}
      `;
    }).join('');
  }
  
  console.log('🎯 [EXEC-INFOGRAPHIC-v4.0] Generating with lang:', lang, 'phasesData:', phasesData?.length, 'and translations:', {
    Executive: getLabel('Executive Summary at a Glance'),
    ROI: getLabel('projectedROI'),
    Payback: getLabel('paybackPeriod'),
    Savings: getLabel('annualSavings'),
    Implementation: getLabel('implementationApproach')
  });

  // Store translated title to use consistently - no hardcoding!
  const executiveTitle = getLabel('Executive Summary at a Glance');
  console.log('✅ [EXEC-TITLE-TRANSLATION] executiveTitle:', executiveTitle, 'lang:', lang);

  return `
    <div class="executive-infographic" style="background: linear-gradient(135deg, #0B1A3D 0%, #1e3a5f 100%); padding: 2rem 1.5rem; border-radius: 16px; margin: 2rem 0; max-width: 100%; box-sizing: border-box;">
      <h2 style="text-align: center; color: #10B981; font-size: 2rem; margin-bottom: 2rem; font-weight: 700;">${executiveTitle}</h2>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; max-width: 100%;">
        <div style="background: rgba(16,185,129,0.1); border: 2px solid #10B981; border-radius: 8px; padding: 1.25rem 1rem; text-align: center;">
          <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">${getLabel("projectedROI")}</div>
          <div style="font-size: 2.5rem; color: #10B981; font-weight: 700; font-family: Georgia, serif; line-height: 1;">${esc(roi)}</div>
        </div>
        <div style="background: rgba(59,130,246,0.1); border: 2px solid #3B82F6; border-radius: 8px; padding: 1.25rem 1rem; text-align: center;">
          <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">${getLabel("paybackPeriod")}</div>
          <div style="font-size: 2.5rem; color: #3B82F6; font-weight: 700; font-family: Georgia, serif; line-height: 1;">${esc(translateTimeString(payback))}</div>
        </div>
        <div style="background: rgba(245,158,11,0.1); border: 2px solid #F59E0B; border-radius: 8px; padding: 1.25rem 1rem; text-align: center;">
          <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">${getLabel("annualSavings")}</div>
          <div style="font-size: 2.5rem; color: #F59E0B; font-weight: 700; font-family: Georgia, serif; line-height: 1;">${esc(savings)}</div>
        </div>
      </div>

      <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 1.5rem 1rem; margin-bottom: 1.5rem;">
        <h3 style="color: #FFFFFF; font-size: 1.2rem; margin-bottom: 1rem; text-align: center;">${getLabel("implementationApproach")}</h3>
        <div style="display: flex; justify-content: center; align-items: flex-start; max-width: 100%; gap: 1rem; flex-wrap: wrap;">
          ${phaseElements}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; max-width: 100%;">
        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="font-size: 2rem; color: #10B981; font-weight: 700; line-height: 1;">${quickWins}</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin-top: 0.5rem;">${getLabel("quickWins")}</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="font-size: 2rem; color: #3B82F6; font-weight: 700; line-height: 1;">${phasesData?.length || phases}</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin-top: 0.5rem;">${getLabel("phases")}</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="font-size: 2rem; color: #F59E0B; font-weight: 700; line-height: 1;">${esc(translateTimeString(timeline))}</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin-top: 0.5rem;">${getLabel("timeline")}</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="font-size: 2rem; color: #10B981; font-weight: 700; line-height: 1;">${esc(confidence)}</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin-top: 0.5rem;">${getLabel("confidence")}</div>
        </div>
      </div>
    </div>
  `;
}

