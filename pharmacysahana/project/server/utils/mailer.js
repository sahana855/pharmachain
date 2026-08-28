// Email delivery for login OTPs. Configure Gmail (or SMTP) via .env.local.
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const EMAIL_RATE_LIMIT = parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '100', 10);
const emailTimestamps: number[] = [];

function checkEmailRateLimit() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  while (emailTimestamps.length > 0 && emailTimestamps[0] < oneHourAgo) {
    emailTimestamps.shift();
  }
  if (emailTimestamps.length >= EMAIL_RATE_LIMIT) {
    const retryAfter = Math.ceil((emailTimestamps[0] + 60 * 60 * 1000 - now) / 1000 / 60);
    const err = new Error(`Email rate limit reached (${EMAIL_RATE_LIMIT}/hour). Retry after ${retryAfter} minutes.`);
    (err as any).code = 'EMAIL_RATE_LIMITED';
    throw err;
  }
  emailTimestamps.push(now);
}

// Do NOT cache the transporter globally — a stale/failed connection would permanently
// block all future login attempts. Create a fresh transporter on every send instead.

function stripQuotes(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function getMailConfig() {
  return {
    host: stripQuotes(process.env.MAILER_HOST || env.MAILER_HOST),
    port: process.env.MAILER_PORT ? parseInt(process.env.MAILER_PORT, 10) : env.MAILER_PORT,
    user: stripQuotes(process.env.MAILER_USER || env.MAILER_USER),
    pass: stripQuotes(process.env.MAILER_PASS || env.MAILER_PASS).replace(/\s+/g, ''),
    secure: String(process.env.MAILER_SECURE || env.MAILER_SECURE || 'false').toLowerCase() === 'true',
    tlsRejectUnauthorized: String(
      process.env.MAILER_TLS_REJECT_UNAUTHORIZED ?? env.MAILER_TLS_REJECT_UNAUTHORIZED ?? 'true'
    ).toLowerCase() !== 'false',
    service: stripQuotes(process.env.MAILER_SERVICE || env.MAILER_SERVICE).toLowerCase(),
    from: stripQuotes(process.env.MAILER_FROM || env.MAILER_FROM),
  };
}

function createTransporter() {
  const cfg = getMailConfig();
  const fromFallback = cfg.user || `no-reply@${env.NODE_ENV === 'development' ? 'pharmachain.local' : 'pharmachain.example'}`;

  // When Gmail is the host, use nodemailer's built-in 'gmail' service shorthand.
  // This is more reliable than explicit host/port on Windows where antivirus can
  // intercept and reset TLS connections (causing ECONNRESET / ETIMEDOUT).
  const isGmail = cfg.host && cfg.host.toLowerCase().includes('gmail.com');
  if (isGmail && cfg.user && cfg.pass) {
    return {
      from: cfg.from || fromFallback,
      transport: nodemailer.createTransport({
        service: 'gmail',
        auth: { user: cfg.user, pass: cfg.pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        tls: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
      }),
    };
  }

  if (cfg.host && cfg.user && cfg.pass) {
    const resolvedPort = cfg.port || 587;
    const resolvedSecure = cfg.port === 465 || (cfg.secure && cfg.port !== 587);
    return {
      from: cfg.from || fromFallback,
      transport: nodemailer.createTransport({
        host: cfg.host,
        port: resolvedPort,
        secure: resolvedSecure,
        auth: { user: cfg.user, pass: cfg.pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        tls: {
          servername: cfg.host,
          rejectUnauthorized: cfg.tlsRejectUnauthorized,
        },
      }),
    };
  }

  const service = cfg.service || (cfg.user.toLowerCase().endsWith('@gmail.com') ? 'gmail' : '');
  if (cfg.user && cfg.pass && service) {
    return {
      from: cfg.from || `PharmaChain <${cfg.user}>`,
      transport: nodemailer.createTransport({
        service,
        auth: { user: cfg.user, pass: cfg.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
      }),
    };
  }

  return null;
}

function ensureTransporter() {
  // Always create a fresh transporter — never cache a failed connection permanently.
  const created = createTransporter();
  if (!created) {
    const err = new Error(
      'Email is not configured. Add MAILER_USER and MAILER_PASS (Gmail App Password) to .env.local, then restart the server.'
    );
    return { transporter: null, from: '', initError: err };
  }
  return { transporter: created.transport, from: created.from, initError: null };
}

export function verifyMailConfig() {
  const cfg = getMailConfig();
  const issues = [];
  if (!cfg.user) issues.push('MAILER_USER is missing');
  if (!cfg.pass) issues.push('MAILER_PASS is missing');
  if (!cfg.service && !cfg.host) issues.push('MAILER_SERVICE or MAILER_HOST is missing');
  if (cfg.host && (!cfg.port || cfg.port <= 0)) issues.push('MAILER_PORT is invalid');

  const created = createTransporter();
  if (!created && issues.length === 0) {
    issues.push('Could not create mail transporter with the provided configuration');
  }

  return {
    configured: created !== null,
    config: { ...cfg, pass: cfg.pass ? '***' : '' },
    issues,
  };
}

export function buildOtpEmail(otp, { resend = false } = {}) {
  const subject = resend ? 'Your PharmaChain login OTP (resend)' : 'Your PharmaChain login OTP';
  const text = `Your one-time login code is: ${otp}\nIt expires in 5 minutes. If you did not request this, you can ignore this email.`;
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:16px;">
      <h2 style="margin:0 0 8px;color:#1e293b;">PharmaChain</h2>
      <p style="margin:0 0 16px;color:#475569;">Use this code to finish signing in. It expires in 5 minutes.</p>
      <p style="font-size:28px;letter-spacing:8px;font-weight:700;color:#4f46e5;background:#fff;padding:16px;border-radius:12px;text-align:center;border:1px solid #e2e8f0;">${otp}</p>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">If you did not try to log in, you can ignore this email.</p>
    </div>
  `;
  return { subject, text, html };
}

export default async function sendMail({ to, subject, text, html }) {
  if (!to) throw new Error('sendMail: "to" address is required');

  checkEmailRateLimit();

  const { transporter: mailer, from, initError: setupError } = ensureTransporter();
  if (!mailer) {
    const err = setupError || new Error('Email transporter is not available');
    console.error('[Mailer] Transporter not initialized:', err.message);
    throw err;
  }

  const cfg = getMailConfig();
  const fromAddress = from || cfg.from || cfg.user;

  try {
    const result = await mailer.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    console.log(`[Mailer] OTP email sent to=${to} subject="${subject}" messageId=${result.messageId}`);
    return result;
  } catch (err) {
    console.error('[Mailer] Failed to send email:', {
      to,
      subject,
      error: err.message,
      code: err.code,
      response: err.response,
    });
    throw err;
  }
}
