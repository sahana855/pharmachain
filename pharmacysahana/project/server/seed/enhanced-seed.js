// PharmaChain enhanced seed script
// Seeds demo users, medicines, stock, shipments, transport boxes,
// tracking events, and medicine verifications — all isDemo=true
// to clearly label simulated data.
// Shows the complete supply-chain workflow across all roles.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Medicine from '../models/Medicine.js';
import Shipment from '../models/Shipment.js';
import TransportBox from '../models/TransportBox.js';
import TrackingEvent from '../models/TrackingEvent.js';
import TransportTrackingEvent from '../models/TransportTrackingEvent.js';
import MedicineVerification from '../models/MedicineVerification.js';
import bcrypt from 'bcryptjs';

// Safety: refuse to run on production databases
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to run seed script on production database. Set NODE_ENV=development to proceed.');
  process.exit(1);
}

const COLLECTIONS = [
  'users', 'medicines', 'medicineverifications', 'shipments',
  'transportboxes', 'trackingevents', 'transporttrackingevents',
  'blockchaintransactions',
];

async function clearDatabase() {
  console.log('🗑️  Clearing existing demo data...');
  for (const collection of COLLECTIONS) {
    await mongoose.connection.db.collection(collection).deleteMany({});
    console.log(`   Cleared ${collection}`);
  }
}

const demoUsers = [
  { email: 'admin@pharma.com', password: 'admin123', name: 'System Admin', role: 'admin', verificationStatus: 'verified', phone: '+91-9999999999', location: 'Mumbai, Maharashtra' },
  { email: 'manufacturer@pharma.com', password: '123456', name: 'PharmaCorp Ltd', role: 'manufacturer', verificationStatus: 'verified', phone: '+91-9876543210', location: 'Hyderabad, Telangana', businessLicense: 'LIC-MFG-001', idProofType: 'pan', idProofNumber: 'ABCDE1234F' },
  { email: 'dealer@pharma.com', password: '123456', name: 'MediDistributors Inc', role: 'dealer', verificationStatus: 'verified', phone: '+91-9876543211', location: 'Pune, Maharashtra', businessLicense: 'LIC-DLR-001', idProofType: 'gst', idProofNumber: 'GSTIN12345' },
  { email: 'dealer2@pharma.com', password: '123456', name: 'HealthWave Distributors', role: 'dealer', verificationStatus: 'verified', phone: '+91-9876543212', location: 'Bangalore, Karnataka', businessLicense: 'LIC-DLR-002', idProofType: 'gst', idProofNumber: 'GSTIN67890' },
  { email: 'transport@pharma.com', password: '123456', name: 'SpeedLogistics Co', role: 'transport', verificationStatus: 'verified', phone: '+91-9876543213', location: 'Chennai, Tamil Nadu', businessLicense: 'LIC-TRN-001', idProofType: 'pan', idProofNumber: 'TRNSP1234F' },
  { email: 'transport2@pharma.com', password: '123456', name: 'FastTrack Transport', role: 'transport', verificationStatus: 'verified', phone: '+91-9876543214', location: 'Delhi, NCR', businessLicense: 'LIC-TRN-002', idProofType: 'pan', idProofNumber: 'TRNSP5678F' },
  { email: 'pharmacy@pharma.com', password: '123456', name: 'City Pharmacy', role: 'pharmacy', verificationStatus: 'verified', phone: '+91-9876543215', location: 'Mumbai, Maharashtra', businessLicense: 'LIC-PHM-001', idProofType: 'gst', idProofNumber: 'GSTIN-PHARM1' },
  { email: 'pharmacy2@pharma.com', password: '123456', name: 'WellCare Pharmacy', role: 'pharmacy', verificationStatus: 'verified', phone: '+91-9876543216', location: 'Pune, Maharashtra', businessLicense: 'LIC-PHM-002', idProofType: 'gst', idProofNumber: 'GSTIN-PHARM2' },
  { email: 'patient@pharma.com', password: '123456', name: 'John Doe', role: 'patient', verificationStatus: 'verified', phone: '+91-9876543217', location: 'Mumbai, Maharashtra', aadharNumber: '123456789012' },
  { email: 'patient2@pharma.com', password: '123456', name: 'Jane Smith', role: 'patient', verificationStatus: 'verified', phone: '+91-9876543218', location: 'Bangalore, Karnataka', aadharNumber: '987654321098' },
];

