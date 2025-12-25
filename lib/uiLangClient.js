// /lib/uiLangClient.js
export function getClientLang() {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(/(?:^|; )ui_lang=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : 'en';
}
