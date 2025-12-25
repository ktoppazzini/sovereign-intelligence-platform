'use client';

import { useEffect, useState } from 'react';

/** tiny in-memory cache to avoid re-translating the same payload */
const txCache = new Map(); // key -> translation object

async function gptTranslateValues(jsonWithEnglishValues, lang) {
  const key = `vals:${lang}:${Object.keys(jsonWithEnglishValues).join('|')}`;
  if (txCache.has(key)) return txCache.get(key);

  const prompt =
    `Translate ONLY the VALUES of this JSON into ${lang}. ` +
    `Return valid JSON with the SAME KEYS and translated VALUES. ` +
    `Do not add or remove keys:\n${JSON.stringify(jsonWithEnglishValues)}`;

  const res = await fetch('/api/gptTranslation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}
  const out =
    data?.translation && typeof data.translation === 'object'
      ? data.translation
      : data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : {};

  txCache.set(key, out);
  return out;
}

export default function ServiceRequestForm({ lang = 'English' }) {
  /** English base labels — will be GPT-translated at runtime */
  const [t, setT] = useState({
    title: 'Service Request',
    yourName: 'Your Name',
    department: 'Department',
    email: 'Email',
    requestType: 'Request Type',
    describe: 'Describe your request',
    submit: 'Submit',
    success: 'Thank you! Your request has been submitted.',
    failure: 'Unable to submit request.',
  });

  // translate static UI labels (skip when lang is clearly English)
  useEffect(() => {
    const isEnglish = String(lang).trim().toLowerCase().startsWith('en');
    if (isEnglish) return;

    (async () => {
      const translated = await gptTranslateValues(t, lang).catch(() => ({}));
      if (translated && Object.keys(translated).length) {
        setT((prev) => ({ ...prev, ...translated }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // form state
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // dropdown
  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesErr, setTypesErr] = useState('');

  async function fetchRawTypes() {
    // prefer the one you’ve had working; then graceful fallbacks
    const endpoints = [
      '/api/service-requests/types?options=1&debug=1',
      '/api/admin/request-types?options=1&debug=1',
      '/api/requests/types?options=1&debug=1',
    ];

    for (const url of endpoints) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const arr = (j.options || j.types || j.items || j.records || j.roles || [])
          .map((row, i) => {
            const label =
              row.label ||
              row.name ||
              row.value ||
              String(row?.fields?.Name || row?.fields?.Label || '');
            const value = row.value || row.name || label;
            const id = row.id || value || `idx-${i}`;
            return {
              id: String(id),
              label: String(label || value || id),
              value: String(value || id),
            };
          })
          .filter((x) => x.label && x.value);

        if ((r.ok && j?.ok) || arr.length) return arr;
      } catch {}
    }
    return null;
  }

  async function loadTypes() {
    setTypesLoading(true);
    setTypesErr('');

    let raw = await fetchRawTypes();

    if (!raw || !raw.length) {
      // UI remains usable if Airtable route is down
      raw = [
        { id: 'new', label: 'New account', value: 'New account' },
        { id: 'change', label: 'Change role', value: 'Change role' },
        { id: 'delete', label: 'Delete account', value: 'Delete account' },
        { id: 'suspend', label: 'Suspend account', value: 'Suspend account' },
        {
          id: 'reports',
          label: 'Cannot generate reform reports',
          value: 'Cannot generate reform reports',
        },
        { id: 'down', label: 'Site down', value: 'Site down' },
        { id: 'function', label: 'Function not working', value: 'Function not working' },
        { id: 'help', label: 'General help', value: 'General help' },
      ];
      setTypesErr('Using fallback options — check your Airtable types API route.');
    }

    // translate only labels; keep English value for backend consistency
    const englishLabelMap = Object.fromEntries(raw.map((o) => [o.label, o.label]));
    const isEnglish = String(lang).trim().toLowerCase().startsWith('en');
    let translated = {};
    if (!isEnglish) {
      translated = await gptTranslateValues(englishLabelMap, lang).catch(() => ({}));
    }

    const localized = raw.map((o) => ({ ...o, label: translated[o.label] || o.label }));
    setTypes(localized);
    if (!type && localized.length) setType(localized[0].value);

    setTypesLoading(false);
  }

  useEffect(() => {
    loadTypes(); /* eslint-disable-line react-hooks/exhaustive-deps */
  }, [lang]);

  async function onSubmit(e) {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          department: dept.trim(),
          email: email.trim().toLowerCase(),
          type, // English value expected by backend
          description: desc.trim(),
          lang, // pass through
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        setMessage(t.failure);
      } else {
        setMessage(t.success + (j?.requestNumber ? ` (#${j.requestNumber})` : ''));
        setName('');
        setDept('');
        setEmail('');
        setDesc('');
        setType(types[0]?.value || '');
      }
    } catch {
      setMessage(t.failure);
    } finally {
      setSubmitting(false);
    }
  }

  // simple styles (match your existing look)
  const input = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    outline: 'none',
  };
  const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 };

  return (
    <form onSubmit={onSubmit}>
      <div style={row}>
        <div>
          <label style={{ fontWeight: 800, fontSize: 14, display: 'block', marginBottom: 8 }}>
            {t.yourName}
          </label>
          <input
            style={input}
            placeholder={t.yourName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ fontWeight: 800, fontSize: 14, display: 'block', marginBottom: 8 }}>
            {t.department}
          </label>
          <input
            style={input}
            placeholder={t.department}
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          />
        </div>
      </div>

      <div style={row}>
        <div>
          <label style={{ fontWeight: 800, fontSize: 14, display: 'block', marginBottom: 8 }}>
            {t.email}
          </label>
          <input
            type="email"
            style={input}
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ fontWeight: 800, fontSize: 14, display: 'block', marginBottom: 8 }}>
            {t.requestType}
          </label>
          <select
            style={{ ...input, color: '#fff' }}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {types.map((opt, i) => (
              <option key={opt.id || opt.value || i} value={opt.value} style={{ color: '#000' }}>
                {opt.label}
              </option>
            ))}
          </select>
          {typesLoading && <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>Loading…</div>}
          {typesErr && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#fca5a5' }}>{typesErr}</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontWeight: 800, fontSize: 14, display: 'block', marginBottom: 8 }}>
          {t.describe}
        </label>
        <textarea
          style={{ ...input, minHeight: 180, resize: 'vertical' }}
          placeholder={t.describe}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: '#0c2f57',
          border: '3px solid rgba(255,255,255,0.95)',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 12,
          fontWeight: 900,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {t.submit}
      </button>

      {message && <div style={{ marginTop: 12, fontSize: 14, opacity: 0.95 }}>{message}</div>}
    </form>
  );
}
