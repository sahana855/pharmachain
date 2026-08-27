import { app } from '../server/index.js';
import { connectDB } from '../server/config/db.js';

let databaseConnection;

export default async function handler(req, res) {
  databaseConnection ||= connectDB();
  try {
    await databaseConnection;
  } catch (error) {
    databaseConnection = undefined;
    res.status(503).json({ success: false, error: 'Database connection failed', detail: error.message });
    return;
  }
  return app(req, res);
}