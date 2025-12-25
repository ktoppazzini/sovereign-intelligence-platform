"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

function normalizeLang(lang) {
  if (!lang) return "English";
  const s = String(lang).trim().toLowerCase();
  if (s === "en" || s === "english") return "English";
  if (s.startsWith("ru")) return "Russian";
  if (s.startsWith("ja") || s.includes("japanese")) return "Japanese";
  if (s.startsWith("es") || s.includes("spanish")) return "Spanish";
  if (s.startsWith("fr") || s.includes("french")) return "French";
  if (s.startsWith("de") || s.includes("german")) return "German";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * One-liner auto-translation.
 *
 * Usage in ANY client page:
 *   useAutoPageTranslation();      // translates the whole <body>, except .notranslate
 *
 * Optional:
 *   useAutoPageTranslation("#reform-root");   // only translate inside a specific container
 */
export function useAutoPageTranslation(rootSelector = "body") {
  const searchParams = useSearchParams();
  const urlLang = searchParams.get("lang") || "English";
  const lang = normalizeLang(urlLang);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // English → no translation, no cost
    if (lang === "English") return;

    // Avoid re-translating if we've already done it for this lang
    const root =
      rootSelector === "body"
        ? document.body
        : document.querySelector(rootSelector);

    if (!root) return;

    const already = root.getAttribute("data-si-translated-lang");
    if (already && already.toLowerCase() === lang.toLowerCase()) {
      return;
    }

    const originalHtml = root.innerHTML;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/gptTranslation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "text",
            text: originalHtml,
            targetLang: lang,
            preserve: "html",
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          console.warn(
            "[useAutoPageTranslation] /api/gptTranslation failed:",
            res.status,
          );
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (data.translated && typeof data.translated === "string") {
          root.innerHTML = data.translated;
          root.setAttribute("data-si-translated-lang", lang);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.warn("[useAutoPageTranslation] aborted");
          return;
        }
        console.warn("[useAutoPageTranslation] error:", err);
      }
    })();

    return () => controller.abort();
  }, [lang, rootSelector]);
}
