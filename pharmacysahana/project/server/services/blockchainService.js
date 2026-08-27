// PharmaChain blockchain service
// Records events on-chain when an Ethereum node is available (Phase 5).
// Until then (and as automatic fallback), uses a tamper-evident SHA-256 hash-chain
// stored in MongoDB. Every event links to the previous hash -> tamper detectable.
import crypto from 'crypto';
import BlockchainTransaction from '../models/BlockchainTransaction.js';
import { env } from '../config/env.js';

// Provider state - set by Phase 5 when a node/contract is configured
let ethereumProvider = null;
let contractAddress = null;
let chainName = 'hashchain';

export function configureEthereum(provider, address, networkName = 'ethereum') {
  ethereumProvider = provider;
  contractAddress = address;
  chainName = networkName;
}

export function isEthereumActive() {
  return !!(ethereumProvider && contractAddress);
}

/**
 * Canonical JSON string used for hashing (stable key order)
 */
function canonicalJson(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

/**
 * Compute SHA-256 hash of a canonical payload + previous hash + timestamp
 */
export function computeHash(payload, previousHash, timestamp) {
  const data = canonicalJson({ payload, previousHash, timestamp });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Record a transaction on the ledger.
 * Uses Ethereum contract if configured, otherwise falls back to hash-chain.
 * Returns { txHash, chainType, chainName, blockNumber }
 */
export async function recordTransaction(eventType, { medicineId, medicineQrId, shipmentId, shipmentQrId, userId, payload = {}, fromAddress } = {}) {
  const timestamp = new Date();

  // Get last block for chaining
  const lastTx = await BlockchainTransaction.findOne({ chainType: 'hashchain' }).sort({ blockNumber: -1 }).limit(1);
  const previousHash = lastTx ? lastTx.txHash : 'GENESIS';
  let blockNumber = lastTx ? lastTx.blockNumber + 1 : 1;

  const dataHash = computeHash(payload, previousHash, timestamp.toISOString());

  let chainType = 'hashchain';
  let txHash = computeHash({ eventType, dataHash, blockNumber, chainName, timestamp }, previousHash, timestamp.toISOString());
  let blockHash = null;

  // Ethereum path (only when a node is actually reachable)
  if (isEthereumActive()) {
    try {
      const contract = new ethereumProvider.eth.Contract(env.CONTRACT_ABI || [], contractAddress);
      const receipt = await contract.methods
        .recordEvent(eventType, dataHash)
        .send({ from: fromAddress || (await ethereumProvider.eth.getAccounts())[0], gas: 200000 });
      if (receipt && receipt.transactionHash) {
        chainType = 'ethereum';
        txHash = receipt.transactionHash;
        blockHash = receipt.blockHash || null;
        blockNumber = Number(receipt.blockNumber);
      }
    } catch (err) {
      console.warn('⚠️ Ethereum node unreachable — falling back to hash-chain:', err.message);
      chainType = 'hashchain';
    }
  }

  const doc = await BlockchainTransaction.create({
    txHash,
    chainType,
    chainName: chainType === 'ethereum' ? chainName : 'hashchain',
    network: chainType === 'ethereum' ? (env.ETHEREUM_NETWORK || '') : 'local-hashchain',
    contractAddress: chainType === 'ethereum' ? contractAddress : undefined,
    eventType,
    medicineId: medicineId || undefined,
    medicineQrId: medicineQrId || undefined,
    shipmentId: shipmentId || undefined,
    shipmentQrId: shipmentQrId || undefined,
    userId: userId || undefined,
    dataHash,
    previousHash,
    blockNumber,
    blockHash,
    fromAddress,
    payload,
    timestamp,
  });

  return {
    txHash: doc.txHash,
    chainType: doc.chainType,
    chainName: doc.chainName,
    blockNumber: doc.blockNumber,
    dataHash: doc.dataHash,
    previousHash: doc.previousHash,
  };
}

/**
 * Verify integrity of the entire hash-chain (tamper detection)
 */
export async function verifyHashChain() {
  const all = await BlockchainTransaction.find({ chainType: 'hashchain' }).sort({ blockNumber: 1 });
  let valid = true;
  let expectedPrev = 'GENESIS';

  for (const tx of all) {
    const recomputedDataHash = computeHash(tx.payload, tx.previousHash, new Date(tx.timestamp).toISOString());
    if (recomputedDataHash !== tx.dataHash || tx.previousHash !== expectedPrev) {
      valid = false;
      break;
    }
    expectedPrev = tx.txHash;
  }

  return { valid, blocks: all.length, lastBlock: all.length > 0 ? all[all.length - 1].blockNumber : 0 };
}

export async function getRecentTransactions(limit = 20) {
  return BlockchainTransaction.find().sort({ blockNumber: -1, createdAt: -1 }).limit(limit);
}

