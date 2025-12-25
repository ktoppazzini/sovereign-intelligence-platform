// /lib/implKitHtml.js
import { barChartHTML } from "./reportGraphs.js";

export const IMPLKIT_CSS = `
.appendix{break-inside:avoid;margin:12px 0;background:#091621;border-radius:12px;padding:12px}
.appendix h3{margin:.25rem 0 .5rem}
.table{width:100%;border-collapse:collapse;background:#000;color:#fff}
.table th,.table td{border:1px solid #fff;padding:6px 8px;vertical-align:top}
.table th{background:#111;text-align:left;font-weight:800;color:#fff}
.small{font-size:.9rem;opacity:.95}
.note{opacity:.8}
`;

const esc = (s='') => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// A — Charters
export function chartersHTML(charters=[], L={}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    projectCharters: L.projectCharters || "Initiative Charters",
    objective: L.objective || "Objective",
    scopeIn: L.scopeIn || "Scope (In)",
    scopeOut: L.scopeOut || "Scope (Out)",
    ownerStakeholders: L.ownerStakeholders || "Owner & Stakeholders",
    milestones: L.milestones || "Milestones",
    kpis: L.kpis || "KPIs",
    risks: L.risks || "Risks",
    mitigation: L.mitigation || "Mitigation",
    owner: L.owner || "Owner",
    budget: L.budget || "Budget",
    acceptance: L.acceptance || "Acceptance",
    tip: L.tip || "Tip: copy as a one-pager per store/workstream."
  };
  
  return `
  <section class="appendix">
    <h3>${labels.appendix} A — ${labels.projectCharters}</h3>
    ${charters.map(c => `
      <h4>${esc(c.name)}</h4>
      <table class="table small">
        <tr><th style="width:22%">${labels.objective}</th><td>${esc(c.objective)}</td></tr>
        <tr><th>${labels.scopeIn}</th><td>${esc(c.scopeIn)}</td></tr>
        <tr><th>${labels.scopeOut}</th><td>${esc(c.scopeOut)}</td></tr>
        <tr><th>${labels.ownerStakeholders}</th><td><strong>${esc(c.owner)}</strong>; ${esc((c.stakeholders||[]).join(", "))}</td></tr>
        <tr><th>${labels.milestones}</th><td>${(c.milestones||[]).map(m=>`${esc(m.milestone)} — <em>${esc(m.due)}</em>`).join("<br/>")}</td></tr>
        <tr><th>${labels.kpis}</th><td>${(c.kpis||[]).map(k=>`${esc(k.kpi)}: ${esc(k.baseline)} → <strong>${esc(k.target)}</strong>${k.source?` (src: ${esc(k.source)})`:""}`).join("<br/>")}</td></tr>
        <tr><th>${labels.risks}</th><td>${(c.risks||[]).map(r=>`${esc(r.risk)} — ${labels.mitigation}: ${esc(r.mitigation)} (${labels.owner}: ${esc(r.owner)})`).join("<br/>")}</td></tr>
        <tr><th>${labels.budget}</th><td>${esc(c.budgetSummary||"")}</td></tr>
        <tr><th>${labels.acceptance}</th><td>${esc(c.acceptanceCriteria||"")}</td></tr>
      </table>
      <div class="note">${labels.tip}</div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:12px 0"/>
    `).join("")}
  </section>`;
}

