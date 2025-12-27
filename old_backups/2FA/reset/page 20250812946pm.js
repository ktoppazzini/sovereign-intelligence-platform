'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// NOTE: reusing the exact layout used in your login page (no header), with inline styles.
// If your login page imports a CSS module, you can import it here too.

const HOME_ROUTE = '/';

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = sp.get('token') || '';
  const emailFromLink = sp.get('email') || '';
  const selectedLanguage = sp.get('lang') || 'English';

  const isRTL = useMemo(
    () =>
      ['Arabic', 'Hebrew', 'Urdu', 'Farsi', 'Persian'].some((l) => selectedLanguage.includes(l)),
    [selectedLanguage],
  );

  const [email, setEmail] = useState(emailFromLink);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');

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

  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // fetch translations via your GPT endpoint, just like the login page
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const prompt = `Translate the following password reset labels and messages into ${selectedLanguage}. Return only raw JSON:
{"title":"Reset Your Password","emailLabel":"Email:","newPasswordLabel":"New Password","newPasswordHelp":"Minimum 8 characters and include letters, numbers, and a symbol.","confirmPasswordLabel":"Confirm your password","submit":"Submit","success":"✅ Password successfully changed.","errorGeneric":"Could not reset password. Please try again.","mismatch":"Passwords do not match. Please try again.","weak":"Password must be at least 8 characters and include letters, numbers, and a symbol."}`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 15000);
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
        clearTimeout(id);
        const data = await res.json().catch(() => ({}));
        if (data?.translation && typeof data.translation === 'object') {
          setT((prev) => ({ ...prev, ...data.translation }));
        }
      } catch (_) {
        // fall back silently to English
      }
    };
    fetchTranslations();
  }, [selectedLanguage]);

  const validStrength = (s) =>
    typeof s === 'string' &&
    s.length >= 8 &&
    /[A-Za-z]/.test(s) &&
    /[0-9]/.test(s) &&
    /[^A-Za-z0-9]/.test(s);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setIsError(false);

    if (p1 !== p2) {
      setIsError(true);
      setMsg(t.mismatch);
      return;
    }
    if (!validStrength(p1)) {
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
          token,
          email,
          newPassword: p1,
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

      // brief pause then go home (preserve language)
      setTimeout(() => {
        router.push(`${HOME_ROUTE}?lang=${encodeURIComponent(selectedLanguage)}`);
      }, 1000);
    } catch (_) {
      setIsError(true);
      setMsg(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  // --- layout copied from your login page (kept inline to avoid touching CSS files) ---
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
    <div style={{ minHeight: '100vh' }}>
      <div style={wrap}>
        {/* Logo column */}
        <div style={leftCol}>
          <div>
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence Logo"
              width={225}
              height={225}
              style={{ width: 225, height: 225, objectFit: 'contain', display: 'block' }}
              decoding="async"
            />
          </div>
        </div>

        {/* Card column */}
        <div style={rightCol}>
          <div style={card}>
            <h1 style={titleStyle}>{t.title}</h1>

            {/* red help line (translated) */}
            <p style={{ color: '#b91c1c', textAlign: 'center', marginTop: -6, marginBottom: 16 }}>
              {t.newPasswordHelp}
            </p>

            {msg ? (
              <p
                style={{
                  textAlign: 'center',
                  marginBottom: 10,
                  color: isError ? '#b91c1c' : '#059669',
                  fontWeight: 700,
                }}
              >
                {msg}
              </p>
            ) : null}

            <form onSubmit={handleSubmit} dir={isRTL ? 'rtl' : 'ltr'} style={stack}>
              <label style={labelStyle}>{t.emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                style={inputStyle}
              />

              <label style={labelStyle}>{t.newPasswordLabel}</label>
              <input
                type="password"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                required
                autoComplete="new-password"
                style={inputStyle}
              />

              <label style={labelStyle}>{t.confirmPasswordLabel}</label>
              <input
                type="password"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                required
                autoComplete="new-password"
                style={inputStyle}
              />

              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? '...' : t.submit}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
