import express from 'express';
import Stock from '../models/Stock.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/stock - get all stock for the logged-in user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const stockItems = await Stock.find({ ownerId: req.user.id });
    res.json({ success: true, count: stockItems.length, items: stockItems });
  } catch (err) {
    next(err);
  }
});

// GET /api/stock/low - get low stock for the logged-in user
router.get('/low', authenticate, async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 50;
    const stockItems = await Stock.find({ ownerId: req.user.id, quantity: { $lt: threshold } });
    res.json({ success: true, count: stockItems.length, items: stockItems });
  } catch (err) {
    next(err);
  }
});

export default router;
