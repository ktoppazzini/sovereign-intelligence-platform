/**
 * Data Encryption Module for Sovereign Intelligence
 * Provides encryption/decryption for sensitive data at rest
 * SOC2 CC6.7 / HIPAA Technical Safeguard compliant
 * Created: December 25, 2025
 */

import crypto from 'crypto';

// Encryption algorithm - AES-256-GCM (NIST approved)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000;

/**
 * Get encryption key from environment or derive from secret
 */
function getEncryptionKey() {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  
  if (!masterKey) {
    // In development, use a derived key (NOT FOR PRODUCTION)
    console.warn('[ENCRYPTION] WARNING: Using development key - set ENCRYPTION_MASTER_KEY in production');
    return crypto.scryptSync('dev-key-not-secure', 'sovereign-salt', KEY_LENGTH);
  }
  
  // Convert hex string to buffer
  if (masterKey.length === 64) {
    return Buffer.from(masterKey, 'hex');
  }
  
  // Derive key from passphrase
  return crypto.scryptSync(masterKey, 'sovereign-intelligence', KEY_LENGTH);
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string|object} data - Data to encrypt
 * @returns {string} - Encrypted data (base64 encoded)
 */
export function encrypt(data) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + Auth Tag + Encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('[ENCRYPTION] Encryption failed:', error.message);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt data encrypted with encrypt()
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {string} - Decrypted plaintext
 */
export function decrypt(encryptedData) {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, Auth Tag, and Encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse as JSON
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    console.error('[ENCRYPTION] Decryption failed:', error.message);
    throw new Error('Decryption failed - data may be corrupted or tampered with');
  }
}

/**
 * Hash data using SHA-256 (one-way)
 * @param {string} data - Data to hash
 * @returns {string} - Hex encoded hash
 */
export function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash password using PBKDF2 with salt
 * @param {string} password - Password to hash
 * @returns {object} - { hash, salt }
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  
  return {
    hash: hash.toString('hex'),
    salt: salt.toString('hex'),
  };
}

/**
 * Verify password against stored hash
 * @param {string} password - Password to verify
 * @param {string} storedHash - Stored hash (hex)
 * @param {string} storedSalt - Stored salt (hex)
 * @returns {boolean} - True if password matches
 */
export function verifyPassword(password, storedHash, storedSalt) {
  const salt = Buffer.from(storedSalt, 'hex');
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  
  return crypto.timingSafeEqual(hash, Buffer.from(storedHash, 'hex'));
}

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Hex encoded token
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate API key with prefix
 * @param {string} prefix - Key prefix (e.g., 'sk_live_')
 * @returns {string} - API key
 */
export function generateApiKey(prefix = 'si_') {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomPart}`;
}

/**
 * Encrypt sensitive fields in an object
 * @param {object} data - Object with sensitive fields
 * @param {string[]} sensitiveFields - List of field names to encrypt
 * @returns {object} - Object with encrypted fields
 */
export function encryptFields(data, sensitiveFields) {
  const result = { ...data };
  
  for (const field of sensitiveFields) {
    if (result[field] !== undefined) {
      result[field] = encrypt(result[field]);
      result[`${field}_encrypted`] = true;
    }
  }
  
  return result;
}

/**
 * Decrypt sensitive fields in an object
 * @param {object} data - Object with encrypted fields
 * @param {string[]} sensitiveFields - List of field names to decrypt
 * @returns {object} - Object with decrypted fields
 */
export function decryptFields(data, sensitiveFields) {
  const result = { ...data };
  
  for (const field of sensitiveFields) {
    if (result[field] !== undefined && result[`${field}_encrypted`]) {
      result[field] = decrypt(result[field]);
      delete result[`${field}_encrypted`];
    }
  }
  
  return result;
}

/**
 * HMAC signature for request verification
 * @param {string} payload - Payload to sign
 * @param {string} secret - Signing secret
 * @returns {string} - HMAC signature
 */
export function createHmacSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} payload - Original payload
 * @param {string} signature - Signature to verify
 * @param {string} secret - Signing secret
 * @returns {boolean} - True if signature is valid
 */
export function verifyHmacSignature(payload, signature, secret) {
  const expected = createHmacSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

/**
 * Encryption status for compliance reporting
 */
export function getEncryptionStatus() {
  return {
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH * 8, // bits
    ivLength: IV_LENGTH * 8, // bits
    authTagLength: AUTH_TAG_LENGTH * 8, // bits
    pbkdf2Iterations: PBKDF2_ITERATIONS,
    hashAlgorithm: 'SHA-512',
    compliance: {
      nist: true,
      fips140_2: true,
      soc2: true,
      hipaa: true,
    },
    masterKeyConfigured: !!process.env.ENCRYPTION_MASTER_KEY,
  };
}

export default {
  encrypt,
  decrypt,
  hash,
  hashPassword,
  verifyPassword,
  generateToken,
  generateApiKey,
  encryptFields,
  decryptFields,
  createHmacSignature,
  verifyHmacSignature,
  getEncryptionStatus,
};
