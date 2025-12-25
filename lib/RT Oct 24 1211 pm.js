/* eslint-disable no-console */

/**
 * Sovereign Intelligence — Reform Report Template
 * - Produces the full HTML shell with numbered sections & subheadings
 * - Exposes hooks for server to inject section HTML, a chart registry,
 *   and consistent styles (including table titles)
 */

export default function buildReformReportHTML(opts = {}) {
  const {
    canon = {},
    sections = {},
    phases = [],
    chartRegistry = [], // [{id, configJSON}]
    logoUrl = '/images/secure.png',
  } = opts;

  const org = canon.orgName || 'Client';
  const preparedFor = canon.preparedFor || '';
  const preparedBy = canon.preparedBy || '';
  const reportDate = canon.reportDate || '';

  // Build chart registry payload (client hydrates it)
  const registryJSON = JSON.stringify(
    chartRegistry.map((e) => ({ id: e.id, config: e.config })),
  );

  // Small helper: wrap section content with numbered header
  const sectionBlock = (num, title, id, html) => `
    <section id="${id}" class="report-section">
      <h2 class="section-title"><span class="sec-no">${num}.</span> ${title}</h2>
      ${html || ''}
    </section>
  `;

  // Basic CSS for readability & table title style
  const CSS = `
  :root {
    --bg: #0d0f13;
    --fg: #e8eefb;
    --muted: #a8b3c7;
    --accent: #3b82f6;
    --tile: #121620;
    --card: #0f141d;
    --table-border: #1f2937;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif}
  a{color:#9ec7ff}
  .report-shell{max-width:1052px;margin:24px auto;padding:24px}
  header.report-head{display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid #152033;margin-bottom:18px}
  header.report-head img{width:44px;height:44px;object-fit:contain}
  .report-meta small{display:block;color:var(--muted)}
  h1,h2,h3{margin:0 0 8px 0}
  h1{font-size:26px;letter-spacing:.2px}
  h2.section-title{font-size:22px;margin:24px 0 12px;border-bottom:1px solid #162135;padding-bottom:8px}
  h3{font-size:16px;color:#cfe1ff;margin-top:12px}
  .sec-no{color:#7fb1ff;margin-right:6px}
  .subhead{font-weight:600;color:#dfe9ff;margin:14px 0 6px}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .tile{background:var(--tile);border:1px solid #152033;border-radius:10px;padding:12px}
  .chart-wrap{background:var(--card);border:1px solid #162135;border-radius:10px;padding:12px;margin:10px 0}
  .chart-wrap canvas{width:100%;height:280px}
  .chart-note{color:#b9c8e6;font-size:13px;margin:8px 4px 0 4px}
  .metric{display:flex;flex-direction:column;gap:4px}
  .metric .label{color:#9fb3cf;font-size:12px}
  .metric .value{font-size:22px;font-weight:700}
  .report-table{width:100%;border-collapse:collapse;margin:8px 0;background:#0c1018;border:1px solid var(--table-border)}
  .report-table th,.report-table td{padding:8px 10px;border-bottom:1px solid var(--table-border)}
  .report-table th{background:#0f141d;color:#d9e6ff;text-align:left}
  .table-title{font-weight:700;color:#fff;margin:6px 0 6px 0}
  #appendices h3{margin-top:20px}
  footer{color:#8aa2c6;margin-top:18px;font-size:12px}

  /* ---------- ADD-ONLY OVERRIDES (no deletions) ---------- */
  /* Ensure requested 80x80 logo without removing original rule */
  header.report-head img{width:80px;height:80px}

  /* Enforce black background + bold white text for table titles */
  .table-title{
    background:#000;
    color:#fff;
    font-weight:700;
    padding:6px 10px;
    border-radius:6px;
    display:inline-block;
  }
  `;

  // Build numbered subheadings wrapper
  const numberedSubheads = (baseNo, subs = []) => {
    if (!subs.length) return '';
    return subs
      .map(
        (s, i) => `
      <h3 class="subhead"><span class="sec-no">${baseNo}.${i + 1}</span> ${s.title}</h3>
      ${s.html || ''}
    `,
      )
      .join('\n');
  };

  // Assemble the big doc
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Reform Report — ${org}</title>
      <style>${CSS}</style>
    </head>
    <body>
      <div id="report" class="report-shell">
        <header class="report-head">
          <img src="${logoUrl}" alt="Logo"/>
          <div class="report-meta">
            <h1>Reform Report — ${org}</h1>
            <small>Prepared for ${preparedFor || org}${
              preparedBy ? ` · Prepared by ${preparedBy}` : ''
            } · ${reportDate}</small>
          </div>
        </header>

        ${sectionBlock('1', 'Executive Summary', 'executive-summary', sections.exec || '')}
        ${sectionBlock('2', 'Current State', 'current-state', sections.current || '')}
        ${sectionBlock('3', 'Financials', 'financials', sections.financials || '')}
        ${sectionBlock('4', 'KPIs & Targets', 'kpis-targets', sections.kpis || '')}
        ${sectionBlock('5', 'Implementation Plan', 'implementation-plan', sections.impl || '')}
        ${sectionBlock('6', 'Operating Model', 'operating-model', sections.ops || '')}
        ${sectionBlock('7', 'Risks & Mitigations', 'risks-mitigations', sections.risk || '')}
        ${sectionBlock('8', 'ROI & Next Steps', 'roi-next', sections.roi || '')}
        ${sectionBlock('9', 'Conclusion', 'conclusion', sections.conclusion || '')}
        ${sectionBlock('10', 'Appendix', 'appendices', sections.appendix || '')}

        <footer>Generated by Sovereign Intelligence</footer>

        <!-- Chart registry for client hydration (read by ReformReportForm) -->
        <script id="chart-registry" type="application/json">${registryJSON}</script>
      </div>
    </body>
  </html>
  `;
}
