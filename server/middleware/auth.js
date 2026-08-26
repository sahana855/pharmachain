// PharmaChain JWT authentication middleware
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

// Verify Bearer token and attach req.user
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required. Please login.' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, error: 'Invalid token. Please login again.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Account no longer exists.' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please login again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
    }
    return res.status(500).json({ success: false, error: 'Authentication error.' });
  }
}

// Attach a valid user when a bearer token is supplied, while keeping public QR verification public.
export async function optionalAuthenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded?.id) return next();
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      req.userId = user._id.toString();
    }
  } catch {
    // Public verification should not fail because an optional token is stale.
  }
  next();
}

