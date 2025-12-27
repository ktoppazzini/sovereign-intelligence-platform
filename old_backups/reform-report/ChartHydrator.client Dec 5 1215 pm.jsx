"use client";
/**
 * ChartHydrator.client.jsx
 * - Non-destructive enhancement layer for ALL figures with data-chart
 * - Adds "Overall" + "Key Insights" (like your reference screenshot)
 * - Adds small bottom padding to prevent x-axis label clipping in Appendices
 * - Leaves existing TYPE dropdown logic intact (provided by TYPE_SWITCH_SCRIPT)
 *
 * Notes:
 * - No deletions; we only inject DOM elements and scoped styles at runtime.
 * - Works with the HTML emitted by report template (figures carry data-chart JSON).
 */

import { useEffect } from "react";

// ---------- tiny helpers ----------
function parseAttrJSON(s) {
  try { return JSON.parse(String(s).replace(/&quot;/g, '"').replace(/&amp;/g, '&')); }
  catch { return null; }
}

function fmtNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function percentChange(from, to) {
  if (!isFinite(from) || Math.abs(from) < 1e-9) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

function describeTrend(series) {
  if (!Array.isArray(series) || series.length < 2) return "Insufficient data.";
  const first = series[0];
  const last = series[series.length - 1];
  const pct = percentChange(first, last);
  if (pct === null) return "Series varies over time.";
  const dir = pct > 1e-6 ? "increasing" : (pct < -1e-6 ? "decreasing" : "flat");
  const pctTxt = `${pct > 0 ? "+" : ""}${(Math.round(pct * 10) / 10).toFixed(1)}%`;
  return `Values show ${dir} trend from ${fmtNumber(first)} to ${fmtNumber(last)} (${pctTxt}).`;
}

function computeInsights(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      overall: "Series not available.",
      key: "No data points detected for this visual."
    };
  }
  const sum = series.reduce((a, b) => a + (Number(b) || 0), 0);
  const avg = sum / series.length;
  let peak = -Infinity, idx = -1;
  series.forEach((v, i) => { const n = Number(v) || 0; if (n > peak) { peak = n; idx = i; } });
  const overall = describeTrend(series);
  const key = `Peak value of ${fmtNumber(peak)} achieved. Average performance: ${fmtNumber(Math.round(avg))}.`;
  return { overall, key };
}

// Inject a style tag once for minor layout fixes (axis clipping + card polish)
function ensureOnceStyle() {
  const id = "si-chart-hydrator-style";
  if (document.getElementById(id)) return;
  const css = `
    /* Avoid x-axis truncation for Appendix charts and others */
    figure[data-chart] .chart-root, 
    figure[data-chart] svg, 
    figure[data-chart] canvas { overflow: visible !important; }
    figure[data-chart] { padding-bottom: 18px; } /* small bottom breathing room */

    /* Insight block styling to match your screenshot */
    .si-insight-card {
      margin: .25rem 0 1rem;
      padding: .85rem 1rem .9rem;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 10px;
      background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
      box-shadow: 0 2px 10px rgba(0,0,0,.35) inset;
    }
    .si-insight-card .si-row { display:block; margin:.25rem 0; }
    .si-insight-card .si-label {
      font-weight: 700;
      color: #E6F0FF;
      margin-right: .35rem;
    }
    .si-insight-card .si-dot { 
      display:inline-block; width:8px; height:8px; border-radius:50%;
      background:#22d3ee; vertical-align:middle; margin-left:.5rem; 
    }
  `;
  const tag = document.createElement("style");
  tag.id = id;
  tag.textContent = css;
  document.head.appendChild(tag);
}

function injectInsightsIntoFigure(fig) {
  // 1) get spec
  const specRaw = fig.getAttribute("data-chart");
  const spec = parseAttrJSON(specRaw) || {};
  const ds = Array.isArray(spec.datasets) && spec.datasets[0] ? spec.datasets[0] : { data: [] };
  const series = Array.isArray(ds.data) ? ds.data.map(Number).filter((v) => isFinite(v)) : [];

  // 2) compute insights
  const { overall, key } = computeInsights(series);

  // REMOVE legacy summary row injection: summary rows are now generated server-side in chart HTML.
  // This function is now a no-op to avoid duplicate/inconsistent summary rows.
  return;
}

export default function ChartHydrator() {
  useEffect(() => {
    try {
      ensureOnceStyle();

      // Enhance all existing charts
      const figs = Array.from(document.querySelectorAll('figure[data-chart]'));
      figs.forEach(injectInsightsIntoFigure);

      // Observe for any charts that render later (dynamic injection / type changes)
      const mo = new MutationObserver((muts) => {
        const needs = new Set();
        muts.forEach((m) => {
          if (m.type === "childList") {
            m.addedNodes.forEach((n) => {
              if (n && n.nodeType === 1) {
                if (n.matches && n.matches('figure[data-chart]')) needs.add(n);
                n.querySelectorAll && n.querySelectorAll('figure[data-chart]').forEach((f) => needs.add(f));
              }
            });
          } else if (m.type === "attributes" && m.target && m.target.matches && m.target.matches('figure[data-chart]')) {
            needs.add(m.target);
          }
        });
        needs.forEach(injectInsightsIntoFigure);
      });

      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-chart"] });

      // Also re-apply after TYPE dropdown changes (TYPE_SWITCH_SCRIPT mutates figures)
      document.addEventListener("change", (e) => {
        const sel = e.target;
        if (sel && (sel.classList?.contains("chart-type-select") || sel.closest(".chart-ui"))) {
          const fig = sel.closest("figure[data-chart]");
          if (fig) injectInsightsIntoFigure(fig);
        }
      });

      return () => mo.disconnect();
    } catch (e) {
      // Non-fatal; never block render
      console.warn("[ChartHydrator] enhancement failed:", e);
    }
  }, []);

  // This component renders nothing; it enhances the DOM.
  return null;
}
