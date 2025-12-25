'use client';

/**
 * Page: /2FA/login
 * TRACK_ID: LOGIN-2FA-v1.6 (one-page 2FA + Forgot Password)
 *
 * - Preserves your locked layout & CSS (TestloginPage.module.css)
 * - Fixes JSX ternary/comment around translations.signIn
 * - Adds white, bold, larger "Forgot password?" link (outside the login box)
 * - Clicking the link calls /api/requestPasswordReset and shows success/error
 * - Email subject: "Steps to reset your password" (no-reply)
 *
 * Note: Translations kept simple here; you can wire into your GPT i18n if desired.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../login_test/TestloginPage.module.css';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Login2FA() {
  const router = useRouter();
  const qs = useSearchParams();
  const lang = (qs.get('lang') || 'English').trim();

  // --- LOCAL STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [code, setCode] = useState('');
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Keep your existing translation shape; add forgotPassword link label + messages
  const [translations, setTranslations] = useState({
    title: 'Secure Login',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    signIn: 'Sign In',
    verificationLabel: 'Verification Code',
    verify: 'Verify',
    codeSent: '✅ Code successfully sent. Please check your phone.',
    errorGeneric: 'Unexpected error occurred.',
    errorSending: 'Error sending 2FA.',
    forgotPassword: 'Forgot password?',
    forgotEmailRequired: 'Please enter your email first.',
    forgotSent: '📧 Check your email for steps to reset your password.',
    forgotError: 'Could not send reset email. Please try again.',
  });

  // --- HANDLERS ---
  async function handleSignIn(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setLoadingSend(true);
    try {
      const res = await fetch('/api/send2FACode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || translations.errorSending);
      } else {
        setSuccessMsg(translations.codeSent);
      }
    } catch (err) {
      setErrorMsg(translations.errorGeneric);
    } finally {
      setLoadingSend(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email || !code) {
      setErrorMsg('Email and code are required.');
      return;
    }
    setLoadingVerify(true);
    try {
      const res = await fetch('/api/verify2FA', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || translations.errorGeneric);
      } else {
        // On successful verify -> go to real home and preserve ?lang=
        router.push(`/?lang=${encodeURIComponent(lang)}`);
      }
    } catch (err) {
      setErrorMsg(translations.errorGeneric);
    } finally {
      setLoadingVerify(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email) {
      setErrorMsg(translations.forgotEmailRequired);
      return;
    }
    try {
      const res = await fetch('/api/requestPasswordReset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || translations.forgotError);
      } else {
        setSuccessMsg(translations.forgotSent);
      }
    } catch (err) {
      setErrorMsg(translations.forgotError);
    }
  }

  // --- RENDER ---
  return (
    <div className={styles.pageWrapper}>
      {/* Left column: Title + Logo (preserve your locked layout) */}
      <div className={styles.leftColumn}>
        <h1 className={styles.brandTitle}>SOVEREIGN INTELLIGENCE</h1>
        <img
          src="/images/secure.png"
          alt="Sovereign Intelligence"
          width={225}
          height={225}
          className={styles.logo}
        />
      </div>

      {/* Right column: Login box + verification */}
      <div className={styles.rightColumn}>
        <div className={styles.loginCard}>
          <h2 className={styles.loginTitle}>{translations.title}</h2>

          {/* Alerts */}
          {errorMsg ? (
            <div className={styles.errorText} role="alert" style={{ marginBottom: '0.75rem' }}>
              {errorMsg}
            </div>
          ) : null}
          {successMsg ? (
            <div className={styles.successText} role="status" style={{ marginBottom: '0.75rem' }}>
              {successMsg}
            </div>
          ) : null}

          {/* Login form */}
          <form onSubmit={handleSignIn}>
            <label className={styles.label} htmlFor="email">
              {translations.emailLabel}
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <label className={styles.label} htmlFor="password">
              {translations.passwordLabel}
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={loadingSend}
              style={{ marginTop: '1rem' }}
            >
              {loadingSend ? '...' : translations.signIn /* keeps layout */}
            </button>
          </form>

          {/* Forgot password link — outside the login box content but visually close */}
        </div>

        <a
          href="#"
          onClick={handleForgotPassword}
          style={{
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1.075rem',
            textDecoration: 'underline',
            display: 'inline-block',
            marginTop: '0.85rem',
          }}
          aria-label={translations.forgotPassword}
        >
          {translations.forgotPassword}
        </a>

        {/* Verification section (visible immediately per your spec) */}
        <div className={styles.loginCard} style={{ marginTop: '1.25rem' }}>
          <form onSubmit={handleVerify}>
            <label className={styles.label} htmlFor="code">
              {translations.verificationLabel}
            </label>
            <input
              id="code"
              className={styles.input}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
            />
            <button
              type="submit"
              className={styles.secondaryButton}
              disabled={loadingVerify}
              style={{ marginTop: '0.75rem' }}
            >
              {loadingVerify ? '...' : translations.verify /* keeps layout */}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
