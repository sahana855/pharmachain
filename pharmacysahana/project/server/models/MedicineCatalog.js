// PharmaChain MedicineCatalog model
// Official drug catalogue entries imported from CDSCO-format source (India Drug Registrar / CDSCO).
// Every entry MUST carry dataSource:'CDSCO' + sourceReference for traceability.
import mongoose from 'mongoose';

const medicineCatalogSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    composition: { type: String, trim: true },
    saltComposition: { type: String, trim: true },
    category: { type: String, trim: true },
    therapeuticClass: { type: String, trim: true },
    manufacturerName: { type: String, trim: true, index: true },
    manufacturerAddress: { type: String, trim: true },
    drugLicenseNumber: { type: String, trim: true },
    approvalYear: { type: Number },
    form: { type: String, trim: true }, // tablet, capsule, syrup...
    strength: { type: String, trim: true },
    dosage: { type: String, trim: true },
    // Data source - must be CDSCO for official entries
    dataSource: { type: String, enum: ['CDSCO', 'MANUAL'], default: 'CDSCO', required: true },
    sourceReference: { type: String, trim: true },
    sourceDate: { type: Date, default: Date.now },
    // Import batch tracking
    importBatch: { type: String, trim: true },
  },
  { timestamps: true }
);

medicineCatalogSchema.index({ name: 1, manufacturerName: 1 });

const MedicineCatalog = mongoose.model('MedicineCatalog', medicineCatalogSchema);

export default MedicineCatalog;

