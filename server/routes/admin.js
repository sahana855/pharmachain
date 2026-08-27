// PharmaChain admin routes - data import + catalog management
import express from 'express';
import MedicineCatalog from '../models/MedicineCatalog.js';
import Medicine from '../models/Medicine.js';
import Shipment from '../models/Shipment.js';
import User from '../models/User.js';
import BlockchainTransaction from '../models/BlockchainTransaction.js';
import MedicineVerification from '../models/MedicineVerification.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { importCdscoCatalog, INITIAL_CDSCO_CATALOG } from '../services/cdscoImportService.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// POST /api/admin/catalog/import  - Import official CDSCO-format data
router.post('/catalog/import', async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'rows array is required' });
    }
    const result = await importCdscoCatalog(rows);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/catalog/seed - Seed the initial CDSCO-format catalog
router.post('/catalog/seed', async (req, res, next) => {
  try {
    const result = await importCdscoCatalog(INITIAL_CDSCO_CATALOG);
    res.json({
      success: true,
      message: 'Official-format CDSCO catalog seeded',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/catalog - List catalog entries
router.get('/catalog', async (req, res, next) => {
  try {
    const { q, source } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { manufacturerName: { $regex: q, $options: 'i' } },
        { saltComposition: { $regex: q, $options: 'i' } },
      ];
    }
    if (source) filter.dataSource = source;
    const items = await MedicineCatalog.find(filter).sort({ name: 1 }).limit(500);
    const count = await MedicineCatalog.countDocuments(filter);
    res.json({ success: true, items, count });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats - System overview counts
router.get('/stats', async (req, res, next) => {
  try {
    const [users, pendingUsers, manufacturers, dealers, transport, pharmacies, medicines, shipments, verifiedMedicines, suspiciousMedicines, blockchainTransactions] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: { $ne: 'admin' }, verificationStatus: 'pending' }),
      User.countDocuments({ role: 'manufacturer' }),
      User.countDocuments({ role: 'dealer' }),
      User.countDocuments({ role: 'transport' }),
      User.countDocuments({ role: 'pharmacy' }),
      Medicine.countDocuments(),
      Shipment.countDocuments(),
      MedicineVerification.countDocuments({ result: { $in: ['GREEN', 'BLUE'] } }),
      MedicineVerification.countDocuments({ result: { $in: ['ORANGE', 'RED'] } }),
      BlockchainTransaction.countDocuments(),
    ]);
    const catalog = await MedicineCatalog.countDocuments();
    res.json({ success: true, stats: { users, pendingUsers, manufacturers, dealers, transport, pharmacies, medicines, catalog, shipments, verifiedMedicines, suspiciousMedicines, blockchainTransactions } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/ledger - immutable ledger view for administrators
router.get('/ledger', async (req, res, next) => {
  try {
    const { eventType, medicineId, shipmentId } = req.query;
    const filter = {};
    if (eventType) filter.eventType = eventType;
    if (medicineId) filter.medicineId = medicineId;
    if (shipmentId) filter.shipmentId = shipmentId;
    const items = await BlockchainTransaction.find(filter).sort({ blockNumber: -1, timestamp: -1 }).limit(500);
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    next(err);
  }
});

export default router;

