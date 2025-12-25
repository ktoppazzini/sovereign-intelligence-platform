// lib/userStore.js
// Uses the airtable helper; exports both named and default.

import airtbl from './airtable';
const { readOneBy, update } = airtbl;

const USERS = 'Users';

function projectUser(rec) {
  if (!rec) return null;
  const f = rec.fields || {};
  return {
    id: rec.id,
    email: f.Email,
    phone: f.Phone,
    mfaTemp: f['MFA Temp'],
    mfaVerified: !!f['MFA Verified'],
    verificationCode: f.VerificationCode,
    codeExpiry: f['MFA Code Exp'],
  };
}

async function getUserByEmail(email /*, rid */) {
  const rec = await readOneBy(USERS, 'Email', email);
  return projectUser(rec);
}

// When sending code: set code + expiry and clear verified
async function setMfaCode(recordId, code, expiresIso /*, rid */) {
  return update(USERS, recordId, {
    VerificationCode: code,
    'MFA Code Exp': expiresIso,
    'MFA Verified': false,
  });
}

// When verifying successfully: consume code, mark verified
async function consumeMfa(recordId /*, rid */) {
  return update(USERS, recordId, {
    VerificationCode: '',
    'MFA Code Exp': 0,
    'MFA Verified': true,
  });
}

export { getUserByEmail, setMfaCode, consumeMfa };
export default { getUserByEmail, setMfaCode, consumeMfa };
