// PharmaChain admin routes - data import + catalog management
import express from 'express';
import MedicineCatalog from '../models/MedicineCatalog.js';
import Medicine from '../models/Medicine.js';
import Shipment from '../models/Shipment.js';
import User from '../models/User.js';
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
    const [users, pendingUsers, medicines, catalog, shipments] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: { $ne: 'admin' }, verificationStatus: 'pending' }),
      Medicine.countDocuments(),
      MedicineCatalog.countDocuments(),
      Shipment.countDocuments(),
    ]);
    res.json({ success: true, stats: { users, pendingUsers, medicines, catalog, shipments } });
  } catch (err) {
    next(err);
  }
});

export default router;

