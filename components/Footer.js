'use client';

import { useEffect, useState } from 'react';

export default function Footer({ lang = 'English' }) {
  const [t, setT] = useState({
    rights: 'All rights reserved.',
    poweredBy: 'Powered by',
  });

  useEffect(() => {
    const prompt = `Translate the following footer labels into ${lang}. Return only a raw JSON object:
{"rights":"All rights reserved.","poweredBy":"Powered by"}`;
    (async () => {
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.translation && typeof data.translation === 'object') {
          setT((prev) => ({ ...prev, ...data.translation }));
        }
      } catch {}
    })();
  }, [lang]);

  return (
    <footer className="border-t border-white/10 mt-12 py-6 text-sm opacity-90">
      <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between">
        <span>
          © {new Date().getFullYear()} Sovereign Intelligence™. {t.rights}
        </span>
        <span>{t.poweredBy} Sovereign OPS™</span>
      </div>
    </footer>
  );
}
