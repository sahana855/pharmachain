// PharmaChain MongoDB connection
import mongoose from 'mongoose';
import { env } from './env.js';

function maskedMongoUri(uri) {
  return uri.replace(/:\/\/[^@]+@/, '://***@');
}

export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${maskedMongoUri(env.MONGODB_URI)}`);
    return mongoose.connection;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

