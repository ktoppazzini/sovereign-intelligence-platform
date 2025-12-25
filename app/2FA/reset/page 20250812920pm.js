'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../login_test/TestloginPage.module.css';
import { useRouter, useSearchParams } from 'next/navigation';

const HOME_ROUTE = '/';
const LOGO_PULL = -220;

export default function PasswordResetPage() {
  const router = useRouter();
  const search = useSearchParams();

  const lang = search.get('lang') || 'English';
  const token = search.get('token') || '';
  const emailFromLink = search.get('email') || '';

  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const isRTL = useMemo(
    () => ['Arabic', 'Hebrew', 'Urdu', 'Farsi', 'Persian'].some((l) => lang.includes(l)),
    [lang],
  );

  const [t, setT] = useState({
    title: 'Reset Your Password',
    emailLabel: 'Email:',
    newPasswordLabel: 'New Password',
    newPasswordHelp: 'Minimum 8 characters and include letters, numbers, and a symbol.',
    confirmPasswordLabel: 'Confirm your password',
    submit: 'Submit',
    success: '✅ Password successfully changed.',
    errorGeneric: 'Could not reset password. Please try again.',
    mismatch: 'Passwords do not match. Please try again.',
    weak: 'Password must be at least 8 characters and include letters, numbers, and a symbol.',
  });

  // Robust translation (with fallback)
  useEffect(() => {
    (async () => {
      try {
        const prompt = `Translate the following labels/messages into ${lang}. Return only a raw JSON object:
{"title":"Reset Your Password","emailLabel":"Email:","newPasswordLabel":"New Password","newPasswordHelp":"Minimum 8 characters and include letters, numbers, and a symbol.","confirmPasswordLabel":"Confirm your password","submit":"Submit","success":"✅ Password successfully changed.","errorGeneric":"Could not reset password. Please try again.","mismatch":"Passwords do not match. Please try again.","weak":"Password must be at least 8 characters and include letters, numbers, and a symbol."}`;
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: ctrl.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        // Debug
        console.log('[RESET] gptTranslation status=', res.status, 'data=', data);
        if (data?.translation && typeof data.translation === 'object') {
          setT((prev) => ({ ...prev, ...data.translation }));
        }
      } catch (err) {
        console.warn('[RESET] translation fetch failed:', err);
      }
    })();
  }, [lang]);

  const strong = (p) =>
    typeof p === 'string' &&
    p.length >= 8 &&
    /[A-Za-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setIsError(false);

    if (password !== confirm) {
      setIsError(true);
      setMsg(t.mismatch);
      return;
    }
    if (!strong(password)) {
      setIsError(true);
      setMsg(t.weak);
      return;
    }
    if (!token) {
      setIsError(true);
      setMsg(t.errorGeneric);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/performPasswordReset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password, lang }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[RESET] POST /api/performPasswordReset', res.status, data);

      if (!res.ok || data?.ok !== true) {
        setIsError(true);
        setMsg(data?.uiErrorMessage || t.errorGeneric);
        return;
      }

      setIsError(false);
      setMsg(data?.uiMessage || t.success);
      // Redirect after a beat
      setTimeout(() => router.push(`${HOME_ROUTE}?lang=${encodeURIComponent(lang)}`), 1200);
    } catch (err) {
      console.error('[RESET] unexpected error:', err);
      setIsError(true);
      setMsg(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  // === identical layout to login ===
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

        <div style={rightCol}>
          <div className={styles.loginBox} style={card} dir={isRTL ? 'rtl' : 'ltr'}>
            <h1 className={styles.title} style={titleStyle}>
              {t.title}
            </h1>

            {msg ? (
              <p
                className={`${styles.msg} ${isError ? styles.error : styles.success}`}
                style={{ textAlign: 'center', marginBottom: 10 }}
                aria-live="polite"
              >
                {msg}
              </p>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className={styles.form}
              dir={isRTL ? 'rtl' : 'ltr'}
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
                autoComplete="email"
                style={inputStyle}
              />

              <label className={styles.label} style={labelStyle}>
                {t.newPasswordLabel}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
                autoComplete="new-password"
                placeholder={t.newPasswordHelp}
                style={inputStyle}
              />
              <small style={{ opacity: 0.8, marginTop: -6, marginBottom: 4 }}>
                {t.newPasswordHelp}
              </small>

              <label className={styles.label} style={labelStyle}>
                {t.confirmPasswordLabel}
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={styles.input}
                autoComplete="new-password"
                style={inputStyle}
              />

              <button type="submit" className={styles.button} disabled={loading} style={btnStyle}>
                {loading ? '...' : t.submit}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
