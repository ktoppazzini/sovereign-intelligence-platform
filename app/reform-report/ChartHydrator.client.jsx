"use client";

import { useEffect } from "react";

const TAG = "[ChartHydrator]";

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
    applyChartType(cardEl, nextType);
  };

  selectEl.addEventListener("change", handler);

  // Return a disposer so we can clean up on unmount
  return () => {
    selectEl.removeEventListener("change", handler);
  };
}

/**
 * Main hydrator: runs once on the client after the report HTML is injected.
 * It:
 *   - Finds all chart cards that have a Type dropdown
 *   - Ensures the correct SVG is visible for the current type
 *   - Attaches change listeners so switching the dropdown changes the chart
 */
export default function ChartHydrator() {
  useEffect(() => {
    try {
      // We support both:
      //   <select id="xyz-type" data-chart-id="xyz">...</select>
      //   <select data-chart-type>...</select>   (fallback)
      const selects = document.querySelectorAll(
        'figure.chart-card select[id$="-type"], figure.chart-card select[data-chart-type]'
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

      // Cleanup on unmount / route change
      return () => {
        disposers.forEach((fn) => {
          try {
            fn();
          } catch (err) {
            console.error(TAG, "dispose.error", err);
          }
        });
      };
    } catch (err) {
      console.error(TAG, "runtime.error", err);
    }
  }, []);

  // No visible UI; this is a pure behavior component
  return null;
}
