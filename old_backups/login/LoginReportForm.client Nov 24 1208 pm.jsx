"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "@/app/reform-report/ReformReport.module.css";
import { useRouter, useSearchParams } from "next/navigation";

/* 
  ────────────────────────────────────────────────────────────────────────────
  [KT:SURGICAL] 
  PRESERVE OLD 2FA LOGIN PAGE CODE BLOCK
  (Copied in whole from original 2FA login file, left commented out)
  ────────────────────────────────────────────────────────────────────────────

  // OLD 2FA LOGIN CODE PRESERVED — DO NOT DELETE
  // import styles from '../../login_test/TestloginPage.module.css';
  // ... (full original code would be here)
*/

function normalizeLang(raw) {
  if (!raw) return "English";
  const lower = String(raw).toLowerCase();
  const map = {
    ar: "Arabic",
    arabic: "Arabic",
    he: "Hebrew",
    hebrew: "Hebrew",
    iw: "Hebrew",
    ur: "Urdu",
    urdu: "Urdu",
    fa: "Persian",
    farsi: "Persian",
    "zh-cn": "Chinese (Simplified)",
    "zh-sg": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    "zh-hk": "Chinese (Traditional)",
    cn: "Chinese (Simplified)",
    tw: "Chinese (Traditional)",
  };
  return map[lower] || raw[0].toUpperCase() + raw.slice(1);
}

function isRTL(lang) {
  return ["Arabic", "Hebrew", "Urdu", "Persian"].includes(normalizeLang(lang));
}

// [KT:SURGICAL] Map UI language string → compact lang code for send2FACode
function toLangCode(lang) {
  const n = normalizeLang(lang);
  const map = {
    English: "en",
    Arabic: "ar",
    Hebrew: "he",
    Urdu: "ur",
    Persian: "fa",
    "Chinese (Simplified)": "zh-cn",
    "Chinese (Traditional)": "zh-tw",
    Albanian: "sq",
  };
  return map[n] || "en";
}

const T_CACHE_KEY = (lang) =>
  `SI_2FA_LOGIN_UI_${(lang || "English").toLowerCase()}`;

