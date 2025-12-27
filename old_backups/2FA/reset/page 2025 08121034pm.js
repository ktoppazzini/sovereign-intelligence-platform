'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../login_test/TestloginPage.module.css';
import { useRouter, useSearchParams } from 'next/navigation';

const HOME_ROUTE = '/';

export default function PasswordResetPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const emailFromUrl = sp.get('email') || '';
  const tokenFromUrl = sp.get('token') || '';
  const selectedLanguage = sp.get('lang') || 'English';

  const isRTL = useMemo(
    () =>
      ['Arabic', 'Hebrew', 'Urdu', 'Farsi', 'Persian'].some((l) => selectedLanguage.includes(l)),
    [selectedLanguage],
  );

  const [email, setEmail] = useState(emailFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const prompt = `Translate the following labels into ${selectedLanguage}. Return ONLY a JSON object with the same keys.
{"title":"Reset Your Password","emailLabel":"Email:","newPasswordLabel":"New Password","newPasswordHelp":"Minimum 8 characters and include letters, numbers, and a symbol.","confirmPasswordLabel":"Confirm your password","submit":"Submit","success":"✅ Password successfully changed.","errorGeneric":"Could not reset password. Please try again.","mismatch":"Passwords do not match. Please try again.","weak":"Password must be at least 8 characters and include letters, numbers, and a symbol."}`;
        const r = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await r.json().catch(() => ({}));
        if (data?.translation && typeof data.translation === 'object') {
          setT((prev) => ({ ...prev, ...data.translation }));
        }
      } catch {
        /* soft fail */
      }
    })();
  }, [selectedLanguage]);

  const validPassword = (p) =>
    typeof p === 'string' &&
    p.length >= 8 &&
    /[A-Za-z]/.test(p) &&
    /\d/.test(p) &&
    /[^A-Za-z0-9]/.test(p);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setIsError(false);

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMsg(t.mismatch);
      return;
    }
    if (!validPassword(newPassword)) {
      setIsError(true);
      setMsg(t.weak);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/performPasswordReset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: tokenFromUrl,
          newPassword,
          lang: selectedLanguage,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setIsError(true);
        setMsg(data?.message || t.errorGeneric);
        return;
      }

      setIsError(false);
      setMsg(t.success);
      setTimeout(() => {
        router.push(`${HOME_ROUTE}?lang=${encodeURIComponent(selectedLanguage)}`);
      }, 1200);
    } catch {
      setIsError(true);
      setMsg(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  // Layout: copy of your login page card styles
  const wrap = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 56,
    width: '100%',
    maxWidth: 1100,
    margin: '24px auto 0',
  };
  const leftCol = { flex: '0 0 325px', marginTop: 8, marginLeft: '-220px' };
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
          <div className={styles.loginBox} style={card}>
            <h1 className={styles.title} style={titleStyle}>
              {t.title}
            </h1>

            {/* policy hint in red, same look */}
            <p style={{ color: '#b91c1c', textAlign: 'center', marginTop: -6, marginBottom: 10 }}>
              {t.newPasswordHelp}
            </p>

            {msg ? (
              <p
                className={`${styles.msg} ${isError ? styles.error : styles.success}`}
                style={{ textAlign: 'center', marginBottom: 10 }}
              >
                {msg}
              </p>
            ) : null}

            <form
              onSubmit={submit}
              dir={isRTL ? 'rtl' : 'ltr'}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
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
                style={inputStyle}
              />

              <label className={styles.label} style={labelStyle}>
                {t.newPasswordLabel}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className={styles.input}
                style={inputStyle}
              />

              <label className={styles.label} style={labelStyle}>
                {t.confirmPasswordLabel}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={styles.input}
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
