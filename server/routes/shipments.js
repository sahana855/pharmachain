// PharmaChain shipment routes - create, list, assign transport, status updates
// Shipment QR is SEPARATE from medicine QR: /track/SHIP-XXX vs /verify/MED-XXX
import express from 'express';
import Shipment from '../models/Shipment.js';
import Medicine from '../models/Medicine.js';
import TrackingEvent from '../models/TrackingEvent.js';
import User from '../models/User.js';
import Stock from '../models/Stock.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { generateShipmentQrToken, generateQrDataUrl, isShipmentQr } from '../services/qrService.js';
import { recordTransaction } from '../services/blockchainService.js';
import { emitEvent } from '../services/eventBus.js';

const router = express.Router();

const STATUS_TRANSITIONS = {
  CREATED: ['ASSIGNED_TO_DEALER', 'DISPATCHED', 'CANCELLED'],
  ASSIGNED_TO_DEALER: ['DEALER_ACCEPTED', 'CANCELLED'],
  DEALER_ACCEPTED: ['ASSIGNED_TO_TRANSPORT', 'CANCELLED'],
  ASSIGNED_TO_TRANSPORT: ['PICKED_UP', 'DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['PICKED_UP', 'IN_TRANSIT', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERED_TO_DEALER', 'DELIVERED_TO_PHARMACY', 'DELAYED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERED_TO_DEALER', 'DELIVERED_TO_PHARMACY', 'DELAYED'],
  DELIVERED_TO_DEALER: ['ASSIGNED_TO_PHARMACY', 'CANCELLED'],
  ASSIGNED_TO_PHARMACY: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  DELAYED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERED_TO_DEALER', 'DELIVERED_TO_PHARMACY', 'CANCELLED'],
  DELIVERED: [],
  DELIVERED_TO_PHARMACY: [],
  CANCELLED: [],
};

function canViewShipment(shipment, user) {
  if (user.role === 'admin') return true;
  const userId = user.id;
  return [shipment.fromId, shipment.toId, shipment.transportId].some((id) => id && id.toString() === userId);
}

async function validateShipmentItems(items, user) {
  const medicineIds = items.map((item) => item.medicineId).filter(Boolean);
  if (medicineIds.length !== items.length) {
    throw Object.assign(new Error('Every shipment item must reference a medicine'), { status: 400 });
  }
  const medicines = await Medicine.find({ _id: { $in: medicineIds } });
  if (medicines.length !== medicineIds.length) {
    throw Object.assign(new Error('One or more medicines were not found'), { status: 400 });
  }
  if (user.role === 'manufacturer') {
    const foreign = medicines.find((medicine) => medicine.manufacturerId.toString() !== user.id);
    if (foreign) throw Object.assign(new Error('Manufacturers can only ship medicines they created'), { status: 403 });
  }
  if (user.role === 'dealer') {
    const delivered = await Shipment.find({
      toId: user.id,
      toRole: 'dealer',
      status: { $in: ['DELIVERED', 'DELIVERED_TO_DEALER'] },
      'items.medicineId': { $in: medicineIds },
    }).select('items.medicineId');
    const receivedIds = new Set(delivered.flatMap((shipment) => shipment.items.map((item) => item.medicineId?.toString())));
    const unavailable = medicineIds.find((id) => !receivedIds.has(id.toString()));
    if (unavailable) throw Object.assign(new Error('Dealers can only distribute medicines received from a manufacturer'), { status: 403 });
  }
  return medicines;
}

// Helper: add tracking event
async function addTrackingEvent(shipment, type, description, opts = {}) {
  return TrackingEvent.create({
    shipmentId: shipment._id,
    shipmentQrId: shipment.shipmentQrId,
    type,
    description,
    location: opts.location,
    isDemo: opts.isDemo || false,
    updatedById: opts.updatedById,
    updatedByName: opts.updatedByName,
    updatedByRole: opts.updatedByRole,
  });
}