export default function LoginReportForm() {
  const router = useRouter();
  const search = useSearchParams();

  // Language initialization (URL ?lang wins; fallback to last_login_lang; then English)
  const urlLang = search.get("lang");
  const [lang, setLang] = useState(() =>
    normalizeLang(
      urlLang ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem("last_login_lang") || "English"
          : "English"),
    ),
  );

  const rtl = useMemo(() => isRTL(lang), [lang]);

  // [KT:SURGICAL] sync html lang/dir + cache chosen language
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("last_login_lang", lang);
      }
    } catch {}
    try {
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", lang);
        document.documentElement.setAttribute(
          "dir",
          isRTL(lang) ? "rtl" : "ltr",
        );
      }
    } catch {}
  }, [lang]);

  // [KT:SURGICAL] NEW: read language from cookie set by language selector page
  // This does NOT change the GPT translation strategy; it just improves lang detection.
  useEffect(() => {
    try {
      if (typeof document === "undefined") return;
      const raw = document.cookie || "";
      if (!raw) return;

      const parts = raw.split(";");
      let cookieLang = null;

      for (const part of parts) {
        const [k, v] = part.split("=");
        if (!k || typeof v === "undefined") continue;
        const key = k.trim().toLowerCase();
        // Pick up any cookie whose name contains "lang"
        if (key.includes("lang")) {
          cookieLang = decodeURIComponent(v.trim());
          break;
        }
      }

      if (cookieLang) {
        const normalized = normalizeLang(cookieLang);
        setLang((prev) => (prev === normalized ? prev : normalized));
      }
    } catch (err) {
      console.error("[2FA] cookie language read error", err);
    }
  }, []);

  // Translatable labels
  const [t, setT] = useState({
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
  });

  // Controlled fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  // State flags
  const [sentCode, setSentCode] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingForgot, setLoadingForgot] = useState(false);

  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);

  // Fetch translation via GPT (uses /api/gptTranslation)
  useEffect(() => {
    if (!lang) return;

    // [KT:SURGICAL] Try local cache first
    let cached = null;
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(T_CACHE_KEY(lang))
          : null;
      if (raw) cached = JSON.parse(raw);
    } catch {}
    if (cached) {
      setT((p) => ({ ...p, ...cached }));
    }

    const base = { ...t };
    const prompt = `You are localizing a secure 2FA login screen into ${lang}.
Return ONLY valid JSON under "translation".
Keep tone executive and concise.
Do NOT alter brand or product references.

Base JSON:
${JSON.stringify(base, null, 2)}`;

    let abort = false;

    (async () => {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 15000);

        const res = await fetch("/api/gptTranslation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            lang,
            targetLang: lang,
            json: base,
          }),
          signal: ctrl.signal,
        });

        clearTimeout(to);

        const raw = await res.text();
        let j;
        try {
          j = JSON.parse(raw);
        } catch {
          j = {};
        }

        const tx = j?.translation;
        if (!abort && res.ok && tx) {
          setT((prev) => ({ ...prev, ...tx }));
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                T_CACHE_KEY(lang),
                JSON.stringify(tx),
              );
            }
          } catch {}
        } else if (!abort && !res.ok) {
          // [KT:SURGICAL] extra log so you can see failures in DevTools
          console.error("[2FA] gptTranslation error", {
            status: res.status,
            body: raw,
          });
        }
      } catch (err) {
        if (!abort) {
          console.error("[2FA] gptTranslation network/abort error", err);
        }
      }
    })();

    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // ---- Handlers ----
  async function handleSend(e) {
    e.preventDefault();
    setMsg("");
    setIsErr(false);
    setLoadingSend(true);
    try {
      // [KT:SURGICAL] Your real 2FA "send code" API goes here
      //
      // const res = await fetch("/api/send2FACode", { ... })
      // const j = await res.json()
      //
      // setSentCode(true);
      // setMsg(t.codeSent);

      // [KT:SURGICAL] Wire up /api/send2FACode with lang code and full error handling
      const payload = {
        email,
        password,
        lang: toLangCode(lang),
      };

      const res = await fetch("/api/send2FACode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data || data.ok === false) {
        const message =
          (data && data.message) ||
          (!res.ok ? `HTTP ${res.status}` : null) ||
          t.errorGeneric;
        setIsErr(true);
        setMsg(message);
        return;
      }

      setSentCode(true);
      setMsg(data.message || t.codeSent);
    } catch (err) {
      console.error("[2FA] send2FACode error", err);
      setIsErr(true);
      setMsg(t.errorGeneric);
    } finally {
      setLoadingSend(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setMsg("");
    setIsErr(false);
    setLoadingVerify(true);
    try {
      // [KT:SURGICAL] Your real verify API
      //
      // const res = await fetch("/api/verify2FACode", { ... })
      //
      // setMsg(t.verifiedOK);
      // setTimeout(() => {
      //   // Keep lang flowing into the app
      //   const encoded = encodeURIComponent(lang || "English");
      //   router.push(`/?lang=${encoded}`);
      // }, 500);

      // [KT:SURGICAL] Connect to /api/verify2FACode (reuses existing redirect + messages)
      const res = await fetch("/api/verify2FACode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data || data.ok === false) {
        const message =
          (data && data.message) ||
          (!res.ok ? `HTTP ${res.status}` : null) ||
          t.errorGeneric;
        setIsErr(true);
        setMsg(message);
        return;
      }

      setMsg(data.message || t.verifiedOK);
      setTimeout(() => {
        // Keep lang flowing into the app
        const encoded = encodeURIComponent(lang || "English");
        router.push(`/?lang=${encoded}`);
      }, 500);
    } catch (err) {
      console.error("[2FA] verify2FACode error", err);
      setIsErr(true);
      setMsg(t.errorGeneric);
    } finally {
      setLoadingVerify(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setMsg("");
    setIsErr(false);
    if (!email) {
      setIsErr(true);
      setMsg(t.forgotEmailRequired);
      return;
    }
    setLoadingForgot(true);
    try {
      // [KT:SURGICAL] Forgot password API
      //
      setMsg(t.forgotSent);
    } catch {
      setIsErr(true);
      setMsg(t.forgotError);
    } finally {
      setLoadingForgot(false);
    }
  }

  // ──────────────────────────────────────────────────────────
  // FORM RENDERING (ReformReport styling)
  // ──────────────────────────────────────────────────────────
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{t.title}</h1>

      <div
        className={styles.cardGrid}
        style={{ maxWidth: 800, margin: "0 auto" }}
      >
        <div
          className={styles.leftCol}
          style={{ maxWidth: 600, width: "100%" }}
          dir={rtl ? "rtl" : "ltr"}
        >
          {/* LOGIN FORM */}
          <form className={styles.formStack} onSubmit={handleSend}>
            <label className={styles.label}>{t.emailLabel}</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className={styles.label}>{t.passwordLabel}</label>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              className={styles.navButton}
              type="submit"
              disabled={loadingSend}
            >
              {loadingSend ? "…" : t.signIn}
            </button>
          </form>

          {/* 2FA CODE FORM */}
          {sentCode && (
            <form
              className={styles.formStack}
              onSubmit={handleVerify}
              style={{ marginTop: 24 }}
            >
              <label className={styles.label}>{t.codeLabel}</label>
              <input
                type="text"
                inputMode="numeric"
                className={styles.input}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />

              <button
                className={styles.navButton}
                type="submit"
                disabled={loadingVerify}
              >
                {loadingVerify ? "…" : t.verifyBtn}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          <div style={{ marginTop: 16, textAlign: rtl ? "right" : "left" }}>
            <button
              type="button"
              onClick={handleForgot}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                margin: 0,
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "1rem",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {loadingForgot ? "…" : t.forgotPassword}
            </button>
          </div>

          {/* STATUS MESSAGE */}
          {msg && (
            <p
              className={styles.smallNote}
              style={{
                marginTop: 12,
                textAlign: "center",
                color: isErr ? "#f87171" : "#22c55e",
                fontWeight: 600,
              }}
            >
              {msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
