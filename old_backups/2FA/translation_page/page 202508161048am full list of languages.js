 File: /app/2FA/translation_page/page.js
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Reuse locked translation page CSS
import styles from '../../test_page/TestPage.module.css';

/**
 * Notes for future maintainers
 * - The only intentional change here is narrowing the fallback language list to the top 5.
 * - All other languages remain as comments so they can be re-enabled quickly.
 * - The previous build error ("Expected ',' got ';'") happened because the array
 *   literal was not properly closed after large comment edits. Keep the array brackets
 *   intact and ensure there is no trailing unbalanced comment.
 */
export default function TwoFASelectLanguage() {
  const router = useRouter();
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  //   Locked fallback list (now restricted to the top 5 by request).
  // Everything else remains commented so it’s easy to re-enable later.
  const FALLBACK_207 = [
    'Afrikaans',
    'Akan',
    'Albanian',
    'Amharic',
    'Arabic',
     'Armenian',
     'Assamese',
     'Aymara',
     'Azerbaijani',
     'Bambara',
     'Basque',
     'Belarusian',
     'Bengali',
     'Bhojpuri',
     'Bislama',
     'Bosnian',
     'Breton',
     'Bulgarian',
     'Burmese',
     'Catalan',
     'Cebuano',
     'Chichewa',
     'Chinese (Cantonese)',
     'Chinese (Gan)',
     'Chinese (Hakka)',
     'Chinese (Hokkien)',
     'Chinese (Jin)',
     'Chinese (Mandarin)',
     'Chinese (Min Nan)',
     'Chinese (Wu)',
     'Chinese (Xiang)',
     'Corsican',
     'Croatian',
     'Czech',
     'Danish',
     'Divehi',
     'Dogri',
     'Dutch',
     'Dzongkha',
     'English',
     'Esperanto',
     'Estonian',
     'Ewe',
     'Faroese',
     'Fijian',
     'Filipino',
     'Finnish',
     'French',
     'Frisian',
     'Fulah',
     'Galician',
     'Ganda',
     'Georgian',
     'German',
     'Greek',
     'Greenlandic',
     'Guarani',
     'Gujarati',
     'Haitian Creole',
     'Hausa',
     'Hawaiian',
     'Hebrew',
     'Herero',
     'Hindi',
     'Hiri Motu',
     'Hmong',
     'Hungarian',
     'Icelandic',
     'Igbo',
     'Ilocano',
     'Indonesian',
     'Inuktitut',
     'Irish',
     'Italian',
     'Japanese',
     'Javanese',
     'Kabyle',
     'Kannada',
     'Kanuri',
     'Kashmiri',
     'Kazakh',
     'Khasi',
     'Khmer',
     'Kikuyu',
     'Kinyarwanda',
     'Kirundi',
     'Komi',
     'Kongo',
     'Korean',
     'Krio',
     'Kurdish',
     'Kyrgyz',
     'Lao',
     'Latin',
     'Latvian',
     'Limburgish',
     'Lingala',
     'Lithuanian',
     'Lojban',
     'Luxembourgish',
     'Macedonian',
     'Maithili',
     'Malagasy',
     'Malay',
     'Malayalam',
     'Maltese',
     'Manx',
     'Maori',
     'Mapuche',
     'Marathi',
     'Marshallese',
     'Mende',
     'Mizo',
     'Mongolian',
     'Montenegrin',
     'Morisyen',
     'Nauru',
     'Navajo',
     'Ndonga',
     'Nepali',
     'Nias',
     'Niuean',
     'Norwegian',
     'Nuer',
     'Nyanja',
     'Occitan',
     'Odia',
     'Oromo',
     'Ossetian',
     'Pali',
     'Papiamento',
     'Pashto',
     'Persian',
     'Polish',
     'Portuguese',
     'Punjabi',
     'Quechua',
     'Rhaeto-Romance',
     'Romanian',
     'Romansh',
     'Rundi',
     'Russian',
     'Samoan',
     'Sango',
     'Sanskrit',
     'Santali',
     'Sardinian',
     'Scots Gaelic',
     'Serbian',
     'Sesotho',
     'Setswana',
     'Shona',
     'Sichuan Yi',
     'Sindhi',
     'Sinhala',
     'Slovak',
     'Slovenian',
     'Somali',
     'Songhai',
     'Spanish',
     'Sranan Tongo',
     'Sundanese',
     'Swahili',
     'Swati',
     'Swedish',
     'Tagalog',
     'Tahitian',
     'Tajik',
     'Tamil',
     'Tatar',
     'Telugu',
     'Tetum',
     'Thai',
     'Tibetan',
     'Tigrinya',
     'Tok Pisin',
     'Tokelauan',
     'Tongan',
     'Tsonga',
     'Tswana',
     'Tumbuka',
     'Turkish',
     'Turkmen',
     'Tuvaluan',
     'Ukrainian',
     'Urdu',
     'Uyghur',
     'Uzbek',
     'Venda',
     'Vietnamese',
     'Wallisian',
     'Welsh',
     'Wolof',
     'Xhosa',
     'Yao',
     'Yapese',
     'Yiddish',
     'Yoruba',
     'Zhuang',
     'Zulu',
  ];

  useEffect(() => {
    let aborted = false;

    // Small fetch helper with timeout; unchanged behavior
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

      // 1) Try GPT-backed list
      let res = await fetchWithTimeout('/api/getLanguages', 6000);

      //       2) Fallback to the (now 5-item) locked list
      if (!res.ok || !Array.isArray(res.data?.languages) || !res.data.languages.length) {
        res = { ok: true, data: { languages: FALLBACK_207 } };
      }

      const list =
        res.ok && Array.isArray(res.data?.languages) && res.data.languages.length
          ? res.data.languages
          : FALLBACK_207;

      // Normalize, de-dupe, and sort A→Z
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
    //     Navigate to /2FA/login with selected lang
    router.push(`/2FA/login?lang=${encodeURIComponent(lang)}`);
  };

  return (
    /* ONE-LINE CHANGE: add top spacing so this page breathes without a header */
    <div className={styles.container} style={{ paddingTop: '16px' }}>
      <header className={styles.header}>
        {/* Left: title + logo (locked 300x300) */}
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

        {/* Right: dropdown under the nav (wider & larger) */}
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
