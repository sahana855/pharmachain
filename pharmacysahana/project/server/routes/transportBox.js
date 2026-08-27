// PharmaChain Transport Box routes
// Separate QR system from Medicine Authentication QR (MED-XXX).
// Transport Box QR (BOX-XXX) -> tracks the physical movement of a shipment box.
// Roles:
//   manufacturer -> create boxes, assign transporter, track
//   dealer       -> create boxes, receive boxes, dispatch out, track
//   transport    -> scan box, confirm pickup, update status/location
//   pharmacy     -> scan box, confirm delivery
//   patient      -> NO access to transport box scanner
import express from 'express';
import TransportBox, { STATUSES } from '../models/TransportBox.js';
import TransportTrackingEvent from '../models/TransportTrackingEvent.js';
import Shipment from '../models/Shipment.js';
import User from '../models/User.js';
import Medicine from '../models/Medicine.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, requireVerified } from '../middleware/role.js';
import { generateBoxQrToken, generateBoxQrDataUrl, isBoxQr, normalizeBoxId } from '../services/qrService.js';
import { recordTransaction } from '../services/blockchainService.js';
import { emitEvent } from '../services/eventBus.js';

const router = express.Router();

// Roles allowed to use the transport box scanner
const SCAN_ROLES = ['manufacturer', 'dealer', 'transport', 'pharmacy'];

// Helper: create a transport tracking event
async function addBoxEvent(box, eventType, description, opts = {}) {
  return TransportTrackingEvent.create({
    boxId: box.boxId,
    box: box._id,
    shipmentId: box.shipmentId,
    shipmentQrId: box.shipmentQrId,
    eventType,
    description,
    location: opts.location,
    latitude: opts.latitude,
    longitude: opts.longitude,
    isDemo: opts.isDemo || false,
    updatedById: opts.updatedById,
    updatedByName: opts.updatedByName,
    userRole: opts.userRole,
    remarks: opts.remarks,
  });
}

/**
 * GET /api/transport-box/list - list boxes (role-filtered)
 */
router.get('/list', authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    let filter = {};
    if (user.role === 'manufacturer') filter.manufacturerId = user.id;
    else if (user.role === 'dealer') filter.$or = [{ manufacturerId: user.id }, { dealerId: user.id }];
    else if (user.role === 'transport') filter.transporterId = user.id;
    else if (user.role === 'pharmacy') filter.dealerId = user.id;
    // admin sees all

    const boxes = await TransportBox.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: boxes.length, boxes });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/transport-box/create - create a transport box (manufacturer/dealer)
 * Body: { shipmentId, source, destination, transporterId?, vehicleNumber?, driverName?,
 *         expectedDeliveryDate?, medicineIds?, batchNumbers?, quantity? }
 */
