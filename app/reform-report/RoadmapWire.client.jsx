'use client';
import { useEffect } from 'react';

function injectCSS() {
  if (document.getElementById('si-roadmap-css')) return;
  const el = document.createElement('style');
  el.id = 'si-roadmap-css';
  el.textContent = `
  .roadmap{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;margin:12px 0}
  .roadmap .card{background:var(--card,#121a33);border:1px solid var(--line,#243154);border-radius:14px;padding:14px}
  .roadmap .head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
  .roadmap .head h3{margin:0;font-size:16px;color:#fff;font-weight:800}
  .roadmap ul{margin:0;padding-left:18px}
  .roadmap li,.roadmap p{color:#fff;font-size:14px;line-height:1.45}
  .hex{width:38px;height:38px}
  .hex svg{display:block;width:38px;height:38px}
  .hex polygon{fill:#193052;stroke:#77b3ff;stroke-width:2}
  .hex .ico{fill:#cfe2ff}`;
  document.head.appendChild(el);
}

function ico(name) {
  const m = {
    phases: '<path class="ico" d="M13 19h12v-2H13v2Zm0-6h18v-2H13v2Zm0-6h18V5H13v2Z"/>',
    milestones: '<path class="ico" d="M12 5h10l2 4h10v12H12V5Zm2 2v12h18V11h-9.3l-2-4H14Z"/>',
    resources:
      '<path class="ico" d="M12 19c0-3.3 2.7-6 6-6s6 2.7 6 6h-3a3 3 0 1 0-6 0h-3Zm6-8a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/>',
    timeline: '<path class="ico" d="M12 12h20v2H12v-2Zm0 6h16v2H12v-2Zm0-12h24v2H12V6Z"/>',
    risk: '<path class="ico" d="M20 6 4 34h32L20 6Zm0 8 2 10h-4l2-10Zm-2 14h4v4h-4v-4Z"/>',
  };
  const inner = m[name] || m.phases;
  return `<span class="hex"><svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><polygon points="20,2 35,10 35,30 20,38 5,30 5,10"></polygon>${inner}</svg></span>`;
}

function readVal(label) {
  // read from form inputs by visible label
  const lab = Array.from(document.querySelectorAll('label')).find((l) =>
    new RegExp(`^\\s*${label}\\s*$`, 'i').test(l.textContent || ''),
  );
  const box =
    lab && lab.parentElement ? lab.parentElement.querySelector('input,textarea,select') : null;
  return box && 'value' in box ? (box.value || '').trim() : '';
}

function phasesFromSection(sec) {
  const set = new Set();
  sec.querySelectorAll('*').forEach((n) => {
    const m = (n.textContent || '').match(/\bPhase\s+\d+(?:\s*[—-]\s*\w+)?/gi);
    if (m) m.forEach((x) => set.add(x));
  });
  const arr = Array.from(set.values());
  return arr.length
    ? arr
    : [
        'Phase 1 — Assess',
        'Phase 2 — Design',
        'Phase 3 — Implement',
        'Phase 4 — Optimize',
        'Phase 5 — Sustain',
      ];
}

function build(phases, preparedFor, preparedBy, timeFrame, constraints) {
  const milestones = phases.map((p, i) => `<li>${p}: Gate ${i + 1}</li>`).join('');
  const resources = `<p>Core team led by <strong>${preparedBy || 'Project Lead'}</strong>; SMEs engaged per phase for ${preparedFor || 'client'}.</p>`;
  const overview = `<p>${phases.join(' &rarr; ')} (${timeFrame || '36 months'})</p>`;
  const risks = `<p>${constraints || 'Top risks tracked per phase; mitigations owned in RAID log.'}</p>`;
  return `<div class="roadmap">
    <div class="card"><div class="head">${ico('phases')}<h3>Project Phases</h3></div><ul>${phases.map((p) => `<li>${p}</li>`).join('')}</ul></div>
    <div class="card"><div class="head">${ico('milestones')}<h3>Key Milestones</h3></div><ul>${milestones}</ul></div>
    <div class="card"><div class="head">${ico('resources')}<h3>Resource Allocation</h3></div>${resources}</div>
    <div class="card"><div class="head">${ico('timeline')}<h3>Timeline Overview</h3></div>${overview}</div>
    <div class="card"><div class="head">${ico('risk')}<h3>Risk Management</h3></div>${risks}</div>
  </div>`;
}

function enhance() {
  injectCSS();
  // Look for the "Implementation Timeline" section
  const h2 = Array.from(document.querySelectorAll('h2')).find((h) =>
    /Implementation\s+Timeline/i.test(h.textContent || ''),
  );
  if (!h2) return;
  const sec = h2.closest('.sec') || h2.parentElement || document.body;
  const phases = (window && window.SI && window.SI.phases) || phasesFromSection(sec);
  const preparedFor = readVal('Prepared For');
  const preparedBy = readVal('Prepared By');
  const timeFrame = readVal('Time Frame');
  const constraints = readVal('Constraints');
  // Replace the skinny line (if any)
  const graph = sec.querySelector('.graph');
  const host = document.createElement('div');
  host.className = 'graph';
  host.innerHTML = build(phases, preparedFor, preparedBy, timeFrame, constraints);
  if (graph) graph.replaceWith(host);
  else sec.appendChild(host);
}

export default function RoadmapWire() {
  useEffect(() => {
    try {
      enhance();
    } catch (e) {
      console.error('[SI:ROADMAP] error', e);
    }
  }, []);
  return null;
}
