// PharmaChain QR routes - all verification decisions made on the backend
// Medicine QR -> /verify/MED-XXX  (authenticated + public lookup)
// Shipment QR -> /track/SHIP-XXX (Phase 4)
import express from 'express';
import Medicine from '../models/Medicine.js';
import MedicineVerification from '../models/MedicineVerification.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { isMedicineQr, generateQrDataUrl, normalizeQrId } from '../services/qrService.js';
import { verifyMedicineQr, saveVerification, VERDICT_LABELS } from '../services/verificationEngine.js';
import { recordTransaction } from '../services/blockchainService.js';

const router = express.Router();

/**
 * GET /api/qr/verify/:qrId
 * Public-safe lookup of a medicine QR (no sensitive data).
 * Returns full medicine details + scan history count + current color state.
 */
router.get('/verify/:qrId', async (req, res, next) => {
  try {
    const { qrId: rawQrId } = req.params;
    const qrId = normalizeQrId(rawQrId) || String(rawQrId || '').toUpperCase();

    // Validate token format
    if (!isMedicineQr(qrId)) {
      return res.status(400).json({
        success: false,
        verdict: 'RED',
        message: 'Invalid medicine QR code format',
        reasonCodes: ['INVALID_FORMAT'],
      });
    }

    const medicine = await Medicine.findOne({ qrCodeId: qrId });
    if (!medicine) {
      // Record failed lookup attempt for tamper evidence
      await recordTransaction('MEDICINE_VERIFIED', {
        medicineQrId: qrId,
        payload: { qrCodeId: qrId, verdict: 'RED', reason: 'QR_NOT_FOUND_IN_SYSTEM', time: new Date().toISOString() },
      });
      return res.status(404).json({
        success: false,
        verdict: 'RED',
        message: 'This QR code is not registered in PharmaChain. It may be counterfeit.',
        reasonCodes: ['QR_NOT_FOUND'],
      });
    }

    const prevScans = await MedicineVerification.countDocuments({ medicineId: medicine._id, qrCodeId: medicine.qrCodeId });

    res.json({
      success: true,
      qrId,
      medicine: {
        id: medicine._id,
        name: medicine.name,
        batchNumber: medicine.batchNumber,
        manufacturerName: medicine.manufacturerName,
        manufacturingDate: medicine.manufacturingDate,
        expiryDate: medicine.expiryDate,
        saltComposition: medicine.saltComposition,
        medicineType: medicine.medicineType,
        dataSource: medicine.dataSource,
        sourceReference: medicine.sourceReference,
        status: medicine.status,
      },
      scanCount: prevScans,
      colorState: Math.min(prevScans, 5),
      verificationUrl: `/verify/${medicine.qrCodeId}`,
      qrImage: (await generateQrDataUrl(medicine.qrCodeId, 'MED')).dataUrl,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/qr/verify
 * Perform a verification scan. Body: { qrId, location?, device?, geo? }
 * Authentication optional - public can verify, but logged-in entities get richer context.
 * All decision logic lives in verificationEngine.js.
 */
router.post('/verify', optionalAuthenticate, async (req, res, next) => {
  try {
    const { qrId: rawQrId, location, device, geo } = req.body;
    const qrId = normalizeQrId(rawQrId) || String(rawQrId || '').toUpperCase();

    if (!qrId || !isMedicineQr(qrId)) {
      return res.status(400).json({
        success: false,
        verdict: 'RED',
        message: 'Invalid medicine QR code. Please scan a valid PharmaChain QR.',
        reasonCodes: ['INVALID_FORMAT'],
      });
    }

    const medicine = await Medicine.findOne({ qrCodeId: qrId });
    if (!medicine) {
      await recordTransaction('MEDICINE_VERIFIED', {
        medicineQrId: qrId,
        payload: { qrCodeId: qrId, verdict: 'RED', reason: 'QR_NOT_FOUND', time: new Date().toISOString() },
      });
      return res.status(404).json({
        success: false,
        verdict: 'RED',
        message: 'This QR code is not registered in PharmaChain. It may be counterfeit.',
        reasonCodes: ['QR_NOT_FOUND'],
      });
    }

    // Optional auth context
    const scannedBy = req.user || null;

    // Run the verification engine (backend decision)
    const result = await verifyMedicineQr(medicine, {
      scannedById: scannedBy ? scannedBy.id : undefined,
      scannedByRole: scannedBy ? scannedBy.role : 'public',
      location,
      device,
      geo,
    });

    // Persist the verification event
    const verification = await saveVerification(medicine, result, {
      scannedById: scannedBy ? scannedBy.id : undefined,
      scannedByName: scannedBy ? scannedBy.name : '',
      scannedByRole: scannedBy ? scannedBy.role : 'public',
      location,
      device,
      geo,
    });

    res.json({
      success: result.verdict !== 'RED',
      verdict: result.verdict,
      verdictLabel: VERDICT_LABELS[result.verdict],
      reasonCodes: result.reasonCodes,
      colorState: result.colorState,
      scanNumber: result.scanNumber,
      chain: result.chain,
      verificationId: verification._id,
      medicine: {
        id: medicine._id,
        name: medicine.name,
        batchNumber: medicine.batchNumber,
        manufacturerName: medicine.manufacturerName,
        manufacturingDate: medicine.manufacturingDate,
        expiryDate: medicine.expiryDate,
        saltComposition: medicine.saltComposition,
        dataSource: medicine.dataSource,
        sourceReference: medicine.sourceReference,
        status: medicine.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/qr/verify/:qrId/history
 * Full verification history for a QR (authenticated).
 */
router.get('/verify/:qrId/history', authenticate, async (req, res, next) => {
  try {
    const { qrId } = req.params;
    const medicine = await Medicine.findOne({ qrCodeId: qrId });
    if (!medicine) {
      return res.status(404).json({ success: false, error: 'QR code not found' });
    }

    const history = await MedicineVerification.find({ medicineId: medicine._id, qrCodeId: medicine.qrCodeId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, qrId, count: history.length, history });
  } catch (err) {
    next(err);
  }
});

export default router;

