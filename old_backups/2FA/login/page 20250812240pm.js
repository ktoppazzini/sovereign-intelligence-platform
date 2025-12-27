'use client';

/**
 * Page: /2FA/login
 * TRACK_ID: LOGIN-2FA-v1.5 (one-page 2FA)
 * - Logo & card in separate columns (keeps your locked layout)
 * - On "Sign In" -> stays on page, shows green "code sent" message (no redirect)
 * - Verification section is visible immediately (translated)
 * - On successful verify -> router.push(/?lang=...)
 * - GPT i18n + console debug
 *
 * Note: Only change from your working file is the successful verification redirect
 * now goes to "/" (real home) instead of "/2FA/home", and we preserve ?lang=.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../login_test/TestloginPage.module.css';
import { useRouter, useSearchParams } from 'next/navigation';

const DEBUG = true;
const LOGO_PULL = -220; // px — negative pushes logo further left
const HOME_ROUTE = '/'; // ✅ real app home

export default function TranslationLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [translatedMessage, setTranslatedMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const [translations, setTranslations] = useState({
    title: 'Secure Login',
    emailLabel: 'Email:',
    passwordLabel: 'Password:',
    signIn: 'Sign In',
    // verification (new keys)
    codeLabel: 'Verification Code:',
    verifyBtn: 'Verify',
    // messages
    codeSent: '✅ Code successfully sent. Please check your phone.',
    verifiedOK: '✅ Verified.',
    // errors
    errorGeneric: 'Unexpected error occurred',
    errorSending: 'Error sending 2FA',
    errorVerifying: 'Error verifying code',
  });

  const searchParams = useSearchParams();
  const selectedLanguage = searchParams.get('lang') || 'English';
  const isRTL = useMemo(
    () =>
      ['Arabic', 'Hebrew', 'Urdu', 'Farsi', 'Persian'].some((l) => selectedLanguage.includes(l)),
    [selectedLanguage],
  );

  const log = (...args) => {
    if (DEBUG) console.log('[LOGIN-2FA]', ...args);
  };

  useEffect(() => {
    log('v1.5 mounted');
  }, []);

  // i18n (keeps your endpoint usage, but now includes verification labels)
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const prompt = `Translate the following login page labels into ${selectedLanguage}. Return only a raw JSON object:
{"title":"Secure Login","emailLabel":"Email:","passwordLabel":"Password:","signIn":"Sign In","codeLabel":"Verification Code:","verifyBtn":"Verify","codeSent":"✅ Code successfully sent. Please check your phone.","verifiedOK":"✅ Verified.","errorGeneric":"Unexpected error occurred","errorSending":"Error sending 2FA","errorVerifying":"Error verifying code"}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        log('Fetching GPT translations for', selectedLanguage);
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        log('Translation API response:', data);
        if (data?.translation && typeof data.translation === 'object') {
          setTranslations((prev) => ({ ...prev, ...data.translation }));
        }
      } catch (err) {
        log('Translation fetch failed:', err);
      }
    };
    fetchTranslations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  // Sign In (send code) -> stay on same page and show success
  const handleSendCode = async (e) => {
    e.preventDefault();
    setTranslatedMessage('');
    setIsError(false);
    setLoadingSend(true);

    try {
      const payload = { email, password, lang: selectedLanguage };
      log('POST /api/send2FACode payload ->', payload);

      const response = await fetch('/api/send2FACode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      log('send2FACode response:', { status: response.status, data });

      if (!response.ok || data?.ok === false) {
        const reason = data?.reason;
        const msg =
          reason === 'no_phone'
            ? translations.errorSending
            : reason === 'user_not_found'
              ? translations.errorGeneric
              : data?.message || translations.errorSending;
        setIsError(true);
        setTranslatedMessage(msg);
        return;
      }

      // optional: remember email/lang for later use
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_login_email', email);
        localStorage.setItem('last_login_lang', selectedLanguage);
      }

      setIsError(false);
      setTranslatedMessage(translations.codeSent); // ✅ show green message, DO NOT redirect
    } catch (err) {
      log('Unexpected error (send2FA):', err);
      setIsError(true);
      setTranslatedMessage(translations.errorGeneric);
    } finally {
      setLoadingSend(false);
    }
  };

  // Verify -> go to home (unlocked nav)
  const handleVerify = async (e) => {
    e.preventDefault();
    setTranslatedMessage('');
    setIsError(false);
    setLoadingVerify(true);

    try {
      const payload = { email, code, lang: selectedLanguage };
      log('POST /api/verify2FA payload ->', payload);

      const response = await fetch('/api/verify2FA', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      log('verify2FA response:', { status: response.status, data });

      if (!response.ok || data?.ok === false) {
        setIsError(true);
        setTranslatedMessage(data?.message || translations.errorVerifying);
        return;
      }

      setIsError(false);
      setTranslatedMessage(translations.verifiedOK);

      // ✅ Redirect to real home page, preserving chosen language for the app shell
      router.push(`${HOME_ROUTE}?lang=${encodeURIComponent(selectedLanguage)}`);
    } catch (err) {
      log('Unexpected error (verify2FA):', err);
      setIsError(true);
      setTranslatedMessage(translations.errorGeneric);
    } finally {
      setLoadingVerify(false);
    }
  };

  // Layout (locked-in)
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
    textAlign: isRTL ? 'right' : 'left',
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
    textAlign: isRTL ? 'right' : 'left',
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
        {/* Left column: logo */}
        <div style={leftCol}>
          <div className={styles.logoContainer}>
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence Logo"
              className={styles.logo}
              width={225}
              height={225}
              style={{
                width: 225,
                height: 225,
                maxWidth: 225,
                maxHeight: 225,
                objectFit: 'contain',
                display: 'block',
              }}
              decoding="async"
            />
          </div>
        </div>

        {/* Right column: login card */}
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

            {/* Sign In (send code) */}
            <form
              onSubmit={handleSendCode}
              className={styles.form}
              dir={isRTL ? 'rtl' : 'ltr'}
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

            {/* Verification (always visible) */}
            <form
              onSubmit={handleVerify}
              className={styles.form}
              dir={isRTL ? 'rtl' : 'ltr'}
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
        </div>
      </div>
    </div>
  );
}
