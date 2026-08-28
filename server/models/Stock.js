import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    medicineName: { type: String, required: true },
    batchNumber: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerRole: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Compound index to ensure uniqueness per user per medicine
stockSchema.index({ medicineId: 1, ownerId: 1 }, { unique: true });

const Stock = mongoose.model('Stock', stockSchema);

export default Stock;