router.post('/create', authenticate, authorize('manufacturer', 'dealer'), requireVerified, async (req, res, next) => {
  try {
    const {
      shipmentId,
      source,
      destination,
      transporterId,
      vehicleNumber,
      driverName,
      expectedDeliveryDate,
      medicineIds = [],
      batchNumbers = [],
      quantity = 0,
    } = req.body;

    if (!shipmentId) {
      return res.status(400).json({ success: false, error: 'shipmentId is required' });
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });

    // The shipment creator (manufacturer/dealer) OR the receiving dealer can create boxes
    const isCreator = shipment.fromId.toString() === req.user.id;
    const isReceiverDealer = req.user.role === 'dealer' && shipment.toId && shipment.toId.toString() === req.user.id;
    if (!isCreator && !isReceiverDealer && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to create boxes for this shipment' });
    }

    // Resolve transporter if provided
    let transporter = null;
    if (transporterId) {
      transporter = await User.findById(transporterId);
      if (!transporter || transporter.role !== 'transport') {
        return res.status(400).json({ success: false, error: 'Invalid transport user' });
      }
    }

    // Resolve medicine names
    const medNames = [];
    if (medicineIds.length > 0) {
      const meds = await Medicine.find({ _id: { $in: medicineIds } });
      const medMap = new Map(meds.map((m) => [String(m._id), m.name]));
      for (const id of medicineIds) {
        medNames.push(medMap.get(String(id)) || 'Unknown');
      }
    } else {
      // Fall back to shipment items
      for (const it of shipment.items || []) {
        medNames.push(it.medicineName || 'Unknown');
      }
    }

    // Generate QR data URL (standard black-and-white)
    const qrToken = generateBoxQrToken();
    const qr = await generateBoxQrDataUrl(qrToken);

    const status = transporter ? 'ASSIGNED' : 'CREATED';
    const box = await TransportBox.create({
      boxId: qrToken,
      qrToken,
      shipmentId: shipment._id,
      shipmentNumber: shipment.shipmentNumber,
      shipmentQrId: shipment.shipmentQrId,
      medicineIds: medicineIds.length > 0 ? medicineIds : (shipment.items || []).map((it) => it.medicineId).filter(Boolean),
      medicineNames: medNames,
      batchNumbers,
      quantity,
      source: source || shipment.fromName,
      destination: destination || shipment.toName,
      manufacturerId: req.user.role === 'manufacturer' ? req.user.id : shipment.fromId,
      manufacturerName: req.user.role === 'manufacturer' ? req.user.name : shipment.fromName,
      dealerId: req.user.role === 'dealer' ? req.user.id : shipment.toId,
      dealerName: req.user.role === 'dealer' ? req.user.name : shipment.toName,
      transporterId: transporter ? transporter.id : undefined,
      transporterName: transporter ? transporter.name : undefined,
      vehicleNumber,
      driverName,
      dispatchDate: new Date(),
      expectedDeliveryDate: expectedDeliveryDate || shipment.expectedDelivery,
      currentLocation: source || shipment.fromName,
      status,
      qrDataUrl: qr.dataUrl,
      isDemo: false,
    });

    await addBoxEvent(box, 'BOX_CREATED', `Transport box ${box.boxId} created for shipment ${shipment.shipmentNumber}`, {
      location: source || shipment.fromName,
      updatedById: req.user.id,
      updatedByName: req.user.name,
      userRole: req.user.role,
    });

    if (transporter) {
      await addBoxEvent(box, 'TRANSPORTER_ASSIGNED', `Transporter ${transporter.name} assigned`, {
        updatedById: req.user.id,
        updatedByName: req.user.name,
        userRole: req.user.role,
        remarks: `Vehicle: ${vehicleNumber || 'N/A'}, Driver: ${driverName || 'N/A'}`,
      });
    }

    // Blockchain record
    const chain = await recordTransaction('BOX_CREATED', {
      shipmentId: String(shipment._id),
      shipmentQrId: shipment.shipmentQrId,
      userId: req.user.id,
      payload: {
        boxId: box.boxId,
        shipmentId: String(shipment._id),
        shipmentNumber: shipment.shipmentNumber,
        source: box.source,
        destination: box.destination,
        transporter: transporter ? transporter.name : null,
        status: box.status,
        vehicleNumber: vehicleNumber || null,
      },
    });
    box.blockchainRecord = chain.txHash;
    await box.save();

    emitEvent('box_created', {
      boxId: box.boxId,
      shipmentId: String(box.shipmentId),
      shipmentNumber: box.shipmentNumber,
      status: box.status,
      createdBy: req.user.name,
      createdByRole: req.user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Transport box created with separate BOX QR',
      box,
      trackingUrl: box.trackingUrl,
      qr: { qrId: qrToken, dataUrl: qr.dataUrl, url: qr.url },
      chain,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transport-box/directory - list transport/dealer/pharmacy users (manufacturer/dealer/admin)
 * Used by box creation forms to populate transporter / destination dropdowns.
 */
router.get('/directory', authenticate, authorize('manufacturer', 'dealer', 'admin'), async (req, res, next) => {
  try {
    const transports = await User.find({ role: 'transport' }).sort({ name: 1 });
    const receivers = await User.find({ role: { $in: ['dealer', 'pharmacy'] } }).sort({ name: 1 });
    res.json({
      success: true,
      transports: transports.map((u) => ({ id: u._id, name: u.name, email: u.email })),
      receivers: receivers.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transport-box/public/:boxId - PUBLIC box tracking (no auth)
 * Used by /track/BOX-XXX for external scanners. Returns only non-sensitive info.
 * NOTE: Declared BEFORE /:boxId so Express doesn't capture "public" as a boxId.
 */
router.get('/public/:boxId', async (req, res, next) => {
  try {
    const boxId = normalizeBoxId(req.params.boxId);
    if (!boxId) return res.status(400).json({ success: false, error: 'Invalid box QR format' });

    const box = await TransportBox.findOne({ boxId });
    if (!box) return res.status(404).json({ success: false, error: 'Transport box not found' });

    const events = await TransportTrackingEvent.find({ box: box._id }).sort({ createdAt: 1 });

    res.json({
      success: true,
      box: {
        boxId: box.boxId,
        shipmentNumber: box.shipmentNumber,
        source: box.source,
        destination: box.destination,
        status: box.status,
        currentLocation: box.currentLocation,
        expectedDeliveryDate: box.expectedDeliveryDate,
        deliveredAt: box.deliveredAt,
        delayAlert: box.delayAlert,
        transporterName: box.transporterName,
        vehicleNumber: box.vehicleNumber,
        medicineNames: box.medicineNames,
        batchNumbers: box.batchNumbers,
        quantity: box.quantity,
        isDemo: box.isDemo,
        trackingUrl: box.trackingUrl,
      },
      events: events.map((e) => ({
        eventType: e.eventType,
        description: e.description,
        location: e.location,
        updatedByName: e.updatedByName,
        userRole: e.userRole,
        remarks: e.remarks,
        isDemo: e.isDemo,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transport-box/:boxId - get transport box details + timeline (authorized roles)
 */
router.get('/:boxId', authenticate, authorize(...SCAN_ROLES), async (req, res, next) => {
  try {
    const boxId = normalizeBoxId(req.params.boxId);
    if (!boxId) return res.status(400).json({ success: false, error: 'Invalid box QR format' });

    const box = await TransportBox.findOne({ boxId });
    if (!box) return res.status(404).json({ success: false, error: 'Transport box not found' });

    const events = await TransportTrackingEvent.find({ box: box._id }).sort({ createdAt: 1 });

    res.json({ success: true, box, events });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/transport-box/:boxId/scan - record a scan of a transport box QR
 * Available to manufacturer/dealer/transport/pharmacy.
 * Records the scan event (with optional location).
 */
router.post('/:boxId/scan', authenticate, authorize(...SCAN_ROLES), requireVerified, async (req, res, next) => {
  try {
    const boxId = normalizeBoxId(req.params.boxId);
    if (!boxId) return res.status(400).json({ success: false, error: 'Invalid box QR format' });

    const box = await TransportBox.findOne({ boxId });
    if (!box) return res.status(404).json({ success: false, error: 'Transport box not found' });

    const { location, latitude, longitude, remarks } = req.body || {};

    // Validation checks for verification result
    const alerts = [];
    if (box.status === 'CANCELLED') alerts.push('This shipment has been cancelled.');
    if (box.status === 'DELIVERED') alerts.push('This shipment has already been delivered.');
    if (box.status === 'DAMAGED') alerts.push('This box has been reported as damaged.');
    if (box.status === 'DELAYED') alerts.push('This shipment has been flagged as delayed.');

    const event = await addBoxEvent(box, 'SCANNED', `Box scanned by ${req.user.name} (${req.user.role})`, {
      location,
      latitude,
      longitude,
      updatedById: req.user.id,
      updatedByName: req.user.name,
      userRole: req.user.role,
      remarks: remarks || alerts.join(' '),
    });

    emitEvent('box_scanned', {
      boxId: box.boxId,
      shipmentNumber: box.shipmentNumber,
      status: box.status,
      scannedBy: req.user.name,
      scannedByRole: req.user.role,
      alerts,
    });

    res.json({
      success: true,
      message: 'Box scan recorded',
      box: {
        boxId: box.boxId,
        shipmentId: box.shipmentId,
        shipmentNumber: box.shipmentNumber,
        status: box.status,
        source: box.source,
        destination: box.destination,
        currentLocation: box.currentLocation,
        transporterName: box.transporterName,
        expectedDeliveryDate: box.expectedDeliveryDate,
        deliveredAt: box.deliveredAt,
        delayAlert: box.delayAlert,
        medicineNames: box.medicineNames,
        batchNumbers: box.batchNumbers,
        quantity: box.quantity,
        trackingUrl: box.trackingUrl,
      },
      alerts,
      event,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/transport-box/:boxId/status - update box status (role-based)
 * Body: { status, location?, remarks? }
 * Status transitions enforced per role:
 *   transport -> PICKED_UP, IN_TRANSIT, DELAYED, DAMAGED, DELIVERED, LOCATION
 *   dealer    -> RECEIVED_BY_DEALER / DELIVERED
 *   pharmacy  -> RECEIVED_BY_PHARMACY / DELIVERED
 *   manufacturer/dealer -> CANCELLED, ASSIGNED (assign transporter)
 */
router.put('/:boxId/status', authenticate, authorize(...SCAN_ROLES, 'admin'), requireVerified, async (req, res, next) => {
  try {
    const { status, location, remarks, transporterId } = req.body;
    const boxId = normalizeBoxId(req.params.boxId);
    if (!boxId) return res.status(400).json({ success: false, error: 'Invalid box QR format' });

    const box = await TransportBox.findOne({ boxId });
    if (!box) return res.status(404).json({ success: false, error: 'Transport box not found' });

    const user = req.user;

    // Assign transporter (manufacturer/dealer)
    if (status === 'ASSIGNED') {
      if (!['manufacturer', 'dealer', 'admin'].includes(user.role)) {
        return res.status(403).json({ success: false, error: 'Only manufacturer/dealer can assign a transporter' });
      }
      if (transporterId) {
        const transport = await User.findById(transporterId);
        if (!transport || transport.role !== 'transport') {
          return res.status(400).json({ success: false, error: 'Invalid transport user' });
        }
        box.transporterId = transport.id;
        box.transporterName = transport.name;
      }
      box.status = 'ASSIGNED';
      await box.save();
      await addBoxEvent(box, 'TRANSPORTER_ASSIGNED', `Transporter ${box.transporterName || 'assigned'} assigned`, {
        updatedById: user.id,
        updatedByName: user.name,
        userRole: user.role,
        remarks,
      });
    }

    // Transporter status updates
    else if (['PICKED_UP', 'IN_TRANSIT', 'DELAYED', 'DAMAGED'].includes(status)) {
      if (user.role !== 'transport' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only the assigned transporter can update this status' });
      }
      if (box.transporterId && box.transporterId.toString() !== user.id && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not the assigned transporter for this box' });
      }
      box.status = status;
      if (status === 'DELAYED') box.delayAlert = true;
      if (status === 'DAMAGED') box.delayAlert = true;
      if (location) {
        box.currentLocation = location;
        box.locationUpdatedAt = new Date();
      }
      await box.save();
      await addBoxEvent(box, status, `Box status updated to ${status}`, {
        location,
        isDemo: false,
        updatedById: user.id,
        updatedByName: user.name,
        userRole: user.role,
        remarks,
      });
    }

    // Receiver / Admin confirm delivery
    else if (status === 'DELIVERED') {
      const allowedRecipients = ['dealer', 'pharmacy', 'admin'];
      if (!allowedRecipients.includes(user.role)) {
        return res.status(403).json({ success: false, error: 'Only the receiver or admin can confirm delivery' });
      }
      box.status = 'DELIVERED';
      box.deliveredAt = new Date();
      if (location) {
        box.currentLocation = location;
        box.locationUpdatedAt = new Date();
      }
      await box.save();
      const eventType = user.role === 'pharmacy' ? 'RECEIVED_BY_PHARMACY' : user.role === 'dealer' ? 'RECEIVED_BY_DEALER' : 'DELIVERED';
      await addBoxEvent(box, eventType, `Box delivered - confirmed by ${user.name} (${user.role})`, {
        location,
        updatedById: user.id,
        updatedByName: user.name,
        userRole: user.role,
        remarks,
      });
    }

    // Cancel (manufacturer/dealer/admin)
    else if (status === 'CANCELLED') {
      if (!['manufacturer', 'dealer', 'admin'].includes(user.role)) {
        return res.status(403).json({ success: false, error: 'Only manufacturer/dealer can cancel a shipment' });
      }
      box.status = 'CANCELLED';
      await box.save();
      await addBoxEvent(box, 'CANCELLED', `Box cancelled by ${user.name}`, {
        updatedById: user.id,
        updatedByName: user.name,
        userRole: user.role,
        remarks,
      });
    }

    else {
      return res.status(400).json({ success: false, error: `Invalid status. Valid: ${STATUSES.join(', ')}` });
    }

    // Blockchain record
    const chain = await recordTransaction('BOX_STATUS', {
      shipmentId: String(box.shipmentId),
      shipmentQrId: box.shipmentQrId,
      userId: user.id,
      payload: { boxId: box.boxId, status: box.status, location: location || null, remarks: remarks || null },
     });

     emitEvent('box_updated', {
       boxId: box.boxId,
       shipmentNumber: box.shipmentNumber,
      status: box.status,
       location: location || undefined,
       updatedBy: req.user.name,
       updatedByRole: req.user.role,
       delayAlert: box.delayAlert,
     });

     res.json({ success: true, message: `Box status updated to ${box.status}`, box, chain });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/transport-box/:boxId/location - update box location (transport)
 * Body: { location, latitude?, longitude?, remarks? }
 */
router.post('/:boxId/location', authenticate, authorize('transport'), requireVerified, async (req, res, next) => {
  try {
    const { location, latitude, longitude, remarks } = req.body;
    if (!location) return res.status(400).json({ success: false, error: 'location is required' });

    const boxId = normalizeBoxId(req.params.boxId);
    if (!boxId) return res.status(400).json({ success: false, error: 'Invalid box QR format' });

    const box = await TransportBox.findOne({ boxId });
    if (!box) return res.status(404).json({ success: false, error: 'Transport box not found' });

    if (box.transporterId && box.transporterId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not the assigned transporter for this box' });
    }

    // Demo flag - always false for real tracking data
    const demoFlag = false;

    const event = await addBoxEvent(box, 'LOCATION_UPDATE', 'Box location updated', {
      location,
      latitude,
      longitude,
      isDemo: demoFlag,
      updatedById: req.user.id,
      updatedByName: req.user.name,
      userRole: req.user.role,
      remarks,
    });

    box.currentLocation = location;
    box.latitude = latitude;
    box.longitude = longitude;
    box.locationUpdatedAt = new Date();
    await box.save();

    const chain = await recordTransaction('BOX_LOCATION', {
      shipmentId: String(box.shipmentId),
      shipmentQrId: box.shipmentQrId,
      userId: req.user.id,
      payload: { boxId: box.boxId, location, latitude: latitude || null, longitude: longitude || null, isDemo: demoFlag },
     });

     emitEvent('box_updated', {
       boxId: box.boxId,
       shipmentNumber: box.shipmentNumber,
      location,
       updatedBy: req.user.name,
       updatedByRole: req.user.role,
       isDemo: demoFlag,
     });

      res.json({
       success: true,
       message: demoFlag ? 'Box location updated (Demo Tracking Data)' : 'Box location updated',
       event,
       box: { currentLocation: box.currentLocation, locationUpdatedAt: box.locationUpdatedAt },
       chain,
     });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transport-box/:boxId/timeline - full box timeline (authorized roles)
 */
router.get('/:boxId/timeline', authenticate, authorize(...SCAN_ROLES), async (req, res, next) => {
  try {
    const boxId = normalizeBoxId(req.params.boxId);
    if (!boxId) return res.status(400).json({ success: false, error: 'Invalid box QR format' });

    const box = await TransportBox.findOne({ boxId });
    if (!box) return res.status(404).json({ success: false, error: 'Transport box not found' });

    const events = await TransportTrackingEvent.find({ box: box._id }).sort({ createdAt: 1 });

    res.json({ success: true, box, events });
  } catch (err) {
    next(err);
  }
});

export default router;

