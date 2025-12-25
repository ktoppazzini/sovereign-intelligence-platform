// /lib/implKitHtml.js


import { barChartHTML } from "./reportGraphs.js";

export const IMPLKIT_CSS = `
.appendix{break-inside:avoid;margin:12px 0;background:#091621;border-radius:12px;padding:12px}
.appendix h3{margin:.25rem 0 .5rem}
.table{width:100%;border-collapse:collapse}
.table th,.table td{border:1px solid rgba(230,240,255,.15);padding:6px 8px;vertical-align:top}
.table th{background:#0E2A44;text-align:left}
.small{font-size:.9rem;opacity:.95}
.note{opacity:.8}
`;

// Helper to render a type dropdown for chart type selection
function chartTypeDropdown(id, currentType = "bar") {
  return `
    <label for="${id}-type" class="small" style="margin-right:8px;">Type:</label>
    <select id="${id}-type" class="chart-type-dropdown" style="margin-bottom:8px;">
      <option value="bar"${currentType === "bar" ? " selected" : ""}>Bar</option>
      <option value="column"${currentType === "column" ? " selected" : ""}>Column</option>
      <option value="line"${currentType === "line" ? " selected" : ""}>Line</option>
      <option value="area"${currentType === "area" ? " selected" : ""}>Area</option>
    </select>
    <script>
      (function() {
        var sel = document.getElementById('${id}-type');
        if (sel && !sel.dataset.bound) {
          sel.dataset.bound = "1";
          sel.addEventListener('change', function(e) {
            var type = e.target.value;
            var event = new CustomEvent('appendix-chart-type-change', { detail: { id: '${id}', type } });
            window.dispatchEvent(event);
          });
        }
      })();
    </script>
    <style>
      .appendix-chart-title {
        font-size: 1.25rem;
        font-weight: bold;
        margin-bottom: 8px;
        text-align: center;
      }
      .appendix-chart-x-title, .appendix-chart-y-title {
        font-size: 1.1rem !important;
        font-weight: 500;
        white-space: normal !important;
        word-break: break-word;
      }
      .appendix-chart-x-axis .tick text {
        writing-mode: initial !important;
        text-anchor: middle !important;
        font-size: 1rem !important;
        white-space: normal !important;
        word-break: break-word;
      }
    </style>
  `;
}
const esc = (s='') => {
  try {
    return String(s).replace(/[&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  } catch {
    return '';
  }
}

function chartersHTML(charters=[]) {
  if (!Array.isArray(charters)) charters = [];
  return `
  <section class="appendix">
    <h3>Appendix A — Initiative Charters</h3>
    ${charters.map(c => {
      if (!c || typeof c !== 'object') c = {};
      return `
      <h4>${esc(c.name || "")}</h4>
      <table class="table small">
        <tr><th style="width:22%">Objective</th><td>${esc(c.objective || "")}</td></tr>
        <tr><th>Scope (In)</th><td>${esc(c.scopeIn || "")}</td></tr>
        <tr><th>Scope (Out)</th><td>${esc(c.scopeOut || "")}</td></tr>
        <tr><th>Owner & Stakeholders</th><td><strong>${esc(c.owner || "")}</strong>; ${esc((c.stakeholders||[]).join(", "))}</td></tr>
        <tr><th>Milestones</th><td>${(c.milestones||[]).map(m=>`${esc(m && m.milestone || "")} — <em>${esc(m && m.due || "")}</em>`).join("<br/>")}</td></tr>
        <tr><th>KPIs</th><td>${(c.kpis||[]).map(k=>`${esc(k && k.kpi || "")}: ${esc(k && k.baseline || "")} → <strong>${esc(k && k.target || "")}</strong>${k && k.source?` (src: ${esc(k.source)})`:""}`).join("<br/>")}</td></tr>
        <tr><th>Risks</th><td>${(c.risks||[]).map(r=>`${esc(r && r.risk || "")} — Mitigation: ${esc(r && r.mitigation || "")} (Owner: ${esc(r && r.owner || "")})`).join("<br/>")}</td></tr>
        <tr><th>Budget</th><td>${esc(c.budgetSummary||"")}</td></tr>
        <tr><th>Acceptance</th><td>${esc(c.acceptanceCriteria||"")}</td></tr>
      </table>
      <div class="note">Tip: copy as a one-pager per store/workstream.</div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:12px 0"/>
      `;
    }).join("")}
  </section>`;
}

// (rest of your functions...)


function decisionFrameworkHTML(model = {}) {
  const items = Array.isArray(model.items) && model.items.length > 0 ? model.items : [];
  if (!items.length) {
    if (typeof console !== 'undefined') {
      if (!Array.isArray(model.items)) {
        console.log('[APPENDIX-J] Not added: model.items is not an array', { model });
      } else {
        console.log('[APPENDIX-J] Not added: items array is empty', { model });
      }
    }
    // Commented out fallback: return '';
    return '';
  } else {
    if (typeof console !== 'undefined') {
      console.log('[APPENDIX-J] Added: items present', { count: items.length });
    }
  }
    // [KT:SURGICAL:APPENDIX-TABLE-STYLE-FIX] Appendix J (Decision Framework) table style enforced as 'table report-table'.
  const rows = items.map(item => `
    <tr>
      <td>${esc(item && item.decision || "")}</td>
      <td>${esc(item && item.criteria || "")}</td>
      <td>${esc(item && item.options || "")}</td>
      <td>${esc(item && item.recommendation || "")}</td>
      <td>${esc(item && item.rationale || "")}</td>
      <td>${esc(item && item.owner || "")}</td>
      <td>${esc(item && item.status || "")}</td>
    </tr>
  `).join("");
  // [KT:SURGICAL:APPENDIX-TABLE-STYLE-FIX] Commented out old class, enforced 'table small' for style consistency
  // <table class="appendix-table">
  // [KT:SURGICAL:APPENDIX-TABLE-STYLE-FIX] Enforce 'table report-table' for style consistency
  return `
  <section class="appendix">
    <h3>Appendix J — Decision Framework</h3>
    <table class="table report-table small">
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

function resourceRequirementsHTML(model = {}) {
  const items = Array.isArray(model.items) && model.items.length > 0 ? model.items : [];
  if (!items.length) {
    if (typeof console !== 'undefined') {
      if (!Array.isArray(model.items)) {
        console.log('[APPENDIX-K] Not added: model.items is not an array', { model });
      } else {
        console.log('[APPENDIX-K] Not added: items array is empty', { model });
      }
    }
    // Commented out fallback: return '';
    return '';
  } else {
    if (typeof console !== 'undefined') {
      console.log('[APPENDIX-K] Added: items present', { count: items.length });
    }
  }
  const rows = items.map(item => `
    <tr>
      <td>${esc(item && item.resource || "")}</td>
      <td>${esc(item && item.role || "")}</td>
      <td>${esc(item && item.quantity || "")}</td>
      <td>${esc(item && item.duration || "")}</td>
      <td>${esc(item && item.cost || "")}</td>
      <td>${esc(item && item.notes || "")}</td>
    </tr>
  `).join("");
  // [KT:SURGICAL:APPENDIX-TABLE-STYLE-FIX] Commented out old class, enforced 'table small' for style consistency
  // <table class="appendix-table">
  // [KT:SURGICAL:APPENDIX-TABLE-STYLE-FIX] Enforce 'table report-table' for style consistency
  return `
  <section class="appendix">
    <h3>Appendix K — Resource Requirements</h3>
    <table class="table report-table">
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

function raciHTML(model) {
  const rows = (model && Array.isArray(model.items) ? model.items : []).map(x=>`
    <tr>
      <td>${esc(x && x.decision || "")}</td>
      <td>${esc(x && x.R || "")}</td>
      <td>${esc(x && x.A || "")}</td>
      <td>${esc((x && x.C||[]).join(", "))}</td>
      <td>${esc((x && x.I||[]).join(", "))}</td>
      <td>${esc(x && x.SLA || "")}</td>
    </tr>
  `).join("");
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

// Appendix I — Implementation Checklist (like raidHTML but for checklist)
// Duplicate function removed to avoid redeclaration error.

function raidHTML(model) {
  const rows = (model && Array.isArray(model.items) ? model.items : []).map(x=>`
    <tr><td>${esc(x && x.type || "")}</td><td>${esc(x && x.description || "")}</td><td>${esc(x && x.owner || "")}</td><td>${esc(x && x.impact || "")}</td><td>${esc(x && x.probability||"")}</td><td>${esc(x && x.trigger||"")}</td><td>${esc(x && x.mitigation||"")}</td><td>${esc(x && x.status||"")}</td><td>${esc(x && x.nextReview||"")}</td></tr>
  `).join("");
  return `
  <section class="appendix">
    <h3>Appendix C — RAID (Risks, Assumptions, Issues, Dependencies)</h3>
    <table class="table small">
      <thead><tr><th>Type</th><th>Description</th><th>Owner</th><th>Impact</th><th>Prob.</th><th>Trigger</th><th>Mitigation</th><th>Status</th><th>Next review</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function benefitsHTML(model) {
  const lines = (model && Array.isArray(model.lines) ? model.lines : []);
  if (!lines.length) return '';
  const rows = lines.map(l=>`
    <tr>
      <td>${esc(l && l.workstream || "")}</td><td>${esc(l && l.lever || "")}</td><td>${esc(l && l.unitAssumption || "")}</td><td>${esc(l && l.source||"")}</td>
      <td style="text-align:right">${esc(l && l.volume || "")}</td><td style="text-align:right">${esc(l && l.rate || "")}</td>
      <td style="text-align:right"><strong>${esc(l && l.monthlyImpact || "")}</strong></td>
      <td>${esc(l && l.confidence || "")}</td><td>${esc(l && l.startMonth || "")}</td><td>${esc(l && l.runRateMonth || "")}</td>
      <td style="text-align:right">${esc(l && l.oneOffCost || "")}</td>
    </tr>
  `).join("");
  const totals = lines.reduce((a,b)=>a+(+b.monthlyImpact||0),0);
  // Chart type selector for Monthly Value Bridge
  const bridgeChartId = "monthly-value-bridge";
  const bridgeTypeSelect = `
    <label for="${bridgeChartId}-type" class="small" style="margin-right:8px;">Chart type:</label>
    <select id="${bridgeChartId}-type" class="chart-type-select" aria-label="Chart type" style="margin-bottom:8px;">
      <option value="line" selected>Line</option>
      <option value="bar">Bar</option>
      <option value="pie">Pie</option>
      <option value="doughnut">Doughnut</option>
    </select>
    <script>
      (function() {
        var sel = document.getElementById('${bridgeChartId}-type');
        if (sel && !sel.dataset.bound) {
          sel.dataset.bound = "1";
          sel.addEventListener('change', function(e) {
            var type = e.target.value;
            var event = new CustomEvent('monthly-value-bridge-type-change', { detail: { id: '${bridgeChartId}', type } });
            window.dispatchEvent(event);
          });
        }
      })();
    </script>
  `;
  const bridge = `
    <div style="margin:12px 0;">
      ${bridgeTypeSelect}
      ${barChartHTML({
        title:"Monthly Value Bridge",
        labels:lines.map(l=>l.lever || "").slice(0,6),
        series:lines.map(l=>+l.monthlyImpact||0).slice(0,6),
        xTitle:"Levers", yTitle:"$/month", type:"line"
      })}
    </div>
  `;

  return `
  <section class="appendix">
    <h3>Appendix D — Benefits Realization Model</h3>
    <table class="table small">
      <thead>
        <tr><th>Workstream</th><th>Lever</th><th>Unit Assumption</th><th>Source</th><th>Volume</th><th>Rate</th><th>Monthly $</th><th>Confidence</th><th>Start</th><th>Run-rate</th><th>One-off $</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="small">Total monthly impact (estimated): <strong>$${totals.toLocaleString()}</strong></p>
    ${bridge}
  </section>`;
}

function plan100HTML(model) {
  const rows = (model && Array.isArray(model.weeks) ? model.weeks : []).map(w=>`
    <tr><td>${esc(w && w.week || "")}</td><td>${esc(w && w.workstream || "")}</td><td>${esc(w && w.task || "")}</td><td>${esc(w && w.owner || "")}</td><td>${esc(w && w.status || "")}</td></tr>
  `).join("");
  return `
  <section class="appendix">
    <h3>Appendix E — 100-Day Plan (Week by Week)</h3>
    <table class="table small">
      <thead><tr><th>Week</th><th>Workstream</th><th>Task</th><th>Owner</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function pilotHTML(model = {}) {
  return `
  <section class="appendix">
    <h3>Appendix F — Pilot Charter</h3>
    <table class="table small">
      <tr><th style="width:22%">Pilot</th><td>${esc(model && model.name || "")}</td></tr>
      <tr><th>Locations</th><td>${esc(String((model && model.locations) || ""))}</td></tr>
      <tr><th>Success KPIs</th><td>${esc((model && model.successKPIs||[]).join(", "))}</td></tr>
      <tr><th>Thresholds</th><td>${esc((model && model.thresholds||[]).join("; "))}</td></tr>
      <tr><th>Sample Design</th><td>${esc(model && model.sampleDesign || "")}</td></tr>
      <tr><th>Rollback Criteria</th><td>${esc(model && model.rollbackCriteria || "")}</td></tr>
    </table>
  </section>`;
}

function assumptionsHTML(model) {
  const rows = (model && Array.isArray(model.items) ? model.items : []).map(a=>`
    <tr>
      <td>${esc(a && a.name || "")}</td>
      <td>${a && a.low!=null?esc(a.low):""}</td>
      <td><strong>${esc(a && a.value || "")}</strong>${a && a.unit?` ${esc(a.unit)}`:""}</td>
      <td>${a && a.high!=null?esc(a.high):""}</td>
      <td>${esc(a && a.note||"")}</td>
    </tr>
  `).join("");
  return `
  <section class="appendix">
    <h3>Appendix G — Assumptions & Ranges</h3>
    <table class="table small">
      <thead><tr><th>Assumption</th><th>Low</th><th>Value</th><th>High</th><th>Note</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function methodsSourcesHTML({ benchmarks=[], sources=[] } = {}) {
  return `
  <section class="appendix">
    <h3>Appendix H — Methods & Sources</h3>
    <p class="small">Benchmarks were normalized for region and time; assumptions have documented ranges and sensitivity reviewed by Finance.</p>
    <table class="table small">
      <thead><tr><th>Benchmark</th><th>Source</th><th>Date</th><th>Normalization notes</th></tr></thead>
      <tbody>
        ${(Array.isArray(benchmarks) ? benchmarks : []).map(b=>`<tr><td>${esc(b && b.name || "")}</td><td>${esc(b && b.source || "")}</td><td>${esc(b && b.date||"")}</td><td>${esc(b && b.notes||"")}</td></tr>`).join("")}
      </tbody>
    </table>
    <p class="small">Additional sources: ${(Array.isArray(sources) ? sources : []).map(s=>esc(s)).join("; ")}</p>
  </section>`;
}

function implementationChecklistHTML(model = {}) {
  const items = Array.isArray(model.items) && model.items.length > 0 ? model.items : [];
  if (!items.length) {
    if (typeof console !== 'undefined') {
      if (!Array.isArray(model.items)) {
        console.log('[APPENDIX-I] Not added: model.items is not an array', { model });
      } else {
        console.log('[APPENDIX-I] Not added: items array is empty', { model });
      }
    }
    // Commented out fallback: return '';
    return '';
  } else {
    if (typeof console !== 'undefined') {
      console.log('[APPENDIX-I] Added: items present', { count: items.length });
    }
  }
  // [KT:SURGICAL:APPENDIX-TABLE-STYLE-FIX] Uncommented and enforced 'table small' for style consistency
  const rows = items.map(item => `
    <tr>
      <td>${esc(item && item.task || "")}</td>
      <td>${esc(item && item.owner || "")}</td>
      <td>${esc(item && item.dueDate || "")}</td>
      <td>${esc(item && item.status || "")}</td>
      <td>${esc(item && item.notes || "")}</td>
    </tr>
  `).join("");
  // Calculate total completed tasks and total tasks
  const totalTasks = items.length;
  const completedTasks = items.filter(item => {
    const s = (item.status || "").toLowerCase();
    return s === "complete" || s === "completed";
  }).length;

  // [KT:SURGICAL:APPENDIX-TABLE-STYLE-FIX] Enforce 'table report-table' for style consistency and correct columns for Implementation Checklist
  return `
  <section class="appendix">
    <h3>Appendix I — Implementation Checklist</h3>
    <table class="table report-table">
      <thead>
        <tr>
          <th>Phase</th>
          <th>Activities</th>
          <th>Owner</th>
          <th>Success Criteria</th>
        </tr>
      </thead>
      <tbody>
        ${model.items && model.items.length > 0 ? model.items.map(item => `
          <tr>
            <td>${esc(item.phase || "")}</td>
            <td>${Array.isArray(item.activities) ? item.activities.join('<br>') : ''}</td>
            <td>${esc(item.owner || "")}</td>
            <td>${esc(item.successCriteria || "")}</td>
          </tr>
        `).join('') : ''}
      </tbody>
    </table>
    <p class="small">Total tasks: <strong>${totalTasks}</strong> &nbsp;|&nbsp; Completed: <strong>${completedTasks}</strong></p>
  </section>`;
}

// Helper to build all appendix sections A–K, always rendering each section (even if empty)
function buildAllAppendices({charters, raci, raid, benefits, plan100, pilot, assumptions, methodsSources, implementationChecklist, decisionFramework, resourceRequirements}) {
  return [
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
    resourceRequirementsHTML(resourceRequirements)
  ].join('\n');
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
  buildAllAppendices
}
