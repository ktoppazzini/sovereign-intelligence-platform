'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n'; // ✅ FIXED: relative path

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    async function fetchLanguages() {
      try {
        const res = await fetch('/api/languages');
        const data = await res.json();
        setLanguages(data);
      } catch (err) {
        console.error('Failed to fetch languages:', err);
      }
    }

    fetchLanguages();
  }, []);

  const handleChange = async e => {
    const langCode = e.target.value;
    await i18n.changeLanguage(langCode);
  };

  return (
    <select
      className="px-3 py-2 rounded border border-gray-300 bg-white text-black dark:bg-black dark:text-white"
      onChange={handleChange}
      value={i18n.language}
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}
