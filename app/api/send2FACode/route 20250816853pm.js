// /app/api/send2FACode/route.js
// Purpose: Generate a 6-digit 2FA code, store it + expiry in Airtable, and send an SMS
//          in the user's selected language (Afrikaans, Akan, Albanian, Amharic, Arabic;
//          English fallback). All other language templates are intentionally commented
//          out to reduce model/API usage per your cost controls.
//
// Debugging:
// - Every request is tagged with a short request id (rid) to correlate logs.
// - We log: payload envelope (sanitized), Airtable lookups/updates, computed expiry,
//   Twilio send outcome (SID/status) or Twilio error details.
// - On any error, we return JSON { ok:false, reason, detail } so the frontend can show
//   an actionable message instead of generic “success”.

import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Twilio client (only constructed if enabled)
let twilioClient = null;

// --- Env helpers -------------------------------------------------------------

function readEnv() {
  // Note: TWILIO_MESSSAGING_SID has 3x 'S' in your .env; also accept the normal key.
  const TWILIO_MESSAGING_SID =
    process.env.TWILIO_MESSAGING_SID || process.env.TWILIO_MESSSAGING_SID || '';

  return {
    // Feature toggle
    TWILIO_ENABLED: (process.env.TWILIO_ENABLED || 'true').toLowerCase() === 'true',

    // Twilio
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
    TWILIO_MESSAGING_SID,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',

    // Airtable
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || '',
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || '',
    AIRTABLE_USERS_TABLE_ID: process.env.AIRTABLE_USERS_TABLE_ID || '',
    AIRTABLE_USERS_TABLE: process.env.AIRTABLE_USERS_TABLE || 'Users',

    // Users table field names (from .env)
    F_EMAIL: process.env.AIRTABLE_USERS_EMAIL_FIELD || 'Email',
    F_PHONE: process.env.AIRTABLE_USER_PHONE_FIELD || 'Phone',
    F_CODE: process.env.AIRTABLE_USERS_MFA_CODE_FIELD || 'MFA Temp',
    F_EXPIRES: process.env.AIRTABLE_USERS_MFA_EXPIRES_FIELD || 'MFA Code Expiry',
    F_VERIFIED: process.env.AIRTABLE_USERS_MFA_VERIFIED_FIELD || 'MFA Verified',

    // Policy
    TTL_MIN: Number(process.env.TWOFA_CODE_TTL_MINUTES || 20),

    // Misc
    DEBUG_2FA: (process.env.DEBUG_2FA || 'true').toLowerCase() === 'true',
  };
}

function rid4() {
  // tiny readable request id for correlating logs
  return Math.random().toString(36).slice(2, 8);
}

function log(rid, ...args) {
  console.log('[send2FA', rid + ']', ...args);
}

// --- Airtable helpers --------------------------------------------------------

function makeUsersTable(env) {
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
    throw new Error('Airtable credentials missing (AIRTABLE_API_KEY / AIRTABLE_BASE_ID)');
  }
  const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
  const tableNameOrId = env.AIRTABLE_USERS_TABLE_ID || env.AIRTABLE_USERS_TABLE;
  return base(tableNameOrId);
}

async function findUserByEmail(usersTbl, env, email) {
  const emailNorm = (email || '').trim().toLowerCase();
  const formula = `LOWER({${env.F_EMAIL}}) = '${emailNorm.replace(/'/g, '\\\'')}'`;
  const records = await usersTbl.select({ maxRecords: 1, filterByFormula: formula }).firstPage();
  if (!records || !records.length) return null;
  return records[0];
}

async function updateUser(usersTbl, id, fields) {
  // Minimal retry-on-rate-limit could be added; for now a simple update
  return usersTbl.update([{ id, fields }]);
}

// --- Localization (active 5; others commented out for cost control) ----------

function localizedSms(lang, code, ttlMins) {
  const L = (lang || '').trim();

  // Actively supported:
  if (L === 'Afrikaans') {
    return `Jou Sovereign Intelligence verifikasiekode is ${code}. Dit verval oor ${ttlMins} minute.`;
  }
  if (L === 'Akan') {
    // Twi (simple)
    return `Wo Sovereign Intelligence nhyehyɛe kɔd yɛ ${code}. Ebetwa mu akyi mfeɛ ${ttlMins} miniti.`;
  }
  if (L === 'Albanian') {
    return `Kodi juaj i verifikimit të Sovereign Intelligence është ${code}. Skadon për ${ttlMins} minuta.`;
  }
  if (L === 'Amharic') {
    return `የ Sovereign Intelligence ማረጋገጫ ኮድዎ ${code} ነው። በ${ttlMins} ደቂቃ ውስጥ ይበቃል።`;
  }
  if (L === 'Arabic') {
    return `رمز التحقق الخاص بـ Sovereign Intelligence هو ${code}. ينتهي خلال ${ttlMins} دقيقة.`;
  }

  // Fallback (intentional to avoid model costs)
  return `Your Sovereign Intelligence verification code is ${code}. It expires in ${ttlMins} minutes.`;

  // --------------------------------------------------------------------------
  // The following templates are intentionally commented out to minimize usage
  // and keep the app operating only in the 5 approved languages. If/when you
  // want to re-enable more, just uncomment the relevant block and rebuild.
  //
  // if (L === 'French') {
  //   return `Votre code de vérification Sovereign Intelligence est ${code}. Il expire dans ${ttlMins} minutes.`;
  // }
  // if (L === 'Spanish') {
  //   return `Su código de verificación de Sovereign Intelligence es ${code}. Caduca en ${ttlMins} minutos.`;
  // }
  // if (L === 'Hindi') {
  //   return `आपका Sovereign Intelligence सत्यापन कोड ${code} है। यह ${ttlMins} मिनट में समाप्त हो जाएगा।`;
  // }
  // if (L === 'Swahili') {
  //   return `Nambari yako ya uthibitisho ya Sovereign Intelligence ni ${code}. Itaisha baada ya dakika ${ttlMins}.`;
  // }
}

