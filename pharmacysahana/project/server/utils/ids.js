// PharmaChain ID / token generation utilities
import crypto from 'crypto';

export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateId(prefix = '') {
  const rand = crypto.randomBytes(4).toString('base64url').substring(0, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix ? prefix + '-' : ''}${time}${rand}`;
}

export function generateOtp(length = 6) {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

export function generateQrToken(type = 'MED') {
  // High-entropy unique token for QR codes (no sensitive data embedded)
  const rand = crypto.randomBytes(6).toString('base64url').toUpperCase();
  return `${type}-${rand}`;
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

