// lib/verify2FAHandler.js
export default async function verify2FAHandler({ email, code, lang }) {
  try {
    const payload = { email, code, lang };
    console.log('POST /api/verify2FA', payload);

    const res = await fetch('/api/verify2FA', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Verification failed:', data.message);
      return { success: false, error: data.message || 'Verification failed' };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error verifying 2FA:', err);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
