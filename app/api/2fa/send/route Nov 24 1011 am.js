import { NextResponse } from 'next/server';
import Twilio from 'twilio';

const baseUrl = 'https://api.airtable.com/v0';

function t(lang) {
  // Add more languages as needed
  const m = {
    en: {
      codeSentBanner: '✅ Request sent — check your text messages.',
      sms: 'Your verification code is: {{code}}. It expires in 20 minutes.',
      noUser: 'No user found for that email.',
      noPhone: 'No phone number on file for this user.',
      badCreds: 'Invalid email or password.',
      serverErr: 'Unexpected error. Please try again.',
    },
    ar: {
      codeSentBanner: '✅ تم إرسال الطلب — يرجى التحقق من رسائلك النصية.',
      sms: 'رمز التحقق الخاص بك: {{code}}. ينتهي خلال 20 دقيقة.',
      noUser: 'لا يوجد مستخدم بهذا البريد الإلكتروني.',
      noPhone: 'لا يوجد رقم هاتف لهذا المستخدم.',
      badCreds: 'بريد إلكتروني أو كلمة مرور غير صحيحة.',
      serverErr: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    },
    sq: {
      codeSentBanner: '✅ Kërkesa u dërgua — kontrolloni mesazhet tuaja.',
      sms: 'Kodi juaj i verifikimit është: {{code}}. Skadon për 20 minuta.',
      noUser: 'Nuk u gjet përdorues për këtë email.',
      noPhone: 'Nuk ka numër telefoni për këtë përdorues.',
      badCreds: 'Email ose fjalëkalim i pavlefshëm.',
      serverErr: 'Gabim i papritur. Ju lutemi provoni përsëri.',
    },
  };
  return m[lang] || m.en;
}

export async function POST(req) {
  try {
    const { email, password, lang = 'en' } = await req.json();
    const M = t(lang);

    // 1) Pull user from Airtable Users
    const usersRes = await fetch(
      `${baseUrl}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_USERS_TABLE_ID)}?filterByFormula=${encodeURIComponent(`{Email} = '${email}'`)}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` } },
    );
    const users = await usersRes.json();

    if (!users.records?.length) {
      return NextResponse.json({ ok: false, message: M.noUser }, { status: 404 });
    }
    const user = users.records[0].fields;

    if (String(user.Password || '') !== String(password || '')) {
      return NextResponse.json({ ok: false, message: M.badCreds }, { status: 401 });
    }

    const phone = String(user.Phone || '').trim();
    if (!phone) {
      return NextResponse.json({ ok: false, message: M.noPhone }, { status: 400 });
    }

    // 2) Generate and store code in Airtable Verification
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    await fetch(
      `${baseUrl}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_VERIFICATION_TABLE)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Email: email,
                VerificationCode: code,
                CodeExpiry: expiresAt,
                Attempts: 0,
              },
            },
          ],
        }),
      },
    );

    // 3) Send SMS (localized body)
    const client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const body = M.sms.replace('{{code}}', code);

    await client.messages.create({
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      body,
    });

    return NextResponse.json({ ok: true, message: M.codeSentBanner });
  } catch (err) {
    console.error('send2FACode error:', err);
    return NextResponse.json({ ok: false, message: t('en').serverErr }, { status: 500 });
  }
}
