// app/api/send2FACode/route.js
import { NextResponse } from 'next/server';
import twilio from 'twilio';
import * as userStore from '@/lib/userStore';

function rid() {
  return Math.random().toString(36).slice(2, 8);
}

function normalizePlus(num) {
  if (!num) return '';
  const digits = String(num).replace(/[^\d]/g, '');
  return digits ? `+${digits}` : '';
}

export async function POST(req) {
  const r = rid();

  try {
    const { email, lang } = await req.json();
    console.log(`[send2FA ${r}] payload ->`, { email, lang });

    if (!email) {
      return NextResponse.json({ ok: false, reason: 'missing_email' }, { status: 400 });
    }

    // 1) Find user
    const user = await userStore.getUserByEmail(email, r);
    if (!user?.id) {
      return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 });
    }

    // 2) Normalize phone
    const to = normalizePlus(
      user.fields?.Phone || user.fields?.['A Phone'] || user.fields?.['MFA Phone'] || '',
    );
    if (!to) {
      return NextResponse.json({ ok: false, reason: 'no_phone' }, { status: 400 });
    }
    console.log(`[send2FA ${r}] to=${to}`);

    // 3) Generate + store code
    const ttlMin = Number(process.env.TWOFA_CODE_TTL_MINUTES ?? 10);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresIso = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();

    await userStore.set2FACode(user.id, code, expiresIso, r);
    console.log(`[send2FA ${r}] generated code + expiry:`, { code, expiresIso });

    // 4) Twilio (can be disabled)
    const twilioEnabled = String(process.env.TWILIO_ENABLED ?? 'true') !== 'false';

    // Accept common env name variants
    const ACC = process.env.TWILIO_ACCOUNT_SID || '';
    const TOK = process.env.TWILIO_AUTH_TOKEN || '';
    const MSGSID =
      process.env.TWILIO_MSG_SERVICE_SID ||
      process.env.TWILIO_MESSAGING_SID || // alias you used
      process.env.TWILIO_MESSSAGING_SID ||
      ''; // old/typo alias

    const FROM =
      process.env.TWILIO_FROM ||
      (process.env.TWILIO_PHONE_NUMBER ? normalizePlus(process.env.TWILIO_PHONE_NUMBER) : '');

    console.log(`[send2FA ${r}] twilio env present:`, {
      ACC: ACC ? 'yes' : 'no',
      TOK: TOK ? 'yes' : 'no',
      MSS: MSGSID ? 'yes' : 'no',
      FROM: FROM ? 'yes' : 'no',
      ENABLED: twilioEnabled ? 'yes' : 'no',
    });

    const body =
      (process.env.TWOFA_SENDER_NAME || 'Sovereign Intelligence') +
      `: Your verification code is ${code} (valid ${ttlMin}m).`;

    if (twilioEnabled) {
      if (!ACC || !TOK || (!MSGSID && !FROM)) {
        return NextResponse.json({ ok: false, reason: 'twilio_misconfigured' }, { status: 500 });
      }

      const client = twilio(ACC, TOK);

      try {
        const params = MSGSID
          ? { to, body, messagingServiceSid: MSGSID }
          : { to, body, from: FROM };

        const resp = await client.messages.create(params);
        console.log(`[send2FA ${r}] twilio sent sid=${resp.sid}`);
      } catch (twErr) {
        console.log(`[send2FA ${r}] twilio error`, {
          code: twErr?.code,
          status: twErr?.status,
          message: twErr?.message,
          moreInfo: twErr?.moreInfo,
        });
        return NextResponse.json({ ok: false, reason: 'twilio_error' }, { status: 502 });
      }
    } else {
      console.log(`[send2FA ${r}] TWILIO_ENABLED=false - skipping SMS. (code=${code})`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log(`[send2FA ${r}] unhandled`, err);
    return NextResponse.json({ ok: false, reason: 'server_error' }, { status: 500 });
  }
}
