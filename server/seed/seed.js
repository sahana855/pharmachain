// PharmaChain seed script
// Seeds demo users + official-format medicine catalog into MongoDB
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';

// Demo users (matching the existing frontend demo accounts)
const demoUsers = [
  { email: 'admin@pharma.com', password: 'admin123', name: 'System Admin', role: 'admin', verificationStatus: 'verified' },
  { email: 'manufacturer@pharma.com', password: '123456', name: 'PharmaCorp Ltd', role: 'manufacturer', verificationStatus: 'verified' },
  { email: 'dealer@pharma.com', password: '123456', name: 'MediDistributors Inc', role: 'dealer', verificationStatus: 'verified' },
  { email: 'transport@pharma.com', password: '123456', name: 'SpeedLogistics Co', role: 'transport', verificationStatus: 'verified' },
  { email: 'pharmacy@pharma.com', password: '123456', name: 'City Pharmacy', role: 'pharmacy', verificationStatus: 'verified' },
  { email: 'patient@pharma.com', password: '123456', name: 'John Doe', role: 'patient', verificationStatus: 'verified' },
];

async function seed() {
  try {
    await connectDB();

    // Seed users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      for (const u of demoUsers) {
        const user = new User(u);
        await user.save();
        console.log(`  ✅ Created user: ${u.email} (${u.role})`);
      }
    } else {
      console.log(`  ⏭️  ${userCount} users already exist, skipping user seed`);
    }

    console.log('\n✅ Seed completed.');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

seed();

