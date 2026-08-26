// PharmaChain ID / token generation utilities

export function generateId(prefix = '') {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix ? prefix + '-' : ''}${time}${rand}`;
}

export function generateOtp(length = 6) {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

export function generateQrToken(type = 'MED') {
  // High-entropy unique token for QR codes (no sensitive data embedded)
  const rand = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  return `${type}-${rand.toUpperCase()}`;
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

