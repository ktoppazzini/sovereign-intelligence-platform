import OpenAI from "openai";
import { NextResponse as Response } from "next/server";
import { setMaxListeners } from "events";
//import { setGraphTranslator } from '.../reportGraphs';//

// Somewhere central once you know the report language:
//setGraphTranslator((s) => someTranslator(s, lang));//


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hard-lock Nano 5 for dev; you can swap this in prod.
const MODEL = process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07";
// Increase the default Node.js event listener limit to avoid warnings in heavy concurrency
setMaxListeners(100, process);
function preview(str, n = 160) {
  if (typeof str !== "string") return "";
  return str.length > n ? `${str.slice(0, n)} …` : str;
}

// Safely try to pull a JSON object out of GPT output
function extractJsonObject(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // 1) Pure JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  // 2) ```json fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    const inner = fenceMatch[1].trim();
    if (inner.startsWith("{") && inner.endsWith("}")) return inner;
  }

  // 3) Fallback brace slice with no prose prefix
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) return null;

  const prefix = trimmed.slice(0, firstBrace).trim();
  if (prefix && !prefix.startsWith("```")) return null;

  const candidate = trimmed.slice(firstBrace, lastBrace + 1).trim();
  if (!candidate.startsWith("{") || !candidate.endsWith("}")) return null;

  return candidate;
}

