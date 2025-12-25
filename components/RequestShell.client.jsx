// app/forms/request/RequestForm.client.jsx
// VERSION: REQUEST-FORM v1.0 — 2025-08-21 (ET)
// Notes:
// - No changes to HomeShell or RequestShell; this file is self-contained.
// - Loads Request Type / Change Type options from /api/requests/options.
// - Submits to /api/requests (which already emails Admin + Requester & writes Airtable).
// - Translates labels via /api/gptTranslation (no hard-coded language).
// - Minimal inline styles; uses same visual tokens as your other cards/tables.

'use client';

import { useEffect, useState } from 'react';

const LBL = {
  yourName: 'Your Name',
  department: 'Department',
  email: 'Email',
  requestType: 'Request Type',
  changeType: 'Change Type (if applicable)',
  description: 'Describe your request',
  placeholderName: 'Your Name',
  placeholderDept: 'Department',
  placeholderEmail: 'Email',
  placeholderDesc: 'Describe your request',
  submit: 'Submit',
  success: 'Thank you. Your request was received.',
  error: 'Something went wrong. Please try again.',
  loadingTypes: 'Loading request types…',
  noTypes: 'No request types available. Please contact your admin.',
};

function isEnglish(v = '') {
  return /^en/i.test(String(v)) || /english/i.test(String(v));
}
async function gptTranslate(obj, lang) {
  if (isEnglish(lang)) return obj;
  try {
    const res = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Translate ONLY the VALUES of this JSON into ${lang}. Return valid JSON with the SAME KEYS and translated VALUES:\n${JSON.stringify(obj)}`,
      }),
    });
    const j = await res.json().catch(() => ({}));
    return j?.translation || obj;
  } catch {
    return obj;
  }
}

export default function RequestForm({ lang = 'English' }) {
  // labels
  const [t, setT] = useState(LBL);
  useEffect(() => {
    (async () => setT(await gptTranslate(LBL, lang)))();
  }, [lang]);

  // form state
  const [form, setForm] = useState({
    name: '',
    department: '',
    email: '',
    requestType: '',
    changeType: '',
    description: '',
  });
  const setField = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  // dropdown options
  const [reqTypeOpts, setReqTypeOpts] = useState([]);
  const [changeTypeOpts, setChangeTypeOpts] = useState([]);
  const [optsLoading, setOptsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setOptsLoading(true);
      try {
        const r = await fetch('/api/requests/options', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const rt = Array.isArray(j.requestTypeOpts) ? j.requestTypeOpts : [];
        const ct = Array.isArray(j.changeTypeOpts) ? j.changeTypeOpts : [];
        if (alive) {
          setReqTypeOpts(rt);
          setChangeTypeOpts(ct);
        }
      } catch {
        if (alive) {
          setReqTypeOpts([]);
          setChangeTypeOpts([]);
        }
      } finally {
        if (alive) setOptsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const reqTypeEmpty = !optsLoading && reqTypeOpts.length === 0;

  // submit
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setOkMsg('');
    setErrMsg('');
    try {
      // Server expects: name, department, email, requestType, changeType, description, lang
      // (It maps requestType -> Airtable "type" internally and emails Admin/Requester.)
      // ref: app/api/requests/route.js POST mapping & emails
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lang }),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.ok) {
        setOkMsg(t.success);
        setForm({
          name: '',
          department: '',
          email: '',
          requestType: '',
          changeType: '',
          description: '',
        });
      } else {
        setErrMsg(j?.error || t.error);
      }
    } catch {
      setErrMsg(t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      {/* Row 1: Name / Department */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontWeight: 800 }}>{t.yourName}</label>
          <input
            value={form.name}
            onChange={setField('name')}
            placeholder={t.placeholderName}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontWeight: 800 }}>{t.department}</label>
          <input
            value={form.department}
            onChange={setField('department')}
            placeholder={t.placeholderDept}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Row 2: Email / Request Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontWeight: 800 }}>{t.email}</label>
          <input
            type="email"
            value={form.email}
            onChange={setField('email')}
            placeholder={t.placeholderEmail}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontWeight: 800 }}>{t.requestType}</label>
          <select
            value={form.requestType}
            onChange={setField('requestType')}
            disabled={optsLoading || reqTypeEmpty}
            style={selectStyle}
          >
            <option value="">{optsLoading ? t.loadingTypes : reqTypeEmpty ? t.noTypes : ''}</option>
            {reqTypeOpts.map((opt) => (
              <option key={opt} value={opt} style={{ color: '#000' }}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Change Type (optional) */}
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontWeight: 800 }}>{t.changeType}</label>
        <select
          value={form.changeType}
          onChange={setField('changeType')}
          disabled={optsLoading}
          style={selectStyle}
        >
          <option value="">{optsLoading ? t.loadingTypes : ''}</option>
          {changeTypeOpts.map((opt) => (
            <option key={opt} value={opt} style={{ color: '#000' }}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Row 4: Description */}
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontWeight: 800 }}>{t.description}</label>
        <textarea
          value={form.description}
          onChange={setField('description')}
          placeholder={t.placeholderDesc}
          style={{ ...inputStyle, minHeight: 140, resize: 'vertical', lineHeight: 1.35 }}
        />
      </div>

      {/* Submit + messages */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={busy || !form.email || !form.requestType || reqTypeEmpty}
          style={{
            background: '#2ea7c9',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '10px 16px',
            fontWeight: 800,
          }}
        >
          {busy ? '…' : t.submit}
        </button>

        {okMsg && <span style={{ color: '#22c55e', fontWeight: 700 }}>{okMsg}</span>}
        {errMsg && <span style={{ color: '#ef4444', fontWeight: 700 }}>{errMsg}</span>}
      </div>
    </form>
  );
}

const inputStyle = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  outline: 'none',
};
const selectStyle = { ...inputStyle };
