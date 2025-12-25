// /lib/implKitHtml.js
// [KT:SURGICAL] Impl Kit HTML with detailed empties logging + responsive tweaks
//                + translation-friendly attributes (data-i18n-key)

import { barChartHTML, TYPE_SWITCH_SCRIPT } from "./reportGraphs.js";

// [KT:SURGICAL:LEGACY-CHART-PARKING]
// Legacy inline chart card that used to render at the bottom of Appendix D.
// It is now *not* injected into the HTML to avoid the blank graph block,
// but we keep it here for future reuse if you ever want to re-enable it.
const LEGACY_BENEFITS_CHART_HTML = `
<div class="chart-card" data-type="line">
  <div class="chart-head">
    <div class="chart-title-wrap">
      <span class="chart-title">Monthly Savings by Lever</span>
    </div>
    <div class="chart-ui">
      <label class="chart-type-label">
        TYPE:
        <select class="chart-type-select">
          <option value="line" selected>Line</option>
          <option value="bar">Bar</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
        </select>
      </label>
    </div>
  </div>
  <figure
    data-chart='{"title":"Monthly Savings by Lever","kind":"line","labels":["Digital ordering & real-time routing","Centralized procurement & supplier contracts","Menu optimization and waste reduction"],"series":[480,300,120],"xTitle":"Levers","yTitle":"$/month"}'
  >
    <svg class="plot line"></svg>
    <svg class="plot bar" style="display:none"></svg>
    <svg class="plot pie" style="display:none"></svg>
    <svg class="plot doughnut" style="display:none"></svg>
  </figure>
  <p class="chart-note">
    Values assume phased implementation of digital ordering, centralized procurement,
    and menu optimization levers.
  </p>
</div>
`;
// NOTE: LEGACY_BENEFITS_CHART_HTML is intentionally unused to keep behaviour
// identical while preserving the old chart implementation for reference.
void LEGACY_BENEFITS_CHART_HTML;

// Minimal CSS for all appendices (with responsive tweaks)
export const IMPLKIT_CSS = `
.appendix{
  break-inside:avoid;
  margin:12px 0;
  background:#091621;
  border-radius:12px;
  padding:12px;
  max-width:100%;
  overflow-x:auto;
}
.appendix h3{
  margin:.25rem 0 .5rem;
  font-size:1rem;
}

/* OLD generic table rules (kept for reference, no longer used directly)
.table{
  width:100%;
  border-collapse:collapse;
  min-width:640px;
}
.table th,.table td{
  border:1px solid rgba(230,240,255,.15);
  padding:6px 8px;
  vertical-align:top;
}
*/

/* [KT:SURGICAL:APPENDIX-TABLE-SMALL-STYLE]
   Recreate the original appendix tableSmall look, but keep it
   compatible with translation (data-i18n-key) and existing markup
   (class="table small"). This applies to ALL appendices A–K. */
.appendix table,
.appendix .table{
  width:100%;
  border-collapse:collapse;
  min-width:800px;
  table-layout:fixed;
}

/* Header row: dark band, bold white text */
.appendix table thead th,
.appendix .table thead th{
  background:#050b12;
  color:#f5f7fb;
  font-weight:600;
  border:1px solid rgba(230,240,255,.3);
  padding:6px 8px;
  vertical-align:top;
}

/* Body cells: deep navy with subtle grid, like original Appendix C */
.appendix table tbody td,
.appendix .table tbody td{
  background:#081522;
  color:#f5f7fb;
  border:1px solid rgba(230,240,255,.18);
  padding:6px 8px;
  vertical-align:top;
}

/* Allow footer rows / single-row tables to match body style */
.appendix table td,
.appendix .table td{
  background:#081522;
  color:#f5f7fb;
  border:1px solid rgba(230,240,255,.18);
  padding:6px 8px;
  vertical-align:top;
}

/* Optional: slightly stronger left column to echo original look */
.appendix table th:first-child,
.appendix .table th:first-child{
  width:18%;
}

/* Small-body text + notes (unchanged) */
.small{
  font-size:.9rem;
  opacity:.95;
}
.note{
  opacity:.8;
}
@media (max-width:900px){
  .appendix{
    padding:10px 8px;
    margin:10px 0;
  }
  .appendix table,
  .appendix .table{
    min-width:520px;
  }
  .appendix table th,
  .appendix table td,
  .appendix .table th,
  .appendix .table td{
    padding:4px 6px;
    font-size:.8rem;
  }
}
@media (max-width:600px){
  .appendix table,
  .appendix .table{
    min-width:460px;
  }
}
`;

