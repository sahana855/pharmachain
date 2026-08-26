const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  const uri = process.env.PHARMACHAIN_MONGODB_URI;
  if (!uri) throw new Error('PHARMACHAIN_MONGODB_URI is required');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const hash = await bcrypt.hash('Admin@123', 10);
  const result = await db.collection('users').updateOne(
    { email: 'tatvamayiee.p@gmail.com' },
    { $set: { password: hash, role: 'admin', verificationStatus: 'verified' } }
  );
  console.log('Updated:', result.modifiedCount);
  await mongoose.disconnect();
}

main().catch(e => console.error(e));
