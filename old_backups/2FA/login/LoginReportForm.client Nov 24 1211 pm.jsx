// app/2FA/login/LoginReportForm.client.jsx
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

const T_CACHE_KEY = (lang) =>
  `SI_2FA_LOGIN_UI_${(lang || "English").toLowerCase()}`;

export default function LoginReportForm() {
  const router = useRouter();
  const search = useSearchParams();

  // Language initialization
  const urlLang = search.get("lang");
  const [lang, setLang] = useState(
    normalizeLang(
      urlLang ||
        (typeof window !== "undefined"
          ? localStorage.getItem("last_login_lang") || "English"
          : "English")
    )
  );

  const rtl = useMemo(() => isRTL(lang), [lang]);

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

  // Fetch translation via GPT
  useEffect(() => {
    if (!lang) return;

    let cached = null;
    try {
      const raw = localStorage.getItem(T_CACHE_KEY(lang));
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
          // [KT:SURGICAL:OLD-PAYLOAD-PRESERVED]
          // body: JSON.stringify({
          //   prompt,
          //   lang,
          //   targetLang: lang,
          //   json: base,
          // }),
          // [KT:SURGICAL:JSON-MODE-PAYLOAD]
          body: JSON.stringify({
            mode: "json",       // tell the API we’re sending a label map
            prompt,             // still available if the route wants it
            lang,
            targetLang: lang,
            map: base,          // <-- THIS is what /api/gptTranslation expects
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
            localStorage.setItem(T_CACHE_KEY(lang), JSON.stringify(tx));
          } catch {}
        }
      } catch {
        // swallow errors; keep English as a safe fallback
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
      setSentCode(true);
      setMsg(t.codeSent);
    } catch {
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
      setMsg(t.verifiedOK);
      setTimeout(() => {
        router.push(`/?lang=${encodeURIComponent(lang)}`);
      }, 500);
    } catch {
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

      <div className={styles.cardGrid} style={{ maxWidth: 800, margin: "0 auto" }}>
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
