import mongoose from 'mongoose';
import User from './server/models/User.js';
import Medicine from './server/models/Medicine.js';

await mongoose.connect('mongodb://localhost:27017/pharmacysahana');

// Create an unverified dealer
const pendingDealer = await User.create({
  email: 'pendingdealer@pharma.com',
  password: '123456',
  name: 'Pending Dealer',
  role: 'dealer',
  verificationStatus: 'pending',
  phone: '+91-9999999999',
  location: 'Test City',
});

console.log('Created pending dealer:', pendingDealer.name, '| status:', pendingDealer.verificationStatus);

// Get manufacturer and first medicine
const manufacturer = await User.findOne({ role: 'manufacturer' });
const medicine = await Medicine.findOne({});

console.log('Manufacturer:', manufacturer.name, '| id:', manufacturer._id);
console.log('Medicine:', medicine.name, '| status:', medicine.status, '| expiry:', medicine.expiryDate);

// Test 1: Try to create shipment to pending dealer (should fail)
console.log('\n--- Test 1: Shipment to pending dealer ---');
try {
  const Shipment = (await import('./server/models/Shipment.js')).default;
  await Shipment.create({
    fromId: manufacturer._id,
    fromName: manufacturer.name,
    fromRole: 'manufacturer',
    toId: pendingDealer._id,
    toName: pendingDealer.name,
    toRole: 'dealer',
    items: [{ medicineId: medicine._id, medicineName: medicine.name, batchNumber: medicine.batchNumber, quantity: 10, price: medicine.price }],
    totalAmount: medicine.price * 10,
    status: 'ASSIGNED_TO_DEALER',
    isDemo: true,
  });
  console.log('FAIL: Should have thrown error');
} catch (err) {
  console.log('PASS: Got expected error:', err.message);
}

// Test 2: Approve the dealer and try again (should succeed)
console.log('\n--- Test 2: Shipment to verified dealer ---');
pendingDealer.verificationStatus = 'verified';
await pendingDealer.save();

const Shipment = (await import('./server/models/Shipment.js')).default;
const shipment = await Shipment.create({
  fromId: manufacturer._id,
  fromName: manufacturer.name,
  fromRole: 'manufacturer',
  toId: pendingDealer._id,
  toName: pendingDealer.name,
  toRole: 'dealer',
  items: [{ medicineId: medicine._id, medicineName: medicine.name, batchNumber: medicine.batchNumber, quantity: 10, price: medicine.price }],
  totalAmount: medicine.price * 10,
  status: 'ASSIGNED_TO_DEALER',
  isDemo: true,
});
console.log('PASS: Shipment created to verified dealer');

// Test 3: Mark medicine as recalled and try to ship (should fail)
console.log('\n--- Test 3: Shipment with recalled medicine ---');
medicine.status = 'recalled';
await medicine.save();

try {
  await Shipment.create({
    fromId: manufacturer._id,
    fromName: manufacturer.name,
    fromRole: 'manufacturer',
    toId: pendingDealer._id,
    toName: pendingDealer.name,
    toRole: 'dealer',
    items: [{ medicineId: medicine._id, medicineName: medicine.name, batchNumber: medicine.batchNumber, quantity: 10, price: medicine.price }],
    totalAmount: medicine.price * 10,
    status: 'ASSIGNED_TO_DEALER',
    isDemo: true,
  });
  console.log('FAIL: Should have thrown error');
} catch (err) {
  console.log('PASS: Got expected error:', err.message);
}

// Test 4: Mark medicine as expired and try to ship (should fail)
console.log('\n--- Test 4: Shipment with expired medicine ---');
medicine.status = 'active';
medicine.expiryDate = new Date('2020-01-01');
await medicine.save();

try {
  await Shipment.create({
    fromId: manufacturer._id,
    fromName: manufacturer.name,
    fromRole: 'manufacturer',
    toId: pendingDealer._id,
    toName: pendingDealer.name,
    toRole: 'dealer',
    items: [{ medicineId: medicine._id, medicineName: medicine.name, batchNumber: medicine.batchNumber, quantity: 10, price: medicine.price }],
    totalAmount: medicine.price * 10,
    status: 'ASSIGNED_TO_DEALER',
    isDemo: true,
  });
  console.log('FAIL: Should have thrown error');
} catch (err) {
  console.log('PASS: Got expected error:', err.message);
}

// Test 5: Valid medicine and verified dealer (should succeed)
console.log('\n--- Test 5: Valid shipment ---');
const validMedicine = await Medicine.findOne({ name: 'Amoxicillin 250mg' });
const validShipment = await Shipment.create({
  fromId: manufacturer._id,
  fromName: manufacturer.name,
  fromRole: 'manufacturer',
  toId: pendingDealer._id,
  toName: pendingDealer.name,
  toRole: 'dealer',
  items: [{ medicineId: validMedicine._id, medicineName: validMedicine.name, batchNumber: validMedicine.batchNumber, quantity: 10, price: validMedicine.price }],
  totalAmount: validMedicine.price * 10,
  status: 'ASSIGNED_TO_DEALER',
  isDemo: true,
});
console.log('PASS: Valid shipment created');

await mongoose.disconnect();
console.log('\nAll tests completed.');
