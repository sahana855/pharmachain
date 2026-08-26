// PharmaChain verification engine
// All QR verification decisions are made HERE on the backend (never on the client).
// Outcome logic:
//   GREEN  - Original authentic product, never scanned before (first verification)
//   BLUE   - Authentic, previously scanned by the SAME verified entity (safe repeat check)
//   ORANGE - Authentic but flagged: >3 scans, same scanner repeating, or near-expiry
//   RED    - NOT authentic / recalled / expired / tampered / not found in system
import Medicine from '../models/Medicine.js';
import MedicineVerification from '../models/MedicineVerification.js';
import { recordTransaction } from './blockchainService.js';

export const VERDICT = {
  GREEN: 'GREEN',
  BLUE: 'BLUE',
  ORANGE: 'ORANGE',
  RED: 'RED',
};

export const VERDICT_LABELS = {
  GREEN: 'Original — First verified scan',
  BLUE: 'Authentic — Previously verified by same entity',
  ORANGE: 'Caution — Authentic but flagged (repeat scans / near expiry)',
  RED: 'NOT VERIFIED — counterfeit / recalled / expired / tampered',
};

/**
 * Decide the verification verdict for a medicine QR code.
 * @param {object} medicine - Medicine document
 * @param {object} opts - { scannedById, scannedByRole, location, device, geo }
 * @returns {Promise<{verdict, colorState, scanNumber, reasonCodes, previousScan, chain}>}
 */
export async function verifyMedicineQr(medicine, opts = {}) {
  const now = new Date();
  const reasons = [];
  const { scannedById, scannedByRole } = opts;

  // ---- Failure conditions first (RED) ----
  const recalled = medicine.status === 'recalled';
  const expired = medicine.expiryDate && new Date(medicine.expiryDate) < now;
  const discontinued = medicine.status === 'discontinued';

  // Look up previous verifications for this QR
  const prevScans = await MedicineVerification.find({ medicineId: medicine._id, qrCodeId: medicine.qrCodeId })
    .sort({ createdAt: -1 });

  const scanCount = prevScans.length;
  const lastScan = prevScans[0] || null;
  const colorState = Math.min(scanCount, 5);

  // Determine chain record payload
  const chainPayload = {
    qrCodeId: medicine.qrCodeId,
    medicineId: String(medicine._id),
    medicineName: medicine.name,
    batchNumber: medicine.batchNumber,
    verdict: null,
    scannedByRole: scannedByRole || 'public',
    time: now.toISOString(),
  };

  if (recalled || discontinued) {
    reasons.push(recalled ? 'RECALLED_BY_MANUFACTURER' : 'DISCONTINUED');
    chainPayload.verdict = VERDICT.RED;
    const chain = await recordTransaction('MEDICINE_VERIFIED', {
      medicineId: String(medicine._id),
      medicineQrId: medicine.qrCodeId,
      userId: scannedById || undefined,
      payload: chainPayload,
    });
    return { verdict: VERDICT.RED, colorState, scanNumber: scanCount + 1, reasonCodes: reasons, previousScan: lastScan, chain };
  }

  if (expired) {
    reasons.push('EXPIRED');
    chainPayload.verdict = VERDICT.RED;
    const chain = await recordTransaction('MEDICINE_VERIFIED', {
      medicineId: String(medicine._id),
      medicineQrId: medicine.qrCodeId,
      userId: scannedById || undefined,
      payload: chainPayload,
    });
    return { verdict: VERDICT.RED, colorState, scanNumber: scanCount + 1, reasonCodes: reasons, previousScan: lastScan, chain };
  }

  // ---- Not found in catalog - already handled at route level (RED: NOT_FOUND) ----

  // ---- Safe repeat detection ----
  const isRepeatBySame = lastScan && lastScan.scannedById && lastScan.scannedById.toString() === (scannedById || '').toString();

  // ---- Verdict decision ----
  let verdict = VERDICT.GREEN;

  if (scanCount === 0) {
    verdict = VERDICT.GREEN; // First-ever scan = original
  } else if (isRepeatBySame) {
    verdict = VERDICT.BLUE; // Same entity verifying again = safe repeat
    reasons.push('REPEAT_SCAN_BY_SAME_ENTITY');
  } else if (scanCount >= 3) {
    verdict = VERDICT.ORANGE; // High scan count
    reasons.push('HIGH_SCAN_COUNT');
  } else if (scanCount >= 1) {
    // Multiple different entities scanning = suspicious but not conclusive
    verdict = VERDICT.ORANGE;
    reasons.push('MULTIPLE_DIFFERENT_SCANNERS');
  }

  // Near-expiry caution (within 3 months)
  const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
  if (medicine.expiryDate && new Date(medicine.expiryDate) <= threeMonths) {
    reasons.push('NEAR_EXPIRY');
    if (verdict === VERDICT.GREEN || verdict === VERDICT.BLUE) {
      verdict = VERDICT.ORANGE;
    }
  }

  chainPayload.verdict = verdict;
  const chain = await recordTransaction('MEDICINE_VERIFIED', {
    medicineId: String(medicine._id),
    medicineQrId: medicine.qrCodeId,
    userId: scannedById || undefined,
    payload: chainPayload,
  });

  return {
    verdict,
    colorState,
    scanNumber: scanCount + 1,
    reasonCodes: reasons,
    previousScan: lastScan,
    chain,
  };
}

/**
 * Record a verification event in DB (called by route after verifyMedicineQr)
 */
export async function saveVerification(medicine, result, opts = {}) {
  const { scannedById, scannedByName, scannedByRole, location, device, geo } = opts;
  const doc = await MedicineVerification.create({
    medicineId: medicine._id,
    qrCodeId: medicine.qrCodeId,
    scannedById: scannedById || undefined,
    scannedByName: scannedByName || '',
    scannedByRole: scannedByRole || 'public',
    result: result.verdict,
    reasonCodes: result.reasonCodes,
    colorState: result.colorState,
    scanNumber: result.scanNumber,
    location,
    geo,
    device,
    chainHash: result.chain?.txHash,
    chainProvider: result.chain?.chainType || 'none',
  });

  return doc;
}

