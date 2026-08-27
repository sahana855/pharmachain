// PharmaChain medicines routes - manufacturer registers medicines with unique QR tokens
import express from 'express';
import Medicine from '../models/Medicine.js';
import MedicineCatalog from '../models/MedicineCatalog.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, requireVerified } from '../middleware/role.js';
import { generateMedicineQrToken, generateQrDataUrl, getMedicineQrUrl } from '../services/qrService.js';
import { recordTransaction } from '../services/blockchainService.js';
import { escapeRegex } from '../utils/ids.js';

const router = express.Router();

// GET /api/medicines - list medicines (any authenticated role; supports ?q=, ?manufacturerId=)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { q, manufacturerId, status } = req.query;
    const filter = {};
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { batchNumber: { $regex: safe, $options: 'i' } },
        { qrCodeId: { $regex: safe, $options: 'i' } },
      ];
    }
    if (manufacturerId) filter.manufacturerId = manufacturerId;
    if (status) filter.status = status;

    const items = await Medicine.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json({ success: true, items: items.map((m) => m.toPublicJSON()), count: items.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/medicines/register - manufacturer registers a new medicine batch + QR
router.post('/register', authenticate, authorize('manufacturer'), requireVerified, async (req, res, next) => {
  try {
    const {
      name,
      batchNumber,
      quantity,
      price,
      manufacturingDate,
      expiryDate,
      saltComposition,
      medicineType,
      category,
      fromCatalogId, // optional - link to CDSCO catalog entry
    } = req.body;

    if (!name || !batchNumber || !manufacturingDate || !expiryDate) {
      return res.status(400).json({ success: false, error: 'name, batchNumber, manufacturingDate, expiryDate are required' });
    }

    // If the same medicine NAME already exists for this manufacturer, reuse the
    // existing record + QR code so the medicine always shows the SAME QR.
    const existingByName = await Medicine.findOne({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, manufacturerId: req.user.id });
    if (existingByName) {
      // Generate a fresh QR image for the existing record and return it unchanged.
      const qr = await generateQrDataUrl(existingByName.qrCodeId, 'MED');
      return res.status(200).json({
        success: true,
        message: 'Medicine already registered — same QR code reused. No duplicate created.',
        alreadyExists: true,
        medicine: existingByName.toPublicJSON(),
        qr,
      });
    }

    // Check duplicate batch for this manufacturer
    const existing = await Medicine.findOne({ batchNumber, manufacturerId: req.user.id });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A medicine with this batch number already exists for your company' });
    }

    let dataSource = 'MANUFACTURER';
    let sourceReference = '';
    let sourceDate = null;

    // If linked to a CDSCO catalog entry, inherit official data source
    if (fromCatalogId) {
      const catalogEntry = await MedicineCatalog.findById(fromCatalogId);
      if (catalogEntry) {
        dataSource = catalogEntry.dataSource || 'CDSCO';
        sourceReference = catalogEntry.sourceReference || '';
        sourceDate = catalogEntry.sourceDate || null;
        if (!saltComposition) saltComposition = catalogEntry.saltComposition || catalogEntry.composition || '';
        if (!category) category = catalogEntry.category || '';
        if (!medicineType) medicineType = catalogEntry.form || '';
      }
    }

    const qrCodeId = generateMedicineQrToken();

    const medicine = await Medicine.create({
      name,
      batchNumber,
      manufacturerId: req.user.id,
      manufacturerName: req.user.name,
      quantity,
      price,
      manufacturingDate,
      expiryDate,
      saltComposition,
      medicineType,
      category,
      dataSource,
      sourceReference,
      sourceDate,
      qrCodeId,
      status: 'active',
    });

    // Record on blockchain / hash-chain
    const chain = await recordTransaction('MEDICINE_REGISTERED', {
      medicineId: String(medicine._id),
      medicineQrId: medicine.qrCodeId,
      userId: req.user.id,
      payload: {
        name: medicine.name,
        batchNumber: medicine.batchNumber,
        qrCodeId: medicine.qrCodeId,
        manufacturer: medicine.manufacturerName,
        expiryDate: medicine.expiryDate,
        dataSource,
      },
    });

    medicine.blockchainRecord = chain.txHash;
    await medicine.save();

    // Generate QR image
    const qr = await generateQrDataUrl(medicine.qrCodeId, 'MED');

    res.status(201).json({
      success: true,
      message: 'Medicine registered with unique QR code',
      medicine: medicine.toPublicJSON(),
      qr,
      chain,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/medicines/catalog - search official CDSCO catalog (manufacturer)
router.get('/catalog', authenticate, authorize('manufacturer'), async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = {};
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { manufacturerName: { $regex: safe, $options: 'i' } },
        { saltComposition: { $regex: safe, $options: 'i' } },
      ];
    }
    const items = await MedicineCatalog.find(filter).sort({ name: 1 }).limit(100);
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

// GET /api/medicines/:id - single medicine detail (public-ish, authenticated)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, error: 'Medicine not found' });
    }
    res.json({ success: true, medicine: medicine.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/medicines/:id/status - manufacturer updates status (recall / active / discontinued)
router.patch('/:id/status', authenticate, authorize('manufacturer', 'admin'), requireVerified, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'recalled', 'discontinued'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, error: 'Medicine not found' });
    }

    // Only the owning manufacturer or admin can change status
    if (medicine.manufacturerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized for this medicine' });
    }

    medicine.status = status;
    await medicine.save();

    if (status === 'recalled') {
      await recordTransaction('RECALL', {
        medicineId: String(medicine._id),
        medicineQrId: medicine.qrCodeId,
        userId: req.user.id,
        payload: {
          name: medicine.name,
          batchNumber: medicine.batchNumber,
          qrCodeId: medicine.qrCodeId,
          reason: 'Product recall issued',
        },
      });
    }

    await emitEvent('medicine_status_updated', {
      medicineId: String(medicine._id),
      medicineQrId: medicine.qrCodeId,
      status,
      updatedBy: req.user.name,
      updatedByRole: req.user.role,
    });

    res.json({ success: true, message: `Medicine marked ${status}`, medicine: medicine.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;