// --- Twilio send -------------------------------------------------------------

async function sendSms(env, to, body, rid) {
  if (!env.TWILIO_ENABLED) {
    log(rid, 'Twilio disabled; skipping SMS send. Message:', body);
    return { mock: true, status: 'skipped' };
  }

  if (!twilioClient) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error('Missing Twilio credentials (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN).');
    }
    const twilio = (await import('twilio')).default;
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  const msgArgs = {
    to: to.startsWith('+') ? to : `+${to}`,
    body,
  };

  if (env.TWILIO_MESSAGING_SID) {
    msgArgs.messagingServiceSid = env.TWILIO_MESSAGING_SID;
  } else if (env.TWILIO_PHONE_NUMBER) {
    msgArgs.from = env.TWILIO_PHONE_NUMBER.startsWith('+')
      ? env.TWILIO_PHONE_NUMBER
      : `+${env.TWILIO_PHONE_NUMBER}`;
  } else {
    throw new Error('Provide either TWILIO_MESSAGING_SID or TWILIO_PHONE_NUMBER.');
  }

  const res = await twilioClient.messages.create(msgArgs);
  log(rid, 'Twilio response:', {
    sid: res.sid,
    status: res.status,
    to: res.to,
    from: res.from,
    dateCreated: res.dateCreated,
  });
  return { sid: res.sid, status: res.status };
}

// --- API route ---------------------------------------------------------------

export async function POST(req) {
  const env = readEnv();
  const rid = rid4();

  try {
    const json = await req.json().catch(() => ({}));
    const email = (json.email || '').trim();
    const lang = (json.lang || 'English').trim();

    log(rid, 'payload ->', { email, lang });

    if (!email) {
      return NextResponse.json(
        { ok: false, reason: 'bad_request', detail: 'email_required' },
        { status: 400 },
      );
    }

    // 1) Lookup user
    const usersTbl = makeUsersTable(env);
    const user = await findUserByEmail(usersTbl, env, email);
    if (!user) {
      log(rid, 'user not found for', email);
      return NextResponse.json(
        { ok: false, reason: 'not_found', detail: 'user_not_found' },
        { status: 404 },
      );
    }

    const phone = (user.get(env.F_PHONE) || '').toString().replace(/\D+/g, '');
    if (!phone) {
      log(rid, 'no phone on record');
      return NextResponse.json(
        { ok: false, reason: 'no_phone', detail: 'user_missing_phone' },
        { status: 409 },
      );
    }
    log(rid, 'Found phone:', phone);

    // 2) Generate code + expiry
    const code = ('' + Math.floor(100000 + Math.random() * 900000)).slice(0, 6);
    const now = new Date();
    const expires = new Date(now.getTime() + env.TTL_MIN * 60 * 1000); // now + TTL
    const expiresIso = expires.toISOString();
    log(rid, 'generated code + expiry:', { code, expiresIso });

    // 3) Persist to Airtable (store code and expiry, unset verified)
    await updateUser(usersTbl, user.id, {
      [env.F_CODE]: code,
      [env.F_EXPIRES]: expiresIso,
      [env.F_VERIFIED]: false,
    });
    log(rid, 'Airtable updated for user', user.id);

    // 4) Compose localized SMS and send (or skip if disabled)
    const smsBody = localizedSms(lang, code, env.TTL_MIN);
    let twilioResult = { status: 'skipped' };
    try {
      twilioResult = await sendSms(env, phone, smsBody, rid);
    } catch (twilioErr) {
      // Surface the Twilio error clearly to the client/UI
      log(rid, 'Twilio error', {
        name: twilioErr?.name,
        code: twilioErr?.code,
        message: twilioErr?.message,
        more: twilioErr?.moreInfo || null,
      });
      return NextResponse.json(
        {
          ok: false,
          reason: 'twilio_error',
          detail: {
            message: twilioErr?.message || 'twilio_failed',
            code: twilioErr?.code || null,
          },
        },
        { status: 502 },
      );
    }

    // 5) Done
    return NextResponse.json(
      {
        ok: true,
        reason: 'code_sent',
        data: { to: phone, twilioStatus: twilioResult.status },
      },
      { status: 200 },
    );
  } catch (err) {
    log(rid, 'fatal error', err?.message || err);
    return NextResponse.json(
      { ok: false, reason: 'server_error', detail: err?.message || 'unknown' },
      { status: 500 },
    );
  }
}
