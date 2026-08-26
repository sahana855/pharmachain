// PharmaChain QR code generation service
// Generates data-light QR codes that resolve to backend endpoints.
// Critical: QR contains ONLY a token - the backend resolves it. No sensitive data embedded.
//
// THREE separate QR systems:
//   MED  -> Medicine Authentication QR  (/verify/MED-XXX)
//   SHIP -> Shipment QR                 (/track/SHIP-XXX)
//   BOX  -> Transport Box QR            (/track/BOX-XXX)
import QRCode from 'qrcode';
import { generateQrToken } from '../utils/ids.js';
import { env } from '../config/env.js';

const BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${env.PORT}`;

/**
 * Generate a medicine QR token (starts with MED-)
 * Used for /verify/MED-XXX endpoints
 */
export function generateMedicineQrToken() {
  return generateQrToken('MED');
}

/**
 * Generate a shipment QR token (starts with SHIP-)
 * Used for /track/SHIP-XXX endpoints - fully separate from medicine QR
 */
export function generateShipmentQrToken() {
  return generateQrToken('SHIP');
}

/**
 * Generate a transport box QR token (starts with BOX-)
 * Used for /track/BOX-XXX endpoints - tracks the physical movement of a shipment box.
 * Completely separate from medicine/shipment QRs.
 */
export function generateBoxQrToken() {
  return generateQrToken('BOX');
}

/**
 * Build the endpoint URL for a medicine QR code.
 * Medicine QR -> /verify/MED-XXX
 */
export function getMedicineQrUrl(qrId) {
  if (!qrId) throw new Error('qrId is required');
  return `${BASE_URL}/verify/${qrId}`;
}

/**
 * Build the endpoint URL for a shipment QR code.
 * Shipment QR -> /track/SHIP-XXX (separate from medicine verify)
 */
export function getShipmentQrUrl(qrId) {
  if (!qrId) throw new Error('qrId is required');
  return `${BASE_URL}/track/${qrId}`;
}

/**
 * Build the endpoint URL for a transport box QR code.
 * Transport Box QR -> /track/BOX-XXX
 */
export function getBoxQrUrl(qrId) {
  if (!qrId) throw new Error('qrId is required');
  return `${BASE_URL}/track/${qrId}`;
}

/**
 * Generate a QR code image data URL (no data stored in QR - just the URL)
 * type: 'MED' | 'SHIP' | 'BOX'
 */
export async function generateQrDataUrl(qrId, type = 'MED') {
  const url = type === 'SHIP' ? getShipmentQrUrl(qrId) : type === 'BOX' ? getBoxQrUrl(qrId) : getMedicineQrUrl(qrId);
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: { dark: '#000000', light: '#ffffff' },
    });
    return { qrId, url, dataUrl };
  } catch (err) {
    console.error('QR generation error:', err);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Convenience: generate a transport box QR data URL
 */
export async function generateBoxQrDataUrl(boxId) {
  return generateQrDataUrl(boxId, 'BOX');
}

/**
 * Validate that a token is a well-formed medicine QR
 */
export function isMedicineQr(qrId) {
  return /^MED-[\w-]+$/i.test(qrId || '');
}

/**
 * Validate that a token is a well-formed shipment QR
 */
export function isShipmentQr(qrId) {
  return /^SHIP-[\w-]+$/i.test(qrId || '');
}

/**
 * Validate that a token is a well-formed transport box QR
 */
export function isBoxQr(qrId) {
  return /^BOX-[\w-]+$/i.test(qrId || '');
}

/**
 * Normalize arbitrary QR input into a clean MED-XXX / SHIP-XXX / BOX-XXX token (uppercase).
 * Handles raw tokens, verify/track URLs, legacy JSON payloads, and free text
 * such as "QR ID: MED-1RI0M297MSBEM679" copied from the UI.
 */
export function normalizeQrId(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  // URL like http://host/verify/MED-XXX or /track/SHIP-XXX or /track/BOX-XXX
  const urlMatch = trimmed.match(/(?:verify|track)\/([A-Za-z0-9-]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  // Legacy JSON payload
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.qrId) return String(parsed.qrId).toUpperCase();
    if (parsed.url) {
      const m = String(parsed.url).match(/(?:verify|track)\/([A-Za-z0-9-]+)/i);
      if (m) return m[1].toUpperCase();
    }
  } catch {}
  // Token anywhere in free text (e.g. "QR ID: MED-1RI0M297MSBEM679" or "BOX-8F32A91")
  const anyMatch = trimmed.match(/(?:MED|SHIP|BOX)-[A-Za-z0-9-]+/i);
  if (anyMatch) return anyMatch[0].toUpperCase();
  return '';
}

/**
 * Normalize arbitrary input into a clean BOX-XXX token (for transport box tracking).
 * Returns '' if the input is not a valid box QR.
 */
export function normalizeBoxId(input) {
  if (!input) return '';
  const normalized = normalizeQrId(input);
  if (normalized && isBoxQr(normalized)) return normalized;
  return '';
}

