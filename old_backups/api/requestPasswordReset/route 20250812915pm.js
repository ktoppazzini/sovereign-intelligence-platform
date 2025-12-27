export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

function requiredEnv(keys) {
  const missing = [];
  const values = {};
  for (const k of keys) {
    const v = process.env[k];
    if (!v || String(v).trim() === '') missing.push(k);
    values[k] = v;
  }
  return { missing, values };
}

async function translateFields(baseUrl, lang, obj, timeoutMs = 6000) {
  if (!lang) return obj;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const safe = JSON.stringify(obj).replace(/\n/g, '\\n');
    const prompt = `Translate the following fields into ${lang}. Return ONLY a raw JSON object with the same keys.\n${safe}`;
    const res = await fetch(`${baseUrl}/api/gptTranslation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return obj;
    const json = await res.json().catch(() => ({}));
    const tr = json?.translation && typeof json.translation === 'object' ? json.translation : json;
    return { ...obj, ...tr };
  } catch {
    return obj;
  }
}

export async function POST(request) {
  try {
    const { email, lang } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const { missing, values: envs } = requiredEnv([
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'EMAIL_FROM',
      'APP_BASE_URL',
    ]);
    if (missing.length) {
      const errObj = await translateFields(
        envs.APP_BASE_URL,
        lang,
        {
          uiErrorMessage: 'Could not send reset email. Please try again.',
        },
        3000,
      );
      return NextResponse.json(
        {
          error: `Missing env var(s): ${missing.join(', ')}`,
          uiErrorMessage: errObj.uiErrorMessage,
        },
        { status: 500 },
      );
    }

    const token = crypto.randomUUID();
    const resetLink = `${envs.APP_BASE_URL}/2FA/reset?token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(email)}`;

    // Defaults (English)
    let subject = 'Steps to reset your password';
    let body = `Please click the link below to reset your password:\n${resetLink}`;
    let uiMessage = '📧 Check your email for steps to reset your password.';

    // Translate success texts
    ({ subject, body, uiMessage } = await translateFields(
      envs.APP_BASE_URL,
      lang,
      {
        subject,
        body: body.replace(/\n/g, '\\n'),
        uiMessage,
      },
      6000,
    ).then((o) => ({ ...o, body: o.body.replace(/\\n/g, '\n') })));

    // SMTP transport
    const port = Number(envs.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: envs.SMTP_HOST,
      port,
      secure: port === 465, // SSL on 465, STARTTLS on 587
      auth: { user: envs.SMTP_USER, pass: envs.SMTP_PASS },
      requireTLS: port === 587,
    });

    try {
      await transporter.verify();
    } catch (e) {
      console.error('SMTP verify failed:', e);
      const errObj = await translateFields(
        envs.APP_BASE_URL,
        lang,
        {
          uiErrorMessage: 'Could not send reset email. Please try again.',
        },
        3000,
      );
      return NextResponse.json(
        {
          error: 'SMTP connect/auth failed',
          code: e?.code || 'SMTP_ERROR',
          uiErrorMessage: errObj.uiErrorMessage,
        },
        { status: 500 },
      );
    }

    try {
      await transporter.sendMail({
        from: envs.EMAIL_FROM,
        to: email,
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
      });
    } catch (e) {
      console.error('SMTP sendMail failed:', e);
      const errObj = await translateFields(
        envs.APP_BASE_URL,
        lang,
        {
          uiErrorMessage: 'Could not send reset email. Please try again.',
        },
        3000,
      );
      return NextResponse.json(
        {
          error: 'SMTP send failed',
          code: e?.code || 'SMTP_SEND_ERROR',
          uiErrorMessage: errObj.uiErrorMessage,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, uiMessage });
  } catch (err) {
    console.error('requestPasswordReset error:', err);
    return NextResponse.json(
      {
        error: 'Failed to send reset email.',
        uiErrorMessage: 'Could not send reset email. Please try again.',
      },
      { status: 500 },
    );
  }
}
