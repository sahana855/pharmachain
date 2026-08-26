// PharmaChain API rate limiting
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Global API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP. Please try again later.' },
});

// Stricter limiter for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login/register attempts. Please try again later.' },
});

// QR verification limiter
export const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.VERIFY_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many verification scans. Please slow down.' },
});

