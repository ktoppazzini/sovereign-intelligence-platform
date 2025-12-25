// /lib/implPlan.js
// Implementation Roadmap (title → phase names → icons → descriptions)
// Surgical: matches your annotated mock. No external images, no TS.

// Escape helper
const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

// Keep identical shape but normalize to exactly 5 slots
function normalizePhases(input) {
  const base = [
    { title: "Phase 1 — Foundation", caption: "Planning & readiness" },
    { title: "Phase 2 — Digital Backbone & Pilot", caption: "Markets" },
    { title: "Phase 3 — Franchise Network & Supply Chain", caption: "Scale" },
    { title: "Phase 4 — Brand Momentum & National Penetration", caption: "Penetration" },
    { title: "Phase 5 — Optimization", caption: "Sustain & improve" },
  ];
  const src = Array.isArray(input) && input.length ? input.slice(0, 5) : base;
  const out = Array.from({ length: 5 }, (_, i) => src[i] || base[i]);
  return out.map((p, i) => ({
    title: p?.title ? String(p.title) : base[i].title,
    caption: p?.caption ? String(p.caption) : base[i].caption,
  }));
}

// Fixed icon set (no external assets)
const ICONS = ["🏁", "👤", "⚙️", "🗓️", "🚀"];

/**
 * Build the roadmap HTML (title centered → phase headings → icons → captions).
 * @param {Array<{title:string, caption?:string}>} phasesIn
 * @param {string} [heading] Top heading
 * @returns {string}
 */
export function planDiagramHTML(phasesIn = [], heading = "Implementation Plan") {
  const phases = normalizePhases(phasesIn);

  // Scoped CSS
  const css = `
  <style>
    .impl-roadmap{ background:#071827; border-radius:16px; padding:18px 20px; color:#E6F0FF; margin:14px 0; }
    .impl-roadmap h3{ margin:0 0 12px; font-size:1.35rem; font-weight:800; text-align:center; letter-spacing:.2px; }
    .impl-grid{ display:grid; grid-template-columns:repeat(5,1fr); gap:14px; align-items:center; }
    .impl-head{ font-weight:700; text-align:center; color:#bfe1ff; background:#0E2A44; border:1px solid rgba(230,240,255,.12);
                padding:10px 8px; border-radius:12px; min-height:52px; display:flex; align-items:center; justify-content:center; }
    .impl-icon{ text-align:center; }
    .impl-icon .ico{ width:58px; height:58px; line-height:58px; margin:0 auto; border-radius:14px;
                     background:radial-gradient(ellipse at 40% 30%, #1d4366, #0f2f4b 55%, #0c2440 100%);
                     font-size:30px; filter:drop-shadow(0 2px 6px rgba(0,0,0,.25)); }
    .impl-desc{ text-align:center; color:#dbeaff; font-size:.95rem; line-height:1.25rem; min-height:52px; }
    .impl-rail{ height:4px; background:linear-gradient(90deg,#1a3b5a,#2d5f8a); border-radius:999px; opacity:.45; margin:10px 8% 12px; }
    @media print { .impl-roadmap { break-inside:avoid; page-break-inside:avoid; } }
  </style>`;

  const heads = phases.map(p => `<div class="impl-head">${esc(p.title)}</div>`).join("");
  const icons = phases.map((_, i) => `<div class="impl-icon"><div class="ico" aria-hidden="true">${ICONS[i]||"⬤"}</div></div>`).join("");
  const descs = phases.map(p => `<div class="impl-desc">${esc(p.caption||"")}</div>`).join("");

  return `
  <section class="impl-roadmap" role="group" aria-label="${esc(heading)}">
    ${css}
    <h3>${esc(heading)}</h3>
    <div class="impl-grid">${heads}</div>
    <div class="impl-rail" aria-hidden="true"></div>
    <div class="impl-grid">${icons}</div>
    <div class="impl-grid">${descs}</div>
  </section>`;
}

export default planDiagramHTML;
