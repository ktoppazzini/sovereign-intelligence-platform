// /lib/implPlan.js
// T2: Alignment-only changes.
// - Three row classes (.heads, .icons, .descs)
// - Fixed heights + top-aligned content so the top of phase boxes AND the top of descriptions align.
// - No copy/icon order changes.

const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

function normalizePhases(input, L = {}) {
  // If we have valid phases from AI, use them
  if (Array.isArray(input) && input.length >= 5) {
    return input.slice(0, 5).map((p, i) => ({
      title: p?.title ? String(p.title) : `${L.phase || "Phase"} ${i + 1}`,
      caption: p?.caption ? String(p.caption) : "",
    }));
  }
  
  // Fallback only if we have fewer than 5 phases
  const base = [
    { title: `${L.phase || "Phase"} 1`, caption: L.planningReadiness || "Planning & readiness" },
    { title: `${L.phase || "Phase"} 2`, caption: L.digitalBackbone || "Digital backbone & pilot markets" },
    { title: `${L.phase || "Phase"} 3`, caption: L.franchiseNetwork || "Franchise network & supply chain scale" },
    { title: `${L.phase || "Phase"} 4`, caption: L.brandMomentum || "Brand momentum & national penetration" },
    { title: `${L.phase || "Phase"} 5`, caption: L.optimization || "Optimization & continuous improvement" },
  ];
  
  const src = Array.isArray(input) && input.length ? input : base;
  const out = Array.from({ length: 5 }, (_, i) => src[i] || base[i]);
  return out.map((p, i) => ({
    title: p?.title ? String(p.title) : base[i].title,
    caption: p?.caption ? String(p.caption) : base[i].caption,
  }));
}

const ICONS = ["🏁", "👤", "⚙️", "🗓️", "🚀"];
// [KT:I18N:INJECTABLE-IMPLPLAN]
// Allows the reform-report translator to localize this module.
let __implPlanTranslator = (s) => s;

export function setImplementationPlanTranslator(fn) {
  __implPlanTranslator = typeof fn === 'function' ? fn : (s) => s;
}
function t(s) {
  try {
    return __implPlanTranslator ? __implPlanTranslator(s) : s;
  } catch {
    return s;
  }
}

