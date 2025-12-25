// lib/reportTemplate.js
export default function buildReformReportHTML(opts){
  const { canon={}, sections={}, phases=[], planDiagramHTML='', implKit={} } = (opts||{});

  const H = (id, num, title) => `<h2 id="${id}">${num}. ${title}</h2>`;
  const S = (id, inner) => `<section id="${id}" class="report-section">\n${inner}\n</section>`;

  const head = `<!doctype html><html><head><meta charset="utf-8">
  <title>${canon.orgName} – Reform Report</title>
  <style>
    body{font-family:Georgia, 'Times New Roman', serif; line-height:1.5; color:#111;}
    h1,h2,h3{font-family:Georgia, 'Times New Roman', serif;}
    h2{margin:1.6rem 0 .6rem; font-size:1.4rem;}
    .report-table{ width:100%; border-collapse:collapse; }
    .report-table th,.report-table td{padding:8px 10px; border:1px solid #dfe6f3;}
    .table-title{margin:6px 0 4px; font-weight:700; color:#000;}
    .chart-note{font-size:.95rem; margin:.4rem 0 1rem;}
  </style>
  </head><body><div id="report">`;

  const titlePage = `
    <header>
      <h1 style="margin:0 0 .2rem">${canon.orgName}: Reform Report</h1>
      <p style="margin:0 0 1.2rem">${canon.country} • ${canon.timeFrame}</p>
    </header>`;

  const exec = S('exec',   H('exec',1,'Executive Summary') + (sections.exec || ''));
  const curr = S('current',H('current',2,'Current State') + (sections.current || ''));
  const fins = S('financials',H('financials',3,'Financials') + (sections.financials || ''));
  const kpis = S('kpis',   H('kpis',4,'KPIs & Targets') + (sections.kpis || ''));
  const impl = S('timeline',H('timeline',5,'Implementation Plan') + (sections.timeline || '') + (planDiagramHTML||''));
  const ops  = S('ops',    H('ops',6,'Operating Model') + (sections.ops || ''));
  const risk = S('risk',   H('risk',7,'Risks & Mitigations') + (sections.risk || ''));
  const roi  = S('roi',    H('roi',8,'ROI & Next Steps') + (sections.roi || ''));
  const concl= S('conclusion',H('conclusion',9,'Conclusion') + (sections.conclusion || ''));

  const appendix = `
  <section id="appendices">
    <h2 id="appendix">10. Appendix</h2>
    <h3>Implementation Kit (Summary)</h3>
    <pre style="white-space:pre-wrap; font-size:.95rem; background:#fafafa; border:1px solid #eee; padding:.6rem; border-radius:6px;">${JSON.stringify(implKit, null, 2)}</pre>
  </section>`;

  const foot = `</div></body></html>`;

  return [head, titlePage, exec, curr, fins, kpis, impl, ops, risk, roi, concl, appendix, foot].join('\n');
}