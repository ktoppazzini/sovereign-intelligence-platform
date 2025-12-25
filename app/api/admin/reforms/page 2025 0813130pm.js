'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../2FA/login_test/TestloginPage.module.css';
import { useSearchParams } from 'next/navigation';

const LOGO_PULL = -220;

export default function AdminReformsPage() {
  const search = useSearchParams();
  const lang = search.get('lang') || 'English';

  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);

  const isRTL = useMemo(
    () => ['Arabic', 'Hebrew', 'Urdu', 'Farsi', 'Persian'].some((l) => lang.includes(l)),
    [lang],
  );

  const [t, setT] = useState({
    title: 'Reform Reports',
    email: 'Email',
    status: 'Status',
    language: 'Language',
    updated: 'Updated',
    view: 'View',
    hide: 'Hide',
    empty: 'No reports found.',
    error: 'Failed to load reports.',
  });

  useEffect(() => {
    (async () => {
      try {
        // i18n
        const prompt = `Translate the following labels/messages into ${lang}. Return only a raw JSON object:
{"title":"Reform Reports","email":"Email","status":"Status","language":"Language","updated":"Updated","view":"View","hide":"Hide","empty":"No reports found.","error":"Failed to load reports."}`;
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: ctrl.signal,
        });
        clearTimeout(to);
        const j = await r.json().catch(() => ({}));
        if (j?.translation && typeof j.translation === 'object')
          setT((p) => ({ ...p, ...j.translation }));
      } catch {}
    })();
  }, [lang]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setIsError(false);
      setMsg('');
      try {
        const r = await fetch(`/api/admin/reforms?lang=${encodeURIComponent(lang)}`, {
          cache: 'no-store',
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setIsError(true);
          setMsg(data?.uiErrorMessage || t.error);
          setItems([]);
        } else {
          setItems(Array.isArray(data?.items) ? data.items : []);
        }
      } catch {
        setIsError(true);
        setMsg(t.error);
      } finally {
        setLoading(false);
      }
    })();
  }, [lang, t.error]);

  // layout identical to login
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
    background: '#fff',
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

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #eee',
  };
  const metaStyle = { fontSize: 14, opacity: 0.85 };
  const btnLink = {
    background: 'transparent',
    border: 'none',
    color: '#082b52',
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'underline',
  };

  return (
    <div className={styles.container}>
      <div style={wrap}>
        {/* left logo */}
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

        {/* right card */}
        <div style={rightCol}>
          <div className={styles.loginBox} style={card} dir={isRTL ? 'rtl' : 'ltr'}>
            <h1 className={styles.title} style={titleStyle}>
              {t.title}
            </h1>

            {msg ? (
              <p
                className={`${styles.msg} ${isError ? styles.error : styles.success}`}
                style={{ textAlign: 'center', marginBottom: 10 }}
              >
                {msg}
              </p>
            ) : null}

            {loading ? <p style={{ textAlign: 'center' }}>...</p> : null}

            {!loading && items.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.8 }}>{t.empty}</p>
            ) : null}

            {!loading &&
              items.map((it) => (
                <div key={it.id} style={rowStyle}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{it.email || '—'}</div>
                    <div style={metaStyle}>
                      {t.status}: {it.status || '—'} · {t.language}: {it.lang || '—'} · {t.updated}:{' '}
                      {it.updated || '—'}
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === it.id ? null : it.id)}
                      style={btnLink}
                      aria-label={openId === it.id ? t.hide : t.view}
                    >
                      {openId === it.id ? t.hide : t.view}
                    </button>
                  </div>
                  {openId === it.id ? (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        whiteSpace: 'pre-wrap',
                        marginTop: 6,
                        fontSize: 14,
                        lineHeight: 1.4,
                      }}
                    >
                      {it.plan || '—'}
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
