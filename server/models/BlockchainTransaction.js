// PharmaChain BlockchainTransaction model
// Stores the on-chain (or tamper-evident hash-chain) record of every important event
import mongoose from 'mongoose';

const blockchainTransactionSchema = new mongoose.Schema(
  {
    txHash: { type: String, required: true, unique: true, index: true },
    // Which chain recorded this
    chainType: { type: String, enum: ['ethereum', 'hashchain'], required: true, index: true },
    chainName: { type: String, default: 'hashchain' },
    network: { type: String, trim: true },
    contractAddress: { type: String, trim: true },
    // The event
    eventType: {
      type: String,
      enum: ['MEDICINE_REGISTERED', 'MEDICINE_VERIFIED', 'SHIPMENT_CREATED', 'SHIPMENT_STATUS', 'TRACKING_EVENT', 'USER_REGISTERED', 'USER_APPROVED', 'RECALL'],
      required: true,
      index: true,
    },
    // References
    medicineId: { type: String },
    medicineQrId: { type: String },
    shipmentId: { type: String },
    shipmentQrId: { type: String },
    userId: { type: String },
    // The recorded data hash (SHA-256 of canonical event JSON)
    dataHash: { type: String, required: true },
    previousHash: { type: String, default: 'GENESIS' },
    blockNumber: { type: Number, index: true },
    blockHash: { type: String },
    fromAddress: { type: String },
    // Verify data integrity against stored payload
    payload: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const BlockchainTransaction = mongoose.model('BlockchainTransaction', blockchainTransactionSchema);

export default BlockchainTransaction;

