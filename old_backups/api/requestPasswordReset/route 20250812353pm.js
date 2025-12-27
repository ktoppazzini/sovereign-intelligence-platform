import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * POST /api/requestPasswordReset
 * Body: { email: string, lang?: string }
 *
 * Sends a no-reply email with subject "Steps to reset your password"
 * and a link like: {APP_BASE_URL}/2FA/reset?token=...&email=...
 *
 * Configure these env vars:
 * - SMTP_HOST
 * - SMTP_PORT        (e.g., 587)
 * - SMTP_USER
 * - SMTP_PASS
 * - EMAIL_FROM       (optional, defaults to no-reply@sovereignintelligence.ai)
 * - APP_BASE_URL     (optional, defaults to http://localhost:3000)
 */

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    // Generate a reset token (store/verify in a later step when you add the reset page)
    const token = crypto.randomUUID();

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/2FA/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // Prepare mail transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // upgrade later with STARTTLS if supported
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.EMAIL_FROM || 'no-reply@sovereignintelligence.ai';
    const subject = 'Steps to reset your password';
    const text = [
      'You requested to reset your password.',
      `Go to this link and change your password: ${resetLink}`,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n');

    const html = `
      <p>You requested to reset your password.</p>
      <p><a href="${resetLink}">Go to this link</a> and change your password.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });

    // NOTE: In the next task, we can store {email, token, expiresAt} in Airtable or DB
    // and build /2FA/reset to verify + update the password.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('requestPasswordReset error:', err);
    return NextResponse.json({ error: 'Failed to send reset email.' }, { status: 500 });
  }
}
