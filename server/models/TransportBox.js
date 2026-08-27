// PharmaChain TransportBox model
// A physical transport box / shipment package with its own unique BOX-XXX QR code.
// This is SEPARATE from the Medicine Authentication QR (MED-XXX) and Shipment QR (SHIP-XXX).
// Purpose: track the physical movement of a medicine shipment box across the supply chain.
import mongoose from 'mongoose';
import { generateBoxQrToken } from '../services/qrService.js';

const STATUSES = [
  'CREATED',      // 🔵 Box created, not dispatched
  'ASSIGNED',     // 🟣 Transporter assigned
  'PICKED_UP',    // 🟡 Transporter collected the box
  'IN_TRANSIT',   // 🔵 Box is being transported
  'DELAYED',      // 🟠 Shipment delayed
  'DAMAGED',      // 🔴 Box reported damaged
  'DELIVERED',    // 🟢 Delivered
  'CANCELLED',    // ⚫ Cancelled
];

const transportBoxSchema = new mongoose.Schema(
  {
    boxId: { type: String, unique: true, index: true, default: () => generateBoxQrToken() },
    qrToken: { type: String, unique: true, index: true, default: () => generateBoxQrToken() },
    // Linked shipment
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
    shipmentNumber: { type: String, trim: true },
    shipmentQrId: { type: String, trim: true, index: true },
    // Box contents
    medicineIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }],
    medicineNames: [{ type: String, trim: true }],
    batchNumbers: [{ type: String, trim: true }],
    quantity: { type: Number, default: 0, min: 0 },
    // Route
    source: { type: String, trim: true },
    destination: { type: String, trim: true },
    // Parties
    manufacturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    manufacturerName: { type: String, trim: true },
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    dealerName: { type: String, trim: true },
    transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    transporterName: { type: String, trim: true },
    // Vehicle / driver
    vehicleNumber: { type: String, trim: true },
    driverName: { type: String, trim: true },
    // Dates
    dispatchDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    deliveredAt: { type: Date },
    // Location
    currentLocation: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    locationUpdatedAt: { type: Date },
    // Status
    status: { type: String, enum: STATUSES, default: 'CREATED', index: true },
    delayAlert: { type: Boolean, default: false },
    // QR image (generated server-side)
    qrDataUrl: { type: String },
    // Demo flag - clearly marked simulated tracking data
    isDemo: { type: Boolean, default: false },
    // Blockchain record
    blockchainRecord: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true, versionKey: false } }
);

transportBoxSchema.virtual('trackingUrl').get(function () {
  return `/track/${this.boxId}`;
});

const TransportBox = mongoose.model('TransportBox', transportBoxSchema);

export default TransportBox;
export { STATUSES };

