// ===============================
// lib/implPlan.js
// ===============================
// PNG-backed implementation roadmap with dynamic text overlays.

const esc = (s='') => String(s)
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;');

export function planDiagramHTML({ phases = [], imageSrc = '/images/implementation-roadmap.png' } = {}){
  const five = (phases||[]).slice(0,5);
  while (five.length < 5) five.push({ title:`Phase ${five.length+1}`, caption:'' });

  const slots = [
    { left: '6%',  top: '62%' },
    { left: '26%', top: '62%' },
    { left: '46%', top: '62%' },
    { left: '66%', top: '62%' },
    { left: '86%', top: '62%' },
  ];

  const cells = five.map((p,i)=>`
    <div class="slot" style="left:${slots[i].left};top:${slots[i].top}">
      <div class="impl-title">${esc(p.title||'')}</div>
      <div class="impl-cap">${esc(String(p.caption||'').slice(0,120))}</div>
    </div>`).join('');

  return `
  <figure class="impl-plan">
    <img src="${imageSrc}" alt="Implementation Plan"/>
    <figcaption class="impl-overlay">${cells}</figcaption>
  </figure>
  <style>
    .impl-plan { position: relative; margin: 1.25rem 0; }
    .impl-plan > img { width: 100%; height: auto; display: block; border-radius: 8px; }
    .impl-plan .impl-overlay { position: absolute; inset: 0; }
    .impl-plan .slot { position: absolute; transform: translate(-50%, -50%); width: 17%; text-align: center; }
    .impl-title { font-weight: 800; color: #0f294d; font-size: clamp(12px, 1.1vw, 16px); }
    .impl-cap   { color: #2b2b2b; font-size: clamp(11px, 1.0vw, 14px); line-height: 1.25; margin-top: .25rem; }
  </style>`;
}

// --- Back-compat shim ---
// Some templates still call `planFigureSVG(phases, { timeframeMonths, src })`.
// Keep them working by delegating to planDiagramHTML.
export function planFigureSVG(phases = [], opts = {}){
  const { timeframeMonths = 12, src = '/images/implementation-roadmap.png' } = opts || {};
  return planDiagramHTML({ phases, timeframeMonths, imageSrc: src });
}

export default planDiagramHTML;