// GET /api/shipments - list shipments (role-filtered)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    let filter = {};
    if (user.role === 'manufacturer') filter.fromId = user.id;
    else if (user.role === 'dealer') filter.$or = [{ fromId: user.id }, { toId: user.id }];
    else if (user.role === 'transport') filter.transportId = user.id;
    else if (user.role === 'pharmacy') filter.toId = user.id;
    // admin sees all

    const items = await Shipment.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    next(err);
  }
});

// POST /api/shipments - manufacturer/dealer creates a shipment
router.post('/', authenticate, authorize('manufacturer', 'dealer'), async (req, res, next) => {
  try {
    const { toId, items, expectedDelivery, transportId, routePath } = req.body;
    if (!toId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'toId and items array are required' });
    }

    const toUser = await User.findById(toId);
    if (!toUser) return res.status(404).json({ success: false, error: 'Destination user not found' });
    if (req.user.role === 'manufacturer' && toUser.role !== 'dealer') {
      return res.status(400).json({ success: false, error: 'Manufacturers can only ship to dealers' });
    }
    if (req.user.role === 'dealer' && toUser.role !== 'pharmacy') {
      return res.status(400).json({ success: false, error: 'Dealers can only ship to pharmacies' });
    }

    await validateShipmentItems(items, req.user);

    const totalAmount = items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
    const shipmentQrId = generateShipmentQrToken();

    // If transport assigned, validate
    let transport = null;
    if (transportId) {
      transport = await User.findById(transportId);
      if (!transport || transport.role !== 'transport') {
        return res.status(400).json({ success: false, error: 'Invalid transport user' });
      }
    }

    const shipment = await Shipment.create({
      fromId: req.user.id,
      fromName: req.user.name,
      fromRole: req.user.role,
      toId: toUser.id,
      toName: toUser.name,
      toRole: toUser.role,
      routePath: routePath?.trim() || undefined,
      items,
      totalAmount,
      transportId: transport ? transport.id : undefined,
      transportName: transport ? transport.name : undefined,
      expectedDelivery,
      status: req.user.role === 'manufacturer' ? 'ASSIGNED_TO_DEALER' : 'ASSIGNED_TO_PHARMACY',
    });

    if (req.user.role === 'dealer') {
      for (const item of items) {
        await Stock.updateOne(
          { ownerId: req.user.id, medicineId: item.medicineId },
          { $inc: { quantity: -item.quantity } }
        );
      }
    }

    await addTrackingEvent(shipment, 'CREATED', `Shipment created by ${req.user.name}`, {
      updatedById: req.user.id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
    });

    // Record on blockchain / hash-chain
    const chain = await recordTransaction('SHIPMENT_CREATED', {
      shipmentId: String(shipment._id),
      shipmentQrId: shipment.shipmentQrId,
      userId: req.user.id,
      payload: {
        shipmentNumber: shipment.shipmentNumber,
        shipmentQrId: shipment.shipmentQrId,
        from: req.user.name,
        to: toUser.name,
        totalAmount,
      },
    });
    shipment.blockchainRecord = chain.txHash;
    await shipment.save();

    emitEvent('shipment_created', {
      shipmentId: String(shipment._id),
      shipmentQrId: shipment.shipmentQrId,
      shipmentNumber: shipment.shipmentNumber,
      fromRole: req.user.role,
      fromName: req.user.name,
    });

    const qr = await generateQrDataUrl(shipment.shipmentQrId, 'SHIP');

    res.status(201).json({
      success: true,
      message: 'Shipment created with separate shipment QR',
      shipment,
      trackingUrl: shipment.trackingUrl,
      qr,
      chain,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/shipments/qr/:qrId - public shipment QR lookup (no auth needed for tracking page)
// NOTE: declared BEFORE /:id so "qr" is not captured as an id
router.get('/qr/:qrId', async (req, res, next) => {
  try {
    const { qrId } = req.params;
    if (!isShipmentQr(qrId)) {
      return res.status(400).json({ success: false, error: 'Invalid shipment QR format' });
    }
    const shipment = await Shipment.findOne({ shipmentQrId: qrId });
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });

    const events = await TrackingEvent.find({ shipmentId: shipment._id }).sort({ createdAt: 1 });

    res.json({
      success: true,
      shipment: {
        shipmentNumber: shipment.shipmentNumber,
        shipmentQrId: shipment.shipmentQrId,
        fromName: shipment.fromName,
        toName: shipment.toName,
        routePath: shipment.routePath,
        status: shipment.status,
        currentLocation: shipment.currentLocation,
        expectedDelivery: shipment.expectedDelivery,
        deliveredAt: shipment.deliveredAt,
        delayAlert: shipment.delayAlert,
        items: shipment.items,
        totalAmount: shipment.totalAmount,
        transportName: shipment.transportName,
        isDemo: shipment.isDemo,
      },
      events,
      trackingUrl: shipment.trackingUrl,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/shipments/:id - shipment detail
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });
    if (!canViewShipment(shipment, req.user)) return res.status(403).json({ success: false, error: 'Not authorized for this shipment' });
    const events = await TrackingEvent.find({ shipmentId: shipment._id }).sort({ createdAt: 1 });
    res.json({ success: true, shipment, events });
  } catch (err) {
    next(err);
  }
});

// PATCH/POST /api/shipments/:id/assign - assign transport (manufacturer/dealer)
const assignTransportHandler = async (req, res, next) => {
  try {
    const { transportId } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });
    if (req.user.role !== 'admin' && shipment.fromId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the shipment owner can assign transport' });
    }
    if (!['CREATED', 'DEALER_ACCEPTED', 'ASSIGNED_TO_PHARMACY'].includes(shipment.status)) {
      return res.status(409).json({ success: false, error: `Transport cannot be assigned from ${shipment.status}` });
    }

    const transport = await User.findById(transportId);
    if (!transport || transport.role !== 'transport') {
      return res.status(400).json({ success: false, error: 'Invalid transport user' });
    }

    shipment.transportId = transport.id;
    shipment.transportName = transport.name;
    shipment.status = shipment.status === 'CREATED' ? 'ASSIGNED_TO_TRANSPORT' : shipment.status;
    await shipment.save();

       await addTrackingEvent(shipment, 'DISPATCHED', `Shipment dispatched via ${transport.name}`, {
       updatedById: req.user.id,
       updatedByName: req.user.name,
       updatedByRole: req.user.role,
     });

     await recordTransaction('SHIPMENT_STATUS', {
       shipmentId: String(shipment._id),
       shipmentQrId: shipment.shipmentQrId,
       userId: req.user.id,
       payload: { status: shipment.status, transport: transport.name },
     });

     emitEvent('shipment_updated', {
       shipmentId: String(shipment._id),
       shipmentQrId: shipment.shipmentQrId,
       status: shipment.status,
       transportName: transport.name,
       targetRole: 'transport',
     });

     res.json({ success: true, message: 'Transport assigned', shipment });
  } catch (err) {
    next(err);
  }
};
router.patch('/:id/assign', authenticate, authorize('manufacturer', 'dealer', 'admin'), assignTransportHandler);
router.post('/:id/assign', authenticate, authorize('manufacturer', 'dealer', 'admin'), assignTransportHandler);

