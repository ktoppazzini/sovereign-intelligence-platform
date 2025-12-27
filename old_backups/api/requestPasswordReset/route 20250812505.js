import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * POST /api/requestPasswordReset
 * Body: { email: string, lang?: string }
 * - Translates subject/body to the provided language (via /api/gptTranslation, 6s timeout)
 * - Sends from no-reply using SMTP (nodemailer)
 *
 * ENV:
 *  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *  EMAIL_FROM (default: no-reply@sovereignintelligence.ai)
 *  APP_BASE_URL (default: http://localhost:3000)
 */
export async function POST(request) {
  try {
    const { email, lang } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/2FA/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // Defaults (English)
    let subject = 'Steps to reset your password';
    let body = `Please click the link below to reset your password:\n${resetLink}`;

    // Translate via internal GPT route with 6s timeout
    if (lang && typeof lang === 'string') {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 6000);

        const prompt = `Translate the following fields into ${lang}. Return ONLY a raw JSON object with the same keys.
{"subject":"${subject.replace(/"/g, '\\"')}","body":"${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}`;

        const gptRes = await fetch(`${baseUrl}/api/gptTranslation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
        clearTimeout(t);

        if (gptRes.ok) {
          const json = await gptRes.json().catch(() => ({}));
          const obj =
            json?.translation && typeof json.translation === 'object' ? json.translation : json;
          if (obj?.subject && obj?.body) {
            subject = String(obj.subject);
            body = String(obj.body).replace(/\\n/g, '\n');
          }
        }
      } catch {
        // timeout/failure -> keep English
      }
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const from = process.env.EMAIL_FROM || 'no-reply@sovereignintelligence.ai';

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    });

    // (next task) store {email, token, expiresAt} and build /2FA/reset
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('requestPasswordReset error:', err);
    return NextResponse.json({ error: 'Failed to send reset email.' }, { status: 500 });
  }
}
