// PharmaChain TrackingEvent model
// Timeline of events for a shipment (location + status updates)
import mongoose from 'mongoose';

const trackingEventSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
    shipmentQrId: { type: String, index: true },
    type: {
      type: String,
      enum: ['CREATED', 'DISPATCHED', 'IN_TRANSIT', 'LOCATION_UPDATE', 'DELAYED', 'DELIVERED', 'CANCELLED', 'PROOF_UPLOADED'],
      required: true,
      index: true,
    },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    // Demo flag - clearly mark simulated data
    isDemo: { type: Boolean, default: false },
    // Delivery proof (optional)
    proofUrl: { type: String },
    proofType: { type: String },
    updatedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String, trim: true },
    updatedByRole: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

trackingEventSchema.index({ shipmentId: 1, createdAt: 1 });

const TrackingEvent = mongoose.model('TrackingEvent', trackingEventSchema);

export default TrackingEvent;

