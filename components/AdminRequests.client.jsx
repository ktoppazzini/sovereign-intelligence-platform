// components/AdminRequests.client.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const LABELS = {
  number: 'Request #',
  name: 'Name',
  dept: 'Department',
  type: 'Type',
  status: 'Status',
  created: 'Created',
  resolution: 'Resolution',
  update: 'Update',
  open: 'Open',
  onHoldReason: 'On hold reason',
};

const STATUSES = ['received', 'in progress', 'on hold', 'completed', 'closed'];

export default function AdminRequests({ lang = 'English' }) {
  const [t, setT] = useState(LABELS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const rtl = useMemo(
    () =>
      ['arabic', 'hebrew', 'urdu', 'persian', 'farsi'].some((x) => lang.toLowerCase().includes(x)),
    [lang],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch('/api/requests?limit=200&debug=1', { cache: 'no-store' });
      const j = await r.json().catch(() => []);
      setRows(Array.isArray(j?.records) ? j.records : Array.isArray(j) ? j : []);
      setLoading(false);
    })();
  }, []);

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
              '. Return JSON with same keys:\n' +
              JSON.stringify(LABELS),
          }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        const obj =
          j?.translation && typeof j.translation === 'object'
            ? j.translation
            : typeof j === 'object'
              ? j
              : null;
        if (obj) setT((prev) => ({ ...prev, ...obj }));
      } catch {}
    })();
    return () => ctrl.abort();
  }, [lang]);

  async function updateRow(id, patch) {
    const r = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) return;
    const j = await r.json().catch(() => ({}));
    // refresh
    const rr = await fetch('/api/requests?limit=200', { cache: 'no-store' });
    const jj = await rr.json().catch(() => []);
    setRows(Array.isArray(jj?.records) ? jj.records : Array.isArray(jj) ? jj : []);
  }

  if (loading) return <div style={{ opacity: 0.8 }}>Loading…</div>;

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {[t.number, t.name, t.dept, t.type, t.status, t.created, t.resolution, ''].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: 8,
                  borderBottom: '1px solid rgba(255,255,255,.15)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const f = r.fields || {};
            const id = r.id;
            return (
              <tr key={id}>
                <td style={{ padding: 8 }}>{f.number || f['Request Number'] || f.reqno || ''}</td>
                <td style={{ padding: 8 }}>{f.name || f['Requester Name'] || ''}</td>
                <td style={{ padding: 8 }}>{f.department || f['Department'] || ''}</td>
                <td style={{ padding: 8 }}>{f['Request Type'] || f.type || ''}</td>
                <td style={{ padding: 8 }}>
                  <select
                    value={(f.status || f.Status || 'received').toLowerCase()}
                    onChange={(e) => {
                      const status = e.target.value;
                      updateRow(id, { status });
                    }}
                    style={{ padding: 6, borderRadius: 8 }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 8 }}>{f['Created At'] || f.created || ''}</td>
                <td style={{ padding: 8 }}>
                  <input
                    style={{ width: 280, padding: 6, borderRadius: 8 }}
                    defaultValue={f['Resolution'] || f.resolution || ''}
                    onBlur={(e) => updateRow(id, { resolution: e.target.value })}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <Link
                    href={`/requests/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`}
                    style={{ color: '#fff', textDecoration: 'underline' }}
                  >
                    {t.open}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
        * Setting status to <b>completed</b> sends a translated resolution email to the requester.
      </div>
    </div>
  );
}
