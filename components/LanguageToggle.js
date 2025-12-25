// File: components/LanguageToggle.js
'use client';

import React, { useEffect, useState } from 'react';
import i18n from '../i18n';

const LanguageToggle = () => {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    const allLanguages = Object.keys(i18n.options.resources || {});
    setLanguages(allLanguages);
  }, []);

  const handleChange = event => {
    const selectedLanguage = event.target.value;
    i18n.changeLanguage(selectedLanguage);
    localStorage.setItem('preferredLanguage', selectedLanguage);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <span role="img" aria-label="globe">
        🌐
      </span>{' '}
      <strong>Language:</strong>{' '}
      <select onChange={handleChange} defaultValue={i18n.language}>
        {languages.length > 0 ? (
          languages.map(lang => (
            <option key={lang} value={lang}>
              {lang.toUpperCase()}
            </option>
          ))
        ) : (
          <option>Loading...</option>
        )}
      </select>
    </div>
  );
};

export default LanguageToggle;
