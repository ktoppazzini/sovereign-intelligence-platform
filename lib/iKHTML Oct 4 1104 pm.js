// /lib/implKitSchemas.js
// JSDoc “schemas” for implementation kit artifacts and tiny factories.

// ===== Initiative Charter =====
/**
 * @typedef {Object} InitiativeCharter
 * @property {string} name
 * @property {string} objective          // e.g., "Reduce delivery P90 42m → 28m"
 * @property {string} scopeIn
 * @property {string} scopeOut
 * @property {string} owner
 * @property {string[]} stakeholders
 * @property {Array<{milestone:string, due:string}>} milestones
 * @property {Array<{kpi:string, baseline:string|number, target:string|number, source?:string}>} kpis
 * @property {Array<{risk:string, mitigation:string, owner:string}>} risks
 * @property {string} budgetSummary       // brief capex/opex view
 * @property {string} acceptanceCriteria
 */
export function makeCharter(overrides={}) {
  return Object.assign({
    name: "Delivery Acceleration",
    objective: "Reduce delivery P90 from 42m to 28m within 2 quarters",
    scopeIn: "Delivery zones, routing, kitchen queueing",
    scopeOut: "Menu re-engineering",
    owner: "COO",
    stakeholders: ["Ops Director","Franchisees","Finance","IT"],
    milestones: [
      { milestone:"Pilot start", due:"Month 1" },
      { milestone:"Pilot read-out", due:"Month 2" },
      { milestone:"Wave 1 rollout", due:"Month 3" }
    ],
    kpis: [
      { kpi:"P90 delivery minutes", baseline:42, target:28, source:"Driver app" },
      { kpi:"On-time %", baseline:"78%", target:"92%" }
    ],
    risks: [
      { risk:"Courier supply shortfall", mitigation:"Standby pool + surge contracts", owner:"Ops" }
    ],
    budgetSummary: "One-off $85k; run-rate $12k/month",
    acceptanceCriteria: "Sustain P90≤28m for 4 weeks across pilot stores"
  }, overrides);
}

// ===== RACI =====
/**
 * @typedef {{decision:string,R:string,A:string,C:string[],I:string[],SLA:string}} RACIItem
 */
export function makeRaci(overrides={}) {
  return Object.assign({
    items: [
      { decision:"Adjust delivery zones", R:"Ops Dir", A:"COO", C:["Legal","Finance"], I:["Franchisees"], SLA:"72h" },
      { decision:"Update SLA in app",     R:"Product", A:"CTO", C:["CX"], I:["Ops"], SLA:"1w" }
    ]
  }, overrides);
}

// ===== RAID =====
/**
 * @typedef {{type:"Risk"|"Assumption"|"Issue"|"Dependency", description:string, owner:string, impact:string, probability?:string, trigger?:string, mitigation?:string, status?:string, nextReview?:string}} RAIDItem
 */
export function makeRaid(overrides={}) {
  return Object.assign({
    items: [
      { type:"Risk", description:"Driver churn spikes >15%", owner:"Ops", impact:"High", probability:"Medium", trigger:"Churn>10%/mo", mitigation:"Retention bonus", status:"Open", nextReview:"2w" },
      { type:"Dependency", description:"Routing vendor contract signed", owner:"Legal", impact:"High", status:"Due M1W2" }
    ]
  }, overrides);
}

// ===== Benefits Model =====
/**
 * @typedef {{workstream:string, lever:string, unitAssumption:string, source?:string, volume:number, rate:number, monthlyImpact:number, confidence:"Low"|"Medium"|"High", startMonth:string, runRateMonth:string, oneOffCost:number}} BenefitLine
 */
export function makeBenefits(overrides={}) {
  return Object.assign({
    lines: [
      { workstream:"Delivery", lever:"Zone shrink", unitAssumption:"-6m P90 ⇒ +2% orders", source:"internal calc", volume:2000, rate:3.5, monthlyImpact:7000, confidence:"Medium", startMonth:"M2", runRateMonth:"M4", oneOffCost:85000 },
      { workstream:"Loyalty", lever:"Push cadence", unitAssumption:"+3 p.p. repeat rate", volume:1500, rate:2.0, monthlyImpact:3000, confidence:"Low", startMonth:"M3", runRateMonth:"M6", oneOffCost:10000 }
    ]
  }, overrides);
}

// ===== 100-Day Plan (week plan) =====
/**
 * @typedef {{week:string, workstream:string, task:string, owner:string, status:"Planned"|"In Progress"|"Done"}} PlanWeek
 */
export function makePlan100(overrides={}) {
  return Object.assign({
    weeks: [
      { week:"W1", workstream:"Delivery", task:"Define new zones", owner:"Ops", status:"Planned" },
      { week:"W2", workstream:"IT",       task:"Routing config pilot", owner:"IT", status:"Planned" },
      { week:"W3", workstream:"Ops",      task:"Kitchen queue SOP pilot", owner:"Ops", status:"Planned" }
    ]
  }, overrides);
}

// ===== Pilot Charter =====
/**
 * @typedef {{name:string, locations:number|string, successKPIs:string[], thresholds:string[], sampleDesign:string, rollbackCriteria:string}} PilotCharter
 */
export function makePilot(overrides={}) {
  return Object.assign({
    name:"Delivery Acceleration Pilot",
    locations:10,
    successKPIs:["P90 delivery","On-time %","CSAT"],
    thresholds:["P90≤28m","On-time ≥92%","CSAT ≥4.5/5"],
    sampleDesign:"Stepped-wedge by region; weekly readouts",
    rollbackCriteria:"If P90>35m for 2 weeks or CSAT<4.0"
  }, overrides);
}

// ===== Assumptions =====
/**
 * @typedef {{name:string, value:number, unit?:string, low?:number, high?:number, note?:string}} Assumption
 */
export function makeAssumptions(overrides={}) {
  return Object.assign({
    items: [
      { name:"Order uplift from P90 cut", value:0.02, unit:"fraction", low:0.01, high:0.03, note:"derived from 2024 A/B" },
      { name:"Promo elasticity", value:1.2, unit:"%/%", low:0.9, high:1.4 }
    ]
  }, overrides);
}
