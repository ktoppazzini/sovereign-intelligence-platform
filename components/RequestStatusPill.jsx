// components/RequestStatusPill.jsx
'use client';
export default function RequestStatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  const bg =
    s === 'received'
      ? '#334155'
      : s === 'in progress'
        ? '#2563eb'
        : s === 'on hold'
          ? '#f59e0b'
          : s === 'completed'
            ? '#22c55e'
            : s === 'closed'
              ? '#64748b'
              : '#475569';
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color: '#fff',
        padding: '6px 10px',
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {status || '—'}
    </span>
  );
}
