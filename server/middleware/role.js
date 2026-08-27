// PharmaChain role-based access control middleware
// Usage: router.post('/', authorize('manufacturer'), handler)

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
}

// Ensure the user account is approved/verified (for business actions)
export function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (req.user.verificationStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      error: 'Your account is pending admin approval. Please wait for verification.',
    });
  }
  next();
}

