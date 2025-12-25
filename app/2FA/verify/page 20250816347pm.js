// File: /app/2FA/verify/page.js
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../../login_test/TestloginPage.module.css'; // use same locked CSS as login

export default function TwoFAVerify() {
  const router = useRouter();
  const qs = useSearchParams();
  const lang = (qs.get('lang') || 'English').trim();
  const email = (qs.get('email') || '').trim();

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [success, setSuccess] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setStatusMsg('');

    if (!code || !email) {
      setError('Missing code or email.');
      return;
    }

    setIsVerifying(true);
    setStatusMsg('Verifying…');

    try {
      const res = await fetch('/api/verify2FA', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, lang }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const raw = data?.message || data?.error || 'Verification failed';
        setError(raw);
        setStatusMsg('');
        setIsVerifying(false);
        return;
      }

      // success: unlock nav in the exact way your app expects
      try {
        localStorage.setItem('auth_isVerified', 'true');
        localStorage.setItem('nav_unlocked', 'true');
        localStorage.setItem('si_authed', '1');
      } catch {}

      setSuccess('✅ Verified.');
      setStatusMsg('');

      // go home with lang preserved
      router.push(`/?lang=${encodeURIComponent(lang)}`);
    } catch (err) {
      setError('Unexpected error during verification');
      setStatusMsg('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={styles.container} style={{ paddingTop: '1.25rem' }}>
      {/* Title + Logo (locked look) */}
      <div className={styles.logoAndTitleWrapper}>
        <h1 className={styles.pageTitle}>SOVEREIGN INTELLIGENCE</h1>
        <div className={styles.logoWrapper}>
          <Image
            src="/images/secure.png"
            alt="Sovereign Intelligence"
            width={225}
            height={225}
            className={styles.logoImage}
            priority
          />
        </div>
      </div>

      {/* Verify box */}
      <div className={styles.loginBox} style={{ marginLeft: '12rem', marginTop: '2rem' }}>
        <h2 className={styles.loginTitle}>Enter Verification Code</h2>

        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="code">
            Code:
          </label>
          <input
            id="code"
            type="text"
            className={styles.input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            inputMode="numeric"
            autoComplete="one-time-code"
          />

          {/* STATUS */}
          {statusMsg ? (
            <div
              style={{
                all: 'unset',
                display: 'block',
                color: '#137333',
                marginTop: '0.5rem',
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {statusMsg}
            </div>
          ) : null}

          {/* ERROR */}
          {error ? (
            <div
              role="alert"
              aria-live="polite"
              style={{
                all: 'unset',
                display: 'block',
                color: '#d93025',
                marginTop: '0.75rem',
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          ) : null}

          {/* SUCCESS */}
          {success ? (
            <div
              style={{
                all: 'unset',
                display: 'block',
                color: '#137333',
                marginTop: '0.5rem',
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {success}
            </div>
          ) : null}

          <button type="submit" className={styles.button} disabled={isVerifying}>
            {isVerifying ? '...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
