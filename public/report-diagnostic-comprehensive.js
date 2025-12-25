/**
 * COMPREHENSIVE REPORT DIAGNOSTIC TOOL
 * Created: November 7, 2025
 * Purpose: Deep analysis of dropdown functionality, KPI benchmarks, and implementation plan rendering
 * 
 * USAGE: Run this in browser console after report loads
 * Copy and paste the entire script, or load via: 
 * var script = document.createElement('script'); script.src='/report-diagnostic-comprehensive.js'; document.head.appendChild(script);
 */

(function() {
  'use strict';
  
  console.clear();
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold; font-size: 16px');
  console.log('%c🔬 COMPREHENSIVE REPORT DIAGNOSTIC TOOL', 'color: #4CAF50; font-weight: bold; font-size: 20px');
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold; font-size: 16px');
  console.log('Generated:', new Date().toLocaleString());
  console.log('\n');

  const report = {
    timestamp: new Date().toISOString(),
    dropdowns: {},
    kpis: {},
    implementationPlan: {},
    errors: []
  };

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: DROPDOWN DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2196F3; font-weight: bold; font-size: 14px');
  console.log('%c📊 SECTION 1: DROPDOWN FUNCTIONALITY ANALYSIS', 'color: #2196F3; font-weight: bold; font-size: 16px');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2196F3; font-weight: bold; font-size: 14px');
  
  function analyzeDropdowns() {
    const cards = document.querySelectorAll('.chart-card, figure[data-type]');
    report.dropdowns.totalCards = cards.length;
    report.dropdowns.cards = [];
    
    console.log(`\n📦 Found ${cards.length} chart cards\n`);
    
    // Test all possible selector patterns
    const selectorTests = [
      'select.chart-type-select',
      '.chart-type-select',
      '.chart-type select',
      '.chart-ui select',
      'select[class*="chart"]',
      'select',
      'header select',
      '.chart-head select'
    ];
    
    cards.forEach((card, index) => {
      console.log(`%c┌─ CARD ${index + 1} ─────────────────────────────────────────┐`, 'color: #FF9800; font-weight: bold');
      
      const cardInfo = {
        index: index + 1,
        tag: card.tagName,
        classes: Array.from(card.classList),
        dataType: card.getAttribute('data-type'),
        hasChartUi: !!card.querySelector('.chart-ui'),
        hasChartHead: !!card.querySelector('.chart-head'),
        selectorsFound: [],
        selectElement: null,
        plots: [],
        events: []
      };
      
      console.log(`│ Tag: %c${card.tagName}`, 'color: #4CAF50');
      console.log(`│ Classes: %c${cardInfo.classes.join(', ')}`, 'color: #4CAF50');
      console.log(`│ data-type: %c${cardInfo.dataType || 'none'}`, 'color: #4CAF50');
      console.log(`│ Has .chart-ui: %c${cardInfo.hasChartUi}`, cardInfo.hasChartUi ? 'color: #4CAF50' : 'color: #f44336');
      console.log(`│ Has .chart-head: %c${cardInfo.hasChartHead}`, cardInfo.hasChartHead ? 'color: #4CAF50' : 'color: #f44336');
      
      // Test each selector
      console.log(`│`);
      console.log(`│ 🔍 Testing ${selectorTests.length} selector patterns:`);
      
      selectorTests.forEach(selector => {
        try {
          const element = card.querySelector(selector);
          if (element) {
            cardInfo.selectorsFound.push(selector);
            if (!cardInfo.selectElement) {
              cardInfo.selectElement = {
                tag: element.tagName,
                id: element.id || '(none)',
                classes: Array.from(element.classList),
                value: element.value,
                options: Array.from(element.options || []).map(opt => opt.value),
                parent: element.parentElement?.tagName,
                parentClass: element.parentElement?.className
              };
            }
            console.log(`│   %c✅ MATCH: "${selector}"`, 'color: #4CAF50; font-weight: bold');
          } else {
            console.log(`│   %c❌ NO MATCH: "${selector}"`, 'color: #9E9E9E');
          }
        } catch (e) {
          console.log(`│   %c⚠️  ERROR: "${selector}" - ${e.message}`, 'color: #f44336');
        }
      });
      
      // Analyze select element if found
      if (cardInfo.selectElement) {
        console.log(`│`);
        console.log(`│ 📝 Select Element Details:`);
        console.log(`│   Tag: ${cardInfo.selectElement.tag}`);
        console.log(`│   ID: ${cardInfo.selectElement.id}`);
        console.log(`│   Classes: ${cardInfo.selectElement.classes.join(', ')}`);
        console.log(`│   Current value: %c${cardInfo.selectElement.value}`, 'color: #FF9800; font-weight: bold');
        console.log(`│   Options: ${cardInfo.selectElement.options.join(', ')}`);
        console.log(`│   Parent: ${cardInfo.selectElement.parent}.${cardInfo.selectElement.parentClass}`);
        
        // Check for event listeners
        const select = card.querySelector(cardInfo.selectorsFound[0]);
        const hasChangeListener = select && typeof select.onchange === 'function';
        cardInfo.events.push({
          type: 'change',
          hasListener: hasChangeListener,
          listenerType: hasChangeListener ? 'direct' : 'delegated or none'
        });
        console.log(`│   Change listener: %c${hasChangeListener ? 'YES (direct)' : 'NO (checking delegated...)'}`, 
          hasChangeListener ? 'color: #4CAF50' : 'color: #FF9800');
      } else {
        console.log(`│ %c⚠️  NO SELECT ELEMENT FOUND!`, 'color: #f44336; font-weight: bold');
      }
      
      // Analyze plots
      const plots = card.querySelectorAll('.plot, plot');
      console.log(`│`);
      console.log(`│ 🎨 Plots: ${plots.length} found`);
      
      plots.forEach((plot, pIndex) => {
        const plotClasses = Array.from(plot.classList);
        const computedStyle = window.getComputedStyle(plot);
        const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
        
        const plotInfo = {
          index: pIndex + 1,
          tag: plot.tagName,
          classes: plotClasses,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          isVisible: isVisible,
          hasCanvas: !!plot.querySelector('canvas')
        };
        
        cardInfo.plots.push(plotInfo);
        
        console.log(`│   Plot ${pIndex + 1}: %c${plot.tagName}.${plotClasses.join('.')}`, 
          isVisible ? 'color: #4CAF50; font-weight: bold' : 'color: #9E9E9E');
        console.log(`│     Display: ${plotInfo.display}, Visible: ${isVisible ? '✅' : '❌'}, Canvas: ${plotInfo.hasCanvas ? '✅' : '❌'}`);
      });
      
      console.log(`└${'─'.repeat(58)}┘\n`);
      
      report.dropdowns.cards.push(cardInfo);
    });
    
    // Summary
    const cardsWithSelects = report.dropdowns.cards.filter(c => c.selectElement).length;
    const cardsWithMultiplePlots = report.dropdowns.cards.filter(c => c.plots.length > 1).length;
    
    console.log('\n%c📊 DROPDOWN SUMMARY:', 'color: #2196F3; font-weight: bold; font-size: 14px');
    console.log(`   Total cards: ${report.dropdowns.totalCards}`);
    console.log(`   Cards with selects: %c${cardsWithSelects}`, cardsWithSelects === report.dropdowns.totalCards ? 'color: #4CAF50' : 'color: #f44336');
    console.log(`   Cards with multiple plots: ${cardsWithMultiplePlots}`);
    
    // Most reliable selector
    const selectorCounts = {};
    report.dropdowns.cards.forEach(card => {
      card.selectorsFound.forEach(sel => {
        selectorCounts[sel] = (selectorCounts[sel] || 0) + 1;
      });
    });
    console.log('\n   📌 Selector Success Rates:');
    Object.entries(selectorCounts).sort((a, b) => b[1] - a[1]).forEach(([sel, count]) => {
      const percentage = ((count / cards.length) * 100).toFixed(1);
      console.log(`      "${sel}": ${count}/${cards.length} (${percentage}%)`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: KPI BENCHMARK DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9C27B0; font-weight: bold; font-size: 14px');
  console.log('%c📈 SECTION 2: KPI BENCHMARK ANALYSIS', 'color: #9C27B0; font-weight: bold; font-size: 16px');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9C27B0; font-weight: bold; font-size: 14px');
  
  function analyzeKPIBenchmarks() {
    // Look for benchmark widgets
    const benchmarks = document.querySelectorAll('.benchmark-widget, figure.benchmark, [data-type="benchmark"]');
    report.kpis.totalBenchmarks = benchmarks.length;
    report.kpis.benchmarks = [];
    
    console.log(`\n📊 Found ${benchmarks.length} benchmark widgets\n`);
    
    benchmarks.forEach((widget, index) => {
      console.log(`%c┌─ BENCHMARK ${index + 1} ─────────────────────────────────────┐`, 'color: #9C27B0; font-weight: bold');
      
      const widgetInfo = {
        index: index + 1,
        classes: Array.from(widget.classList),
        dataType: widget.getAttribute('data-type'),
        title: null,
        bars: [],
        labels: [],
        values: [],
        isEmpty: false
      };
      
      // Get title
      const titleEl = widget.querySelector('figcaption, .benchmark-title, h3, h4');
      if (titleEl) {
        widgetInfo.title = titleEl.textContent.trim();
        console.log(`│ Title: %c${widgetInfo.title}`, 'color: #9C27B0; font-weight: bold');
      }
      
      // Analyze bars
      const bars = widget.querySelectorAll('.bar, .benchmark-bar, [class*="bar"]');
      console.log(`│ Bars found: ${bars.length}`);
      
      bars.forEach((bar, bIndex) => {
        const computedStyle = window.getComputedStyle(bar);
        const barInfo = {
          index: bIndex + 1,
          classes: Array.from(bar.classList),
          height: computedStyle.height,
          backgroundColor: computedStyle.backgroundColor,
          display: computedStyle.display,
          isVisible: computedStyle.display !== 'none',
          text: bar.textContent.trim()
        };
        
        widgetInfo.bars.push(barInfo);
        
        console.log(`│   Bar ${bIndex + 1}: height=${barInfo.height}, visible=${barInfo.isVisible ? '✅' : '❌'}`);
        console.log(`│     Background: ${barInfo.backgroundColor}`);
        console.log(`│     Text: "${barInfo.text}"`);
      });
      
      // Check for labels
      const labels = widget.querySelectorAll('.benchmark-label, .label, label');
      console.log(`│ Labels found: ${labels.length}`);
      labels.forEach((label, lIndex) => {
        const text = label.textContent.trim();
        widgetInfo.labels.push(text);
        console.log(`│   Label ${lIndex + 1}: "${text}"`);
      });
      
      // Check if empty
      const hasCanvas = !!widget.querySelector('canvas');
      const hasSVG = !!widget.querySelector('svg');
      const hasBars = bars.length > 0;
      const visibleBars = Array.from(bars).filter(b => window.getComputedStyle(b).display !== 'none').length;
      
      widgetInfo.isEmpty = !hasCanvas && !hasSVG && (!hasBars || visibleBars === 0);
      
      console.log(`│`);
      console.log(`│ 🎨 Rendering Check:`);
      console.log(`│   Has canvas: ${hasCanvas ? '✅' : '❌'}`);
      console.log(`│   Has SVG: ${hasSVG ? '✅' : '❌'}`);
      console.log(`│   Has bars: ${hasBars ? '✅' : '❌'}`);
      console.log(`│   Visible bars: ${visibleBars}/${bars.length}`);
      console.log(`│   %cIS EMPTY: ${widgetInfo.isEmpty ? '❌ YES' : '✅ NO'}`, 
        widgetInfo.isEmpty ? 'color: #f44336; font-weight: bold' : 'color: #4CAF50; font-weight: bold');
      
      // Check for data attributes
      console.log(`│`);
      console.log(`│ 📊 Data Attributes:`);
      const dataAttrs = {};
      Array.from(widget.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          dataAttrs[attr.name] = attr.value;
          console.log(`│   ${attr.name}: ${attr.value}`);
        }
      });
      widgetInfo.dataAttributes = dataAttrs;
      
      console.log(`└${'─'.repeat(58)}┘\n`);
      
      report.kpis.benchmarks.push(widgetInfo);
    });
    
    // Look for dashboard-wide section
    const dashboardWide = document.querySelector('.dashboard-wide');
    report.kpis.hasDashboardWide = !!dashboardWide;
    
    console.log('\n%c📈 KPI SUMMARY:', 'color: #9C27B0; font-weight: bold; font-size: 14px');
    console.log(`   Total benchmarks: ${report.kpis.totalBenchmarks}`);
    console.log(`   Has .dashboard-wide section: %c${report.kpis.hasDashboardWide ? '✅' : '❌'}`, 
      report.kpis.hasDashboardWide ? 'color: #4CAF50' : 'color: #f44336');
    
    const emptyBenchmarks = report.kpis.benchmarks.filter(b => b.isEmpty).length;
    if (emptyBenchmarks > 0) {
      console.log(`   %c⚠️  Empty benchmarks: ${emptyBenchmarks}`, 'color: #f44336; font-weight: bold');
    } else {
      console.log(`   Empty benchmarks: 0 ✅`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: IMPLEMENTATION PLAN DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #FF5722; font-weight: bold; font-size: 14px');
  console.log('%c🗓️  SECTION 3: IMPLEMENTATION PLAN ANALYSIS', 'color: #FF5722; font-weight: bold; font-size: 16px');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #FF5722; font-weight: bold; font-size: 14px');
  
  function analyzeImplementationPlan() {
    const implSection = document.querySelector('.impl-roadmap');
    report.implementationPlan.found = !!implSection;
    
    if (!implSection) {
      console.log('\n%c⚠️  NO IMPLEMENTATION PLAN SECTION FOUND!', 'color: #f44336; font-weight: bold; font-size: 14px');
      return;
    }
    
    console.log('\n✅ Implementation plan section found\n');
    
    // Analyze phase headers
    const phaseHeads = implSection.querySelectorAll('.impl-head');
    report.implementationPlan.totalPhases = phaseHeads.length;
    report.implementationPlan.phases = [];
    
    console.log(`📋 Phase Headers: ${phaseHeads.length} found\n`);
    
    phaseHeads.forEach((head, index) => {
      const computedStyle = window.getComputedStyle(head);
      const phaseInfo = {
        index: index + 1,
        text: head.textContent.trim(),
        isEmpty: !head.textContent.trim(),
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight,
        height: computedStyle.height,
        padding: computedStyle.padding
      };
      
      report.implementationPlan.phases.push(phaseInfo);
      
      console.log(`Phase ${index + 1}:`);
      console.log(`  Text: %c"${phaseInfo.text}"`, phaseInfo.isEmpty ? 'color: #f44336; font-weight: bold' : 'color: #4CAF50; font-weight: bold');
      console.log(`  Display: ${phaseInfo.display}, Visible: ${phaseInfo.visibility}`);
      console.log(`  Color: ${phaseInfo.color}, Size: ${phaseInfo.fontSize}`);
      console.log(`  Height: ${phaseInfo.height}, Padding: ${phaseInfo.padding}`);
      console.log('');
    });
    
    // Analyze icons
    const icons = implSection.querySelectorAll('.impl-icon');
    console.log(`🎨 Icons: ${icons.length} found`);
    icons.forEach((icon, index) => {
      console.log(`  Icon ${index + 1}: ${icon.textContent.trim()}`);
    });
    
    // Analyze descriptions
    const descs = implSection.querySelectorAll('.impl-desc');
    console.log(`\n📝 Descriptions: ${descs.length} found`);
    descs.forEach((desc, index) => {
      const text = desc.textContent.trim();
      console.log(`  Desc ${index + 1}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    });
    
    // Check for heading
    const heading = implSection.querySelector('h3');
    if (heading) {
      console.log(`\n📌 Section Heading: "${heading.textContent.trim()}"`);
    }
    
    console.log('\n%c🗓️  IMPLEMENTATION PLAN SUMMARY:', 'color: #FF5722; font-weight: bold; font-size: 14px');
    console.log(`   Total phases: ${report.implementationPlan.totalPhases}`);
    const emptyPhases = report.implementationPlan.phases.filter(p => p.isEmpty).length;
    console.log(`   Empty phase headers: %c${emptyPhases}`, emptyPhases > 0 ? 'color: #f44336; font-weight: bold' : 'color: #4CAF50');
    console.log(`   Icons: ${icons.length}`);
    console.log(`   Descriptions: ${descs.length}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: EVENT LISTENER TESTING
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00BCD4; font-weight: bold; font-size: 14px');
  console.log('%c🎯 SECTION 4: EVENT LISTENER TEST', 'color: #00BCD4; font-weight: bold; font-size: 16px');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00BCD4; font-weight: bold; font-size: 14px');
  
  function testEventListeners() {
    const selects = document.querySelectorAll('select.chart-type-select, .chart-type-select');
    console.log(`\n🔍 Testing event listeners on ${selects.length} select elements\n`);
    
    if (selects.length === 0) {
      console.log('%c⚠️  No select elements found to test!', 'color: #f44336; font-weight: bold');
      return;
    }
    
    // Test first select
    const firstSelect = selects[0];
    console.log('Testing first select element...');
    console.log('  Current value:', firstSelect.value);
    console.log('  Options:', Array.from(firstSelect.options).map(o => o.value).join(', '));
    
    // Check for listeners
    const listeners = {
      onclick: typeof firstSelect.onclick === 'function',
      onchange: typeof firstSelect.onchange === 'function',
      oninput: typeof firstSelect.oninput === 'function'
    };
    
    console.log('  Direct listeners:', listeners);
    
    // Try to trigger change
    console.log('\n🧪 Attempting to trigger change event...');
    const originalValue = firstSelect.value;
    const newValue = firstSelect.options[1] ? firstSelect.options[1].value : firstSelect.value;
    
    console.log(`  Original: ${originalValue}, New: ${newValue}`);
    
    if (newValue !== originalValue) {
      firstSelect.value = newValue;
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      firstSelect.dispatchEvent(changeEvent);
      console.log('  ✅ Change event dispatched');
      
      // Check if data-type changed
      const card = firstSelect.closest('.chart-card, figure[data-type]');
      if (card) {
        const newDataType = card.getAttribute('data-type');
        console.log(`  Card data-type after change: ${newDataType}`);
        if (newDataType === newValue) {
          console.log('  %c✅ SUCCESS: data-type updated!', 'color: #4CAF50; font-weight: bold');
        } else {
          console.log('  %c❌ FAILED: data-type not updated', 'color: #f44336; font-weight: bold');
        }
        
        // Reset
        firstSelect.value = originalValue;
        const resetEvent = new Event('change', { bubbles: true, cancelable: true });
        firstSelect.dispatchEvent(resetEvent);
      }
    } else {
      console.log('  ⚠️  Cannot test: not enough options');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // RUN ALL DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════
  
  try {
    analyzeDropdowns();
  } catch (e) {
    console.error('Error in dropdown analysis:', e);
    report.errors.push({ section: 'dropdowns', error: e.message });
  }
  
  try {
    analyzeKPIBenchmarks();
  } catch (e) {
    console.error('Error in KPI analysis:', e);
    report.errors.push({ section: 'kpis', error: e.message });
  }
  
  try {
    analyzeImplementationPlan();
  } catch (e) {
    console.error('Error in implementation plan analysis:', e);
    report.errors.push({ section: 'implementationPlan', error: e.message });
  }
  
  try {
    testEventListeners();
  } catch (e) {
    console.error('Error in event listener test:', e);
    report.errors.push({ section: 'eventListeners', error: e.message });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY AND RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n\n%c═══════════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold; font-size: 16px');
  console.log('%c📋 DIAGNOSTIC SUMMARY & RECOMMENDATIONS', 'color: #4CAF50; font-weight: bold; font-size: 18px');
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold; font-size: 16px');
  
  // Issue detection
  const issues = [];
  const recommendations = [];
  
  // Check dropdowns
  const cardsWithoutSelects = report.dropdowns.cards.filter(c => !c.selectElement).length;
  if (cardsWithoutSelects > 0) {
    issues.push(`${cardsWithoutSelects} chart cards missing select elements`);
    recommendations.push('Verify selector pattern in TypeSwitch script matches actual DOM structure');
  }
  
  // Check KPIs
  const emptyKPIs = report.kpis.benchmarks?.filter(b => b.isEmpty).length || 0;
  if (emptyKPIs > 0) {
    issues.push(`${emptyKPIs} KPI benchmarks appear empty`);
    recommendations.push('Check if benchmark data is being generated and bar heights are set correctly');
  }
  
  // Check implementation plan
  const emptyPhases = report.implementationPlan.phases?.filter(p => p.isEmpty).length || 0;
  if (emptyPhases > 0) {
    issues.push(`${emptyPhases} implementation plan phases have no text`);
    recommendations.push('Verify phase data is passed correctly from backend to planDiagramHTML function');
  }
  
  console.log('\n%c🔍 ISSUES DETECTED:', 'color: #f44336; font-weight: bold; font-size: 14px');
  if (issues.length === 0) {
    console.log('%c   ✅ No major issues detected!', 'color: #4CAF50; font-weight: bold');
  } else {
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. %c${issue}`, 'color: #f44336; font-weight: bold');
    });
  }
  
  console.log('\n%c💡 RECOMMENDATIONS:', 'color: #2196F3; font-weight: bold; font-size: 14px');
  if (recommendations.length === 0) {
    console.log('   No recommendations at this time.');
  } else {
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }
  
  console.log('\n%c📊 FULL REPORT OBJECT:', 'color: #9C27B0; font-weight: bold; font-size: 14px');
  console.log('   Access via: window.diagnosticReport');
  console.log('   Or copy: copy(window.diagnosticReport)');
  
  // Make report available globally
  window.diagnosticReport = report;
  
  console.log('\n%c═══════════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold; font-size: 16px');
  console.log('%c✅ DIAGNOSTIC COMPLETE', 'color: #4CAF50; font-weight: bold; font-size: 18px');
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold; font-size: 16px');
  console.log('\n');
  
  return report;
})();
