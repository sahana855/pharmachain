// IndexedDB Database Layer - No JSON files, uses browser's built-in database
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PharmaDB extends DBSchema {
  users: {
    key: string;
    value: {
      id: string;
      email: string;
      password: string;
      name: string;
      role: 'admin' | 'manufacturer' | 'dealer' | 'transport' | 'pharmacy' | 'patient';
      verificationStatus?: 'pending' | 'verified' | 'rejected';
      aadharNumber?: string;
      idProofType?: string;
      idProofNumber?: string;
      businessLicense?: string;
      createdAt: string;
    };
  };
  medicines: {
    key: string;
    value: {
      id: string;
      name: string;
      batchNumber: string;
      manufacturerId: string;
      manufacturerName: string;
      quantity: number;
      price: number;
      manufacturingDate: string;
      expiryDate: string;
      createdAt: string;
    };
  };
  batches: {
    key: string;
    value: {
      id: string;
      batchNumber: string;
      medicineName: string;
      manufacturerId: string;
      quantity: number;
      manufacturingDate: string;
      expiryDate: string;
      status: 'active' | 'recalled' | 'expired';
      createdAt: string;
    };
  };
  stock: {
    key: string;
    value: {
      id: string;
      medicineId: string;
      medicineName: string;
      batchNumber: string;
      ownerId: string;
      ownerRole: string;
      quantity: number;
      price: number;
      expiryDate: string;
      updatedAt: string;
    };
  };
  orders: {
    key: string;
    value: {
      id: string;
      orderNumber: string;
      fromId: string;
      fromName: string;
      fromRole: string;
      toId: string;
      toName: string;
      toRole: string;
      routePath?: string;
      items: Array<{ medicineId: string; medicineName: string; quantity: number; price: number }>;
      totalAmount: number;
      status: 'pending' | 'approved' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled';
      transportId?: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  deliveries: {
    key: string;
    value: {
      id: string;
      orderId: string;
      transportId: string;
      transportName: string;
      status: 'dispatched' | 'in_transit' | 'delivered';
      currentLocation: string;
      expectedDelivery: string;
      actualDelivery?: string;
      otpCode?: string;
      qrCode?: string;
      delayAlert: boolean;
      updatedAt: string;
    };
  };
  sales: {
    key: string;
    value: {
      id: string;
      medicineId: string;
      medicineName: string;
      pharmacyId: string;
      quantity: number;
      price: number;
      totalAmount: number;
      patientId?: string;
      createdAt: string;
    };
  };
  alerts: {
    key: string;
    value: {
      id: string;
      userId: string;
      type: 'expiry' | 'low_stock' | 'recall' | 'delay' | 'discount';
      title: string;
      message: string;
      read: boolean;
      createdAt: string;
    };
  };
  activityLogs: {
    key: string;
    value: {
      id: string;
      userId: string;
      userName: string;
      userRole: string;
      action: string;
      details: string;
      createdAt: string;
    };
  };
  notifications: {
    key: string;
    value: {
      id: string;
      userId: string;
      type: 'email' | 'sms';
      title: string;
      message: string;
      sent: boolean;
      createdAt: string;
    };
  };
  sideEffects: {
    key: string;
    value: {
      id: string;
      patientId: string;
      medicineName: string;
      batchNumber: string;
      description: string;
      severity: 'mild' | 'moderate' | 'severe';
      createdAt: string;
    };
  };
  usageReminders: {
    key: string;
    value: {
      id: string;
      patientId: string;
      medicineName: string;
      dosage: string;
      frequency: string;
      time: string;
      active: boolean;
      createdAt: string;
    };
  };
  returns: {
    key: string;
    value: {
      id: string;
      medicineId: string;
      medicineName: string;
      batchNumber: string;
      fromId: string;
      fromRole: string;
      toId: string;
      reason: string;
      quantity: number;
      status: 'requested' | 'approved' | 'completed';
      createdAt: string;
    };
  };
  qrCodes: {
    key: string;
    value: {
      id: string;
      medicineId: string;
      medicineName: string;
      batchNumber: string;
      qrType: 'tablet' | 'box';
      colorState: number;
      scanCount: number;
      lastScannedBy?: string;
      lastScannedAt?: string;
      createdAt: string;
    };
  };
  qrScans: {
    key: string;
    value: {
      id: string;
      qrCodeId: string;
      scannedBy: string;
      scannedByName: string;
      scannedByRole: string;
      previousColorState: number;
      newColorState: number;
      createdAt: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<PharmaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<PharmaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PharmaDB>('PharmacyDB', 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('medicines')) {
          db.createObjectStore('medicines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('batches')) {
          db.createObjectStore('batches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('stock')) {
          db.createObjectStore('stock', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('deliveries')) {
          db.createObjectStore('deliveries', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sales')) {
          db.createObjectStore('sales', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('alerts')) {
          db.createObjectStore('alerts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('activityLogs')) {
          db.createObjectStore('activityLogs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sideEffects')) {
          db.createObjectStore('sideEffects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('usageReminders')) {
          db.createObjectStore('usageReminders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('returns')) {
          db.createObjectStore('returns', { keyPath: 'id' });
        }
        if (oldVersion < 2 || oldVersion === undefined) {
          if (!db.objectStoreNames.contains('qrCodes')) {
            db.createObjectStore('qrCodes', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('qrScans')) {
            db.createObjectStore('qrScans', { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export async function logActivity(userId: string, userName: string, userRole: string, action: string, details: string) {
  const db = await getDB();
  await db.add('activityLogs', {
    id: generateId(),
    userId,
    userName,
    userRole,
    action,
    details,
    createdAt: new Date().toISOString(),
  });
}

export async function clearAllData() {
  // Delete the entire database to reset
  indexedDB.deleteDatabase('PharmacyDB');
  dbPromise = null;
}

export async function seedDemoData() {
  const db = await getDB();
  const userCount = await db.count('users');
  if (userCount > 0) return;

  const demoUsers: Array<PharmaDB['users']['value']> = [
    { id: 'admin1', email: 'admin@pharma.com', password: 'admin123', name: 'System Admin', role: 'admin' as const, verificationStatus: 'verified', createdAt: new Date().toISOString() },
    { id: 'm1', email: 'manufacturer@pharma.com', password: '123456', name: 'PharmaCorp Ltd', role: 'manufacturer' as const, verificationStatus: 'verified', createdAt: new Date().toISOString() },
    { id: 'd1', email: 'dealer@pharma.com', password: '123456', name: 'MediDistributors Inc', role: 'dealer' as const, verificationStatus: 'verified', createdAt: new Date().toISOString() },
    { id: 't1', email: 'transport@pharma.com', password: '123456', name: 'SpeedLogistics Co', role: 'transport' as const, verificationStatus: 'verified', createdAt: new Date().toISOString() },
    { id: 'p1', email: 'pharmacy@pharma.com', password: '123456', name: 'City Pharmacy', role: 'pharmacy' as const, verificationStatus: 'verified', createdAt: new Date().toISOString() },
    { id: 'pt1', email: 'patient@pharma.com', password: '123456', name: 'John Doe', role: 'patient' as const, verificationStatus: 'verified', createdAt: new Date().toISOString() },
  ];

  for (const user of demoUsers) {
    await db.add('users', user);
  }

  const medicines = [
    { id: 'med1', name: 'Paracetamol 500mg', batchNumber: 'BATCH001', manufacturerId: 'm1', manufacturerName: 'PharmaCorp Ltd', quantity: 1000, price: 25, manufacturingDate: '2025-01-15', expiryDate: '2027-01-15', createdAt: new Date().toISOString() },
    { id: 'med2', name: 'Amoxicillin 250mg', batchNumber: 'BATCH002', manufacturerId: 'm1', manufacturerName: 'PharmaCorp Ltd', quantity: 500, price: 45, manufacturingDate: '2025-02-01', expiryDate: '2026-02-01', createdAt: new Date().toISOString() },
    { id: 'med3', name: 'Vitamin C 100mg', batchNumber: 'BATCH003', manufacturerId: 'm1', manufacturerName: 'PharmaCorp Ltd', quantity: 2000, price: 15, manufacturingDate: '2025-03-10', expiryDate: '2027-03-10', createdAt: new Date().toISOString() },
  ];
  for (const med of medicines) {
    await db.add('medicines', med);
  }

  const batches = [
    { id: 'b1', batchNumber: 'BATCH001', medicineName: 'Paracetamol 500mg', manufacturerId: 'm1', quantity: 1000, manufacturingDate: '2025-01-15', expiryDate: '2027-01-15', status: 'active' as const, createdAt: new Date().toISOString() },
    { id: 'b2', batchNumber: 'BATCH002', medicineName: 'Amoxicillin 250mg', manufacturerId: 'm1', quantity: 500, manufacturingDate: '2025-02-01', expiryDate: '2026-02-01', status: 'active' as const, createdAt: new Date().toISOString() },
    { id: 'b3', batchNumber: 'BATCH003', medicineName: 'Vitamin C 100mg', manufacturerId: 'm1', quantity: 2000, manufacturingDate: '2025-03-10', expiryDate: '2027-03-10', status: 'active' as const, createdAt: new Date().toISOString() },
  ];
  for (const batch of batches) {
    await db.add('batches', batch);
  }

  const stockItems = [
    { id: 's1', medicineId: 'med1', medicineName: 'Paracetamol 500mg', batchNumber: 'BATCH001', ownerId: 'p1', ownerRole: 'pharmacy', quantity: 100, price: 30, expiryDate: '2027-01-15', updatedAt: new Date().toISOString() },
    { id: 's2', medicineId: 'med2', medicineName: 'Amoxicillin 250mg', batchNumber: 'BATCH002', ownerId: 'p1', ownerRole: 'pharmacy', quantity: 50, price: 55, expiryDate: '2026-02-01', updatedAt: new Date().toISOString() },
    { id: 's3', medicineId: 'med3', medicineName: 'Vitamin C 100mg', batchNumber: 'BATCH003', ownerId: 'p1', ownerRole: 'pharmacy', quantity: 200, price: 20, expiryDate: '2027-03-10', updatedAt: new Date().toISOString() },
    { id: 's4', medicineId: 'med1', medicineName: 'Paracetamol 500mg', batchNumber: 'BATCH001', ownerId: 'd1', ownerRole: 'dealer', quantity: 500, price: 28, expiryDate: '2027-01-15', updatedAt: new Date().toISOString() },
  ];
  for (const item of stockItems) {
    await db.add('stock', item);
  }

  const orders = [
    { id: 'o1', orderNumber: 'ORD-001', fromId: 'p1', fromName: 'City Pharmacy', fromRole: 'pharmacy', toId: 'd1', toName: 'MediDistributors Inc', toRole: 'dealer', items: [{ medicineId: 'med1', medicineName: 'Paracetamol 500mg', quantity: 50, price: 28 }], totalAmount: 1400, status: 'delivered' as const, createdAt: '2025-06-01T10:00:00Z', updatedAt: '2025-06-03T14:00:00Z' },
    { id: 'o2', orderNumber: 'ORD-002', fromId: 'd1', fromName: 'MediDistributors Inc', fromRole: 'dealer', toId: 'm1', toName: 'PharmaCorp Ltd', toRole: 'manufacturer', items: [{ medicineId: 'med2', medicineName: 'Amoxicillin 250mg', quantity: 200, price: 45 }], totalAmount: 9000, status: 'in_transit' as const, transportId: 't1', createdAt: '2025-06-10T10:00:00Z', updatedAt: '2025-06-12T10:00:00Z' },
  ];
  for (const order of orders) {
    await db.add('orders', order);
  }

  const deliveries = [
    { id: 'del1', orderId: 'o2', transportId: 't1', transportName: 'SpeedLogistics Co', status: 'in_transit' as const, currentLocation: 'Mumbai Warehouse', expectedDelivery: '2025-06-15T18:00:00Z', delayAlert: false, updatedAt: new Date().toISOString() },
  ];
  for (const delivery of deliveries) {
    await db.add('deliveries', delivery);
  }

  await logActivity('system', 'System', 'system', 'Database Seeded', 'Demo data has been loaded successfully');
}

