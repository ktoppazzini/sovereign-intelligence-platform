'use client';

import { useEffect, useMemo, useState } from 'react';

function normalizeLang(raw) {
  if (!raw) return 'English';
  const lower = String(raw).toLowerCase();
  const map = {
    ar: 'Arabic',
    arabic: 'Arabic',
    he: 'Hebrew',
    hebrew: 'Hebrew',
    fa: 'Persian',
    farsi: 'Persian',
    ur: 'Urdu',
    urdu: 'Urdu',
    ps: 'Pashto',
    pashto: 'Pashto',
    fr: 'French',
    français: 'French',
    french: 'French',
    es: 'Spanish',
    spanish: 'Spanish',
    zh: 'Chinese',
    chinese: 'Chinese',
    en: 'English',
    english: 'English',
    albanian: 'Albanian',
    sq: 'Albanian',
  };
  return map[lower] || raw;
}

export default function ServiceRequestForm({ lang: langProp = 'English' }) {
  const lang = normalizeLang(langProp);

  // ---- UI labels (translated via your /api/gptTranslation helper) ----
  const [t, setT] = useState({
    yourName: 'Your Name',
    department: 'Department',
    email: 'Email',
    requestType: 'Request Type',
    describe: 'Describe your request',
    submit: 'Submit',
    success: 'Thank you! Your request has been submitted.',
    failure: 'Unable to submit request.',
  });

  useEffect(() => {
    if (/^english$/i.test(lang)) return;

    const payload = { ...t };
    const prompt = `Translate these form labels into ${lang}. Return ONLY JSON with the same keys:
${JSON.stringify(payload)}`;

    (async () => {
      try {
        const r = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await r.json().catch(() => ({}));
        if (data?.translation && typeof data.translation === 'object') {
          setT((prev) => ({ ...prev, ...data.translation }));
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
          setT((prev) => ({ ...prev, ...data }));
        }
      } catch {}
    })();
  }, [lang]);

  // ---- form state ----
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // ---- request types (Airtable) ----
  const [types, setTypes] = useState([]);
  const [typesErr, setTypesErr] = useState('');
  const [typesLoading, setTypesLoading] = useState(false);

  // Try the admin-style options endpoint first (like your Users page), then fall back
  async function loadTypes() {
    setTypesLoading(true);
    setTypesErr('');
    const tryEndpoints = [
      '/api/admin/request-types?options=1&debug=1',
      '/api/requests/types?options=1&debug=1',
      '/api/service-requests/types?options=1&debug=1',
    ];
    for (const url of tryEndpoints) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        // expect { ok: true, roles: [...] }-style or { ok: true, types: [...] }
        const raw = (j.roles || j.types || j.options || j.items || []).map((r, i) => {
          const id = r.id || r.value || r.label || `idx-${i}`;
          const label = r.label || r.name || r.value || String(id);
          const value = r.value || r.name || id;
          return { id, label, value };
        });
        if (res.ok && (j.ok || raw.length)) {
          setTypes(raw);
          if (!type && raw.length) setType(raw[0].value || raw[0].label || raw[0].id);
          setTypesLoading(false);
          return;
        }
      } catch (e) {
        // try next endpoint
      }
    }
    // Final fallback so UI is usable even if API not ready
    setTypes([
      { id: 'new', label: 'New account', value: 'New account' },
      { id: 'change', label: 'Change an account', value: 'Change an account' },
      { id: 'role', label: 'Change role', value: 'Change role' },
      { id: 'delete', label: 'Delete account', value: 'Delete account' },
      { id: 'suspend', label: 'Suspend account', value: 'Suspend account' },
      {
        id: 'reports',
        label: 'Cannot generate reform reports',
        value: 'Cannot generate reform reports',
      },
      { id: 'down', label: 'Site down', value: 'Site down' },
      { id: 'notworking', label: 'Function not working', value: 'Function not working' },
      { id: 'help', label: 'General help', value: 'General help' },
    ]);
    if (!type) setType('New account');
    setTypesErr('Using fallback options — check your API route for Airtable types.');
    setTypesLoading(false);
  }

  useEffect(() => {
    loadTypes();
  }, [lang]);

  // ---- submit handler ----
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
          type, // send the English label/value expected by backend
          description: desc.trim(),
          lang,
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
        setType(types[0]?.value || '');
        setDesc('');
      }
    } catch {
      setMessage(t.failure);
    } finally {
      setSubmitting(false);
    }
  }

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
      {/* 2-up row: name / dept */}
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

      {/* 2-up row: email / type */}
      <div style={row}>
        <div>
          <label style={{ fontWeight: 800, fontSize: 14, display: 'block', marginBottom: 8 }}>
            {t.email}
          </label>
          <input
            style={input}
            type="email"
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

      {/* description */}
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
