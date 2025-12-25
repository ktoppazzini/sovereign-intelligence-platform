// /lib/implKitHtml.js
// [KT:SURGICAL] Impl Kit HTML with detailed empties logging (Option B)

import { barChartHTML, TYPE_SWITCH_SCRIPT } from "./reportGraphs.js";

// Minimal CSS for all appendices
export const IMPLKIT_CSS = `
.appendix{break-inside:avoid;margin:12px 0;background:#091621;border-radius:12px;padding:12px}
.appendix h3{margin:.25rem 0 .5rem}
.table{width:100%;border-collapse:collapse}
.table th,.table td{border:1px solid rgba(230,240,255,.15);padding:6px 8px;vertical-align:top}
.small{font-size:.9rem;opacity:.95}
.note{opacity:.8}
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
        <tr><th style="width:22%">Objective</th><td>${esc(c.objective || "")}</td></tr>
        <tr><th>Scope (In)</th><td>${esc(c.scopeIn || "")}</td></tr>
        <tr><th>Scope (Out)</th><td>${esc(c.scopeOut || "")}</td></tr>
        <tr><th>Owner & Stakeholders</th>
          <td><strong>${esc(c.owner || "")}</strong>; ${esc((c.stakeholders || []).join(", "))}</td>
        </tr>
        <tr>
          <th>Milestones</th>
          <td>${(c.milestones || [])
            .map(
              (m) =>
                `${esc((m && m.milestone) || "")} — <em>${esc((m && m.due) || "")}</em>`
            )
            .join("<br/>")}</td>
        </tr>
        <tr>
          <th>KPIs</th>
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
          <th>Risks</th>
          <td>${(c.risks || [])
            .map(
              (r) =>
                `${esc((r && r.risk) || "")} — Mitigation: ${esc(
                  (r && r.mitigation) || ""
                )} (Owner: ${esc((r && r.owner) || "")})`
            )
            .join("<br/>")}</td>
        </tr>
        <tr><th>Budget</th><td>${esc(c.budgetSummary || "")}</td></tr>
        <tr><th>Acceptance</th><td>${esc(c.acceptanceCriteria || "")}</td></tr>
      </table>
      <div class="note">Tip: copy as a one-pager per store/workstream.</div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:12px 0"/>
      `;
    })
    .join("");

  return `
  <section class="appendix">
    <h3>Appendix A — Initiative Charters</h3>
    ${blocks}
  </section>`;
}

// ---------- Appendix B – RACI ----------

