'use client';

import React, { useEffect, useMemo, useState } from 'react';
//import NonHomeShell from '@/components/NonHomeShell.client';
import styles from '../../login_test/TestloginPage.module.css'; // keep your original CSS
import { useRouter, useSearchParams } from 'next/navigation';
import NonHomeShell from '@/components/NonHomeShell.client';
// ---------- helpers ----------
function normalizeLang(raw) {
  if (!raw) return 'English';
  const lower = String(raw).toLowerCase();
  const map = {
    ar: 'Arabic',
    arabic: 'Arabic',
    he: 'Hebrew',
    hebrew: 'Hebrew',
    fa: 'Persian',
    farsi: 'Persian',
    persian: 'Persian',
    ur: 'Urdu',
    urdu: 'Urdu',
    ps: 'Pashto',
    pashto: 'Pashto',
    fr: 'French',
    français: 'French',
    french: 'French',
    es: 'Spanish',
    spanish: 'Spanish',
    zh: 'Chinese',
    chinese: 'Chinese',
    en: 'English',
    english: 'English',
  };
  return map[lower] || raw;
}
function isRTL(lang) {
  return /arabic|hebrew|persian|farsi|urdu|pashto/i.test(lang || '');
}
const T_CACHE_KEY = (lang) => `SI_LOGIN_T_${(lang || 'English').toLowerCase()}`;

