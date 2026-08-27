// PharmaChain TransportTrackingEvent model
// Timeline of events for a transport box (status + location updates).
// Separate from TrackingEvent (which tracks shipments) - this tracks the physical BOX.
import mongoose from 'mongoose';

const EVENT_TYPES = [
  'BOX_CREATED',
  'TRANSPORTER_ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'LOCATION_UPDATE',
  'DELAYED',
  'DAMAGED',
  'DELIVERED',
  'CANCELLED',
  'RECEIVED_BY_DEALER',
  'RECEIVED_BY_PHARMACY',
  'SCANNED',
];

const transportTrackingEventSchema = new mongoose.Schema(
  {
    boxId: { type: String, index: true },
    box: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportBox', required: true, index: true },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', index: true },
    shipmentQrId: { type: String, index: true },
    eventType: { type: String, enum: EVENT_TYPES, required: true, index: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    // Demo flag - clearly mark simulated data
    isDemo: { type: Boolean, default: false },
    updatedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String, trim: true },
    userRole: { type: String, trim: true },
    remarks: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

transportTrackingEventSchema.index({ box: 1, createdAt: 1 });

const TransportTrackingEvent = mongoose.model('TransportTrackingEvent', transportTrackingEventSchema);

export default TransportTrackingEvent;

