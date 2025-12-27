// app/2FA/translation_page/page.js
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../../test_page/TestPage.module.css';

export default function TwoFASelectLanguage() {
  const router = useRouter();
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  // trimmed fallback list; easy to expand later
  const FALLBACK_207 = ['Afrikaans', 'Akan', 'Albanian', 'Amharic', 'Arabic'];

  useEffect(() => {
    let aborted = false;

    const fetchWithTimeout = async (url, ms = 6000) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort('timeout'), ms);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, data: json };
      } catch (e) {
        return { ok: false, error: e };
      } finally {
        clearTimeout(t);
      }
    };

    (async () => {
      setLoading(true);

      // 1) Ask API
      let res = await fetchWithTimeout('/api/getLanguages', 6000);

      // 2) Fallback if needed
      if (!res.ok || !Array.isArray(res.data?.languages) || !res.data.languages.length) {
        res = { ok: true, data: { languages: FALLBACK_207 } };
      }

      const list =
        res.ok && Array.isArray(res.data?.languages) && res.data.languages.length
          ? res.data.languages
          : FALLBACK_207;

      const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
      const sorted = [...new Set(list.map((s) => (s ?? '').toString().trim()))]
        .filter(Boolean)
        .sort(collator.compare);

      if (!aborted) {
        setLanguages(sorted);
        setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  const handleChange = (e) => {
    const lang = (e.target.value || 'English').trim();
    router.push(`/2FA/login?lang=${encodeURIComponent(lang)}`);
  };

  return (
    // ✅ give this page breathing room like the login page
    <div className={styles.container} style={{ paddingTop: '16px' }}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <h1 className={styles.title}>Sovereign Intelligence</h1>
          <Image
            src="/images/secure.png"
            alt="Sovereign Intelligence"
            width={300}
            height={300}
            className={styles.logo}
            priority
          />
        </div>

        <div className={styles.dropdownSection}>
          <label htmlFor="langSelect" className={styles.dropdownLabel}>
            Select a language:
          </label>

          {loading ? (
            <p className={styles.helperText}>Loading languages... this may take a few seconds.</p>
          ) : (
            <div className={styles.dropdown}>
              <select
                id="langSelect"
                className={styles.dropdownSelect}
                defaultValue=""
                onChange={handleChange}
                style={{ minWidth: '360px', padding: '0.6rem 0.8rem', fontSize: '1rem' }}
              >
                <option value="" disabled>
                  -- Choose a language --
                </option>
                {languages.map((name, i) => (
                  <option key={`${name}-${i}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
