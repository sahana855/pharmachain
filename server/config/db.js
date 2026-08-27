// PharmaChain MongoDB connection
import mongoose from 'mongoose';
import { env } from './env.js';

function maskedMongoUri(uri) {
  return uri.replace(/:\/\/[^@]+@/, '://***@');
}

export async function connectDB() {
  try {
    if (!env.PHARMACHAIN_MONGODB_URI) {
      throw new Error('PHARMACHAIN_MONGODB_URI is not configured. Add it to Vercel environment variables or .env.local.');
    }
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.PHARMACHAIN_MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${maskedMongoUri(env.PHARMACHAIN_MONGODB_URI)}`);
    return mongoose.connection;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

