const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/pharmachain');
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
