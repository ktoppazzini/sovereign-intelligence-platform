// 1) Shared validator (client)
const validPassword = (p) =>
  typeof p === 'string' &&
  p.length >= 8 &&
  /[A-Za-z]/.test(p) && // letter
  /\d/.test(p) && // number
  /[^A-Za-z0-9]/.test(p); // symbol

// 2) Fallback translations (used if GPT call times out)
const FALLBACK_T = {
  title: 'Reset Your Password',
  emailLabel: 'Email:',
  newPasswordLabel: 'New Password',
  newPasswordHelp: 'Minimum 8 characters and include letters, numbers, and a symbol.',
  confirmPasswordLabel: 'Confirm your password',
  submit: 'Submit',
  success: '✅ Password successfully changed.',
  errorGeneric: 'Could not reset password. Please try again.',
  mismatch: 'Passwords do not match. Please try again.',
  weak: 'Password must be at least 8 characters and include letters, numbers, and a symbol.',
};

// 3) Get lang from URL and request translations (you already have this pattern)
const searchParams = useSearchParams();
const lang = searchParams.get('lang') || process.env.DEFAULT_LOCALE || 'en';

// … call /api/gptTranslation with the keys above and merge into `t`
// const t = await fetch('/api/gptTranslation', { … }).then(r => r.json()).catch(() => FALLBACK_T);
// For safety: const t = { ...FALLBACK_T, ...translatedFromApi }

function onSubmit(e) {
  e.preventDefault();
  if (pwd !== confirmPwd) {
    setMsg({ type: 'error', text: t.mismatch });
    return;
  }
  if (!validPassword(pwd)) {
    setMsg({ type: 'error', text: t.weak });
    return;
  }

  // POST to API; include lang for server-side messages if you like
  fetch('/api/performPasswordReset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, newPassword: pwd, lang }),
  })
    .then((r) => r.json())
    .then(({ ok, message }) => {
      setMsg({ type: ok ? 'success' : 'error', text: ok ? t.success : message || t.errorGeneric });
      if (ok) setTimeout(() => router.push(`/2FA/login?lang=${encodeURIComponent(lang)}`), 1200);
    })
    .catch(() => setMsg({ type: 'error', text: t.errorGeneric }));
}