// ---------- component ----------
export default function TranslationLogin() {
  const router = useRouter();
  const sp = useSearchParams();

  // language (URL > last used > English)
  const urlLang = normalizeLang(sp.get('lang') || '');
  const [lang, setLang] = useState(
    urlLang ||
      (typeof window !== 'undefined'
        ? normalizeLang(localStorage.getItem('last_login_lang') || 'English')
        : 'English'),
  );

  const rtl = useMemo(() => isRTL(lang), [lang]);

  // labels (English defaults)
  const [t, setT] = useState({
    title: 'Secure Login',
    emailLabel: 'Email:',
    passwordLabel: 'Password:',
    signIn: 'Sign In',
    codeLabel: 'Verification Code:',
    verifyBtn: 'Verify',
    codeSent: '✅ Code successfully sent. Please check your phone.',
    verifiedOK: '✅ Verified.',
    errorGeneric: 'Unexpected error occurred',
    errorSending: 'Error sending 2FA',
    errorVerifying: 'Error verifying code',
    forgotPassword: 'Forgot password?',
    forgotEmailRequired: 'Please enter your email first.',
    forgotSent: '📧 Check your email for steps to reset your password.',
    forgotError: 'Could not send reset email. Please try again.',
    codeAlreadySent: 'A code was recently sent. Please check your phone and enter it.',
  });

  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  // UI state
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingForgot, setLoadingForgot] = useState(false);

  // --- i18n loader (cached; no global RTL flip to avoid layout collisions) ---
  useEffect(() => {
    // remember chosen lang for next time
    try {
      localStorage.setItem('last_login_lang', lang);
    } catch {}

    // apply cached translation immediately (keeps UI snappy)
    try {
      const cached = localStorage.getItem(T_CACHE_KEY(lang));
      if (cached) setT((prev) => ({ ...prev, ...JSON.parse(cached) }));
    } catch {}

    // fetch fresh translation
    if (/^english$/i.test(lang)) return; // English: nothing to fetch
    const base = { ...t };
    const prompt = `Translate the following login page labels into ${lang}. Return ONLY a JSON object with the SAME KEYS.\n${JSON.stringify(
      base,
    )}`;

    let aborted = false;
    (async () => {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, lang, targetLang: lang, json: base }),
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
        const translated = j?.translation || (j && typeof j === 'object' ? j : null);
        if (!aborted && res.ok && translated) {
          setT((prev) => ({ ...prev, ...translated }));
          try {
            localStorage.setItem(T_CACHE_KEY(lang), JSON.stringify(translated));
          } catch {}
        }
      } catch {
        /* ignore; keep defaults/cached */
      }
    })();
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // ---- handlers ----
  const handleSendCode = async (e) => {
    e.preventDefault();
    setMsg('');
    setIsErr(false);
    setLoadingSend(true);
    try {
      const r = await fetch('/api/send2FACode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, lang }),
      });
      const j = await r.json().catch(() => ({}));

      // 409 means “request conflicts with current resource state” (often: code already issued)
      // Show a helpful message instead of a hard failure. :contentReference[oaicite:0]{index=0}
      if (r.status === 409) {
        setIsErr(false);
        setMsg(j?.uiErrorMessage || t.codeAlreadySent);
        return;
      }

      if (!r.ok || j?.ok === false) {
        setIsErr(true);
        setMsg(j?.uiErrorMessage || t.errorSending);
        return;
      }

      try {
        localStorage.setItem('last_login_email', email);
      } catch {}
      setIsErr(false);
      setMsg(j?.uiMessage || t.codeSent);
    } catch {
      setIsErr(true);
      setMsg(t.errorGeneric);
    } finally {
      setLoadingSend(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setMsg('');
    setIsErr(false);
    setLoadingVerify(true);
    try {
      const r = await fetch('/api/verify2FA', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        setIsErr(true);
        setMsg(j?.uiErrorMessage || t.errorVerifying);
        return;
      }
      setIsErr(false);
      setMsg(j?.uiMessage || t.verifiedOK);
      router.push(`/?lang=${encodeURIComponent(lang)}`);
    } catch {
      setIsErr(true);
      setMsg(t.errorGeneric);
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setMsg('');
    setIsErr(false);
    if (!email) {
      setIsErr(true);
      setMsg(t.forgotEmailRequired);
      return;
    }
    setLoadingForgot(true);
    try {
      const r = await fetch('/api/requestPasswordReset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok !== true) {
        setIsErr(true);
        setMsg(j?.uiErrorMessage || t.forgotError);
      } else {
        setIsErr(false);
        setMsg(j?.uiMessage || t.forgotSent);
      }
    } catch {
      setIsErr(true);
      setMsg(t.forgotError);
    } finally {
      setLoadingForgot(false);
    }
  };

  // ---- layout (keep your look; prevent Arabic collisions) ----
  // IMPORTANT: We do NOT flip the entire page to RTL (that was causing the title/logo overlap).
  // Instead we keep the outer layout LTR, and flip only the form TEXT alignment via `dir`.
  const wrap = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 56,
    width: '100%',
    maxWidth: 1100,
    margin: '24px auto 0',
  };
  const leftCol = { flex: '0 0 325px', marginTop: 8, marginLeft: rtl ? 0 : -220 }; // never pull left in RTL
  const rightCol = { flex: '0 1 500px' };

  const card = {
    width: '100%',
    maxWidth: 500,
    background: '#ffffff',
    borderRadius: 16,
    padding: '24px 22px 22px',
    boxShadow: '0 16px 30px rgba(0,0,0,0.22)',
  };
  const titleStyle = {
    textAlign: 'center',
    margin: '2px 0 18px',
    color: '#111',
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: '0.25px',
  };
  const stack = { display: 'flex', flexDirection: 'column', gap: 14, width: '100%' };
  const labelStyle = {
    textAlign: rtl ? 'right' : 'left',
    color: '#111',
    fontWeight: 600,
    marginBottom: 2,
  };
  const inputStyle = {
    width: '100%',
    height: 46,
    borderRadius: 10,
    padding: '10px 12px',
    boxSizing: 'border-box',
    textAlign: rtl ? 'right' : 'left',
    border: '1px solid #d1d5db',
    background: '#fff',
  };
  const btnStyle = {
    height: 46,
    borderRadius: 10,
    background: '#082b52',
    color: '#fff',
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    marginTop: 4,
  };

  return (
    <div className={styles.container}>
      <div style={wrap}>
        {/* logo stays on the left for all languages */}
        <div style={leftCol}>
          <div className={styles.logoContainer}>
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence Logo"
              className={styles.logo}
              width={225}
              height={225}
              style={{ width: 225, height: 225, objectFit: 'contain', display: 'block' }}
              decoding="async"
            />
          </div>
        </div>

        {/* card on the right (same visual look) */}
        <div style={rightCol}>
          <div className={styles.loginBox} style={card}>
            <h1 className={styles.title} style={titleStyle}>
              {t.title}
            </h1>

            {msg ? (
              <p
                className={`${styles.msg} ${isErr ? styles.error : styles.success}`}
                style={{ textAlign: 'center', marginBottom: 10 }}
              >
                {msg}
              </p>
            ) : null}

            {/* Sign in (send code) */}
            <form
              onSubmit={handleSendCode}
              className={styles.form}
              dir={rtl ? 'rtl' : 'ltr'}
              style={stack}
            >
              <label className={styles.label} style={labelStyle}>
                {t.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
                autoComplete="username"
                style={inputStyle}
              />

              <label className={styles.label} style={labelStyle}>
                {t.passwordLabel}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
                autoComplete="current-password"
                style={inputStyle}
              />

              <button
                type="submit"
                className={styles.button}
                disabled={loadingSend}
                style={btnStyle}
              >
                {loadingSend ? '…' : t.signIn}
              </button>
            </form>

            {/* Verify */}
            <form
              onSubmit={handleVerify}
              className={styles.form}
              dir={rtl ? 'rtl' : 'ltr'}
              style={{ ...stack, marginTop: 16 }}
            >
              <label className={styles.label} style={labelStyle}>
                {t.codeLabel}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className={styles.input}
                style={inputStyle}
              />

              <button
                type="submit"
                className={styles.button}
                disabled={loadingVerify}
                style={btnStyle}
              >
                {loadingVerify ? '…' : t.verifyBtn}
              </button>
            </form>
          </div>

          {/* Forgot password (kept under the card; RTL text only) */}
          <div
            dir={rtl ? 'rtl' : 'ltr'}
            style={{ marginTop: 10, textAlign: rtl ? 'right' : 'left' }}
          >
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                setMsg('');
                setIsErr(false);
                if (!email) {
                  setIsErr(true);
                  setMsg(t.forgotEmailRequired);
                  return;
                }
                setLoadingForgot(true);
                try {
                  const r = await fetch('/api/requestPasswordReset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, lang }),
                  });
                  const j = await r.json().catch(() => ({}));
                  if (!r.ok || j?.ok !== true) {
                    setIsErr(true);
                    setMsg(j?.uiErrorMessage || t.forgotError);
                  } else {
                    setIsErr(false);
                    setMsg(j?.uiMessage || t.forgotSent);
                  }
                } catch {
                  setIsErr(true);
                  setMsg(t.forgotError);
                } finally {
                  setLoadingForgot(false);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.2rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                lineHeight: 1.2,
              }}
              aria-label={t.forgotPassword}
            >
              {loadingForgot ? '…' : t.forgotPassword}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
