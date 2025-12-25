// Lightweight client-only MFA/session helper.
// Purpose: remember "MFA verified" + chosen language, with an expiry.
// Does NOT touch layout or styles. Purely state + tiny persistence.

const MFA_KEY = 'si_mfa_ok';
const EXP_KEY = 'si_mfa_exp';
const LANG_KEY = 'si_lang';

// Call after successful verification.
// ttlMin: how long you want the nav to stay unlocked on the client (default 2 hours).
export function setMfaOK(lang = 'English', ttlMin = 120) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const exp = now + ttlMin * 60 * 1000;
  try {
    localStorage.setItem(MFA_KEY, '1');
    localStorage.setItem(EXP_KEY, String(exp));
    if (lang) localStorage.setItem(LANG_KEY, lang);
  } catch {}
}

// Clears the local client flag (optional helper if you add a Sign Out later)
export function clearMfaOK() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(MFA_KEY);
    localStorage.removeItem(EXP_KEY);
  } catch {}
}

// Returns true if the client-side unlock is still valid.
// If expired, it auto-clears and returns false.
export function isMfaOK() {
  if (typeof window === 'undefined') return false;
  try {
    const ok = localStorage.getItem(MFA_KEY) === '1';
    const exp = Number(localStorage.getItem(EXP_KEY) || 0);
    if (!ok || !exp) return false;
    const now = Date.now();
    if (now > exp) {
      clearMfaOK();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Read the last selected language (falls back to English).
export function getLang(defaultLang = 'English') {
  if (typeof window === 'undefined') return defaultLang;
  try {
    return localStorage.getItem(LANG_KEY) || defaultLang;
  } catch {
    return defaultLang;
  }
}
