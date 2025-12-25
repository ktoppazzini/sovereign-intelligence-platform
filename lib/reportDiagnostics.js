/**
 * [SR:DIAG] Report Diagnostics Utility
 * Browser-side diagnostic script to validate generated reports
 * Checks for: nested scripts, broken chart cards, missing table titles
 */

export const REPORT_DIAGNOSTICS_SCRIPT = `
(function() {
  console.log('%c[SR:DIAG] Running Report Diagnostics...', 'color: #FFA500; font-weight: bold');
  
  const results = {
    nestedScripts: 0,
    brokenChartCards: [],
    missingTableTitles: [],
    chartCardsTotal: 0,
    tablesTotal: 0
  };

  // 1. Find nested <script> tags (CRITICAL - breaks parsing)
  document.querySelectorAll('script').forEach((s, i) => {
    if (/<script/i.test(s.textContent)) {
      console.error(\`%c[SR:DIAG] Nested <script> in script#\${i}\`, 'color: red; font-weight: bold');
      console.log('Preview:', s.textContent.slice(0, 100));
      results.nestedScripts++;
    }
  });

  // 2. Find broken chart cards (missing figure or data-chart spec)
  document.querySelectorAll('.chart-card').forEach((card, i) => {
    results.chartCardsTotal++;
    const fig = card.querySelector('figure[data-chart]');
    const spec = fig?.getAttribute('data-chart');
    const status = {
      index: i,
      hasFig: !!fig,
      hasSpec: !!spec,
      specPreview: spec?.slice(0, 50)
    };
    
    if (!fig || !spec) {
      console.warn(\`%c[SR:DIAG] Broken chart card#\${i}\`, 'color: orange');
      console.log(status);
      results.brokenChartCards.push(status);
    } else {
      console.log(\`[SR:DIAG] Card#\${i}:\`, status);
    }
  });

  // 3. Find tables without titles (accessibility issue)
  document.querySelectorAll('table').forEach((t, i) => {
    results.tablesTotal++;
    const prev = t.previousElementSibling;
    const hasTitle = prev?.classList.contains('table-title');
    
    if (!hasTitle) {
      console.warn(\`%c[SR:DIAG] Table#\${i} missing .table-title\`, 'color: orange');
      results.missingTableTitles.push(i);
    }
  });

  // Summary Report
  console.log('%c[SR:DIAG] Summary Report', 'color: #00FF00; font-weight: bold; font-size: 14px');
  console.table({
    'Nested Scripts (CRITICAL)': results.nestedScripts,
    'Total Chart Cards': results.chartCardsTotal,
    'Broken Chart Cards': results.brokenChartCards.length,
    'Total Tables': results.tablesTotal,
    'Missing Table Titles': results.missingTableTitles.length
  });

  // Priority warnings
  if (results.nestedScripts > 0) {
    console.error('%c[SR:DIAG] CRITICAL: Nested <script> tags found! This will abort HTML parsing.', 
      'color: red; font-weight: bold; font-size: 16px; background: yellow; padding: 4px');
  }
  
  if (results.brokenChartCards.length > 0) {
    console.warn(\`%c[SR:DIAG] HIGH: \${results.brokenChartCards.length} chart card(s) missing valid data-chart specs\`, 
      'color: orange; font-weight: bold');
  }
  
  if (results.missingTableTitles.length > 0) {
    console.warn(\`%c[SR:DIAG] MEDIUM: \${results.missingTableTitles.length} table(s) missing titles (accessibility)\`, 
      'color: orange');
  }

  // Store results globally for external access
  window.__SR_DIAG_RESULTS__ = results;
  console.log('%c[SR:DIAG] Results stored in window.__SR_DIAG_RESULTS__', 'color: #0099FF');
})();
`;

/**
 * Generate inline diagnostic script with Chart.js detection
 */
export function getInlineDiagnosticScript() {
  return `
<script>
// [SR:DIAG] Enhanced diagnostics with Chart.js detection
(function() {
  const report = {
    nestedScripts: 0,
    dropdown: { cards: 0, selects: 0, figures: 0, hasChartJS: false },
    titles: { tables: 0, ok: 0, generated: 0, issues: 0 },
    grid: { candidates: 0, checked: 0, failures: 0 }
  };

  // Check if Chart.js is loaded
  report.dropdown.hasChartJS = typeof Chart !== 'undefined';
  if (!report.dropdown.hasChartJS) {
    console.error('[SR:DIAG] Chart.js NOT loaded - charts will fail to render');
  }

  // Find nested scripts
  document.querySelectorAll('script').forEach((s, i) => {
    if (/<script/i.test(s.textContent)) {
      console.error(\`[SR:DIAG] Nested <script> in script#\${i}:\`, s.textContent.slice(0, 100));
      report.nestedScripts++;
    }
  });

  // Find chart cards and check their state
  document.querySelectorAll('.chart-card').forEach((card, i) => {
    report.dropdown.cards++;
    const sel = card.querySelector('.chart-type select');
    if (sel) report.dropdown.selects++;
    
    const fig = card.querySelector('figure[data-chart]');
    if (fig) {
      report.dropdown.figures++;
      const spec = fig.getAttribute('data-chart');
      if (!spec) {
        console.warn(\`[SR:DIAG] Card#\${i} has figure but no data-chart spec\`);
      }
    } else {
      console.warn(\`[SR:DIAG] Card#\${i} missing figure[data-chart]\`);
    }
  });

  // Find tables and their titles
  document.querySelectorAll('table').forEach((t, i) => {
    report.titles.tables++;
    const prev = t.previousElementSibling;
    const hasTitle = prev?.classList.contains('table-title');
    
    if (hasTitle) {
      report.titles.ok++;
    } else {
      report.titles.issues++;
      console.warn(\`[SR:DIAG] table#\${i} missing .table-title\`);
    }
  });

  // Check for suspicious tokens
  const bodyHTML = document.body?.innerHTML || '';
  if (/\\*\\?/.test(bodyHTML)) {
    console.error('[SR:DIAG] Suspicious token "*?" found in HTML - may abort parsing');
  }

  console.log('[SR:DIAG] Report:', report);
  window.__SR_DIAG__ = report;
})();
</script>
`;
}

/**
 * Export as ES module for use in templates
 */
export default {
  REPORT_DIAGNOSTICS_SCRIPT,
  getInlineDiagnosticScript
};
