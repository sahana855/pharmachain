import http from 'http';
import mongoose from 'mongoose';
import Medicine from './server/models/Medicine.js';
import User from './server/models/User.js';

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 41837,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  await mongoose.connect('mongodb://localhost:27017/pharmacysahana');

  // Get test data
  const manufacturer = await User.findOne({ role: 'manufacturer' });
  const medicine = await Medicine.findOne({ name: 'Paracetamol 500mg' });
  
  // Create unverified dealer for testing
  let pendingDealer = await User.findOne({ email: 'pendingdealer@pharma.com' });
  if (!pendingDealer) {
    pendingDealer = await User.create({
      email: 'pendingdealer@pharma.com',
      password: '123456',
      name: 'Pending Dealer',
      role: 'dealer',
      verificationStatus: 'pending',
      phone: '+91-9999999999',
      location: 'Test City',
    });
  } else {
    pendingDealer.verificationStatus = 'pending';
    await pendingDealer.save();
  }
  console.log('Using pending dealer:', pendingDealer.name, '| status:', pendingDealer.verificationStatus);

  // Login as manufacturer
  const loginRes = await apiRequest('POST', '/api/auth/demo-login', {
    email: 'manufacturer@pharma.com',
    password: '123456',
  });
  console.log('Login status:', loginRes.status);
  const token = loginRes.body.token;
  if (!token) {
    console.log('Login failed:', loginRes.body);
    await mongoose.disconnect();
    return;
  }

  // Test 1: Create shipment to pending dealer (should fail with 403)
  console.log('\n--- Test 1: Shipment to pending dealer ---');
  const test1 = await apiRequest('POST', '/api/shipments', {
    toId: pendingDealer._id.toString(),
    items: [{ medicineId: medicine._id.toString(), medicineName: medicine.name, batchNumber: medicine.batchNumber, quantity: 10, price: medicine.price }],
    expectedDelivery: new Date(Date.now() + 86400000).toISOString(),
  }, token);
  console.log('Status:', test1.status, '| Expected: 403');
  console.log('Response:', test1.body.error || test1.body.message);
  if (test1.status === 403) console.log('PASS');
  else console.log('FAIL');

  // Approve the dealer
  pendingDealer.verificationStatus = 'verified';
  await pendingDealer.save();

  // Test 2: Create shipment to verified dealer (should succeed)
  console.log('\n--- Test 2: Shipment to verified dealer ---');
  const test2 = await apiRequest('POST', '/api/shipments', {
    toId: pendingDealer._id.toString(),
    items: [{ medicineId: medicine._id.toString(), medicineName: medicine.name, batchNumber: medicine.batchNumber, quantity: 10, price: medicine.price }],
    expectedDelivery: new Date(Date.now() + 86400000).toISOString(),
  }, token);
  console.log('Status:', test2.status, '| Expected: 201');
  if (test2.status === 201) console.log('PASS');
  else console.log('FAIL:', test2.body);

  const shipmentId = test2.body.shipment?._id;

  // Test 3: Mark medicine as recalled and try to update status to DISPATCHED (should fail)
  console.log('\n--- Test 3: Dispatch with recalled medicine ---');
  medicine.status = 'recalled';
  await medicine.save();

  const test3 = await apiRequest('PATCH', `/api/shipments/${shipmentId}/status`, {
    status: 'DISPATCHED',
    location: 'Test Location',
  }, token);
  console.log('Status:', test3.status, '| Expected: 400');
  console.log('Response:', test3.body.error || test3.body.message);
  if (test3.status === 400) console.log('PASS');
  else console.log('FAIL');

  // Restore medicine and test DISPATCHED with valid medicine
  medicine.status = 'active';
  await medicine.save();

  // Test 4: Dispatch with valid medicine (should succeed)
  console.log('\n--- Test 4: Dispatch with valid medicine ---');
  const test4 = await apiRequest('PATCH', `/api/shipments/${shipmentId}/status`, {
    status: 'DISPATCHED',
    location: 'Test Location',
  }, token);
  console.log('Status:', test4.status, '| Expected: 200');
  if (test4.status === 200) console.log('PASS');
  else console.log('FAIL:', test4.body);

  // Test 5: Create shipment with expired medicine (should fail)
  console.log('\n--- Test 5: Shipment with expired medicine ---');
  medicine.expiryDate = new Date('2020-01-01');
  await medicine.save();

  const test5 = await apiRequest('POST', '/api/shipments', {
    toId: pendingDealer._id.toString(),
    items: [{ medicineId: medicine._id.toString(), medicineName: medicine.name, batchNumber: medicine.batchNumber, quantity: 10, price: medicine.price }],
    expectedDelivery: new Date(Date.now() + 86400000).toISOString(),
  }, token);
  console.log('Status:', test5.status, '| Expected: 400');
  console.log('Response:', test5.body.error || test5.body.message);
  if (test5.status === 400) console.log('PASS');
  else console.log('FAIL');

  await mongoose.disconnect();
  console.log('\nAll tests completed.');
}

runTests().catch(e => {
  console.error(e);
  mongoose.disconnect();
});
