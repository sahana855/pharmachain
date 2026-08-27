// PharmaChain Shipment model (linked orders + transport tracking)
import mongoose from 'mongoose';
import { generateId } from '../utils/ids.js';

const shipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: { type: String, unique: true, default: () => `SHIP-${generateId()}` },
    shipmentQrId: { type: String, unique: true, index: true, default: () => `SHIP-${generateId().toUpperCase()}` },
    // Origin & destination
    fromId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromName: { type: String, trim: true },
    fromRole: { type: String, trim: true },
    toId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toName: { type: String, trim: true },
    toRole: { type: String, trim: true },
    routePath: { type: String, trim: true },
    // Items being shipped
    items: [
      {
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        medicineName: { type: String, trim: true },
        batchNumber: { type: String, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, default: 0 },
      },
    ],
    totalAmount: { type: Number, default: 0 },
    // Transport assignment
    transportId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    transportName: { type: String, trim: true },
    // Status
    status: {
      type: String,
      enum: [
        'CREATED', 'ASSIGNED_TO_DEALER', 'DEALER_ACCEPTED',
        'ASSIGNED_TO_TRANSPORT', 'DISPATCHED', 'PICKED_UP',
        'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED_TO_DEALER',
        'ASSIGNED_TO_PHARMACY', 'DELIVERED_TO_PHARMACY', 'DELIVERED',
        'DELAYED', 'CANCELLED',
      ],
      default: 'CREATED',
      index: true,
    },
    delayAlert: { type: Boolean, default: false },
    expectedDelivery: { type: Date },
    deliveredAt: { type: Date },
    // Live location (demo tracking data - clearly labelled)
    currentLocation: { type: String, trim: true },
    locationUpdatedAt: { type: Date },
    // Blockchain record
    blockchainRecord: { type: String, trim: true },
    // Data flags
    isDemo: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true, versionKey: false } }
);

shipmentSchema.virtual('trackingUrl').get(function () {
  return `/track/${this.shipmentQrId}`;
});

const Shipment = mongoose.model('Shipment', shipmentSchema);

export default Shipment;

