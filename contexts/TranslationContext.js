'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await axios.post('/api/chatgpt-translate', {
          language,
        });
        setTranslations(response.data.translations);
      } catch (error) {
        console.error('Translation error:', error);
      }
    };

    fetchTranslations();
  }, [language]);

  return (
    <TranslationContext.Provider value={{ translations, language, setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslations = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationProvider');
  }
  return context;
};
