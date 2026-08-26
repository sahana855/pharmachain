// PharmaChain Medicine model (manufacturer-registered medicines with QR codes)
import mongoose from 'mongoose';
import { generateId } from '../utils/ids.js';

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Medicine name is required'], trim: true, index: true },
    batchNumber: { type: String, required: [true, 'Batch number is required'], trim: true, index: true },
    manufacturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    manufacturerName: { type: String, trim: true },
    quantity: { type: Number, required: true, min: [0, 'Quantity cannot be negative'], default: 0 },
    price: { type: Number, required: true, min: [0, 'Price cannot be negative'], default: 0 },
    manufacturingDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    saltComposition: { type: String, trim: true },
    medicineType: { type: String, trim: true },
    category: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'recalled', 'expired', 'discontinued'],
      default: 'active',
      index: true,
    },
    // Data source tracking (CDSCO official import vs manufacturer entry)
    dataSource: { type: String, enum: ['MANUFACTURER', 'CDSCO'], default: 'MANUFACTURER' },
    sourceReference: { type: String, trim: true },
    sourceDate: { type: Date },
    // Unique QR identifier
    qrCodeId: { type: String, unique: true, index: true, default: () => `MED-${generateId().toUpperCase()}` },
    // Blockchain registration record
    blockchainRecord: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false }, toObject: { virtuals: true, versionKey: false } }
);

// Ensure batch + manufacturer uniqueness
medicineSchema.index({ batchNumber: 1, manufacturerId: 1 }, { unique: true });

medicineSchema.virtual('isExpired').get(function () {
  return this.expiryDate && this.expiryDate < new Date();
});

medicineSchema.methods.toPublicJSON = function () {
  const obj = this.toJSON();
  delete obj.manufacturerId; // keep internal ref private when needed
  return {
    ...obj,
    verificationUrl: `/verify/${this.qrCodeId}`,
  };
};

const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;