export function planDiagramHTML(phasesIn = [], heading = "Implementation Plan", L = {}) {
  const phases = normalizePhases(phasesIn, L);

  const css = `
  <style>
    .impl-roadmap{ background:#071827; border-radius:16px; padding:18px 20px; color:#E6F0FF; margin:14px 0; }
    .impl-roadmap h3{ margin:0 0 12px; font-size:1.35rem; font-weight:800; text-align:center; letter-spacing:.2px; }
    .impl-grid{ display:grid; grid-template-columns:repeat(5,1fr); gap:14px; align-items:start; }
    /* HEAD ROW — fixed box height + top-aligned content so tops align perfectly */
    .impl-grid.heads{ margin-top:2px; }
    .impl-head{
      box-sizing:border-box;
      font-weight:700; text-align:center; color:#bfe1ff;
      background:#0E2A44; border:1px solid rgba(230,240,255,.12);
      padding:10px 8px; border-radius:12px;
      height:92px;                 /* fixed height for perfect horizontal alignment */
      display:flex; align-items:flex-start; justify-content:center; /* top-align text */
      line-height:1.15rem;
      /* [KT:SURGICAL:IMPL-HEAD-WRAP] prevent long titles from overflowing */
      word-wrap:break-word;
      overflow-wrap:break-word;
      hyphens:auto;
      max-width: 100%;
    }
    /* connector rail */
    .impl-rail{ height:4px; background:linear-gradient(90deg,#1a3b5a,#2d5f8a); border-radius:999px; opacity:.45; margin:10px 8% 12px; }
    /* ICON ROW — uniform size so desc row always starts at same Y */
    .impl-grid.icons{ }
    .impl-icon{ text-align:center; display:flex; align-items:center; justify-content:center; }
    .impl-icon .ico{
      width:58px; height:58px; line-height:58px; border-radius:14px;
      background:radial-gradient(ellipse at 40% 30%, #1d4366, #0f2f4b 55%, #0c2440 100%);
      font-size:30px; filter:drop-shadow(0 2px 6px rgba(0,0,0,.25));
    }
    /* DESC ROW — top-aligned and fixed min-height so all start lines align */
    .impl-grid.descs{ }
      .impl-desc{
          text-align:center; color:#dbeaff; font-size:0.95rem; line-height:1.25rem;
      min-height:124px; display:flex; align-items:flex-start; justify-content:center; /* top-align */
      margin-top:0; padding-top:0;
      /* [KT:SURGICAL:IMPL-DESC-WRAP] align with head wrapping behavior */
      word-wrap:break-word;
      overflow-wrap:break-word;
      max-width: 100%;
    }
    @media print { .impl-roadmap { break-inside:avoid; page-break-inside:avoid; } }
  </style>`;

  // [KT:PATCH:IMPL-WRAP] Reinforce phase title and desc wrapping for long content
  // Old:
  // const heads = phases.map(p => `<div class="impl-head">${esc(p.title)}</div>`).join("");
  // const descs = phases.map(p => `<div class="impl-desc">${esc(p.caption||"")}</div>`).join("");
  const heads = phases.map(p => `<div class="impl-head" style="word-break:break-word;overflow-wrap:break-word;hyphens:auto;">${esc(p.title)}</div>`).join("");
  const icons = phases.map((_, i) => `<div class="impl-icon"><div class="ico" aria-hidden="true">${ICONS[i]||"⬤"}</div></div>`).join("");
  const descs = phases.map(p => `<div class="impl-desc" style="word-break:break-word;overflow-wrap:break-word;hyphens:auto;">${esc(p.caption||"")}</div>`).join("");

  return `
  <section class="impl-roadmap" role="group" aria-label="${esc(t(heading))}">
    ${css}
    <h3>${esc(t(heading))}</h3>
    <div class="impl-grid heads">${heads}</div>
    <div class="impl-rail" aria-hidden="true"></div>
    <div class="impl-grid icons">${icons}</div>
    <div class="impl-grid descs">${descs}</div>
  </section>`;
}

// Lightweight 2-phase roadmap renderer (Phase 1 + Phase 2) for Step-10 needs
export function planDiagramHTML_TwoPhase(phasesIn = [], heading = "Implementation Plan (Phase 1-2)", L = {}) {
  const phases = (Array.isArray(phasesIn) ? phasesIn : []).slice(0, 2);
  const w = 860, h = 320, p = 60;
  const cellW = (w - 2 * p) / 2;
  const phaseBox = (i, tPhase) => `
    <g transform="translate(${p + i * cellW}, ${p})">
      <rect width="${cellW - 20}" height="120" fill="#0e2a44" rx="8" ry="8"/>
      <text x="10" y="28" fill="#fff" font-weight="700" font-family="Arial">${esc(t(`${L.phase || 'Phase'} ${i+1}`))}</text>
      <text x="10" y="54" fill="#d6e4ff" font-family="Arial" font-size="12">${esc(t(tPhase?.title || (`${L.phase || 'Phase'} ${i+1}`)))}</text>
      <text x="10" y="78" fill="#cbd5e1" font-family="Arial" font-size="12">${esc(t(tPhase?.caption || ''))}</text>
    </g>
  `;
  const header = `<text x="" y=""/>`; // placeholder; not used
  const rows = phases.map((pitem, idx) => phaseBox(idx, pitem));
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rows.join('')}</svg>`;
  return `<section class="impl-roadmap two-phase"><h3>${esc(t(heading))}</h3><div class="canvas-wrap">${svg}</div></section>`;
}

export default planDiagramHTML;