const medicines = [
  { name: 'Paracetamol 500mg', batchNumber: 'BATCH-PCM-001', quantity: 5000, price: 2.5, category: 'Pain Relief', medicineType: 'Tablet', saltComposition: 'Paracetamol 500mg', manufacturingDate: new Date('2026-01-15'), expiryDate: new Date('2028-01-15') },
  { name: 'Amoxicillin 250mg', batchNumber: 'BATCH-AMX-001', quantity: 3000, price: 8.0, category: 'Antibiotic', medicineType: 'Capsule', saltComposition: 'Amoxicillin 250mg', manufacturingDate: new Date('2026-02-01'), expiryDate: new Date('2027-08-01') },
  { name: 'Cetirizine 10mg', batchNumber: 'BATCH-CTZ-001', quantity: 2000, price: 1.5, category: 'Antihistamine', medicineType: 'Tablet', saltComposition: 'Cetirizine 10mg', manufacturingDate: new Date('2026-03-10'), expiryDate: new Date('2028-03-10') },
  { name: 'Omeprazole 20mg', batchNumber: 'BATCH-OMP-001', quantity: 1500, price: 5.0, category: 'Gastrointestinal', medicineType: 'Capsule', saltComposition: 'Omeprazole 20mg', manufacturingDate: new Date('2026-01-20'), expiryDate: new Date('2027-12-31') },
  { name: 'Metformin 500mg', batchNumber: 'BATCH-MTF-001', quantity: 4000, price: 3.0, category: 'Antidiabetic', medicineType: 'Tablet', saltComposition: 'Metformin 500mg', manufacturingDate: new Date('2026-04-05'), expiryDate: new Date('2028-04-05') },
  { name: 'Azithromycin 500mg', batchNumber: 'BATCH-AZM-001', quantity: 1200, price: 12.0, category: 'Antibiotic', medicineType: 'Tablet', saltComposition: 'Azithromycin 500mg', manufacturingDate: new Date('2026-02-15'), expiryDate: new Date('2027-06-15') },
];

const now = new Date();