function normalizeLang(raw) {
  if (!raw) return "English";
  const s = String(raw).trim().toLowerCase();
  if (s === "en" || s === "english") return "English";
  if (s.startsWith("ru")) return "Russian";
  if (s.startsWith("ja") || s.includes("japanese")) return "Japanese";
  if (s.startsWith("es") || s.includes("spanish")) return "Spanish";
  if (s.startsWith("fr") || s.includes("french")) return "French";
  if (s.startsWith("de") || s.includes("german")) return "German";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function POST(req) {
  const controller = new AbortController();
  let timeoutId;

  // Ensure these are always defined for error handling
  let buttonTranslations = [];
  let countryTranslations = [];
  let dropdownTranslations = [];

  try {
    const body = await req.json().catch(() => ({}));

    // Also allow ?lang= on the URL
    let url;
    try {
      url = new URL(
        req.url,
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost",
      );
    } catch (e) {
      url = { searchParams: new URLSearchParams() };
    }

    // Button translations (unchanged)
    if (Array.isArray(body.buttons) && body.buttons.length > 0) {
      const buttonPrompt = [
        "You are a translation engine.",
        `Translate the following button labels and ALL visible UI labels, tooltips, placeholders, and any user-facing text into ${normalizeLang(
          body.targetLang || body.lang || url.searchParams.get("lang") || "English",
        )}.`,
        "Return a JSON array of translated button labels, in the same order.",
        "Respond with RAW JSON ONLY. No extra text.",
        "Ensure every label, tooltip, placeholder, visible string, and type (such as button, input, select, etc.) on the page is translated.",
      ].join("\n");

      const buttonMessages = [
        { role: "system", content: buttonPrompt },
        { role: "user", content: JSON.stringify(body.buttons, null, 2) },
      ];

      try {
        const buttonCompletion = await openai.chat.completions.create(
          {
            model: MODEL,
            messages: buttonMessages,
            temperature: 1,
          },
          { signal: controller.signal },
        );
        const buttonRaw =
          buttonCompletion.choices?.[0]?.message?.content != null
            ? buttonCompletion.choices[0].message.content
            : "";

        const buttonJsonStr = extractJsonObject(buttonRaw);
        if (buttonJsonStr) {
          buttonTranslations = JSON.parse(buttonJsonStr);
        }
      } catch (buttonErr) {
        console.warn("[gptTranslation] Button translation failed:", buttonErr);
        buttonTranslations = [];
      }
    }

    // Extract target language from URL (?lang=)
    const urlLang = url.searchParams.get("lang");

    // Country translations (unchanged)
    if (Array.isArray(body.countries) && body.countries.length > 0) {
      const countryPrompt = [
        "You are a translation engine.",
        `Translate the following country names into ${normalizeLang(
          body.targetLang || body.lang || urlLang || "English",
        )}.`,
        "Return a JSON array of translated country names, in the same order.",
        "Respond with RAW JSON ONLY. No extra text.",
      ].join("\n");

      const countryMessages = [
        { role: "system", content: countryPrompt },
        { role: "user", content: JSON.stringify(body.countries, null, 2) },
      ];

      try {
        const countryCompletion = await openai.chat.completions.create(
          {
            model: MODEL,
            messages: countryMessages,
            temperature: 1,
          },
          { signal: controller.signal },
        );
        const countryRaw =
          countryCompletion.choices?.[0]?.message?.content != null
            ? countryCompletion.choices[0].message.content
            : "";

        const countryJsonStr = extractJsonObject(countryRaw);
        if (countryJsonStr) {
          countryTranslations = JSON.parse(countryJsonStr);
        }
      } catch (countryErr) {
        console.warn("[gptTranslation] Country translation failed:", countryErr);
        countryTranslations = [];
      }
    }

    const mode = body.mode || "json"; // 'json' | 'text'
    const targetLang = normalizeLang(body.targetLang || body.lang || urlLang || "English");
    // L.lang = targetLang;

    // JSON-mode input (UI labels)
    // OLD: only map/ui
    // const uiMap =
    //   (body.map && typeof body.map === "object" && body.map) ||
    //   (body.ui && typeof body.ui === "object" && body.ui) ||
    //   null;

    // NEW: also accept labelMap (for call sites that send that)
    const uiMap =
      (body.map && typeof body.map === "object" && body.map) ||
      (body.ui && typeof body.ui === "object" && body.ui) ||
      (body.labelMap && typeof body.labelMap === "object" && body.labelMap) ||
      null;
      // [KT:SURGICAL:LABEL-MERGE]
// Ensure report structural labels (Title Page, TOC, Executive Summary, etc.)
// are always included in JSON translation, even if caller doesn't send them.

if (mode === "json" && uiMap && !uiMap.executiveSummary) {
  uiMap.executiveSummary = "Executive Summary";
  uiMap.tableOfContents = "Table of Contents";
  uiMap.currentState = "Current State";
  uiMap.financialAnalysis = "Financials";
  uiMap.kpiAnalysis = "KPIs & Targets";
  uiMap.operationalAnalysis = "Operational Analysis";
  uiMap.riskAssessment = "Risk Assessment";
  uiMap.roiProjections = "ROI";
  uiMap.nextSteps = "Next Steps";
  uiMap.appendices = "Appendices";
  uiMap.atAGlance = "At a Glance";
  uiMap.titlePage = "Title Page";
  uiMap.preparedFor = "Prepared for";
  uiMap.preparedBy = "Prepared by";
}


    // Text/HTML input
    const text = typeof body.text === "string" ? body.text : "";
    const preserve = body.preserve || "html"; // 'html' | 'plain'

    // If no API key, bail fast
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[gptTranslation] OPENAI_API_KEY missing");
      return Response.json(
        {
          translation: {},
          translated: "",
          raw: "",
          error: "Translation service not configured",
        },
        { status: 503 },
      );
    }

    // === SHORT-CIRCUITS =====================================================

    // JSON mode but no labels
    if (mode === "json") {
      const keys = uiMap ? Object.keys(uiMap) : [];
      if (!uiMap || keys.length === 0) {
        console.warn(
          "[gptTranslation] JSON mode called with EMPTY label map — skipping GPT call.",
          { targetLang },
        );
        return Response.json({
          translation: {},
          raw: "",
          error: "No UI labels provided; skipped GPT call.",
          buttonTranslations,
          countryTranslations,
          dropdownTranslations,
        });
      }
    }

    // Text/HTML mode but no text
    if (mode === "text" && !text) {
      console.warn(
        "[gptTranslation] TEXT mode called with EMPTY text — skipping GPT call.",
        { targetLang },
      );
      return Response.json({
        translated: "",
        raw: "",
        error: "No text provided; skipped GPT call.",
        buttonTranslations,
        countryTranslations,
        dropdownTranslations,
      });
    }

    // English → just echo inputs (no GPT, no cost)
    if (targetLang === "English") {
      if (mode === "json") {
        return Response.json({
          translation: uiMap || {},
          raw: "",
          error: "",
        });
      }
      return Response.json({
        translated: text,
        raw: "",
        error: "",
      });
    }

    // === BUILD PROMPT =======================================================

    const messages = [];

    if (mode === "json") {
      messages.push(
        {
          role: "system",
          content: [
            "You are a translation engine.",
            `Target language: ${targetLang}.`,
            "",
            "You will be given a JSON object where KEYS are identifiers and VALUES are English UI labels.",
            "Return a JSON object with the SAME KEYS and translated VALUES.",
            "",
            "RULES:",
            "- Respond with RAW JSON ONLY. No extra text.",
            "- The output must be valid JSON.",
            "- Preserve all placeholders exactly (e.g., {name}, {{count}}, {{rev}}).",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify(uiMap, null, 2),
        },
      );
    } else {
      messages.push(
        {
          role: "system",
          content: [
            "You are a translation engine.",
            `Translate ALL user-visible text into the target language: ${targetLang}.`,
            preserve === "html"
              ? "Preserve ALL HTML tags and attributes exactly as-is. Only translate human-readable text between tags."
              : "Preserve the existing structure; only translate the natural language content.",
            "Do not explain. Return ONLY the translated content.",
          ].join("\n"),
        },
        {
          role: "user",
          content: text,
        },
      );
    }

    // Dropdown options (unchanged)
    if (Array.isArray(body.dropdownOptions) && body.dropdownOptions.length > 0) {
      const dropdownPrompt = [
        "You are a translation engine.",
        `Translate the following dropdown options into ${targetLang}.`,
        "Return a JSON array of translated strings, in the same order.",
        "Respond with RAW JSON ONLY. No extra text.",
      ].join("\n");

      const dropdownMessages = [
        { role: "system", content: dropdownPrompt },
        { role: "user", content: JSON.stringify(body.dropdownOptions, null, 2) },
      ];

      try {
        const dropdownCompletion = await openai.chat.completions.create(
          {
            model: MODEL,
            messages: dropdownMessages,
            temperature: 1,
          },
          { signal: controller.signal },
        );
        const dropdownRaw =
          dropdownCompletion.choices?.[0]?.message?.content != null
            ? dropdownCompletion.choices[0].message.content
            : "";

        const dropdownJsonStr = extractJsonObject(dropdownRaw);
        if (dropdownJsonStr) {
          try {
            dropdownTranslations = JSON.parse(dropdownJsonStr);
          } catch (e) {
            console.warn("[gptTranslation] Failed to parse dropdown JSON:", e);
            dropdownTranslations = [];
          }
        }
      } catch (dropdownErr) {
        console.warn("[gptTranslation] Dropdown translation failed:", dropdownErr);
        dropdownTranslations = [];
      }
    }

    // === TIMEOUT & CALL =====================================================

    //const timeoutMs = mode === "text" ? 1000000 : 1000000;
    //timeoutId = setTimeout(() => controller.abort(), timeoutMs);
const __SAFE_TIMEOUT = 10000000; // 2 minutes
const timeoutMs = mode === "text" ? __SAFE_TIMEOUT : __SAFE_TIMEOUT;
timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log("[gptTranslation] calling OpenAI", {
      mode,
      lang: targetLang,
      keys: uiMap ? Object.keys(uiMap).length : 0,
      textLen: text.length,
      timeoutMs,
      dropdownOptions: Array.isArray(body.dropdownOptions)
        ? body.dropdownOptions.length
        : 0,
    });

    let completion;
    try {
      try {
        completion = await openai.chat.completions.create(
          {
            model: MODEL,
            messages,
            temperature: 1,
          },
          { signal: controller.signal },
        );
      } catch (apiErr) {
        if (apiErr.name === "AbortError") {
          throw new Error("Request timed out");
        }
        throw apiErr;
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const raw =
      completion.choices?.[0]?.message?.content != null
        ? completion.choices[0].message.content
        : "";

    console.log("[gptTranslation] raw output:", preview(raw, 220));

    //if (mode === "text") {//
      //return Response.json({//
      // [KT:SURGICAL:DOUBLE-TRANSLATION-PREVENTION]
// This prevents HTML from being translated TWICE (route → UI → /api/gptTranslation).
// If text length > 200000 chars, we mark it as "route-translated" and skip re-translation.

if (mode === "text") {
  if (text.length > 200000) {
    console.warn("[gptTranslation] Skipping re-translation of full report HTML (already translated by route).");
    return Response.json({
      translated: text,   // Echo original to avoid wiping translations
      raw,
      error: "",
      buttonTranslations,
      countryTranslations,
      dropdownTranslations,
      skipped: true
    });
  }
  return Response.json({
    translated: raw,
    raw,
    error: "",
    buttonTranslations,
    countryTranslations,
    dropdownTranslations,
  });
}

    /*const jsonStr = extractJsonObject(raw);

    if (!jsonStr) {
      console.warn(
        "[gptTranslation] No JSON found in GPT output, returning empty translation with raw payload.",
      );
      return Response.json({
        translation: {},
        raw,
        error: "No JSON found in GPT output",
        buttonTranslations,
        countryTranslations,
        dropdownTranslations,
      });
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return Response.json({
        translation: parsed || {},
        raw,
        error: "",
        buttonTranslations,
        countryTranslations,
        dropdownTranslations,
      });
    } catch (parseErr) {
      console.error("❌ Failed to parse JSON from GPT output:", parseErr);
      return Response.json(
        {
          translation: {},
          raw,
          error: "Failed to parse JSON from GPT output",
          buttonTranslations,
          countryTranslations,
          dropdownTranslations,
        },
        { status: 200 },
      );
    }
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const msg = err?.message || "";
    const isAbort =
      err?.name === "AbortError" ||
      msg.includes("aborted") ||
      msg.includes("Request was aborted");

    if (isAbort) {
      console.warn("⚠️ GPT request aborted / timed out:", msg);
      return Response.json(
        {
          translation: {},
          translated: "",
          raw: "",
          error: "GPT request timed out",
          buttonTranslations,
          countryTranslations,
          dropdownTranslations,
        },
        { status: 504 },
      );
    }

    console.error("❌ GPT Translation error:", err);
    return Response.json(
      {
        translation: {},
        translated: "",
        raw: "",
        error: typeof msg === "string" ? msg : "Translation failed",
        buttonTranslations,
        countryTranslations,
        dropdownTranslations,
      },
      { status: 500 },
    );
  }*/
 // [KT:SURGICAL:GPT-JSON-HANDLING]
// Old JSON parse block (kept for audit, do NOT delete):
// const jsonStr = extractJsonObject(raw);
//
// if (!jsonStr) {
//   console.warn(
//     "[gptTranslation] No JSON found in GPT output, returning empty translation with raw payload.",
//   );
//   return Response.json({
//     translation: {},
//     raw,
//     error: "No JSON found in GPT output",
//     buttonTranslations,
//     countryTranslations,
//     dropdownTranslations,
//   });
// }
//
// try {
//   const parsed = JSON.parse(jsonStr);
//   return Response.json({
//     translation: parsed || {},
//     raw,
//     error: "",
//     buttonTranslations,
//     countryTranslations,
//     dropdownTranslations,
//   });
// } catch (parseErr) {
//   console.error("❌ Failed to parse JSON from GPT output:", parseErr);
//   return Response.json(
//     {
//       translation: {},
//       raw,
//       error: "Failed to parse JSON from GPT output",
//       buttonTranslations,
//       countryTranslations,
//       dropdownTranslations,
//     },
//     { status: 200 },
//   );
// }

// [KT:SURGICAL:GPT-JSON-HANDLING:REPAIRED]
// Safer JSON parsing with fallback to original uiMap so callers
// never see an empty/undefined labels object for non-English calls.
const jsonStr = extractJsonObject(raw);

if (!jsonStr || !jsonStr.trim()) {
  console.warn(
    "[gptTranslation] No JSON found in GPT output, falling back to original labels.",
    { lang: targetLang, rawPreview: preview(raw, 160) },
  );

  const fallback = uiMap && typeof uiMap === "object" ? uiMap : {};

  return Response.json({
    translation: fallback,
    raw,
    error: "No JSON found in GPT output; using original labels as fallback.",
    buttonTranslations,
    countryTranslations,
    dropdownTranslations,
  });
}

let parsed;
try {
  parsed = JSON.parse(jsonStr);
} catch (parseErr) {
  console.error(
    "❌ Failed to parse JSON from GPT output (falling back to original labels):",
    parseErr,
    { lang: targetLang, rawPreview: preview(jsonStr, 160) },
  );

  const fallback = uiMap && typeof uiMap === "object" ? uiMap : {};

  return Response.json(
    {
      translation: fallback,
      raw,
      error: "Failed to parse JSON from GPT output; using original labels as fallback.",
      buttonTranslations,
      countryTranslations,
      dropdownTranslations,
    },
    { status: 200 },
  );
}

// Guard against GPT returning something non-object (e.g., array or string)
if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
  console.error(
    "[gptTranslation] Parsed JSON is not an object; falling back to original labels.",
    { lang: targetLang, type: typeof parsed },
  );

  const fallback = uiMap && typeof uiMap === "object" ? uiMap : {};

  return Response.json({
    translation: fallback,
    raw,
    error: "Parsed JSON was not an object; using original labels as fallback.",
    buttonTranslations,
    countryTranslations,
    dropdownTranslations,
  });
}

return Response.json({
  translation: parsed || {},
  raw,
  error: "",
  buttonTranslations,
  countryTranslations,
  dropdownTranslations,
});
} catch (err) {
  if (timeoutId) clearTimeout(timeoutId);
  const msg = err?.message || "";
  const isAbort =
    err?.name === "AbortError" ||
    msg.includes("aborted") ||
    msg.includes("Request was aborted");

  if (isAbort) {
    console.warn("⚠️ GPT request aborted / timed out:", msg);
    return Response.json(
      {
        translation: {},
        translated: "",
        raw: "",
        error: "GPT request timed out",
        buttonTranslations,
        countryTranslations,
        dropdownTranslations,
      },
      { status: 504 },
    );
  }

  console.error("❌ GPT Translation error:", err);
  return Response.json(
    {
      translation: {},
      translated: "",
      raw: "",
      error: typeof msg === "string" ? msg : "Translation failed",
      buttonTranslations,
      countryTranslations,
      dropdownTranslations,
    },
    { status: 500 },
  );
}
}