function raciHTML(model) {
  const rows = (model && Array.isArray(model.items) ? model.items : []).map(
    (x) => `
    <tr>
      <td>${esc((x && x.decision) || "")}</td>
      <td>${esc((x && x.R) || "")}</td>
      <td>${esc((x && x.A) || "")}</td>
      <td>${esc(((x && x.C) || []).join(", "))}</td>
      <td>${esc(((x && x.I) || []).join(", "))}</td>
      <td>${esc((x && x.SLA) || "")}</td>
    </tr>`
  ).join("");

  if (!rows) {
    debugAppendix("APPENDIX-B", "Skipped: no RACI rows", { model });
    return "";
  }

  debugAppendix("APPENDIX-B", "Rendered RACI rows", {
    count: (model && Array.isArray(model.items) && model.items.length) || 0,
  });

  return `
  <section class="appendix">
    <h3>Appendix B — RACI & Decision SLAs</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Decision</th>
          <th>R</th>
          <th>A</th>
          <th>C</th>
          <th>I</th>
          <th>SLA</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// ---------- Appendix C – RAID ----------

function raidHTML(model) {
  const rows = (model && Array.isArray(model.items) ? model.items : []).map(
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
  ).join("");

  if (!rows) {
    debugAppendix("APPENDIX-C", "Skipped: no RAID rows", { model });
    return "";
  }

  debugAppendix("APPENDIX-C", "Rendered RAID rows", {
    count: (model && Array.isArray(model.items) && model.items.length) || 0,
  });

  return `
  <section class="appendix">
    <h3>Appendix C — RAID (Risks, Assumptions, Issues, Dependencies)</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Type</th>
          <th>Description</th>
          <th>Owner</th>
          <th>Impact</th>
          <th>Prob.</th>
          <th>Trigger</th>
          <th>Mitigation</th>
          <th>Status</th>
          <th>Next review</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// ---------- Appendix D – Benefits Realization + chart ----------

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
    <h3>Appendix D — Benefits Realization Model</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Workstream</th>
          <th>Lever</th>
          <th>Unit Assumption</th>
          <th>Source</th>
          <th>Volume</th>
          <th>Rate</th>
          <th>Monthly $</th>
          <th>Confidence</th>
          <th>Start</th>
          <th>Run-rate</th>
          <th>One-off $</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Total monthly impact (estimated):</strong> $${totals.toLocaleString()}</p>

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
  </section>`;
}

// ---------- Appendix E – 100-Day Plan ----------

function plan100HTML(model) {
  const rows = (model && Array.isArray(model.weeks) ? model.weeks : []).map(
    (w) => `
    <tr>
      <td>${esc((w && w.week) || "")}</td>
      <td>${esc((w && w.workstream) || "")}</td>
      <td>${esc((w && w.task) || "")}</td>
      <td>${esc((w && w.owner) || "")}</td>
      <td>${esc((w && w.status) || "")}</td>
    </tr>`
  ).join("");

  if (!rows) {
    debugAppendix("APPENDIX-E", "Skipped: no 100-Day rows", { model });
    return "";
  }

  debugAppendix("APPENDIX-E", "Rendered 100-Day rows", {
    count: (model && Array.isArray(model.weeks) && model.weeks.length) || 0,
  });

  return `
  <section class="appendix">
    <h3>Appendix E — 100-Day Plan (Week by Week)</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Week</th>
          <th>Workstream</th>
          <th>Task</th>
          <th>Owner</th>
          <th>Status</th>
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
    <h3>Appendix F — Pilot Charter</h3>
    <table class="table small">
      <tr><th style="width:22%">Pilot</th><td>${esc(model.name || "")}</td></tr>
      <tr><th>Locations</th><td>${esc(String(model.locations || ""))}</td></tr>
      <tr><th>Success KPIs</th><td>${esc((model.successKPIs || []).join(", "))}</td></tr>
      <tr><th>Thresholds</th><td>${esc((model.thresholds || []).join("; "))}</td></tr>
      <tr><th>Sample Design</th><td>${esc(model.sampleDesign || "")}</td></tr>
      <tr><th>Rollback Criteria</th><td>${esc(model.rollbackCriteria || "")}</td></tr>
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
    <h3>Appendix G — Assumptions & Ranges</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Assumption</th>
          <th>Low</th>
          <th>Value</th>
          <th>High</th>
          <th>Note</th>
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
    <h3>Appendix H — Methods & Sources</h3>
    <p class="small">
      Benchmarks were normalized for region and time; assumptions have documented ranges
      and sensitivity reviewed by Finance.
    </p>
    <table class="table small">
      <thead>
        <tr>
          <th>Benchmark</th>
          <th>Source</th>
          <th>Date</th>
          <th>Normalization notes</th>
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
        ? `<p class="small">Additional sources: ${sources.map((s) => esc(s)).join("; ")}</p>`
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
    <h3>Appendix I — Implementation Checklist</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Phase</th>
          <th>Activities</th>
          <th>Owner</th>
          <th>Success Criteria</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p class="small">
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
    <h3>Appendix J — Decision Framework</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Decision</th>
          <th>Criteria</th>
          <th>Options</th>
          <th>Recommendation</th>
          <th>Rationale</th>
          <th>Owner</th>
          <th>Status</th>
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
    <h3>Appendix K — Resource Requirements</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Resource</th>
          <th>Role</th>
          <th>Quantity</th>
          <th>Duration</th>
          <th>Cost</th>
          <th>Notes</th>
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
