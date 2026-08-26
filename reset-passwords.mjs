import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

await mongoose.connect('mongodb://127.0.0.1:27017/pharmachain');
const users = mongoose.connection.db.collection('users');

const accounts = [
  { email: 'admin@pharma.com',        password: 'admin123' },
  { email: 'manufacturer@pharma.com', password: '123456'   },
  { email: 'dealer@pharma.com',       password: '123456'   },
  { email: 'dealer2@pharma.com',      password: '123456'   },
  { email: 'transport@pharma.com',    password: '123456'   },
  { email: 'transport2@pharma.com',   password: '123456'   },
  { email: 'pharmacy@pharma.com',     password: '123456'   },
  { email: 'pharmacy2@pharma.com',    password: '123456'   },
  { email: 'patient@pharma.com',      password: '123456'   },
  { email: 'patient2@pharma.com',     password: '123456'   },
];

for (const acc of accounts) {
  const hash = await bcrypt.hash(acc.password, 10);
  const res = await users.updateOne({ email: acc.email }, { $set: { password: hash } });
  console.log(acc.email, '->', res.modifiedCount ? '✅ UPDATED' : '❌ not found');
}

await mongoose.disconnect();
console.log('\nDone! All demo passwords reset.');
process.exit(0);