// PATCH/POST /api/shipments/:id/status - transport/dealer updates shipment status
const updateStatusHandler = async (req, res, next) => {
  try {
    const { status, location, delay } = req.body;
    const valid = Object.keys(STATUS_TRANSITIONS);
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });

    if (req.user.role === 'transport' && (!shipment.transportId || shipment.transportId.toString() !== req.user.id)) {
      return res.status(403).json({ success: false, error: 'Only the assigned transport agent can update logistics' });
    }
    if (req.user.role === 'dealer' && shipment.toId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the destination dealer can update this shipment' });
    }
    if (req.user.role === 'pharmacy' && shipment.toId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the destination pharmacy can update this shipment' });
    }

    const allowedNext = STATUS_TRANSITIONS[shipment.status] || [];
    if (req.user.role !== 'admin' && !allowedNext.includes(status)) {
      return res.status(409).json({ success: false, error: `Invalid status transition: ${shipment.status} -> ${status}` });
    }

    // Authorization: transport assigned, or creator, or admin
    const isCreator = shipment.fromId.toString() === req.user.id;
    const isAssignedTransport = shipment.transportId && shipment.transportId.toString() === req.user.id;
    if (req.user.role !== 'admin' && !isCreator && !isAssignedTransport) {
      return res.status(403).json({ success: false, error: 'Not authorized for this shipment' });
    }

    shipment.status = status;
    if (location) {
      shipment.currentLocation = location;
      shipment.locationUpdatedAt = new Date();
    }
    if (status === 'DELIVERED') shipment.deliveredAt = new Date();
    if (delay) shipment.delayAlert = true;
    await shipment.save();

    await addTrackingEvent(shipment, status, `Status updated to ${status}`, {
      location,
      isDemo: delay ? true : undefined,
      updatedById: req.user.id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
    });

    const chain = await recordTransaction('SHIPMENT_STATUS', {
      shipmentId: String(shipment._id),
      shipmentQrId: shipment.shipmentQrId,
      userId: req.user.id,
      payload: { status, location: location || null, delay: delay || false },
     });

     emitEvent('shipment_updated', {
       shipmentId: String(shipment._id),
       shipmentQrId: shipment.shipmentQrId,
       status,
       location: location || undefined,
       currentLocation: shipment.currentLocation,
       delayAlert: shipment.delayAlert || false,
     });

     res.json({ success: true, message: `Shipment status updated to ${status}`, shipment, chain });
  } catch (err) {
    next(err);
  }
};
router.patch('/:id/status', authenticate, updateStatusHandler);
router.post('/:id/status', authenticate, updateStatusHandler);

