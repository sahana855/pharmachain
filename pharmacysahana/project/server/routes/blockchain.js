// Read-only blockchain ledger endpoints.
import express from 'express';
import BlockchainTransaction from '../models/BlockchainTransaction.js';
import { authenticate } from '../middleware/auth.js';
import { verifyHashChain } from '../services/blockchainService.js';

const router = express.Router();

router.get('/integrity/check', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
    res.json({ success: true, ...(await verifyHashChain()) });
  } catch (err) {
    next(err);
  }
});

router.get('/:medicineId', authenticate, async (req, res, next) => {
  try {
    const items = await BlockchainTransaction.find({ medicineId: req.params.medicineId })
      .sort({ blockNumber: 1, timestamp: 1 })
      .limit(500);
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    next(err);
  }
});

export default router;