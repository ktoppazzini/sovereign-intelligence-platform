// /lib/implKitHtml.js

// Minimal CSS for Appendix tables (A–K). Scoped so it only affects appendices.
export const IMPLKIT_CSS = `
.appendix{margin-top:32px;padding:24px;border-radius:12px;background:#050c17;border:1px solid rgba(255,255,255,.08)}
.appendix h3{margin:0 0 12px 0;font-size:18px;font-weight:700;color:#f9fafb;border-bottom:1px solid rgba(148,163,184,.4);padding-bottom:8px}
.table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;line-height:1.45}
.table th,.table td{padding:6px 8px;border-bottom:1px solid rgba(148,163,184,.3);text-align:left;vertical-align:top}
.table th.key-takeaways{background:#0E2A44;text-align:left}
.small{font-size:12px;color:#9ca3af;margin-top:8px}
.note{font-size:11px;color:#9ca3af;margin-top:6px}
`;

function esc(x){
  if (x === null || x === undefined) return "";
  return String(x)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function formatMoney(x) {
  if (x === null || x === undefined || x === "") return "";
  const n = Number(x);
  if (Number.isNaN(n)) return esc(x);
  return "$" + n.toLocaleString();
}

//
// ───────────────────────────────────────────
// Appendix A – Implementation Charters
// ───────────────────────────────────────────
//
function chartersHTML(model) {
  const rows = safeArray(model.items).map(x=>`
    <tr>
      <td>${esc(x.initiative)}</td>
      <td>${esc(x.objective)}</td>
      <td>${esc(x.owner)}</td>
      <td>${esc(x.timeline)}</td>
      <td>${esc(x.metrics)}</td>
    </tr>
  `).join("");

  if (!rows) return "";

  return `
  <section class="appendix">
    <h3>Appendix A — Implementation Charters</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Initiative</th>
          <th>Objective</th>
          <th>Owner</th>
          <th>Timeline</th>
          <th>Success metrics</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

//
// Appendix B – RACI
//
function raciHTML(model) {
  const rows = safeArray(model.items).map(x=>`
    <tr>
      <td>${esc(x.decision)}</td>
      <td>${esc(x.responsible)}</td>
      <td>${esc(x.accountable)}</td>
      <td>${esc(x.consulted)}</td>
      <td>${esc(x.informed)}</td>
    </tr>
  `).join("");

  if (!rows) return "";

  return `
  <section class="appendix">
    <h3>Appendix B — RACI (Decision Rights)</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Decision</th>
          <th>Responsible</th>
          <th>Accountable</th>
          <th>Consulted</th>
          <th>Informed</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

//
// Appendix C – RAID
//
function raidHTML(model) {
  const rows = safeArray(model.items).map(x=>`
    <tr>
      <td>${esc(x.type)}</td>
      <td>${esc(x.description)}</td>
      <td>${esc(x.owner)}</td>
      <td>${esc(x.impact)}</td>
      <td>${esc(x.probability)}</td>
      <td>${esc(x.trigger)}</td>
      <td>${esc(x.mitigation)}</td>
      <td>${esc(x.status)}</td>
    </tr>
  `).join("");

  if (!rows) return "";

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
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

//
// Appendix D – Benefits Realization
//
function benefitsHTML(model) {
  const lines = safeArray(model.lines);
  if (!lines.length) return "";

  const rows = lines.map(l=>`
    <tr>
      <td>${esc(l.workstream)}</td>
      <td>${esc(l.lever)}</td>
      <td>${esc(l.unitAssumption)}</td>
      <td>${esc(l.source)}</td>
      <td style="text-align:right">${esc(l.volume)}</td>
      <td style="text-align:right">${esc(l.rate)}</td>
      <td style="text-align:right">${formatMoney(l.monthlyImpact)}</td>
      <td>${esc(l.confidence)}</td>
      <td>${esc(l.start)}</td>
      <td>${esc(l.runRate)}</td>
      <td style="text-align:right">${formatMoney(l.oneOffCost)}</td>
    </tr>
  `).join("");

  const totals = lines.reduce((a,b)=>a + (+b.monthlyImpact||0), 0);

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

    <!-- [KT:SURGICAL:APPENDIX-D-CHART-REMOVED]
         Chart removed here because a working chart exists in the appendix section.
    -->
  </section>`;
}

//
// Appendix E – 100-Day Plan
//
function plan100HTML(model) {
  const rows = safeArray(model.weeks).map(w=>`
    <tr>
      <td>${esc(w.week)}</td>
      <td>${esc(w.workstream)}</td>
      <td>${esc(w.task)}</td>
      <td>${esc(w.owner)}</td>
      <td>${esc(w.status)}</td>
    </tr>
  `).join("");

  if (!rows) return "";

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

//
// Appendix F – Pilot Charter
//
function pilotHTML(model = {}) {
  return `
  <section class="appendix">
    <h3>Appendix F — Pilot Charter</h3>
    <table class="table small">
      <tr><th>Objective</th><td>${esc(model.objective)}</td></tr>
      <tr><th>Scope</th><td>${esc(model.scope)}</td></tr>
      <tr><th>Success metrics</th><td>${esc(model.metrics)}</td></tr>
      <tr><th>Timeline</th><td>${esc(model.timeline)}</td></tr>
      <tr><th>Sites</th><td>${esc(model.sites)}</td></tr>
    </table>
  </section>`;
}

//
// Appendix G – Key Assumptions
//
function assumptionsHTML(model) {
  const rows = safeArray(model.items).map((x,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${esc(x.assumption)}</td>
      <td>${esc(x.rationale)}</td>
      <td>${esc(x.owner)}</td>
    </tr>
  `).join("");

  if (!rows) return "";

  return `
  <section class="appendix">
    <h3>Appendix G — Key Assumptions</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>#</th>
          <th>Assumption</th>
          <th>Rationale</th>
          <th>Owner</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

//
// Appendix H – Methods & Sources
//
function methodsHTML(model) {
  const rows = safeArray(model.items).map(x=>`
    <tr>
      <td>${esc(x.benchmark)}</td>
      <td>${esc(x.source)}</td>
      <td>${esc(x.date)}</td>
      <td>${esc(x.notes)}</td>
    </tr>
  `).join("");

  if (!rows) return "";

  return `
  <section class="appendix">
    <h3>Appendix H — Methods & Sources</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Benchmark</th>
          <th>Source</th>
          <th>Date</th>
          <th>Normalization notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

//
// Appendix I – Implementation Checklist
//
function implementationChecklistHTML(model = {}) {
  const items = safeArray(model.items);
  if (!items.length) return "";

  const rows = items.map(item => `
    <tr>
      <td>${esc(item.phase)}</td>
      <td>${
        Array.isArray(item.activities)
          ? item.activities.map(a => esc(a)).join("<br>")
          : esc(item.activities)
      }</td>
      <td>${esc(item.owner)}</td>
      <td>${esc(item.successCriteria)}</td>
    </tr>
  `).join("");

  const total = items.length;
  const complete = items.filter(i => (i.status||"").toLowerCase().includes("complete")).length;

  return `
  <section class="appendix">
    <h3>Appendix I — Implementation Checklist</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Phase</th>
          <th>Key activities</th>
          <th>Owner</th>
          <th>Success criteria</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p class="small">Total tasks: <strong>${total}</strong> | Completed: <strong>${complete}</strong></p>
  </section>`;
}

//
// Appendix J – Decision Framework
//
function decisionFrameworkHTML(model = {}) {
  const scenarios = safeArray(model.scenarios);
  if (!scenarios.length) return "";

  const rows = scenarios.map(s => `
    <tr>
      <td>${esc(s.scenario)}</td>
      <td>${esc(s.symptoms)}</td>
      <td>${esc(s.rootCause)}</td>
      <td>${esc(s.action)}</td>
    </tr>
  `).join("");

  return `
  <section class="appendix">
    <h3>Appendix J — Decision Framework</h3>
    <table class="table small">
      <thead>
        <tr>
          <th>Scenario</th>
          <th>Symptoms</th>
          <th>Root cause</th>
          <th>Recommended action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

//
// Appendix K – Resource Requirements
//
function resourceRequirementsHTML(model = {}) {
  const items = safeArray(model.items);
  if (!items.length) return "";

  const rows = items.map(item => `
    <tr>
      <td>${esc(item.resource)}</td>
      <td>${esc(item.role)}</td>
      <td>${esc(item.quantity)}</td>
      <td>${esc(item.duration)}</td>
      <td>${esc(item.cost)}</td>
      <td>${esc(item.notes)}</td>
    </tr>
  `).join("");

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
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

//
// ───────────────────────────────────────────
// MASTER BUILDER – Assembles Appendix A → K
// ───────────────────────────────────────────
//
function buildAllAppendices({
  charters,                // A
  raci,                    // B
  raid,                    // C
  benefits,                // D
  plan100,                 // E
  pilot,                   // F
  assumptions,             // G
  methods,                 // H
  implementationChecklist, // I
  decisionFramework,       // J
  resourceRequirements     // K
}) {

  const content = [
    chartersHTML(charters),                  
    raciHTML(raci),                          
    raidHTML(raid),                          
    benefitsHTML(benefits),                  
    plan100HTML(plan100),                    
    pilotHTML(pilot),                        
    assumptionsHTML(assumptions),            
    methodsHTML(methods),                    
    implementationChecklistHTML(implementationChecklist),
    decisionFrameworkHTML(decisionFramework),
    resourceRequirementsHTML(resourceRequirements)
  ].filter(Boolean);

  if (!content.length) return "";

  return `
  <section id="appendices">
    <h2>Appendices</h2>
    ${content.join("\n")}
  </section>`;
}

export function implKitHTML(implKit) {
  if (!implKit) return { css: "", html: "" };
  return {
    css: IMPLKIT_CSS,
    html: buildAllAppendices(implKit)
  };
}

// Export appendix HTML builders
export {
  chartersHTML,
  raciHTML,
  raidHTML,
  benefitsHTML,
  plan100HTML,
  pilotHTML,
  assumptionsHTML,
  methodsHTML as methodsSourcesHTML,
  implementationChecklistHTML,
  decisionFrameworkHTML,
  resourceRequirementsHTML
};