// ---------- helpers ----------

const esc = (s = "") => {
  try {
    return String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  } catch {
    return "";
  }
};

function debugAppendix(tag, reason, detail) {
  if (typeof console !== "undefined") {
    try {
      console.log(`[${tag}] ${reason}`, detail || {});
    } catch {
      // swallow logging errors
    }
  }
}

// ---------- Appendix A – Charters ----------

// NOTE: AI sometimes returns either:
//   implKit.charters = [ {..}, {..} ]
//   implKit.charters = { items:[..] }
// We normalise both and log if we end up with 0 rows.
function chartersHTML(model) {
  const raw = model;
  let items = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && Array.isArray(raw.items)) {
    items = raw.items;
  }

  if (!items.length) {
    debugAppendix("APPENDIX-A", "Skipped: no charter rows after normalisation", {
      hasModel: !!raw,
      isArray: Array.isArray(raw),
      hasItemsArray: !!(raw && Array.isArray(raw.items)),
      itemsLength: raw && Array.isArray(raw.items) ? raw.items.length : 0,
      sample: Array.isArray(raw) ? raw[0] : raw && Array.isArray(raw.items) ? raw.items[0] : null,
    });
    return "";
  }

  debugAppendix("APPENDIX-A", `Rendered ${items.length} charter(s)`, {
    sampleName: items[0] && items[0].name,
  });

  const blocks = items
    .map((c) => {
      if (!c || typeof c !== "object") c = {};
      return `
      <h4>${esc(c.name || "")}</h4>
      <table class="table small">
        <tr>
          <th style="width:22%" data-i18n-key="appendixA.objective">Objective</th>
          <td>${esc(c.objective || "")}</td>
        </tr>
        <tr>
          <th data-i18n-key="appendixA.scopeIn">Scope (In)</th>
          <td>${esc(c.scopeIn || "")}</td>
        </tr>
        <tr>
          <th data-i18n-key="appendixA.scopeOut">Scope (Out)</th>
          <td>${esc(c.scopeOut || "")}</td>
        </tr>
        <tr>
          <th data-i18n-key="appendixA.ownerStakeholders">Owner & Stakeholders</th>
          <td><strong>${esc(c.owner || "")}</strong>; ${esc((c.stakeholders || []).join(", "))}</td>
        </tr>
        <tr>
          <th data-i18n-key="appendixA.milestones">Milestones</th>
          <td>${(c.milestones || [])
            .map(
              (m) =>
                `${esc((m && m.milestone) || "")} — <em>${esc((m && m.due) || "")}</em>`
            )
            .join("<br/>")}</td>
        </tr>
        <tr>
          <th data-i18n-key="appendixA.kpis">KPIs</th>
          <td>${(c.kpis || [])
            .map((k) => {
              const label = esc((k && k.kpi) || "");
              const base = esc((k && k.baseline) || "");
              const tgt = esc((k && k.target) || "");
              const src = k && k.source ? ` (src: ${esc(k.source)})` : "";
              return `${label}: ${base} → <strong>${tgt}</strong>${src}`;
            })
            .join("<br/>")}</td>
        </tr>
        <tr>
          <th data-i18n-key="appendixA.risks">Risks</th>
          <td>${(c.risks || [])
            .map(
              (r) =>
                `${esc((r && r.risk) || "")} — Mitigation: ${esc(
                  (r && r.mitigation) || ""
                )} (Owner: ${esc((r && r.owner) || "")})`
            )
            .join("<br/>")}</td>
        </tr>
        <tr>
          <th data-i18n-key="appendixA.budget">Budget</th>
          <td>${esc(c.budgetSummary || "")}</td>
        </tr>
        <tr>
          <th data-i18n-key="appendixA.acceptance">Acceptance</th>
          <td>${esc(c.acceptanceCriteria || "")}</td>
        </tr>
      </table>
      <div class="note" data-i18n-key="appendixA.tip">
        Tip: copy as a one-pager per store/workstream.
      </div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:12px 0"/>
      `;
    })
    .join("");

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixA.title">Appendix A — Initiative Charters</h3>
    ${blocks}
  </section>`;
}

// ---------- Appendix B – RACI ----------

function raciHTML(model) {
  const rows = (model && Array.isArray(model.items) ? model.items : [])
    .map(
      (x) => `
    <tr>
      <td>${esc((x && x.decision) || "")}</td>
      <td>${esc((x && x.R) || "")}</td>
      <td>${esc((x && x.A) || "")}</td>
      <td>${esc(((x && x.C) || []).join(", "))}</td>
      <td>${esc(((x && x.I) || []).join(", "))}</td>
      <td>${esc((x && x.SLA) || "")}</td>
    </tr>`
    )
    .join("");

  if (!rows) {
    debugAppendix("APPENDIX-B", "Skipped: no RACI rows", { model });
    return "";
  }

  debugAppendix("APPENDIX-B", "Rendered RACI rows", {
    count: (model && Array.isArray(model.items) && model.items.length) || 0,
  });

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixB.title">Appendix B — RACI & Decision SLAs</h3>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixB.decision">Decision</th>
          <th data-i18n-key="appendixB.R">R</th>
          <th data-i18n-key="appendixB.A">A</th>
          <th data-i18n-key="appendixB.C">C</th>
          <th data-i18n-key="appendixB.I">I</th>
          <th data-i18n-key="appendixB.sla">SLA</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// ---------- Appendix C – RAID ----------

function raidHTML(model) {
  const rows = (model && Array.isArray(model.items) ? model.items : [])
    .map(
      (x) => `
    <tr>
      <td>${esc((x && x.type) || "")}</td>
      <td>${esc((x && x.description) || "")}</td>
      <td>${esc((x && x.owner) || "")}</td>
      <td>${esc((x && x.impact) || "")}</td>
      <td>${esc((x && x.probability) || "")}</td>
      <td>${esc((x && x.trigger) || "")}</td>
      <td>${esc((x && x.mitigation) || "")}</td>
      <td>${esc((x && x.status) || "")}</td>
      <td>${esc((x && x.nextReview) || "")}</td>
    </tr>`
    )
    .join("");

  if (!rows) {
    debugAppendix("APPENDIX-C", "Skipped: no RAID rows", { model });
    return "";
  }

  debugAppendix("APPENDIX-C", "Rendered RAID rows", {
    count: (model && Array.isArray(model.items) && model.items.length) || 0,
  });

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixC.title">
      Appendix C — RAID (Risks, Assumptions, Issues, Dependencies)
    </h3>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixC.type">Type</th>
          <th data-i18n-key="appendixC.description">Description</th>
          <th data-i18n-key="appendixC.owner">Owner</th>
          <th data-i18n-key="appendixC.impact">Impact</th>
          <th data-i18n-key="appendixC.probability">Prob.</th>
          <th data-i18n-key="appendixC.trigger">Trigger</th>
          <th data-i18n-key="appendixC.mitigation">Mitigation</th>
          <th data-i18n-key="appendixC.status">Status</th>
          <th data-i18n-key="appendixC.nextReview">Next review</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// ---------- Appendix D – Benefits Realization (chart removed to avoid blank block) ----------

function benefitsHTML(model) {
  const lines = model && Array.isArray(model.lines) ? model.lines : [];
  if (!lines.length) {
    debugAppendix("APPENDIX-D", "Skipped: no benefits lines", { model });
    return "";
  }

  const rows = lines
    .map(
      (l) => `
    <tr>
      <td>${esc((l && l.workstream) || "")}</td>
      <td>${esc((l && l.lever) || "")}</td>
      <td>${esc((l && l.unitAssumption) || "")}</td>
      <td>${esc((l && l.source) || "")}</td>
      <td style="text-align:right">${esc((l && l.volume) || "")}</td>
      <td style="text-align:right">${esc((l && l.rate) || "")}</td>
      <td style="text-align:right"><strong>${esc(
        (l && l.monthlyImpact) || ""
      )}</strong></td>
      <td>${esc((l && l.confidence) || "")}</td>
      <td>${esc((l && l.startMonth) || "")}</td>
      <td>${esc((l && l.runRateMonth) || "")}</td>
      <td style="text-align:right">${esc((l && l.oneOffCost) || "")}</td>
    </tr>`
    )
    .join("");

  const totals = lines.reduce((a, b) => a + (+b.monthlyImpact || 0), 0);
  debugAppendix("APPENDIX-D", "Rendered benefits lines", {
    count: lines.length,
    totalMonthlyImpact: totals,
  });

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixD.title">Appendix D — Benefits Realization Model</h3>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixD.workstream">Workstream</th>
          <th data-i18n-key="appendixD.lever">Lever</th>
          <th data-i18n-key="appendixD.unitAssumption">Unit Assumption</th>
          <th data-i18n-key="appendixD.source">Source</th>
          <th data-i18n-key="appendixD.volume">Volume</th>
          <th data-i18n-key="appendixD.rate">Rate</th>
          <th data-i18n-key="appendixD.monthly">Monthly $</th>
          <th data-i18n-key="appendixD.confidence">Confidence</th>
          <th data-i18n-key="appendixD.start">Start</th>
          <th data-i18n-key="appendixD.runRate">Run-rate</th>
          <th data-i18n-key="appendixD.oneOff">One-off $</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="small" data-i18n-key="appendixD.totalMonthly">
      <strong>Total monthly impact (estimated):</strong> $${totals.toLocaleString()}
    </p>
  </section>`;
}