// J — Resource Requirements
export function resourceRequirementsHTML(model = {}, L = {}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    resourceRequirements: L.resourceRequirements || "Resource Requirements",
    role: L.role || "Role",
    fte: L.fte || "FTE",
    start: L.start || "Start",
    end: L.end || "End",
    notes: L.notes || "Notes"
  };

  const rows = (model?.items || []).map(item => `
    <tr>
      <td>${esc(item.role)}</td>
      <td>${esc(item.fte)}</td>
      <td>${esc(item.start)}</td>
      <td>${esc(item.end)}</td>
      <td>${esc(item.notes || "")}</td>
    </tr>
  `).join("");

  return `
  <section class="appendix">
    <h3>${labels.appendix} J — ${labels.resourceRequirements}</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>${labels.role}</th>
          <th>${labels.fte}</th>
          <th>${labels.start}</th>
          <th>${labels.end}</th>
          <th>${labels.notes}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// H — Methods & Sources
export function methodsSourcesHTML(model = {}, L = {}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    methodsSources: L.methodsSources || "Methods & Sources",
    method: L.method || "Method",
    source: L.source || "Source",
    notes: L.notes || "Notes"
  };

  const rows = (model?.items || []).map(m => `
    <tr>
      <td>${esc(m.method)}</td>
      <td>${esc(m.source)}</td>
      <td>${esc(m.notes || "")}</td>
    </tr>
  `).join("");

  return `
  <section class="appendix">
    <h3>${labels.appendix} H — ${labels.methodsSources}</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>${labels.method}</th>
          <th>${labels.source}</th>
          <th>${labels.notes}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// F — Pilot (add this function if missing)
