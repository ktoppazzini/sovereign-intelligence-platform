"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeLang } from "@/lib/i18nClient";

// Lightweight debug namespace for translations
const DEBUG_NS = "SR:I18N";
const RTL_LANGS = ["ar", "he", "fa", "ur", "ps", "ku", "yi"];

const UI_CACHE_KEY = (lang) =>
  `si.ui.${String(lang || "english").toLowerCase().replace(/\s+/g, "-")}`;

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function clonePlainObject(src) {
  if (!isPlainObject(src)) return {};
  const result = {};
  Object.keys(src).forEach((k) => {
    const v = src[k];
    result[k] = typeof v === "string" ? v : String(v ?? "");
  });
  return result;
}

function isRtlLang(lang) {
  const lc = String(lang || "").toLowerCase();
  return RTL_LANGS.some((code) => lc.startsWith(code));
}

export default function useTranslation(labels, langInput) {
  // ─────────────────────────────────────────────
  // Legacy stub (kept for history; now replaced)
  // const [t, setT] = useState(labels || {});
  // const [rtl, setRtl] = useState(false);
  // ─────────────────────────────────────────────

  const [state, setState] = useState(() => {
    const base = isPlainObject(labels) ? labels : {};
    const langRaw = langInput || "English";
    const langResolved = normalizeLang ? normalizeLang(langRaw) : langRaw;
    return {
      t: base,
      lang: langResolved,
      rtl: isRtlLang(langResolved),
      loading: false,
      error: null,
    };
  });

  const baseMap = useMemo(() => clonePlainObject(labels || {}), [labels]);

  useEffect(() => {
    if (!isPlainObject(baseMap) || !Object.keys(baseMap).length) {
      setState((prev) => ({
        ...prev,
        t: {},
        loading: false,
        error: null,
      }));
      return;
    }

    let cancelled = false;

    const langRaw = langInput || "English";
    const langResolved = normalizeLang ? normalizeLang(langRaw) : langRaw;
    const langLower = String(langResolved || "").toLowerCase();
    const isEnglish =
      langLower === "english" ||
      langLower === "en" ||
      langLower.startsWith("en-");

    const nextRtl = isRtlLang(langResolved);
    const cacheKey = UI_CACHE_KEY(langResolved);

    // Fast path: English, no API call.
    if (isEnglish) {
      setState({
        t: baseMap,
        lang: langResolved,
        rtl: nextRtl,
        loading: false,
        error: null,
      });
      return;
    }

    const run = async () => {
      setState((prev) => ({
        ...prev,
        lang: langResolved,
        rtl: nextRtl,
        loading: true,
        error: null,
      }));

      // 1) Cache check
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const cached = window.localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (
              isPlainObject(parsed) &&
              Object.keys(baseMap).every((k) => typeof parsed[k] === "string")
            ) {
              console.log(`[${DEBUG_NS}] ui cache hit`, {
                lang: langResolved,
                keys: Object.keys(parsed).length,
              });
              if (!cancelled) {
                setState({
                  t: parsed,
                  lang: langResolved,
                  rtl: nextRtl,
                  loading: false,
                  error: null,
                });
              }
              return;
            }
          }
        }
      } catch (err) {
        console.warn(`[${DEBUG_NS}] cache read error`, err);
      }

      // 2) GPT translation call (JSON mode)
      try {
        const payload = {
          mode: "json",
          targetLang: langResolved,
          ui: baseMap,
          map: baseMap,
        };

        console.log(`[${DEBUG_NS}] ui translate → /api/gptTranslation`, {
          lang: langResolved,
          keys: Object.keys(baseMap).length,
        });

        const res = await fetch("/api/gptTranslation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-SI-Debug": `hook-ui-json:${langResolved}`,
          },
          cache: "no-store",
          body: JSON.stringify(payload),
        });

        const raw = await res.text();
        let json;
        try {
          json = JSON.parse(raw);
        } catch (parseErr) {
          console.error(
            `[${DEBUG_NS}] ui translate JSON parse error`,
            parseErr,
            raw.slice(0, 200)
          );
        }

        const translated =
          json && json.translation && isPlainObject(json.translation)
            ? json.translation
            : null;

        const errorMessage =
          json && typeof json.error === "string" ? json.error : undefined;

        console.log(`[${DEBUG_NS}] ui translate response`, {
          ok: res.ok,
          status: res.status,
          keys: translated ? Object.keys(translated).length : 0,
          hasError: !!errorMessage,
        });

        const finalMap = translated || baseMap;

        if (!cancelled) {
          setState({
            t: finalMap,
            lang: langResolved,
            rtl: nextRtl,
            loading: false,
            error: errorMessage || null,
          });
        }

        if (translated && typeof window !== "undefined" && window.localStorage) {
          try {
            window.localStorage.setItem(cacheKey, JSON.stringify(finalMap));
          } catch (err) {
            console.warn(`[${DEBUG_NS}] cache write error`, err);
          }
        }
      } catch (err) {
        console.warn(`[${DEBUG_NS}] ui translate exception`, err);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err?.message || "Translation failed",
          }));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [baseMap, langInput]);

  return {
    t: state.t,
    lang: state.lang,
    rtl: state.rtl,
    loading: state.loading,
    error: state.error,
  };
}

// ─────────────────────────────────────────────
// Legacy 2FA labels kept for compatibility.
// They no longer drive hook behavior.
// ─────────────────────────────────────────────
export const BASE_LABELS = {
  title: "Two-Factor Authentication",
  emailLabel: "Email",
  passwordLabel: "Password",
  signIn: "Send Code",
  codeLabel: "Verification Code",
  verifyBtn: "Verify",
  forgotPassword: "Forgot password?",
  forgotEmailRequired: "Enter your email to reset password.",
  forgotSent: "If this email exists, a reset link has been sent.",
  forgotError: "Error requesting password reset.",
  codeSent: "A verification code has been sent.",
  verifiedOK: "Verification successful.",
  errorGeneric: "Unexpected error occurred",
};