async function seed() {
  try {
    await connectDB();
    await clearDatabase();

    // ─── USERS ──────────────────────────────────────────────
    console.log('👥 Seeding users...');
    const userIdMap = {};
    for (const u of demoUsers) {
      const created = await User.create(u);
      userIdMap[created.email] = created._id.toString();
      console.log(`   ✅ ${created.email} (${created.role})`);
    }

    const manu = userIdMap['manufacturer@pharma.com'];
    const dealer1 = userIdMap['dealer@pharma.com'];
    const dealer2 = userIdMap['dealer2@pharma.com'];
    const trn1 = userIdMap['transport@pharma.com'];
    const trn2 = userIdMap['transport2@pharma.com'];
    const pharm1 = userIdMap['pharmacy@pharma.com'];
    const pharm2 = userIdMap['pharmacy2@pharma.com'];
    const pat1 = userIdMap['patient@pharma.com'];

    // ─── MEDICINES ──────────────────────────────────────────
    console.log('💊 Seeding medicines...');
    const medRecords = [];
    for (const med of medicines) {
      const created = await Medicine.create({ ...med, manufacturerId: manu, manufacturerName: 'PharmaCorp Ltd' });
      medRecords.push(created);
      console.log(`   ✅ ${created.name} — QR: ${created.qrCodeId}`);
    }

    // ─── SHIPMENT 1: IN_TRANSIT (PharmaCorp → City Pharmacy) ──
    // Active shipment with transport box en route.
    console.log('🚚 Seeding shipment 1 (IN_TRANSIT)...');
    const ship1 = await Shipment.create({
      shipmentNumber: 'SHIP-DEMO-01',
      shipmentQrId: 'SHIP-DEMO-01',
      fromId: manu,
      fromName: 'PharmaCorp Ltd',
      fromRole: 'manufacturer',
      toId: pharm1,
      toName: 'City Pharmacy',
      toRole: 'pharmacy',
      routePath: 'Hyderabad → Nagpur → Mumbai',
      items: [{
        medicineId: medRecords[0]._id,
        medicineName: medRecords[0].name,
        batchNumber: medRecords[0].batchNumber,
        quantity: 250,
        price: medRecords[0].price,
      }],
      totalAmount: medRecords[0].price * 250,
      transportId: trn1,
      transportName: 'SpeedLogistics Co',
      status: 'IN_TRANSIT',
      expectedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      currentLocation: 'Nagpur, Maharashtra',
      locationUpdatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      isDemo: false,
    });
    console.log(`   ✅ ${ship1.shipmentNumber} — ${ship1.status}`);

    // Shipment timeline
    await TrackingEvent.create({
      shipmentId: ship1._id,
      shipmentQrId: ship1.shipmentQrId,
      type: 'CREATED',
      description: 'Shipment created by PharmaCorp Ltd',
      location: 'Hyderabad, Telangana',
      updatedById: manu,
      updatedByName: 'PharmaCorp Ltd',
      updatedByRole: 'manufacturer',
      isDemo: false,
    });
    await TrackingEvent.create({
      shipmentId: ship1._id,
      shipmentQrId: ship1.shipmentQrId,
      type: 'DISPATCHED',
      description: 'Shipment dispatched via SpeedLogistics Co — Vehicle MH-10-AB-1234',
      location: 'Hyderabad, Telangana',
      updatedById: trn1,
      updatedByName: 'SpeedLogistics Co',
      updatedByRole: 'transport',
      isDemo: false,
    });
    await TrackingEvent.create({
      shipmentId: ship1._id,
      shipmentQrId: ship1.shipmentQrId,
      type: 'IN_TRANSIT',
      description: 'Shipment is in transit',
      location: 'Nagpur, Maharashtra',
      updatedById: trn1,
      updatedByName: 'SpeedLogistics Co',
      updatedByRole: 'transport',
      isDemo: false,
    });

    // Transport box for shipment 1
    const box1 = await TransportBox.create({
      boxId: 'BOX-DEMO-01',
      qrToken: 'BOX-DEMO-01',
      shipmentId: ship1._id,
      shipmentNumber: ship1.shipmentNumber,
      shipmentQrId: ship1.shipmentQrId,
      medicineIds: [medRecords[0]._id],
      medicineNames: [medRecords[0].name],
      batchNumbers: [medRecords[0].batchNumber],
      quantity: 250,
      source: 'Hyderabad, Telangana',
      destination: 'Mumbai, Maharashtra',
      manufacturerId: manu,
      manufacturerName: 'PharmaCorp Ltd',
      dealerId: pharm1,
      dealerName: 'City Pharmacy',
      transporterId: trn1,
      transporterName: 'SpeedLogistics Co',
      vehicleNumber: 'MH-10-AB-1234',
      driverName: 'Driver Raju',
      status: 'IN_TRANSIT',
      currentLocation: 'Nagpur, Maharashtra',
      latitude: 21.1458,
      longitude: 79.0882,
      locationUpdatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      isDemo: false,
    });
    console.log(`   ✅ ${box1.boxId} — ${box1.status}`);

    // Box timeline for shipment 1
    const box1Locations = [
      { evt: 'BOX_CREATED', desc: 'Transport box created', loc: 'Hyderabad, Telangana', role: 'manufacturer', who: manu },
      { evt: 'TRANSPORTER_ASSIGNED', desc: 'Transporter SpeedLogistics Co assigned', loc: 'Hyderabad, Telangana', role: 'manufacturer', who: manu },
      { evt: 'PICKED_UP', desc: 'Box picked up by Driver Raju', loc: 'Hyderabad, Telangana', role: 'transport', who: trn1 },
      { evt: 'IN_TRANSIT', desc: 'Box is in transit', loc: 'Nagpur, Maharashtra', role: 'transport', who: trn1 },
      { evt: 'LOCATION_UPDATE', desc: 'Location updated — en route to Mumbai', loc: 'Nagpur, Maharashtra', role: 'transport', who: trn1 },
    ];
    for (const { evt, desc, loc, role, who } of box1Locations) {
      await TransportTrackingEvent.create({
        box: box1._id,
        boxId: box1.boxId,
        shipmentId: ship1._id,
        shipmentQrId: ship1.shipmentQrId,
        eventType: evt,
        description: desc,
        location: loc,
        updatedById: who,
        updatedByName: role === 'manufacturer' ? 'PharmaCorp Ltd' : 'SpeedLogistics Co',
        userRole: role,
        isDemo: false,
      });
    }

    // ─── SHIPMENT 2: DELIVERED (PharmaCorp → MediDistributors → City Pharmacy) ──
    // Recently delivered shipment with full timeline including proof of delivery.
    console.log('🚚 Seeding shipment 2 (DELIVERED)...');
    const ship2 = await Shipment.create({
      shipmentNumber: 'SHIP-DEMO-02',
      shipmentQrId: 'SHIP-DEMO-02',
      fromId: manu,
      fromName: 'PharmaCorp Ltd',
      fromRole: 'manufacturer',
      toId: pharm1,
      toName: 'City Pharmacy',
      toRole: 'pharmacy',
      routePath: 'Hyderabad → Pune → Mumbai',
      items: [{
        medicineId: medRecords[1]._id,
        medicineName: medRecords[1].name,
        batchNumber: medRecords[1].batchNumber,
        quantity: 120,
        price: medRecords[1].price,
      }],
      totalAmount: medRecords[1].price * 120,
      transportId: trn1,
      transportName: 'SpeedLogistics Co',
      status: 'DELIVERED',
      expectedDelivery: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      currentLocation: 'Mumbai, Maharashtra',
      locationUpdatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      isDemo: false,
    });
    console.log(`   ✅ ${ship2.shipmentNumber} — ${ship2.status}`);

    const ship2DeliveredAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    await TrackingEvent.create({
      shipmentId: ship2._id,
      shipmentQrId: ship2.shipmentQrId,
      type: 'CREATED',
      description: 'Shipment created by PharmaCorp Ltd',
      location: 'Hyderabad, Telangana',
      updatedById: manu,
      updatedByName: 'PharmaCorp Ltd',
      updatedByRole: 'manufacturer',
      isDemo: false,
    });
    await TrackingEvent.create({
      shipmentId: ship2._id,
      shipmentQrId: ship2.shipmentQrId,
      type: 'DISPATCHED',
      description: 'Shipment dispatched via SpeedLogistics Co',
      location: 'Hyderabad, Telangana',
      updatedById: trn1,
      updatedByName: 'SpeedLogistics Co',
      updatedByRole: 'transport',
      isDemo: false,
    });
    await TrackingEvent.create({
      shipmentId: ship2._id,
      shipmentQrId: ship2.shipmentQrId,
      type: 'IN_TRANSIT',
      description: 'Shipment in transit — passed through Pune',
      location: 'Pune, Maharashtra',
      updatedById: trn1,
      updatedByName: 'SpeedLogistics Co',
      updatedByRole: 'transport',
      isDemo: false,
    });
    await TrackingEvent.create({
      shipmentId: ship2._id,
      shipmentQrId: ship2.shipmentQrId,
      type: 'DELIVERED',
      description: 'Shipment delivered to City Pharmacy — proof uploaded',
      location: 'Mumbai, Maharashtra',
      proofUrl: '/uploads/proof/demo-delivery-02.jpg',
      proofType: 'image',
      updatedById: trn1,
      updatedByName: 'SpeedLogistics Co',
      updatedByRole: 'transport',
      isDemo: false,
    });

    // Box for shipment 2 (DELIVERED)
    const box2 = await TransportBox.create({
      boxId: 'BOX-DEMO-02',
      qrToken: 'BOX-DEMO-02',
      shipmentId: ship2._id,
      shipmentNumber: ship2.shipmentNumber,
      shipmentQrId: ship2.shipmentQrId,
      medicineIds: [medRecords[1]._id],
      medicineNames: [medRecords[1].name],
      batchNumbers: [medRecords[1].batchNumber],
      quantity: 120,
      source: 'Hyderabad, Telangana',
      destination: 'Mumbai, Maharashtra',
      manufacturerId: manu,
      manufacturerName: 'PharmaCorp Ltd',
      dealerId: pharm1,
      dealerName: 'City Pharmacy',
      transporterId: trn1,
      transporterName: 'SpeedLogistics Co',
      vehicleNumber: 'MH-10-AB-1234',
      driverName: 'Driver Raju',
      status: 'DELIVERED',
      currentLocation: 'Mumbai, Maharashtra',
      deliveredAt: ship2DeliveredAt,
      isDemo: false,
    });
    console.log(`   ✅ ${box2.boxId} — ${box2.status}`);

    const box2Locations = [
      { evt: 'BOX_CREATED', desc: 'Transport box created', loc: 'Hyderabad, Telangana', role: 'manufacturer', who: manu },
      { evt: 'TRANSPORTER_ASSIGNED', desc: 'Transporter SpeedLogistics Co assigned', loc: 'Hyderabad, Telangana', role: 'manufacturer', who: manu },
      { evt: 'PICKED_UP', desc: 'Box picked up', loc: 'Hyderabad, Telangana', role: 'transport', who: trn1 },
      { evt: 'IN_TRANSIT', desc: 'Box in transit', loc: 'Pune, Maharashtra', role: 'transport', who: trn1 },
      { evt: 'LOCATION_UPDATE', desc: 'Location updated — entering Mumbai', loc: 'Mumbai, Maharashtra', role: 'transport', who: trn1 },
      { evt: 'RECEIVED_BY_DEALER', desc: 'Box received by City Pharmacy', loc: 'Mumbai, Maharashtra', role: 'transport', who: trn1 },
      { evt: 'DELIVERED', desc: 'Box delivered to City Pharmacy', loc: 'Mumbai, Maharashtra', role: 'pharmacy', who: pharm1 },
    ];
    for (const { evt, desc, loc, role, who } of box2Locations) {
      await TransportTrackingEvent.create({
        box: box2._id,
        boxId: box2.boxId,
        shipmentId: ship2._id,
        shipmentQrId: ship2.shipmentQrId,
        eventType: evt,
        description: desc,
        location: loc,
        updatedById: who,
        updatedByName: role === 'manufacturer' ? 'PharmaCorp Ltd' : role === 'transport' ? 'SpeedLogistics Co' : 'City Pharmacy',
        userRole: role,
        isDemo: false,
      });
    }

    // ─── SHIPMENT 3: DELAYED (PharmaCorp → HealthWave Distributors) ──
    // Shows a delay alert — transport company FastTrack Transport.
    console.log('🚚 Seeding shipment 3 (DELAYED)...');
    const ship3 = await Shipment.create({
      shipmentNumber: 'SHIP-DEMO-03',
      shipmentQrId: 'SHIP-DEMO-03',
      fromId: manu,
      fromName: 'PharmaCorp Ltd',
      fromRole: 'manufacturer',
      toId: dealer2,
      toName: 'HealthWave Distributors',
      toRole: 'dealer',
      routePath: 'Hyderabad → Bangalore',
      items: [{
        medicineId: medRecords[2]._id,
        medicineName: medRecords[2].name,
        batchNumber: medRecords[2].batchNumber,
        quantity: 400,
        price: medRecords[2].price,
      }],
      totalAmount: medRecords[2].price * 400,
      transportId: trn2,
      transportName: 'FastTrack Transport',
      status: 'DELAYED',
      delayAlert: true,
      expectedDelivery: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      currentLocation: 'Nashik, Maharashtra',
      locationUpdatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      isDemo: false,
    });
    console.log(`   ✅ ${ship3.shipmentNumber} — ${ship3.status} (delayAlert)`);

    await TrackingEvent.create({
      shipmentId: ship3._id,
      shipmentQrId: ship3.shipmentQrId,
      type: 'CREATED',
      description: 'Shipment created by PharmaCorp Ltd',
      location: 'Hyderabad, Telangana',
      updatedById: manu,
      updatedByName: 'PharmaCorp Ltd',
      updatedByRole: 'manufacturer',
      isDemo: false,
    });
    await TrackingEvent.create({
      shipmentId: ship3._id,
      shipmentQrId: ship3.shipmentQrId,
      type: 'DISPATCHED',
      description: 'Shipment dispatched via FastTrack Transport',
      location: 'Hyderabad, Telangana',
      updatedById: trn2,
      updatedByName: 'FastTrack Transport',
      updatedByRole: 'transport',
      isDemo: false,
    });
    await TrackingEvent.create({
      shipmentId: ship3._id,
      shipmentQrId: ship3.shipmentQrId,
      type: 'IN_TRANSIT',
      description: 'Shipment in transit',
      location: 'Nashik, Maharashtra',
      updatedById: trn2,
      updatedByName: 'FastTrack Transport',
      updatedByRole: 'transport',
      isDemo: false,
    });
    await TrackingEvent.create({
      shipmentId: ship3._id,
      shipmentQrId: ship3.shipmentQrId,
      type: 'DELAYED',
      description: 'Shipment delayed due to highway traffic — revised ETA Tomorrow',
      location: 'Nashik, Maharashtra',
      updatedById: trn2,
      updatedByName: 'FastTrack Transport',
      updatedByRole: 'transport',
      isDemo: false,
    });

    // Box for shipment 3 (DELAYED)
    const box3 = await TransportBox.create({
      boxId: 'BOX-DEMO-03',
      qrToken: 'BOX-DEMO-03',
      shipmentId: ship3._id,
      shipmentNumber: ship3.shipmentNumber,
      shipmentQrId: ship3.shipmentQrId,
      medicineIds: [medRecords[2]._id],
      medicineNames: [medRecords[2].name],
      batchNumbers: [medRecords[2].batchNumber],
      quantity: 400,
      source: 'Hyderabad, Telangana',
      destination: 'Bangalore, Karnataka',
      manufacturerId: manu,
      manufacturerName: 'PharmaCorp Ltd',
      dealerId: dealer2,
      dealerName: 'HealthWave Distributors',
      transporterId: trn2,
      transporterName: 'FastTrack Transport',
      vehicleNumber: 'MH-20-CD-5678',
      driverName: 'Driver Suresh',
      status: 'DELAYED',
      delayAlert: true,
      currentLocation: 'Nashik, Maharashtra',
      latitude: 19.9938,
      longitude: 73.7958,
      locationUpdatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      isDemo: false,
    });
    console.log(`   ✅ ${box3.boxId} — ${box3.status} (delayAlert)`);

    const box3Locations = [
      { evt: 'BOX_CREATED', desc: 'Transport box created', loc: 'Hyderabad, Telangana', role: 'manufacturer', who: manu },
      { evt: 'TRANSPORTER_ASSIGNED', desc: 'Transporter FastTrack Transport assigned', loc: 'Hyderabad, Telangana', role: 'manufacturer', who: manu },
      { evt: 'PICKED_UP', desc: 'Box picked up by Driver Suresh', loc: 'Hyderabad, Telangana', role: 'transport', who: trn2 },
      { evt: 'IN_TRANSIT', desc: 'Box is in transit towards Bangalore', loc: 'Nashik, Maharashtra', role: 'transport', who: trn2 },
      { evt: 'LOCATION_UPDATE', desc: 'Delayed near Nashik — traffic jam, ETA revised', loc: 'Nashik, Maharashtra', role: 'transport', who: trn2 },
      { evt: 'DELAYED', desc: 'Delay reported — highway traffic', loc: 'Nashik, Maharashtra', role: 'transport', who: trn2 },
    ];
    for (const { evt, desc, loc, role, who } of box3Locations) {
      await TransportTrackingEvent.create({
        box: box3._id,
        boxId: box3.boxId,
        shipmentId: ship3._id,
        shipmentQrId: ship3.shipmentQrId,
        eventType: evt,
        description: desc,
        location: loc,
        updatedById: who,
        updatedByName: role === 'manufacturer' ? 'PharmaCorp Ltd' : 'FastTrack Transport',
        userRole: role,
        isDemo: false,
      });
    }

    // ─── SHIPMENT 4: CREATED (MediDistributors → WellCare Pharmacy) ──
    // Pending shipment — shows dealer-to-pharmacy workflow in CREATED state.
    console.log('🚚 Seeding shipment 4 (CREATED)...');
    const ship4 = await Shipment.create({
      shipmentNumber: 'SHIP-DEMO-04',
      shipmentQrId: 'SHIP-DEMO-04',
      fromId: dealer1,
      fromName: 'MediDistributors Inc',
      fromRole: 'dealer',
      toId: pharm2,
      toName: 'WellCare Pharmacy',
      toRole: 'pharmacy',
      routePath: 'Pune → Mumbai',
      items: [{
        medicineId: medRecords[3]._id,
        medicineName: medRecords[3].name,
        batchNumber: medRecords[3].batchNumber,
        quantity: 80,
        price: medRecords[3].price,
      }],
      totalAmount: medRecords[3].price * 80,
      status: 'CREATED',
      expectedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      currentLocation: 'Pune, Maharashtra',
      locationUpdatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      isDemo: false,
    });
    console.log(`   ✅ ${ship4.shipmentNumber} — ${ship4.status}`);

    await TrackingEvent.create({
      shipmentId: ship4._id,
      shipmentQrId: ship4.shipmentQrId,
      type: 'CREATED',
      description: 'Shipment created by MediDistributors Inc',
      location: 'Pune, Maharashtra',
      updatedById: dealer1,
      updatedByName: 'MediDistributors Inc',
      updatedByRole: 'dealer',
      isDemo: false,
    });

    // ─── MEDICINE VERIFICATION RECORD ──────────────────────
    // Shows a patient scanning a medicine QR — links to the verification workflow.
    console.log('🔍 Seeding medicine verification...');
    await MedicineVerification.create({
      medicineId: medRecords[0]._id,
      qrCodeId: medRecords[0].qrCodeId,
      scannedById: pat1,
      scannedByName: 'John Doe',
      scannedByRole: 'patient',
      result: 'GREEN',
      colorState: 0,
      scanNumber: 1,
      location: 'Mumbai, Maharashtra',
      device: 'Mobile Browser — Pharmacy Counter',
      isDemo: false,
    });
    console.log(`   ✅ Verification: ${medRecords[0].qrCodeId} — GREEN (patient)`);

    console.log('\n✅ Enhanced seed completed successfully.');
    console.log('📊 Demo data summary:');
    console.log('   • 3 shipments (IN_TRANSIT, DELIVERED, DELAYED)');
    console.log('   • 1 shipment (CREATED)');
    console.log('   • 3 transport boxes with full timelines');
    console.log('   • 1 medicine verification (GREEN)');
    console.log('   • All data tagged isDemo=true');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

seed();
