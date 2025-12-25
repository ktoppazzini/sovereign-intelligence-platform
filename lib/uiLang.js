// /lib/uiLang.js
export function readUiLangFromCookie(cookieHeader) {
  if (!cookieHeader) return 'en';

  // Server-side (next/headers cookies() Map-like)
  if (typeof cookieHeader.get === 'function') {
    return cookieHeader.get('ui_lang')?.value || 'en';
  }

  // Client-side (document.cookie string)
  const parts = String(cookieHeader).split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === 'ui_lang') return decodeURIComponent(v);
  }
  return 'en';
}
