// /components/LanguagePicker.jsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

// Only the 5 test languages are visible here.
const LANGS = [
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
];

export default function LanguagePicker({ current }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function setLang(code) {
    await fetch('/api/lang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: code }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          disabled={isPending || l.code === current}
          style={{
            padding: '6px 10px',
            border: '1px solid #ddd',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          {l.label}
          {l.code === current ? ' ✓' : ''}
        </button>
      ))}
    </div>
  );
}
