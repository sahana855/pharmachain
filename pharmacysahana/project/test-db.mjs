import mongoose from 'mongoose';
import Medicine from './server/models/Medicine.js';
import User from './server/models/User.js';

await mongoose.connect('mongodb://localhost:27017/pharmacysahana');

const meds = await Medicine.find({});
console.log('Medicines:');
meds.forEach(m => console.log('  -', m.name, '| status:', m.status, '| expiry:', m.expiryDate, '| id:', m._id));

const users = await User.find({ role: { $in: ['dealer', 'pharmacy'] } });
console.log('Dealers/Pharmacies:');
users.forEach(u => console.log('  -', u.name, '| role:', u.role, '| verified:', u.verificationStatus, '| id:', u._id));

await mongoose.disconnect();
