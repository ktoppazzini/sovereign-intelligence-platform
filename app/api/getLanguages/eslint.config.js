// eslint.config.js
import js from '@eslint/js';
import jsx from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  {
    plugins: {
      react: jsx,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'react/react-in-jsx-scope': 'off', // Next.js doesn't require importing React
    },
  },
];
