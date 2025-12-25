// app/defense/DefenseAppSyncWire.client.jsx
'use client';
import { useEffect } from 'react';

// Binds a test to any button containing "AppSync Ping"
export default function DefenseAppSyncWire() {
  useEffect(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      /AppSync Ping/i.test(b.textContent || ''),
    );
    if (!btn || btn.__siPingBound) return;
    btn.__siPingBound = true;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const query = `query Ping { __typename }`;
      try {
        const res = await fetch('/api/appsync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.errors?.[0]?.message || 'AppSync error');
        alert('AppSync OK ✓');
      } catch (err) {
        alert('AppSync error: ' + (err?.message || err));
        console.error('[defense][appsync] error', err);
      }
    });

    return () => {
      if (btn) btn.__siPingBound = false;
    };
  }, []);
  return null;
}