// ---------- Appendix E – 100-Day Plan ----------

function plan100HTML(model) {
  const rows = (model && Array.isArray(model.weeks) ? model.weeks : [])
    .map(
      (w) => `
    <tr>
      <td>${esc((w && w.week) || "")}</td>
      <td>${esc((w && w.workstream) || "")}</td>
      <td>${esc((w && w.task) || "")}</td>
      <td>${esc((w && w.owner) || "")}</td>
      <td>${esc((w && w.status) || "")}</td>
    </tr>`
    )
    .join("");

  if (!rows) {
    debugAppendix("APPENDIX-E", "Skipped: no 100-Day rows", { model });
    return "";
  }

  debugAppendix("APPENDIX-E", "Rendered 100-Day rows", {
    count: (model && Array.isArray(model.weeks) && model.weeks.length) || 0,
  });

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixE.title">Appendix E — 100-Day Plan (Week by Week)</h3>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixE.week">Week</th>
          <th data-i18n-key="appendixE.workstream">Workstream</th>
          <th data-i18n-key="appendixE.task">Task</th>
          <th data-i18n-key="appendixE.owner">Owner</th>
          <th data-i18n-key="appendixE.status">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// ---------- Appendix F – Pilot Charter ----------

function pilotHTML(model = {}) {
  const hasContent =
    !!(model &&
      (String(model.name || "").trim() ||
        String(model.locations || "").trim() ||
        (Array.isArray(model.successKPIs) && model.successKPIs.length) ||
        (Array.isArray(model.thresholds) && model.thresholds.length) ||
        String(model.sampleDesign || "").trim() ||
        String(model.rollbackCriteria || "").trim()));

  if (!hasContent) {
    debugAppendix("APPENDIX-F", "Skipped: pilot fields empty or missing", { model });
    return "";
  }

  debugAppendix("APPENDIX-F", "Rendered pilot charter", {
    name: model.name || null,
  });

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixF.title">Appendix F — Pilot Charter</h3>
    <table class="table small">
      <tr>
        <th style="width:22%" data-i18n-key="appendixF.pilot">Pilot</th>
        <td>${esc(model.name || "")}</td>
      </tr>
      <tr>
        <th data-i18n-key="appendixF.locations">Locations</th>
        <td>${esc(String(model.locations || ""))}</td>
      </tr>
      <tr>
        <th data-i18n-key="appendixF.successKpis">Success KPIs</th>
        <td>${esc((model.successKPIs || []).join(", "))}</td>
      </tr>
      <tr>
        <th data-i18n-key="appendixF.thresholds">Thresholds</th>
        <td>${esc((model.thresholds || []).join("; "))}</td>
      </tr>
      <tr>
        <th data-i18n-key="appendixF.sampleDesign">Sample Design</th>
        <td>${esc(model.sampleDesign || "")}</td>
      </tr>
      <tr>
        <th data-i18n-key="appendixF.rollback">Rollback Criteria</th>
        <td>${esc(model.rollbackCriteria || "")}</td>
      </tr>
    </table>
  </section>`;
}

// ---------- Appendix G – Assumptions ----------

function assumptionsHTML(model = {}) {
  let items = Array.isArray(model.items) ? model.items : [];
  if (!items.length && Array.isArray(model.assumptions)) {
    // AI might have named the array "assumptions" instead of "items"
    items = model.assumptions;
  }

  if (!items.length) {
    debugAppendix("APPENDIX-G", "Skipped: no assumption rows after normalisation", {
      hasItemsArray: Array.isArray(model.items),
      itemsLength: Array.isArray(model.items) ? model.items.length : 0,
      hasAssumptionsArray: Array.isArray(model.assumptions),
      assumptionsLength: Array.isArray(model.assumptions) ? model.assumptions.length : 0,
      sample:
        (Array.isArray(model.items) && model.items[0]) ||
        (Array.isArray(model.assumptions) && model.assumptions[0]) ||
        null,
    });
    return "";
  }

  debugAppendix("APPENDIX-G", "Rendered assumptions", { count: items.length });

  const rows = items
    .map(
      (a) => `
    <tr>
      <td>${esc((a && a.name) || "")}</td>
      <td>${a && a.low != null ? esc(a.low) : ""}</td>
      <td><strong>${esc((a && a.value) || "")}</strong>${
        a && a.unit ? ` ${esc(a.unit)}` : ""
      }</td>
      <td>${a && a.high != null ? esc(a.high) : ""}</td>
      <td>${esc((a && a.note) || "")}</td>
    </tr>`
    )
    .join("");

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixG.title">Appendix G — Assumptions & Ranges</h3>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixG.assumption">Assumption</th>
          <th data-i18n-key="appendixG.low">Low</th>
          <th data-i18n-key="appendixG.value">Value</th>
          <th data-i18n-key="appendixG.high">High</th>
          <th data-i18n-key="appendixG.note">Note</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// ---------- Appendix H – Methods & Sources ----------

function methodsSourcesHTML(input = {}) {
  const rawBench = input.benchmarks;
  const rawSources = input.sources;

  const benchmarks = Array.isArray(rawBench)
    ? rawBench
    : rawBench && Array.isArray(rawBench.items)
    ? rawBench.items
    : [];

  const sources = Array.isArray(rawSources)
    ? rawSources
    : rawSources && Array.isArray(rawSources.items)
    ? rawSources.items
    : [];

  if (!benchmarks.length && !sources.length) {
    debugAppendix("APPENDIX-H", "Skipped: no benchmarks or sources", {
      hasBenchmarksArray: Array.isArray(rawBench),
      hasBenchmarksItems: rawBench && Array.isArray(rawBench.items),
      hasSourcesArray: Array.isArray(rawSources),
      hasSourcesItems: rawSources && Array.isArray(rawSources.items),
    });
    return "";
  }

  debugAppendix("APPENDIX-H", "Rendered methods & sources", {
    benchmarks: benchmarks.length,
    sources: sources.length,
  });

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixH.title">Appendix H — Methods & Sources</h3>
    <p class="small" data-i18n-key="appendixH.lead">
      Benchmarks were normalized for region and time; assumptions have documented ranges
      and sensitivity reviewed by Finance.
    </p>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixH.benchmark">Benchmark</th>
          <th data-i18n-key="appendixH.source">Source</th>
          <th data-i18n-key="appendixH.date">Date</th>
          <th data-i18n-key="appendixH.notes">Normalization notes</th>
        </tr>
      </thead>
      <tbody>
        ${benchmarks
          .map(
            (b) => `
          <tr>
            <td>${esc((b && b.name) || "")}</td>
            <td>${esc((b && b.source) || "")}</td>
            <td>${esc((b && b.date) || "")}</td>
            <td>${esc((b && b.notes) || "")}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${
      sources.length
        ? `<p class="small" data-i18n-key="appendixH.additionalSources">
             Additional sources: ${sources.map((s) => esc(s)).join("; ")}
           </p>`
        : ""
    }
  </section>`;
}

// ---------- Appendix I – Implementation Checklist ----------

function implementationChecklistHTML(model = {}) {
  const items = Array.isArray(model.items) ? model.items : [];

  if (!items.length) {
    debugAppendix("APPENDIX-I", "Not added: items array is empty or missing", {
      hasItemsArray: Array.isArray(model.items),
    });
    return "";
  }

  debugAppendix("APPENDIX-I", "Added: items present", { count: items.length });

  const rows = items
    .map(
      (item) => `
    <tr>
      <td>${esc(item && item.phase) || ""}</td>
      <td>${
        Array.isArray(item && item.activities)
          ? item.activities.map((a) => esc(a || "")).join("<br>")
          : ""
      }</td>
      <td>${esc((item && item.owner) || "")}</td>
      <td>${esc((item && item.successCriteria) || "")}</td>
    </tr>`
    )
    .join("");

  const totalTasks = items.length;
  const completedTasks = items.filter((item) => {
    const s = (item.status || "").toLowerCase();
    return s === "complete" || s === "completed";
  }).length;

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixI.title">Appendix I — Implementation Checklist</h3>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixI.phase">Phase</th>
          <th data-i18n-key="appendixI.activities">Activities</th>
          <th data-i18n-key="appendixI.owner">Owner</th>
          <th data-i18n-key="appendixI.successCriteria">Success Criteria</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p class="small" data-i18n-key="appendixI.summary">
      Total tasks: <strong>${totalTasks}</strong>
      &nbsp;|&nbsp; Completed: <strong>${completedTasks}</strong>
    </p>
  </section>`;
}

// ---------- Appendix J – Decision Framework (existing logs kept) ----------

function decisionFrameworkHTML(model = {}) {
  const items = Array.isArray(model.items) && model.items.length > 0 ? model.items : [];
  if (!items.length) {
    if (typeof console !== "undefined") {
      if (!Array.isArray(model.items)) {
        console.log("[APPENDIX-J] Not added: model.items is not an array", { model });
      } else {
        console.log("[APPENDIX-J] Not added: items array is empty", { model });
      }
    }
    return "";
  } else {
    if (typeof console !== "undefined") {
      console.log("[APPENDIX-J] Added: items present", { count: items.length });
    }
  }

  const rows = items
    .map(
      (item) => `
    <tr>
      <td>${esc((item && item.decision) || "")}</td>
      <td>${esc((item && item.criteria) || "")}</td>
      <td>${esc((item && item.options) || "")}</td>
      <td>${esc((item && item.recommendation) || "")}</td>
      <td>${esc((item && item.rationale) || "")}</td>
      <td>${esc((item && item.owner) || "")}</td>
      <td>${esc((item && item.status) || "")}</td>
    </tr>`
    )
    .join("");

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixJ.title">Appendix J — Decision Framework</h3>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixJ.decision">Decision</th>
          <th data-i18n-key="appendixJ.criteria">Criteria</th>
          <th data-i18n-key="appendixJ.options">Options</th>
          <th data-i18n-key="appendixJ.recommendation">Recommendation</th>
          <th data-i18n-key="appendixJ.rationale">Rationale</th>
          <th data-i18n-key="appendixJ.owner">Owner</th>
          <th data-i18n-key="appendixJ.status">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </section>`;
}

// ---------- Appendix K – Resource Requirements (existing logs kept) ----------

function resourceRequirementsHTML(model = {}) {
  const items = Array.isArray(model.items) && model.items.length > 0 ? model.items : [];
  if (!items.length) {
    if (typeof console !== "undefined") {
      if (!Array.isArray(model.items)) {
        console.log("[APPENDIX-K] Not added: model.items is not an array", { model });
      } else {
        console.log("[APPENDIX-K] Not added: items array is empty", { model });
      }
    }
    return "";
  } else {
    if (typeof console !== "undefined") {
      console.log("[APPENDIX-K] Added: items present", { count: items.length });
    }
  }

  const rows = items
    .map(
      (item) => `
    <tr>
      <td>${esc((item && item.resource) || "")}</td>
      <td>${esc((item && item.role) || "")}</td>
      <td>${esc((item && item.quantity) || "")}</td>
      <td>${esc((item && item.duration) || "")}</td>
      <td>${esc((item && item.cost) || "")}</td>
      <td>${esc((item && item.notes) || "")}</td>
    </tr>`
    )
    .join("");

  return `
  <section class="appendix">
    <h3 data-i18n-key="appendixK.title">Appendix K — Resource Requirements</h3>
    <table class="table small">
      <thead>
        <tr>
          <th data-i18n-key="appendixK.resource">Resource</th>
          <th data-i18n-key="appendixK.role">Role</th>
          <th data-i18n-key="appendixK.quantity">Quantity</th>
          <th data-i18n-key="appendixK.duration">Duration</th>
          <th data-i18n-key="appendixK.cost">Cost</th>
          <th data-i18n-key="appendixK.notes">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </section>`;
}

// ---------- Aggregator ----------

function buildAllAppendices({
  charters,
  raci,
  raid,
  benefits,
  plan100,
  pilot,
  assumptions,
  methodsSources,
  implementationChecklist,
  decisionFramework,
  resourceRequirements,
}) {
  const content = [
    chartersHTML(charters),
    raciHTML(raci),
    raidHTML(raid),
    benefitsHTML(benefits),
    plan100HTML(plan100),
    pilotHTML(pilot),
    assumptionsHTML(assumptions),
    methodsSourcesHTML(methodsSources),
    implementationChecklistHTML(implementationChecklist),
    decisionFrameworkHTML(decisionFramework),
    resourceRequirementsHTML(resourceRequirements),
  ]
    .filter(Boolean)
    .join("\n");

  if (!content) return "";

  // Inject TYPE_SWITCH_SCRIPT once at the end for appendix chart type dropdowns
  // (safe even if no appendix charts are currently rendered).
  return `${content}
<script>${TYPE_SWITCH_SCRIPT}</script>`;
}

export {
  chartersHTML,
  raciHTML,
  raidHTML,
  benefitsHTML,
  plan100HTML,
  pilotHTML,
  assumptionsHTML,
  methodsSourcesHTML,
  implementationChecklistHTML,
  decisionFrameworkHTML,
  resourceRequirementsHTML,
  buildAllAppendices,
};
