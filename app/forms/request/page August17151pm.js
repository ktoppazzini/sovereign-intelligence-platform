// app/forms/request/RequestForm.client.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';

/** Base (English) request types — these get translated on load. */
const REQUEST_TYPES_EN = [
  'New account',
  'Change account',
  'Change role',
  'Delete account',
  'Suspend account',
  'Cannot generate reform reports',
  'Site down',
  'Function not working',
  'General help',
];

/** UI text that we translate via /api/gptTranslation. */
const KEYS = {
  title: 'Service Request',
  name: 'Your Name',
  department: 'Department',
  email: 'Email',
  type: 'Request Type',
  description: 'Describe your request',
  submit: 'Submit',
  sent: '✅ Request submitted. Your ticket number is {ticket}.',
  failed: 'Could not submit your request. Please try again.',
};

const RTL_LANGS = /arabic|urdu|hebrew|farsi|persian|pashto|dari/i;

export default function RequestForm({ lang = 'English' }) {
  const [t, setT] = useState(KEYS);
  const [types, setTypes] = useState(REQUEST_TYPES_EN);

  // Form state
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [email, setEmail] = useState('');
  const [reqType, setReqType] = useState(REQUEST_TYPES_EN[0]);
  const [desc, setDesc] = useState('');

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const dir = useMemo(() => (RTL_LANGS.test(lang) ? 'rtl' : 'ltr'), [lang]);

  /**
   * Translate labels and request types for the selected language.
   * Falls back to English on any errors.
   */
  useEffect(() => {
    if (/^english$/i.test(lang)) return;

    const payload = {
      prompt:
        `Translate ONLY this JSON into ${lang}. Keep the same keys and structure, return JSON only.\n` +
        JSON.stringify({ ...KEYS, types: REQUEST_TYPES_EN }),
    };

    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        if (j?.translation && typeof j.translation === 'object') {
          const { types: translatedTypes, ...rest } = j.translation;
          if (Array.isArray(translatedTypes) && translatedTypes.length) {
            setTypes(translatedTypes.map(String));
            setReqType(String(translatedTypes[0]));
          }
          setT((prev) => ({ ...prev, ...rest }));
        }
      } catch {
        // swallow translation errors; English defaults remain
      }
    })();

    return () => ctrl.abort();
  }, [lang]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          department: dept,
          email,
          requestType: reqType,
          description: desc,
          lang,
        }),
      });

      const js = await res.json().catch(() => ({}));
      if (res.ok && js?.ticket) {
        const text = String(t.sent || KEYS.sent).replace('{ticket}', js.ticket);
        setMsg(text);

        // Reset form
        setName('');
        setDept('');
        setEmail('');
        setReqType(types[0] || REQUEST_TYPES_EN[0]);
        setDesc('');
      } else {
        setMsg(t.failed || KEYS.failed);
      }
    } catch {
      setMsg(t.failed || KEYS.failed);
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    outline: 'none',
  };

  return (
    <section dir={dir} aria-label={t.title} style={{ maxWidth: 760 }}>
      <h2 style={{ fontWeight: 900, fontSize: 32, margin: '6px 0 18px' }}>{t.title}</h2>

      <form
        onSubmit={onSubmit}
        style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 18,
          boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
        }}
      >
        {/* row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', margin: '0 0 6px 2px', fontWeight: 700 }}>
              {t.name}
            </label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label style={{ display: 'block', margin: '0 0 6px 2px', fontWeight: 700 }}>
              {t.department}
            </label>
            <input
              style={inputStyle}
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              required
            />
          </div>
        </div>

        {/* row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <div>
            <label style={{ display: 'block', margin: '0 0 6px 2px', fontWeight: 700 }}>
              {t.email}
            </label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', margin: '0 0 6px 2px', fontWeight: 700 }}>
              {t.type}
            </label>
            <select
              style={{ ...inputStyle, color: '#fff' }}
              value={reqType}
              onChange={(e) => setReqType(e.target.value)}
            >
              {(types.length ? types : REQUEST_TYPES_EN).map((opt) => (
                <option key={opt} value={opt} style={{ color: '#000' }}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* description */}
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', margin: '0 0 6px 2px', fontWeight: 700 }}>
            {t.description}
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            required
          />
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              background: '#0c2f57',
              border: '3px solid rgba(255,255,255,0.95)',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: 12,
              fontWeight: 900,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {t.submit}
          </button>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              fontWeight: 600,
            }}
          >
            {msg}
          </div>
        )}
      </form>
    </section>
  );
}