// POST /api/shipments/:id/accept - destination dealer or pharmacy accepts delivery
router.post('/:id/accept', authenticate, authorize('dealer', 'pharmacy'), async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });
    if (shipment.toId.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'Only the destination can accept this shipment' });
    const expected = req.user.role === 'dealer' ? ['ASSIGNED_TO_DEALER', 'DELIVERED_TO_DEALER', 'DELIVERED'] : ['ASSIGNED_TO_PHARMACY', 'DELIVERED_TO_PHARMACY', 'DELIVERED'];
    if (!expected.includes(shipment.status)) return res.status(409).json({ success: false, error: `Shipment cannot be accepted from ${shipment.status}` });
    shipment.status = req.user.role === 'dealer' ? 'DEALER_ACCEPTED' : 'DELIVERED_TO_PHARMACY';
    await shipment.save();

    // Add to stock
    for (const item of shipment.items) {
      const existingStock = await Stock.findOne({ ownerId: req.user.id, medicineId: item.medicineId });
      if (existingStock) {
        existingStock.quantity += item.quantity;
        await existingStock.save();
      } else {
        const medicine = await Medicine.findById(item.medicineId);
        if (medicine) {
          await Stock.create({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchNumber: item.batchNumber || medicine.batchNumber,
            ownerId: req.user.id,
            ownerRole: req.user.role,
            quantity: item.quantity,
            price: item.price || medicine.price,
            expiryDate: medicine.expiryDate,
          });
        }
      }
    }

    await addTrackingEvent(shipment, shipment.status, `Shipment accepted by ${req.user.name}`, { updatedById: req.user.id, updatedByName: req.user.name, updatedByRole: req.user.role });
    const chain = await recordTransaction(req.user.role === 'dealer' ? 'DEALER_ACCEPTED' : 'PHARMACY_RECEIVED', { shipmentId: String(shipment._id), shipmentQrId: shipment.shipmentQrId, userId: req.user.id, payload: { status: shipment.status } });
    res.json({ success: true, shipment, chain });
  } catch (err) {
    next(err);
  }
});

export default router;

