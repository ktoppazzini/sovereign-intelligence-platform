// components/RequestShell.client.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import NavCtas from '@/components/NavCtas.client';

function isEnglish(lang) {
  return /^english$/i.test(String(lang || '').trim());
}

export default function RequestShell({ lang = 'English', role = 'User' }) {
  const [options, setOptions] = useState([]); // [{value:'newAccount', label:'New account'}, ...]
  const [t, setT] = useState({
    title: 'Service Request',
    yourName: 'Your Name',
    department: 'Department',
    email: 'Email',
    requestType: 'Request Type',
    describe: 'Describe your request',
    submit: 'Submit',
    sentOk: 'Thanks! Your request has been submitted.',
    sentErr: 'Unable to submit the request.',
  });

  const [form, setForm] = useState({
    name: '',
    email: '',
    dept: '',
    type: '',
    desc: '',
  });

  // Load dropdown options from Airtable and translate their labels (values remain stable)
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const r = await fetch('/api/service-requests/types?options=1&debug=1', {
          cache: 'no-store',
        });
        const data = await r.json();
        const list = Array.isArray(data?.options) ? data.options : [];

        // Normalize into {value,label} with English labels first
        const base = list.map((v) => ({ value: v.value || v, label: v.label || String(v) }));

        if (ignore) return;

        // Translate labels if needed
        if (!isEnglish(lang) && base.length) {
          // Build a translation object with English -> English
          const obj = Object.fromEntries(base.map((o) => [o.label, o.label]));
          const prompt = `Translate ONLY the values of this JSON into ${lang}, returning a JSON with the same keys:\n${JSON.stringify(
            obj,
          )}`;

          try {
            const tr = await fetch('/api/gptTranslation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt }),
            })
              .then((res) => res.json())
              .catch(() => null);

            const translated =
              tr?.translation && typeof tr.translation === 'object' ? tr.translation : null;
            setOptions(
              base.map((o) => ({
                value: o.value,
                label: translated?.[o.label] ?? o.label,
              })),
            );
          } catch {
            setOptions(base); // fall back to English labels
          }
        } else {
          setOptions(base);
        }

        // Default the select to the first option if empty
        if (!form.type && base.length) {
          setForm((f) => ({ ...f, type: base[0].value }));
        }
      } catch {
        setOptions([]);
      }
    };

    load();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Translate static labels on this page
  useEffect(() => {
    if (isEnglish(lang)) return;
    const prompt = `Translate ONLY the values of this JSON into ${lang}, returning a JSON with the same keys:\n${JSON.stringify(
      t,
    )}`;

    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => null);
        if (j?.translation && typeof j.translation === 'object') {
          setT((prev) => ({ ...prev, ...j.translation }));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          name: form.name,
          email: form.email,
          department: form.dept,
          requestType: form.type,
          description: form.desc,
        }),
      });

      if (!res.ok) throw new Error('submit failed');
      alert(t.sentOk);
      setForm({ name: '', email: '', dept: '', type: options[0]?.value || '', desc: '' });
    } catch {
      alert(t.sentErr);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116,#2d333a)',
        color: '#fff',
      }}
      data-role={role}
    >
      <main style={{ padding: '24px 32px' }}>
        {/* Top row: Title on left, SAME header/nav on right (scaled to match Home) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <h1 style={{ fontWeight: 900, fontSize: 44, margin: 0 }}>Sovereign Intelligence</h1>

          <div
            style={{ marginLeft: 'auto', transform: 'scale(1.15)', transformOrigin: 'top right' }}
          >
            <NavCtas lang={lang} active="forms" />
          </div>
        </div>

        {/* Page title + two-column body */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '420px 1fr',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left: brand card (same style you use elsewhere) */}
          <div
            style={{
              background: '#0f1116',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
              padding: 18,
            }}
          >
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={420}
              height={420}
              style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* Right: form */}
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 34, margin: '0 0 16px' }}>{t.title}</h2>

            <form
              onSubmit={handleSubmit}
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: 18,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
              }}
            >
              {/* Name + Department */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: 6, opacity: 0.9 }}>
                    {t.yourName}
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder={t.yourName}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, opacity: 0.9 }}>
                    {t.department}
                  </label>
                  <input
                    name="dept"
                    value={form.dept}
                    onChange={handleChange}
                    placeholder={t.department}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Email + Request Type */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: 6, opacity: 0.9 }}>
                    {t.email}
                  </label>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder={t.email}
                    type="email"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, opacity: 0.9 }}>
                    {t.requestType}
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', marginBottom: 6, opacity: 0.9 }}>
                  {t.describe}
                </label>
                <textarea
                  name="desc"
                  value={form.desc}
                  onChange={handleChange}
                  placeholder={t.describe}
                  rows={7}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#0c2f57',
                  border: '3px solid rgba(255,255,255,0.95)',
                  color: '#fff',
                  fontWeight: 900,
                  borderRadius: 12,
                  padding: '10px 18px',
                }}
              >
                {t.submit}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  outline: 'none',
};
