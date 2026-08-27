// PharmaChain centralized error handler

export function notFound(req, res, next) {
  const err = new Error(`Endpoint not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

export function errorHandler(err, req, res, next) {
  // Skip if headers already sent
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, error: errors.join('. ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, error: `${field} already exists` });
  }

  // Mongoose CastError
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, error: `Invalid id format for ${err.path}` });
  }

  if (status === 500) {
    console.error('❌ [errorHandler]', err);
  }

  res.status(status).json({ success: false, error: message });
}

