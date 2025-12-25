// lib/svc-mail.js
import nodemailer from 'nodemailer';

export function makeMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'no-reply@example.com';

  if (!host || !user || !pass) {
    return {
      async send(to, subject, text) {
        console.log('[email disabled]', { to, subject, text });
        return { ok: true, id: 'disabled' };
      },
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return {
    async send(to, subject, text) {
      const info = await transporter.sendMail({ from, to, subject, text });
      return { ok: true, id: info.messageId };
    },
  };
}

// Uses your /api/gptTranslation endpoint to translate subject/body keys
export async function translateEmail(lang, { subject, body }) {
  if (/^english$/i.test(lang)) return { subject, body };
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/gptTranslation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt:
          `Translate ONLY the following email into ${lang}. Return JSON with the same keys "subject" and "body".\n` +
          JSON.stringify({ subject, body }),
      }),
    });
    const j = await r.json().catch(() => ({}));
    const out =
      j?.translation && typeof j.translation === 'object'
        ? j.translation
        : typeof j === 'object'
          ? j
          : null;
    return out || { subject, body };
  } catch {
    return { subject, body };
  }
}
