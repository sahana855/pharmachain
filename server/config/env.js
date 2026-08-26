// PharmaChain backend environment configuration
// Loads .env.local (git-ignored) - never commit real secrets
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

// dotenv only loads .env by default - explicitly load .env.local too
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  // dotenv already loaded .env; load .env.local values (override)
  const parsed = {};
  for (const line of fs.readFileSync(envLocalPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    let value = trimmed.substring(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
    process.env[key] = value;
  }
}

function envStr(key, fallback = '') {
  const raw = process.env[key];
  if (raw == null || raw === '') return fallback;
  return String(raw).trim();
}

export const env = {
  PORT: parseInt(process.env.PORT || '41837', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PHARMACHAIN_MONGODB_URI: process.env.PHARMACHAIN_MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'pharmachain-dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
  BLOCKCHAIN_CONTRACT_ADDRESS: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '',
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  MAILER_HOST: envStr('MAILER_HOST'),
  MAILER_PORT: process.env.MAILER_PORT ? parseInt(process.env.MAILER_PORT, 10) : undefined,
  MAILER_USER: envStr('MAILER_USER'),
  MAILER_PASS: envStr('MAILER_PASS'),
  MAILER_SECURE: envStr('MAILER_SECURE', 'false'),
  MAILER_TLS_REJECT_UNAUTHORIZED: envStr('MAILER_TLS_REJECT_UNAUTHORIZED', 'true').toLowerCase() !== 'false',
  MAILER_SERVICE: envStr('MAILER_SERVICE'),
  MAILER_FROM: envStr('MAILER_FROM'),
  ALLOW_DEMO_LOGIN: envStr('ALLOW_DEMO_LOGIN', 'false').toLowerCase() === 'true',
  API_RATE_LIMIT_MAX: parseInt(process.env.API_RATE_LIMIT_MAX || '10000', 10),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10),
  VERIFY_RATE_LIMIT_MAX: parseInt(process.env.VERIFY_RATE_LIMIT_MAX || '20', 10),
};

