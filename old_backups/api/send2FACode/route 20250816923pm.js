// app/api/send2FA/route.js
import { NextResponse } from 'next/server';
import * as userStore from '../../../lib/userStore.js';

export async function POST(req) {
  const rid = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim();
    const lang = (body.lang || 'en').trim();

    if (!email) {
      return NextResponse.json({ ok: false, error: 'email_required' }, { status: 400 });
    }

    // 1) Lookup
    const user = await userStore.getUserByEmail(email, rid);
    if (!user) {
      console.warn(`[send2FA ${rid}] user not found: ${email}`);
      return NextResponse.json({ ok: false, error: 'no_user' }, { status: 404 });
    }
    if (!user.phone) {
      console.warn(`[send2FA ${rid}] no phone on record for ${email}`);
      return NextResponse.json({ ok: false, error: 'no_phone' }, { status: 409 });
    }

    // 2) Generate code + expiry (10 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresIso = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3) Save on Airtable
    await userStore.set2FACode(user.id, code, expiresIso, rid);

    // 4) Send via Twilio if env present
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const tok = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM || null;
    const msgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID || null;

    if (sid && tok) {
      let to = user.phone.toString();
      // normalize: add '+' if missing and looks like E.164 int’l
      if (!to.startsWith('+') && /^\d{10,15}$/.test(to)) to = `+${to}`;
      // eslint-disable-next-line import/no-extraneous-dependencies
      const twilio = (await import('twilio')).default;
      const client = twilio(sid, tok);

      const bodyText =
        lang?.toLowerCase?.() === 'ar'
          ? `رمز التحقق الخاص بك هو: ${code} (صالح لمدة 10 دقائق)`
          : `Your verification code is ${code} (valid for 10 minutes).`;

      const sendPayload = msgSvc
        ? { to, messagingServiceSid: msgSvc, body: bodyText }
        : { to, from, body: bodyText };

      const r = await client.messages.create(sendPayload);
      console.log(`[send2FA ${rid}] Twilio message sid=${r.sid} status=${r.status}`);
    } else {
      console.log(`[send2FA ${rid}] Twilio not configured, skipping SMS. Code=${code}`);
    }

    const ms = Date.now() - t0;
    console.log(`[send2FA ${rid}] ok email=${email} ms=${ms}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[send2FA ${rid}] unhandled`, err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
