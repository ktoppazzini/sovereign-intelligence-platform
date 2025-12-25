// /lib/implPlan.js
// Dynamic overlay on /public/images/Implementation-roadmap.png
// Replaces static "PHASE X" and "Insert your desired data here" with report-derived data.

export function planDiagramHTML({ imageSrc = 'public/images/Implementation-roadmap.png', phases = [] }) {
  // Normalize exactly 5 cells
  const cells = Array.from({ length: 5 }, (_, i) => phases[i] || { title: `Phase ${i + 1}`, caption: '' });

  // We overlay white “mask” boxes where the PNG shows the baked-in labels,
  // then draw our dynamic titles (above icons) and captions (under icons).
  // The grid is five equal columns; tweak offsets if you updated the PNG.
  const cellHTML = cells.map((p, i) => {
    return `
      <div class="impl-cell" style="--col:${i}">
        <div class="impl-mask-top"></div>
        <div class="impl-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
        <div class="impl-mask-bottom"></div>
        <div class="impl-caption">${escapeHtml(p.caption || '')}</div>
      </div>`;
  }).join('');

  return `
  <figure class="impl-figure">
    <img class="impl-image" src="${imageSrc}" alt="Implementation Roadmap" />
    <figcaption class="sr-only">Implementation Roadmap</figcaption>
    <div class="impl-overlay">${cellHTML}</div>
  </figure>`;
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


