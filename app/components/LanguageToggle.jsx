import React, { useEffect, useState } from 'react';
import i18n from '../i18n/i18n';

export default function LanguageToggle() {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    const langs = Object.keys(i18n.options.resources);
    setLanguages(langs);
  }, []);

  return (
    <select defaultValue={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
      {languages.map((lang) => (
        <option key={lang} value={lang}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
