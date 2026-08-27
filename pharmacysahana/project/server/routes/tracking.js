// PharmaChain tracking routes - transport location updates + shipment timeline
import express from 'express';
import Shipment from '../models/Shipment.js';
import TrackingEvent from '../models/TrackingEvent.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, requireVerified } from '../middleware/role.js';
import { isShipmentQr } from '../services/qrService.js';
import { recordTransaction } from '../services/blockchainService.js';
import { emitEvent } from '../services/eventBus.js';

const router = express.Router();

// Helper: create a tracking event
async function addEvent(shipment, type, description, opts = {}) {
  return TrackingEvent.create({
    shipmentId: shipment._id,
    shipmentQrId: shipment.shipmentQrId,
    type,
    description,
    location: opts.location,
    isDemo: opts.isDemo || false,
    proofUrl: opts.proofUrl,
    proofType: opts.proofType,
    updatedById: opts.updatedById,
    updatedByName: opts.updatedByName,
    updatedByRole: opts.updatedByRole,
  });
}

// POST /api/tracking/:shipmentId/location - transport updates live location
router.post('/:shipmentId/location', authenticate, authorize('transport'), requireVerified, async (req, res, next) => {
  try {
    const { location, note, isDemo } = req.body;
    if (!location) return res.status(400).json({ success: false, error: 'location is required' });

    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });

    // Only assigned transport can update
    if (shipment.transportId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not the assigned transporter for this shipment' });
    }

    // Track demo flag - always false for real tracking data
    const demoFlag = false;
    const event = await addEvent(shipment, 'LOCATION_UPDATE', note || 'Location updated', {
      location,
      isDemo: demoFlag,
      updatedById: req.user.id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
    });

    shipment.currentLocation = location;
    shipment.locationUpdatedAt = new Date();
    await shipment.save();

    const chain = await recordTransaction('TRACKING_EVENT', {
      shipmentId: String(shipment._id),
      shipmentQrId: shipment.shipmentQrId,
      userId: req.user.id,
      payload: { type: 'LOCATION_UPDATE', location, isDemo: demoFlag },
    });

    emitEvent('shipment_updated', {
      shipmentId: String(shipment._id),
      shipmentQrId: shipment.shipmentQrId,
      status: shipment.status,
      location,
      currentLocation: shipment.currentLocation,
      updatedBy: req.user.name,
      updatedByRole: req.user.role,
    });

    res.json({
      success: true,
      message: 'Location updated',
      event,
      shipment: {
        currentLocation: shipment.currentLocation,
        locationUpdatedAt: shipment.locationUpdatedAt,
      },
      chain,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tracking/:shipmentId/proof - transport uploads delivery proof (URL)
router.post('/:shipmentId/proof', authenticate, authorize('transport'), requireVerified, async (req, res, next) => {
  try {
    const { proofUrl, proofType, location } = req.body;
    if (!proofUrl) return res.status(400).json({ success: false, error: 'proofUrl is required' });

    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });

    if (shipment.transportId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not the assigned transporter' });
    }

    const event = await addEvent(shipment, 'PROOF_UPLOADED', 'Delivery proof uploaded', {
      location,
      proofUrl,
      proofType: proofType || 'photo',
      updatedById: req.user.id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
    });

    await recordTransaction('TRACKING_EVENT', {
      shipmentId: String(shipment._id),
      shipmentQrId: shipment.shipmentQrId,
      userId: req.user.id,
      payload: { type: 'PROOF_UPLOADED', proofType: proofType || 'photo' },
    });

    await emitEvent('shipment_updated', {
      shipmentId: String(shipment._id),
      shipmentQrId: shipment.shipmentQrId,
      status: shipment.status,
      proofUploaded: true,
      proofType: proofType || 'photo',
    });

    res.json({ success: true, message: 'Delivery proof uploaded', event });
  } catch (err) {
    next(err);
  }
});

// GET /api/tracking/timeline/:shipmentId - shipment timeline (authenticated)
router.get('/timeline/:shipmentId', authenticate, async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) return res.status(404).json({ success: false, error: 'Shipment not found' });
    if (req.user.role !== 'admin' && ![shipment.fromId, shipment.toId, shipment.transportId].some((id) => id && id.toString() === req.user.id)) {
      return res.status(403).json({ success: false, error: 'Not authorized for this shipment' });
    }

    const events = await TrackingEvent.find({ shipmentId: shipment._id }).sort({ createdAt: 1 });
    res.json({ success: true, shipment, events });
  } catch (err) {
    next(err);
  }
});

// GET /api/tracking/public/:qrId - public shipment tracking (for /track/SHIP-XXX page)
router.get('/public/:qrId', async (req, res, next) => {
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
        fromName: shipment.fromName,
        toName: shipment.toName,
        status: shipment.status,
        currentLocation: shipment.currentLocation,
        locationUpdatedAt: shipment.locationUpdatedAt,
        routePath: shipment.routePath,
        expectedDelivery: shipment.expectedDelivery,
        deliveredAt: shipment.deliveredAt,
        delayAlert: shipment.delayAlert,
        transportName: shipment.transportName,
        items: shipment.items,
        totalAmount: shipment.totalAmount,
        isDemo: shipment.isDemo,
      },
      events,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

