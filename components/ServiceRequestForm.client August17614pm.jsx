// components/ServiceRequestForm.client.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';

const KEYS = {
  title: 'Service Request',
  yourName: 'Your Name',
  department: 'Department',
  email: 'Email',
  requestType: 'Request Type',
  changeType: 'Change Type',
  description: 'Describe your request',
  submit: 'Submit',
  submitted: '✅ Request submitted.',
  failed: 'Failed to submit request. Please try again.',
};

const REQ_TYPES = [
  'New account',
  'Change an account',
  'Change type (change role, delete account, suspend account)',
  'Cannot generate reform reports',
  'Site down',
  'Function not working',
  'General help',
];

const CHANGE_TYPES = ['Change role', 'Delete account', 'Suspend account'];

function isRTL(lang) {
  const s = String(lang || '').toLowerCase();
  return ['arabic', 'hebrew', 'urdu', 'persian', 'farsi'].some((x) => s.includes(x));
}

export default function ServiceRequestForm({ lang = 'English', emailFromCookie = '' }) {
  const [t, setT] = useState(KEYS);
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [email, setEmail] = useState(emailFromCookie || '');
  const [reqType, setReqType] = useState(REQ_TYPES[0]);
  const [chgType, setChgType] = useState(CHANGE_TYPES[0]);
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const rtl = useMemo(() => isRTL(lang), [lang]);
  const showChangeType = reqType.startsWith('Change type');

  // Translate labels via your existing GPT endpoint
  useEffect(() => {
    if (/^english$/i.test(lang)) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt:
              'Translate ONLY the following labels into ' +
              lang +
              '. Return just a JSON object with the same keys:\n' +
              JSON.stringify(KEYS),
          }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        const obj =
          (j && j.translation && typeof j.translation === 'object' && j.translation) ||
          (typeof j === 'object' ? j : null);
        if (obj) setT((prev) => ({ ...prev, ...obj }));
      } catch {}
    })();
    return () => ctrl.abort();
  }, [lang]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setToast('');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          name,
          department: dept,
          email,
          requestType: reqType,
          changeType: showChangeType ? chgType : '',
          description: desc,
        }),
      });
      if (!res.ok) throw new Error('bad');
      setToast(t.submitted);
      setDesc('');
    } catch {
      setToast(t.failed);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 5000);
    }
  }

  const box = {
    background: 'rgba(255,255,255,0.07)',
    padding: 18,
    borderRadius: 12,
    backdropFilter: 'blur(2px)',
    maxWidth: 720,
  };
  const row = { display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginBottom: 16 };
  const input = {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    width: '100%',
  };

  return (
    <form onSubmit={handleSubmit} dir={rtl ? 'rtl' : 'ltr'} style={box}>
      <div style={row}>
        <div>
          <label>{t.yourName}</label>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>{t.department}</label>
          <input style={input} value={dept} onChange={(e) => setDept(e.target.value)} />
        </div>
      </div>

      <div style={row}>
        <div>
          <label>{t.email}</label>
          <input
            style={input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>{t.requestType}</label>
          <select style={input} value={reqType} onChange={(e) => setReqType(e.target.value)}>
            {REQ_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showChangeType && (
        <div style={{ marginBottom: 16 }}>
          <label>{t.changeType}</label>
          <select style={input} value={chgType} onChange={(e) => setChgType(e.target.value)}>
            {CHANGE_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label>{t.description}</label>
        <textarea
          rows={6}
          style={{ ...input, resize: 'vertical' }}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: '#0c2f57',
          border: '2px solid rgba(255,255,255,0.9)',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 12,
          fontWeight: 900,
          cursor: 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? '…' : t.submit}
      </button>

      {toast && <div style={{ marginTop: 12, fontWeight: 700 }}>{toast}</div>}
    </form>
  );
}
