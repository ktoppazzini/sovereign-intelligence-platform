import OpenAI from "openai";
import { NextResponse as Response } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hard-lock Nano 5 for dev; you can swap this in prod.
const MODEL = "gpt-5-nano-2025-08-07";

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
      url = new URL(req.url, process.env.NEXT_PUBLIC_BASE_URL || "http://localhost");
    } catch (e) {
      url = { searchParams: new URLSearchParams() };
    }
    // let buttonTranslations = {}; // Already defined above
    if (Array.isArray(body.buttons) && body.buttons.length > 0) {
      const buttonPrompt = [
        "You are a translation engine.",
        `Translate the following button labels and ALL visible UI labels, tooltips, placeholders, and any user-facing text into ${normalizeLang(body.targetLang || body.lang || url.searchParams.get("lang") || "English")}.`,
        "Return a JSON array of translated button labels, in the same order.",
        "Respond with RAW JSON ONLY. No extra text.",
        "Ensure every label, tooltip, placeholder, visible string, and type (such as button, input, select, etc.) on the page is translated."
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

    // Helper to ensure all translatable fields are included
    // let countryTranslations = {}; // Already defined above
    if (Array.isArray(body.countries) && body.countries.length > 0) {
      const countryPrompt = [
        "You are a translation engine.",
        `Translate the following country names into ${normalizeLang(body.targetLang || body.lang || urlLang || "English")}.`,
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

    // JSON-mode input (UI labels)

    // [KT:OLD] uiMap only looked at map/ui and ignored labelMap,
    // which meant /2FA/login (sending labelMap) always hit the
    // "EMPTY label map" short-circuit.
    //
    // const uiMap =
    //   (body.map && typeof body.map === "object" && body.map) ||
    //   (body.ui && typeof body.ui === "object" && body.ui) ||
    //   null;

    // [KT:SURGICAL] New uiMap prefers labelMap (used by 2FA login),
    // but still fully supports existing map/ui callers (header/nav).
    const uiMap =
      (body.labelMap && typeof body.labelMap === "object" && body.labelMap) ||
      (body.map && typeof body.map === "object" && body.map) ||
      (body.ui && typeof body.ui === "object" && body.ui) ||
      null;

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
      const keys = uiMap ? Object.keys(uiMap).length : 0;
      if (!uiMap || keys === 0) {
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
        { targetLang }
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

    // let dropdownTranslations = {}; // Already defined above
    if (Array.isArray(body.dropdownOptions) && body.dropdownOptions.length > 0) {
      // Build a separate prompt for dropdown options
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
        // Ensure everything on the screen is translated, even if dropdown translation fails
        console.warn("[gptTranslation] Dropdown translation failed:", dropdownErr);
        dropdownTranslations = [];
      }
    }
    // === TIMEOUT & CALL =====================================================

    const timeoutMs = mode === "text" ? 100000 : 100000;
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log("[gptTranslation] calling OpenAI", {
      mode,
      lang: targetLang,
      keys: uiMap ? Object.keys(uiMap).length : 0,
      textLen: text.length,
      timeoutMs,
      dropdownOptions: Array.isArray(body.dropdownOptions) ? body.dropdownOptions.length : 0,
    });

    // Ensure the model supports all 207 languages by explicitly setting the target language in the prompt.
    // The prompt already includes the target language, so no changes are needed here for language support.
    // However, you may want to validate the targetLang against a list of supported languages if needed.

    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: MODEL,
          messages,
          temperature: 1,
        },
        { signal: controller.signal },
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const raw =
      completion.choices?.[0]?.message?.content != null
        ? completion.choices[0].message.content
        : "";

    console.log("[gptTranslation] raw output:", preview(raw, 220));

    // === TEXT/HTML MODE: just return the string =============================

    if (mode === "text") {
      return Response.json({
        translated: raw,
        raw,
        error: "",
        buttonTranslations,
        countryTranslations,
        dropdownTranslations,
      });
    }

    // === JSON MODE: parse JSON =============================================

    const jsonStr = extractJsonObject(raw);

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
  }
}
