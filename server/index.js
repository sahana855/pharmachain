// PharmaChain backend server entry point
// Express + MongoDB + JWT API. Optionally serves the built SPA (dist/).
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import eventBus from './services/eventBus.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import medicineRoutes from './routes/medicines.js';
import qrRoutes from './routes/qr.js';
import shipmentRoutes from './routes/shipments.js';
import trackingRoutes from './routes/tracking.js';
import transportBoxRoutes from './routes/transportBox.js';
import blockchainRoutes from './routes/blockchain.js';
import stockRoutes from './routes/stock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);

// ---------- Middleware ----------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// ---------- Request log ----------
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// ---------- API routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/transport-box', transportBoxRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/stock', stockRoutes);
app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'PharmaChain API', version: '1.0.0', time: new Date().toISOString() });
});

app.get('/api/debug/env', (req, res) => {
  res.json({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    mongoConnected: mongooseConnectionState(),
    mongoUri: env.PHARMACHAIN_MONGODB_URI ? env.PHARMACHAIN_MONGODB_URI.replace(/:\/\/[^@]+@/, '://***@') : null,
  });
});

function mongooseConnectionState() {
  try {
    return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
  } catch {
    return 'unknown';
  }
}

// ---------- Real-time SSE endpoint ----------
// Clients connect with their JWT (query ?token=...) for authz.
// The backend emits events via the eventBus; this endpoint fans them out.
app.get('/api/events', (req, res) => {
  const token = req.query.token;
  let user = null;
  if (token && typeof token === 'string') {
    try {
      user = jwt.verify(token, env.JWT_SECRET);
    } catch {
      // Unauthenticated SSE still allowed for public tracking pages
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Expose-Headers', 'Cache-Control');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send immediate connection ack
  res.write(`event: connected\ndata: ${JSON.stringify({ user: user ? { id: user.id, role: user.role } : null })}\n\n`);

  const handler = (data) => {
    try {
      // Only send role-relevant events to role users; admin sees all
      if (user) {
        if (data.payload && data.payload.targetRole && data.payload.targetRole !== user.role && user.role !== 'admin') {
          return;
        }
        if (data.payload && data.payload.userId && data.payload.userId !== user.id && user.role !== 'admin') {
          return;
        }
      }
      res.write(`event: ${data.type}\ndata: ${JSON.stringify(data.payload || data)}\n\n`);
    } catch {
      // ignore write errors on closed sockets
    }
  };

  eventBus.on('sse', handler);

  req.on('close', () => {
    eventBus.off('sse', handler);
    res.end();
  });
});

// ---------- Static SPA (dist) ----------
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback - serve index.html for non-API routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log(`📦 Serving SPA from ${distDir}`);
} else {
  app.get('/', (req, res) => {
    res.json({ success: true, message: 'PharmaChain API is running. Build the frontend with `npm run build` to serve the SPA too.' });
  });
}

// ---------- Error handling ----------
app.use(notFound);
app.use(errorHandler);

export { app };

// ---------- Start ----------
async function start() {
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      console.log(`\n🚀 PharmaChain backend running on http://localhost:${env.PORT}`);
      console.log(`   API health: http://localhost:${env.PORT}/api/health`);
      console.log(`   Mongo: ${env.PHARMACHAIN_MONGODB_URI ? env.PHARMACHAIN_MONGODB_URI.replace(/:\/\/[^@]+@/, '://***@') : 'not configured'}\n`);
    });

    const shutdown = async () => {
      console.log('\n🛑 Shutting down...');
      server.close(async () => {
        try {
          await mongoose.disconnect();
        } catch {}
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) start();

