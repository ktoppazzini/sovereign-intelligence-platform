// ===============================
// lib/implPlan.js
// ===============================

/**
 * Renders the Implementation Plan PNG with dynamic text overlays.
 * Uses /public/images/implementation-roadmap.png as the base image.
 *
 * phases: [{ title, caption }] (exactly 5)
 * timeframeMonths: 1..120 (<=12 shown as months, otherwise years)
 */
function planDiagramHTML({ phases = [], timeframeMonths = 12, src = '/images/implementation-roadmap.png' } = {}) {
  const P = (i) => phases[i] || { title: `Phase ${i + 1}`, caption: '' };

  // Roughly centered under each icon in your PNG; percentage so it’s responsive.
  const slots = [
    { left: '6%',  top: '62%' },
    { left: '26%', top: '62%' },
    { left: '46%', top: '62%' },
    { left: '66%', top: '62%' },
    { left: '86%', top: '62%' },
  ];

  const tfString = timeframeMonths <= 12
    ? `${timeframeMonths} ${timeframeMonths === 1 ? 'month' : 'months'}`
    : `${Math.round(timeframeMonths / 12)} ${Math.round(timeframeMonths / 12) === 1 ? 'year' : 'years'}`;

  return `
  <figure class="impl-plan">
    <img src="${src}" alt="Implementation plan" />
    <figcaption class="impl-overlay">
      ${slots.map((pos, i) => {
        const ph = P(i);
        return `
          <div class="slot" style="left:${pos.left};top:${pos.top}">
            <div class="title">${escapeHtml(ph.title || '')}</div>
            <div class="caption">${escapeHtml(shorten(ph.caption || '', 95))}</div>
          </div>
        `;
      }).join('')}
      <div class="tf">Program timeframe: ${escapeHtml(tfString)}</div>
    </figcaption>
  </figure>
  <style>
    .impl-plan { position: relative; margin: 1.25rem 0; }
    .impl-plan > img { width: 100%; height: auto; display: block; border-radius: 8px; }
    .impl-plan .impl-overlay { position: absolute; inset: 0; }
    .impl-plan .slot { position: absolute; transform: translate(-50%, -50%); width: 17%; text-align: center; }
    .impl-plan .slot .title   { font-weight: 700; font-size: clamp(12px, 1.2vw, 16px); color: #0E2A47; letter-spacing: .3px; }
    .impl-plan .slot .caption { margin-top: .25rem; font-size: clamp(11px, 1.05vw, 14px); color: #2b2b2b; line-height: 1.25; }
    .impl-plan .tf { position: absolute; right: 1.2rem; bottom: .8rem;
                     font-size: 12px; color: #3b3b3b; background: rgba(255,255,255,.85);
                     padding: .25rem .5rem; border-radius: 6px; }
  </style>
  `;
}

function escapeHtml(s=''){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function shorten(s='', n=100){
  const t = String(s).trim();
  if (t.length <= n) return t;
  return t.slice(0, n-1).replace(/\s+\S*$/, '') + '…';
}

// Export BOTH ways so any import style works.
export { planDiagramHTML };
export default planDiagramHTML;

