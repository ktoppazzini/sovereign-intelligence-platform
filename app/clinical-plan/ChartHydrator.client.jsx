"use client";

import { useEffect, useRef } from "react";

const TAG = "[ChartHydrator:Clinical]";

/**
 * Show only the SVG for the requested type inside a single chart card.
 * We rely on the CSS classes you already generate:
 *   <svg class="plot line">...</svg>
 *   <svg class="plot bar">...</svg>
 *   <svg class="plot pie">...</svg>
 *   <svg class="plot doughnut">...</svg>
 */
function applyChartType(cardEl, type) {
  if (!cardEl) return;

  const plots = cardEl.querySelectorAll(".plot");
  plots.forEach((plot) => {
    plot.style.display = "none";
  });

  const target = cardEl.querySelector(`.plot.${type}`);
  if (target) {
    target.style.display = "block";
    console.log(TAG, `Applied chart type: ${type}`);
  }
}

/**
 * Wire up a single <select> that controls a given chart card.
 */
function wireDropdown(selectEl) {
  if (!selectEl) return;

  // Try to locate the owning <figure> chart card
  const cardEl = selectEl.closest("figure.chart-card");
  if (!cardEl) return;

  const initialType = selectEl.value || "line";
  applyChartType(cardEl, initialType);

  const handler = (e) => {
    const nextType = e.target.value || "line";
    console.log(TAG, "Dropdown changed to:", nextType);
    applyChartType(cardEl, nextType);
  };

  selectEl.addEventListener("change", handler);

  // Return a disposer so we can clean up on unmount
  return () => {
    selectEl.removeEventListener("change", handler);
  };
}

/**
 * Find and wire up all chart dropdowns in the document
 */
function hydrateAllCharts() {
  // Support multiple selector patterns for chart type selects
  const selects = document.querySelectorAll(
    'figure.chart-card select[id$="-type"], figure.chart-card select[data-chart-type], figure.chart-card select.chart-type-select, .chart-card select, figure[data-type] select'
  );

  const disposers = [];
  selects.forEach((sel) => {
    const dispose = wireDropdown(sel);
    if (dispose) disposers.push(dispose);
  });

  console.log(TAG, "hydrated", {
    dropdowns: selects.length,
    disposers: disposers.length,
  });

  return disposers;
}

/**
 * Main hydrator: runs on the client after the report HTML is injected.
 * Uses MutationObserver to catch dynamically added charts.
 * 
 * It:
 *   - Finds all chart cards that have a Type dropdown
 *   - Ensures the correct SVG is visible for the current type
 *   - Attaches change listeners so switching the dropdown changes the chart
 *   - Uses MutationObserver to handle dynamically added chart cards
 */
export default function ChartHydrator() {
  const disposersRef = useRef([]);
  const observerRef = useRef(null);

  useEffect(() => {
    console.log(TAG, "Initializing ChartHydrator");

    // Wait a tick for DOM to be ready after dangerouslySetInnerHTML
    const initTimeout = setTimeout(() => {
      try {
        // Initial hydration
        disposersRef.current = hydrateAllCharts();

        // Set up MutationObserver to handle dynamically added chart cards
        observerRef.current = new MutationObserver((mutations) => {
          let shouldRehydrate = false;
          
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              // Check if any added nodes contain chart cards
              for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) { // Element node
                  if (node.matches?.('figure.chart-card') || 
                      node.querySelector?.('figure.chart-card')) {
                    shouldRehydrate = true;
                    break;
                  }
                }
              }
            }
            if (shouldRehydrate) break;
          }

          if (shouldRehydrate) {
            console.log(TAG, "New chart cards detected, rehydrating");
            // Dispose old listeners
            disposersRef.current.forEach((fn) => {
              try { fn(); } catch (e) { /* ignore */ }
            });
            // Rehydrate all charts
            disposersRef.current = hydrateAllCharts();
          }
        });

        // Observe the document body for new chart cards
        observerRef.current.observe(document.body, {
          childList: true,
          subtree: true,
        });

        console.log(TAG, "MutationObserver started");
      } catch (err) {
        console.error(TAG, "runtime.error", err);
      }
    }, 100); // Small delay to ensure DOM is ready

    // Cleanup on unmount / route change
    return () => {
      clearTimeout(initTimeout);
      
      // Dispose all event listeners
      disposersRef.current.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error(TAG, "dispose.error", err);
        }
      });
      disposersRef.current = [];

      // Disconnect MutationObserver
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      console.log(TAG, "Cleanup complete");
    };
  }, []);

  // No visible UI; this is a pure behavior component
  return null;
}
