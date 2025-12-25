// ===============================
// lib/implPlan.js
// ===============================
// Static implementation roadmap diagram as ONE SVG:
// - Embeds your PNG as background
// - Writes 5 phase titles + captions into the SVG itself
//   (no HTML overlay; scales cleanly; prints well)

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// crude word wrap for SVG <text>: split into ~N-char lines without breaking SVG
function wrapLines(str = '', max = 28, maxLines = 2) {
  const words = String(str).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (test.length > max) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines;
}

/**
 * Returns a single <svg> string with the PNG and texts baked in.
 * @param {{ phases?: {title:string, caption:string}[], imageSrc?: string }} opts
 */
export function planDiagramHTML({ phases = [], imageSrc = '/images/Implementation-roadmap.png' } = {}) {
  // Normalize to exactly five entries
  const out = (phases || []).slice(0, 5);
  while (out.length < 5) out.push({ title: `Phase ${out.length + 1}`, caption: '' });

  // SVG canvas (wide letter-ish); background image fitted to width
  // ViewBox chosen to be easy for positioning (1200×650)
  const W = 1200, H = 650;

  // Column centers (5 columns)
  const cols = [0.1, 0.3, 0.5, 0.7, 0.9].map(p => Math.round(W * p));

  // Y positions (tweak to match your PNG layout)
  // - title above icons (if your icons sit around ~300px)
  // - caption under titles
  const titleY = 330;
  const capY   = 370;

  // Text styles
  const titleFont = '600 20px ui-sans-serif, Segoe UI, Roboto, Helvetica, Arial';
  const capFont   = '400 15px ui-sans-serif, Segoe UI, Roboto, Helvetica, Arial';
  const titleFill = '#0f294d';
  const capFill   = '#0b1220';

  // Build <text> nodes
  const textBlocks = out.map((p, i) => {
    const cx = cols[i];
    const title = esc(p.title || '');
    const capLines = wrapLines(p.caption || '', 34, 2).map(esc);

    const tspanCap = capLines.map((line, idx) =>
      `<tspan x="${cx}" dy="${idx === 0 ? 0 : 18}">${line}</tspan>`
    ).join('');

    return `
      <!-- Phase ${i + 1} -->
      <text x="${cx}" y="${titleY}" text-anchor="middle" font="${titleFont}" fill="${titleFill}">
        ${title}
      </text>
      <text x="${cx}" y="${capY}" text-anchor="middle" font="${capFont}" fill="${capFill}">
        ${tspanCap}
      </text>
    `;
  }).join('\n');

  // Compose SVG
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Implementation Plan">
    <defs>
      <style>
        /* ensure crisp text rendering */
        text { dominant-baseline: hanging; }
      </style>
    </defs>
    <!-- Base diagram image -->
    <image href="${imageSrc}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMin slice" />
    <!-- Titles + captions baked into the SVG -->
    ${textBlocks}
  </svg>`;
}


