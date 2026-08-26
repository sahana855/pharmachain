// PharmaChain authentication routes
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { env } from '../config/env.js';
import sendMail, { buildOtpEmail, verifyMailConfig } from '../utils/mailer.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

// Public: GET /api/auth/health
router.get('/health', (req, res) => {
  res.json({ success: true, service: 'PharmaChain API', time: new Date().toISOString() });
});

// Public: GET /api/auth/mail-status
router.get('/mail-status', (req, res) => {
  const status = verifyMailConfig();
  res.json({ success: true, ...status });
});

// Public: POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, name, role, aadharNumber, businessLicense, idProofType, idProofNumber, phone, location } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password and name are required' });
    }

    const normalizedRole = ['admin', 'manufacturer', 'dealer', 'transport', 'pharmacy', 'patient'].includes(role)
      ? role
      : 'patient';

    // Admin cannot be registered publicly; only via seed
    if (normalizedRole === 'admin') {
      return res.status(403).json({ success: false, error: 'Admin accounts cannot be registered publicly' });
    }

    const user = new User({
      email,
      password,
      name,
      role: normalizedRole,
      verificationStatus: 'verified', // Admin approval removed
      aadharNumber,
      businessLicense,
      idProofType,
      idProofNumber,
      phone,
      location,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.',
      user: { id: user._id, email: user.email, name: user.name, role: user.role, verificationStatus: user.verificationStatus },
    });
  } catch (err) {
    next(err);
  }
});

// Public: POST /api/auth/login
// Verify credentials and issue JWT directly (no OTP)
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.verificationStatus === 'pending') {
      return res.status(403).json({ success: false, error: '⏳ Your account is pending admin approval. Please wait for admin to verify you.' });
    }
    if (user.verificationStatus === 'rejected') {
      return res.status(403).json({ success: false, error: '✋ Your account was rejected. Please contact admin support.' });
    }

    const token = signToken(user);
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public: POST /api/auth/demo-login
// Development-only bypass: skip OTP and issue JWT directly for demo accounts
router.post('/demo-login', authLimiter, async (req, res, next) => {
  try {
    if (env.NODE_ENV !== 'development' && !env.ALLOW_DEMO_LOGIN) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.verificationStatus === 'pending') {
      return res.status(403).json({ success: false, error: '⏳ Your account is pending admin approval. Please wait for admin to verify you.' });
    }
    if (user.verificationStatus === 'rejected') {
      return res.status(403).json({ success: false, error: '✋ Your account was rejected. Please contact admin support.' });
    }

    const token = signToken(user);
    res.json({
      success: true,
      message: 'Demo login successful — OTP bypassed',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public: POST /api/auth/verify-otp
router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+otp +otpExpires +otpAttempts');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (!user.otp || !user.otpExpires || Date.now() > new Date(user.otpExpires).getTime()) {
      return res.status(400).json({ success: false, error: 'OTP expired or not found. Request a new OTP.' });
    }

    if ((user.otpAttempts || 0) >= 5) {
      user.otp = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({ success: false, error: 'Too many incorrect codes. Sign in again to get a new OTP.' });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), user.otp);
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }

    // OTP valid — clear OTP and issue JWT
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    const token = signToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public: POST /api/auth/resend-otp
router.post('/resend-otp', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+otp +otpExpires +otpAttempts');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.otp && !user.otpExpires) {
      return res.status(400).json({ success: false, error: 'Sign in first to request a login code.' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.otpAttempts = 0;
    await user.save();

    try {
      await sendMail({ to: user.email, ...buildOtpEmail(otp, { resend: true }) });
    } catch (mailErr) {
      console.error('Failed to resend OTP email', mailErr);
      const devDetail = env.NODE_ENV === 'development'
        ? (mailErr?.message || 'Could not resend the login code.')
        : 'Could not resend the login code. Please try again.';
      return res.status(503).json({
        success: false,
        error: devDetail,
        ...(env.NODE_ENV === 'development' ? { mailError: mailErr?.message, code: mailErr?.code } : {}),
      });
    }

    res.json({ success: true, message: `A new login code was sent to ${user.email}.` });
  } catch (err) {
    next(err);
  }
});

// Protected: GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// Protected (admin): GET /api/auth/users
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

// Protected: GET /api/auth/dealers
// Returns verified dealers for dispatch dropdowns. Accessible to authenticated users.
router.get('/dealers', authenticate, async (req, res, next) => {
  try {
    const dealers = await User.find({ role: 'dealer', verificationStatus: 'verified' })
      .select('name email location phone businessLicense verificationStatus createdAt')
      .sort({ name: 1 });
    res.json({ success: true, dealers });
  } catch (err) {
    next(err);
  }
});

// Protected (admin): POST /api/auth/users/approve-all
router.post('/users/approve-all', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await User.updateMany(
      { role: { $ne: 'admin' }, verificationStatus: 'pending' },
      { $set: { verificationStatus: 'verified' } },
    );
    res.json({ success: true, approved: result.modifiedCount });
  } catch (err) {
    next(err);
  }
});

// Protected (admin): POST /api/auth/users/:id/approve
router.post('/users/:id/approve', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    user.verificationStatus = 'verified';
    await user.save();
    res.json({ success: true, message: `${user.name} approved`, user });
  } catch (err) {
    next(err);
  }
});

// Protected (admin): POST /api/auth/users/:id/reject
router.post('/users/:id/reject', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    user.verificationStatus = 'rejected';
    await user.save();
    res.json({ success: true, message: `${user.name} rejected`, user });
  } catch (err) {
    next(err);
  }
});

export default router;