export function pilotHTML(model = {}, L = {}) {
  // [KT:AUDIT:APPENDIX-F] Logging model data for Appendix F (Pilot) for auditability and debugging
  /* [KT:AUDIT:APPENDIX-F] If Appendix F (Pilot) is missing or not receiving data, check the model value below. This log is for auditability and debugging only. */
  console.log('[KT:AUDIT][pilotHTML] model:', model);
  const labels = {
    appendix: L.appendix || "Appendix",
    pilot: L.pilot || "Pilot",
    description: L.description || "Description",
    owner: L.owner || "Owner",
    status: L.status || "Status"
  };

  const rows = (model?.items || []).map(p => `
    <tr>
      <td>${esc(p.description)}</td>
      <td>${esc(p.owner)}</td>
      <td>${esc(p.status)}</td>
    </tr>
  `).join("");

  return `
  <section class="appendix">
    <h3>${labels.appendix} F — ${labels.pilot}</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>${labels.description}</th>
          <th>${labels.owner}</th>
          <th>${labels.status}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// B — RACI
export function raciHTML(model, L={}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    raciMatrix: L.raciMatrix || "RACI & Decision SLAs",
    decision: L.decision || "Decision"
  };
  
  const rows = (model?.items||[]).map(x=>`
    <tr><td>${esc(x.decision)}</td><td>${esc(x.R)}</td><td>${esc(x.A)}</td><td>${esc((x.C||[]).join(", "))}</td><td>${esc((x.I||[]).join(", "))}</td><td>${esc(x.SLA)}</td></tr>
  `).join("");
  return `
  <section class="appendix">
    <h3>${labels.appendix} B — ${labels.raciMatrix}</h3>
    <table class="table small">
      <thead><tr><th>${labels.decision}</th><th>R</th><th>A</th><th>C</th><th>I</th><th>SLA</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// C — RAID
export function raidHTML(model, L={}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    raidLog: L.raidLog || "RAID (Risks, Assumptions, Issues, Dependencies)",
    type: L.type || "Type",
    description: L.description || "Description",
    owner: L.owner || "Owner",
    impact: L.impact || "Impact",
    probability: L.probability || "Prob.",
    trigger: L.trigger || "Trigger",
    mitigation: L.mitigation || "Mitigation",
    status: L.status || "Status",
    nextReview: L.nextReview || "Next review"
  };
  
  const rows = (model?.items||[]).map(x=>`
    <tr><td>${esc(x.type)}</td><td>${esc(x.description)}</td><td>${esc(x.owner)}</td><td>${esc(x.impact)}</td><td>${esc(x.probability||"")}</td><td>${esc(x.trigger||"")}</td><td>${esc(x.mitigation||"")}</td><td>${esc(x.status||"")}</td><td>${esc(x.nextReview||"")}</td></tr>
  `).join("");
  return `
  <section class="appendix">
    <h3>${labels.appendix} C — ${labels.raidLog}</h3>
    <table class="table small">
      <thead><tr><th>${labels.type}</th><th>${labels.description}</th><th>${labels.owner}</th><th>${labels.impact}</th><th>${labels.probability}</th><th>${labels.trigger}</th><th>${labels.mitigation}</th><th>${labels.status}</th><th>${labels.nextReview}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// D — Benefits Model (+ small value bridge using existing barChart)
export function benefitsHTML(model, currency = '$', L={}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    benefitsRealization: L.benefitsRealization || "Benefits Realization Model",
    workstream: L.workstream || "Workstream",
    lever: L.lever || "Lever",
    unitAssumption: L.unitAssumption || "Unit Assumption",
    source: L.source || "Source",
    volume: L.volume || "Volume",
    rate: L.rate || "Rate",
    monthlyImpact: L.monthlyImpact || "Monthly",
    confidence: L.confidence || "Confidence",
    start: L.start || "Start",
    runRate: L.runRate || "Run-rate",
    oneOffCost: L.oneOffCost || "One-off",
    totalMonthlyImpact: L.totalMonthlyImpact || "Total monthly impact (estimated)"
  };
  
  const rows = (model?.lines||[]).map(l=>`
    <tr>
      <td>${esc(l.workstream)}</td><td>${esc(l.lever)}</td><td>${esc(l.unitAssumption)}</td><td>${esc(l.source||"")}</td>
      <td style="text-align:right">${esc(l.volume)}</td><td style="text-align:right">${esc(l.rate)}</td>
      <td style="text-align:right"><strong>${esc(l.monthlyImpact)}</strong></td>
      <td>${esc(l.confidence)}</td><td>${esc(l.startMonth)}</td><td>${esc(l.runRateMonth)}</td>
      <td style="text-align:right">${esc(l.oneOffCost)}</td>
    </tr>
  `).join("");
  const totals = (model?.lines||[]).reduce((a,b)=>a+(+b.monthlyImpact||0),0);

  // Chart dropdown logic
  const chartTypes = ["bar","line","pie","doughnut"];
  let selectedType = "bar";
  // Optionally, allow passing a preferred type via model or L
  if (model?.chartType && chartTypes.includes(model.chartType)) selectedType = model.chartType;

  // Only generate chart if we have data
  const hasData = (model?.lines||[]).length > 0 && (model?.lines||[]).some(l => +l.monthlyImpact > 0);
  let chartHTML = "";
  if (hasData) {
    // Dropdown UI
    const dropdown = `<div class="chart-ui"><label for="benefits-type">Type:</label> <select id="benefits-type" class="chart-type-switch">${chartTypes.map(t=>`<option value=\"${t}\"${t===selectedType?" selected":""}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join("")}</select></div>`;
    // Chart figure
    chartHTML = `
      <figure class="chart-card" data-chart='{"title":"Monthly Value Bridge (illustrative)","labels":${JSON.stringify((model?.lines||[]).map(l=>l.lever).slice(0,6))},"series":${JSON.stringify((model?.lines||[]).map(l=>+l.monthlyImpact||0).slice(0,6))},"xTitle":"Levers","yTitle":"${currency}/month","type":"${selectedType}"}'>
        <figcaption><span class="chart-title">Monthly Value Bridge (illustrative)</span>${dropdown}</figcaption>
        <div class="canvas-wrap">
          <!-- Chart SVG will be injected here by chart renderer -->
        </div>
      </figure>
    `;
  }

  // [KT:AUDIT:APPENDIX-PREDICTIVE] Logging chartHTML for Appendix D (Benefits Realization) for auditability and debugging
  /* [KT:AUDIT:APPENDIX-PREDICTIVE] If the predictive analytic graph is missing or incorrect in the appendix, check the chartHTML value below. This log is for auditability and debugging only. */
  console.log('[KT:AUDIT][benefitsHTML] chartHTML:', chartHTML);
  return `
  <section class="appendix">
    <h3>${labels.appendix} D — ${labels.benefitsRealization}</h3>
    <table class="table small">
      <thead>
        <tr><th>${labels.workstream}</th><th>${labels.lever}</th><th>${labels.unitAssumption}</th><th>${labels.source}</th><th>${labels.volume}</th><th>${labels.rate}</th><th>${labels.monthlyImpact} ${currency}</th><th>${labels.confidence}</th><th>${labels.start}</th><th>${labels.runRate}</th><th>${labels.oneOffCost} ${currency}</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="small">${labels.totalMonthlyImpact}: <strong>${currency}${totals.toLocaleString()}</strong></p>
    ${chartHTML}
  </section>`;
}

// E — 100-Day Plan
export function plan100HTML(model, currency = '$', L={}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    day100Plan: L.day100Plan || "First 100 Days Plan",
    week: L.week || "Week",
    workstream: L.workstream || "Workstream",
    task: L.task || "Task",
    owner: L.owner || "Owner",
    status: L.status || "Status"
  };
  
  const rows = (model?.weeks||[]).map(w=>`
    <tr><td>${esc(w.week)}</td><td>${esc(w.workstream)}</td><td>${esc(w.task)}</td><td>${esc(w.owner)}</td><td>${esc(w.status)}</td></tr>
  `).join("");
  return `
  <section class="appendix">
    <h3>${labels.appendix} E — ${labels.day100Plan}</h3>
    <table class="table small">
      <thead><tr><th>${labels.week}</th><th>${labels.workstream}</th><th>${labels.task}</th><th>${labels.owner}</th><th>${labels.status}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// G — Assumptions
export function assumptionsHTML(model = {}, L = {}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    assumptions: L.assumptions || "Assumptions",
    description: L.description || "Description",
    owner: L.owner || "Owner",
    status: L.status || "Status"
  };

  const rows = (model?.items || []).map(a => `
    <tr>
      <td>${esc(a.description)}</td>
      <td>${esc(a.owner)}</td>
      <td>${esc(a.status)}</td>
    </tr>
  `).join("");

  return `
  <section class="appendix">
    <h3>${labels.appendix} G — ${labels.assumptions}</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>${labels.description}</th>
          <th>${labels.owner}</th>
          <th>${labels.status}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// H — Implementation Checklist
export function implementationChecklistHTML(model = {}, L = {}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    implementationChecklist: L.implementationChecklist || "Implementation Checklist",
    task: L.task || "Task",
    owner: L.owner || "Owner",
    status: L.status || "Status"
  };

  const rows = (model?.items || []).map(item => `
    <tr>
      <td>${esc(item.task)}</td>
      <td>${esc(item.owner)}</td>
      <td>${esc(item.status)}</td>
    </tr>
  `).join("");

  return `
  <section class="appendix">
    <h3>${labels.appendix} H — ${labels.implementationChecklist}</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>${labels.task}</th>
          <th>${labels.owner}</th>
          <th>${labels.status}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// I — Decision Framework
export function decisionFrameworkHTML(model = {}, L = {}) {
  const labels = {
    appendix: L.appendix || "Appendix",
    decisionFramework: L.decisionFramework || "Decision Framework",
    criteria: L.criteria || "Criteria",
    weight: L.weight || "Weight",
    options: L.options || "Options",
    score: L.score || "Score",
    rationale: L.rationale || "Rationale"
  };

  const rows = (model?.items || []).map(item => `
    <tr>
      <td>${esc(item.criteria)}</td>
      <td>${esc(item.weight)}</td>
      <td>${esc(item.options)}</td>
      <td>${esc(item.score)}</td>
      <td>${esc(item.rationale)}</td>
    </tr>
  `).join("");

  return `
  <section class="appendix">
    <h3>${labels.appendix} I — ${labels.decisionFramework}</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>${labels.criteria}</th>
          <th>${labels.weight}</th>
          <th>${labels.options}</th>
          <th>${labels.score}</th>
          <th>${labels.rationale}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}
