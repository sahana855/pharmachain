// PharmaChain MedicineVerification model
// Records every QR scan / verification of a medicine
import mongoose from 'mongoose';

const medicineVerificationSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    qrCodeId: { type: String, required: true, index: true },
    scannedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    scannedByName: { type: String, trim: true },
    scannedByRole: { type: String, trim: true },
    // Verification outcome
    result: {
      type: String,
      enum: ['GREEN', 'BLUE', 'ORANGE', 'RED'],
      required: true,
      index: true,
    },
    reasonCodes: { type: [String], default: [] },
    colorState: { type: Number, default: 0 },
    scanNumber: { type: Number, default: 1 },
    location: { type: String, trim: true },
    geo: {
      lat: Number,
      lng: Number,
    },
    device: { type: String, trim: true },
     // Blockchain / hash-chain record of this event
     chainHash: { type: String, trim: true },
     chainProvider: { type: String, enum: ['ethereum', 'hashchain', 'none'], default: 'none' },
     // Demo flag - clearly mark simulated data
     isDemo: { type: Boolean, default: false },
     createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

medicineVerificationSchema.index({ qrCodeId: 1, createdAt: -1 });

const MedicineVerification = mongoose.model('MedicineVerification', medicineVerificationSchema);

export default MedicineVerification;

