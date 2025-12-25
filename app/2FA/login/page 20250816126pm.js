// app/2FA/login/page.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../login_test/TestloginPage.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUiTranslations, isRTL, normalizeLang } from '../../../lib/i18nClient'; // adjust path if needed

const DEBUG = true;
const LOGO_PULL = -220;
const HOME_ROUTE = '/';

export default function TranslationLogin() {
  const router = useRouter();
  const sp = useSearchParams();
  const urlLang = sp.get('lang') || 'English';
  const effectiveLang = normalizeLang(urlLang);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [translatedMessage, setTranslatedMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingForgot, setLoadingForgot] = useState(false);

  // default English labels (unchanged)
  const base = {
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
  };

  const [translations, setTranslations] = useState(base);
  const rtl = useMemo(() => isRTL(effectiveLang), [effectiveLang]);

  const log = (...args) => DEBUG && console.log('[LOGIN-2FA]', ...args);

  useEffect(() => {
    (async () => {
      const { t } = await getUiTranslations({
        base,
        lang: effectiveLang,
        cachePrefix: 'SI_LOGIN_2FA',
      });
      setTranslations(t);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('last_login_lang', effectiveLang);
        } catch {}
      }
      log('i18n ready for', effectiveLang);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveLang]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setTranslatedMessage('');
    setIsError(false);
    setLoadingSend(true);

    try {
      const response = await fetch('/api/send2FACode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, lang: effectiveLang }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        setIsError(true);
        setTranslatedMessage(data?.uiErrorMessage || translations.errorSending);
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_login_email', email);
      }
      setIsError(false);
      setTranslatedMessage(data?.uiMessage || translations.codeSent);
    } catch {
      setIsError(true);
      setTranslatedMessage(translations.errorGeneric);
    } finally {
      setLoadingSend(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setTranslatedMessage('');
    setIsError(false);
    setLoadingVerify(true);
    try {
      const response = await fetch('/api/verify2FA', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, lang: effectiveLang }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        setIsError(true);
        setTranslatedMessage(data?.uiErrorMessage || translations.errorVerifying);
        return;
      }
      setIsError(false);
      setTranslatedMessage(data?.uiMessage || translations.verifiedOK);
      router.push(`${HOME_ROUTE}?lang=${encodeURIComponent(effectiveLang)}`);
    } catch {
      setIsError(true);
      setTranslatedMessage(translations.errorGeneric);
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setTranslatedMessage('');
    setIsError(false);
    if (!email) {
      setIsError(true);
      setTranslatedMessage(translations.forgotEmailRequired);
      return;
    }
    setLoadingForgot(true);
    try {
      const res = await fetch('/api/requestPasswordReset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang: effectiveLang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) {
        setIsError(true);
        setTranslatedMessage(data?.uiErrorMessage || translations.forgotError);
      } else {
        setIsError(false);
        setTranslatedMessage(data?.uiMessage || translations.forgotSent);
      }
    } catch {
      setIsError(true);
      setTranslatedMessage(translations.forgotError);
    } finally {
      setLoadingForgot(false);
    }
  };

  const wrap = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 56,
    width: '100%',
    maxWidth: 1100,
    margin: '24px auto 0',
  };
  const leftCol = { flex: '0 0 325px', marginTop: 8, marginLeft: `${LOGO_PULL}px` };
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

        <div style={rightCol}>
          <div className={styles.loginBox} style={card}>
            <h1 className={styles.title} style={titleStyle}>
              {translations.title}
            </h1>

            {translatedMessage ? (
              <p
                className={`${styles.msg} ${isError ? styles.error : styles.success}`}
                style={{ textAlign: 'center', marginBottom: 10 }}
              >
                {translatedMessage}
              </p>
            ) : null}

            <form
              onSubmit={handleSendCode}
              className={styles.form}
              dir={rtl ? 'rtl' : 'ltr'}
              style={stack}
            >
              <label className={styles.label} style={labelStyle}>
                {translations.emailLabel}
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
                {translations.passwordLabel}
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
                {loadingSend ? '...' : translations.signIn}
              </button>
            </form>

            <form
              onSubmit={handleVerify}
              className={styles.form}
              dir={rtl ? 'rtl' : 'ltr'}
              style={{ ...stack, marginTop: 16 }}
            >
              <label className={styles.label} style={labelStyle}>
                {translations.codeLabel}
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
                {loadingVerify ? '...' : translations.verifyBtn}
              </button>
            </form>
          </div>

          <div
            dir={rtl ? 'rtl' : 'ltr'}
            style={{ marginTop: 10, textAlign: rtl ? 'right' : 'left' }}
          >
            <button
              type="button"
              onClick={handleForgot}
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
              aria-label={translations.forgotPassword}
            >
              {loadingForgot ? '…' : translations.forgotPassword}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
