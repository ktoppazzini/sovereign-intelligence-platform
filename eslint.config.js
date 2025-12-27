// eslint.config.js
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
    },
    rules: {
      semi: ['warn', 'always'], // Changed to warning
      quotes: ['warn', 'single'], // Changed to warning
      'react/react-in-jsx-scope': 'off', // Next.js doesn't require importing React
      'no-unused-vars': 'warn', // Changed to warning
      'no-empty': 'warn', // Changed to warning
      'no-undef': 'warn', // Changed to warning
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
