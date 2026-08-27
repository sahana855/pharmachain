// PharmaChain Colour-Shifting Verification Result
// Displays an animated GREEN / BLUE / ORANGE / RED authentication interface
// based on the backend verification verdict. The physical QR remains unchanged.
// Animations powered by Framer Motion.
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, ShieldAlert, ScanLine } from 'lucide-react';

export interface VerificationData {
  verdict: 'GREEN' | 'BLUE' | 'ORANGE' | 'RED';
  verdictLabel?: string;
  message?: string;
  reasonCodes?: string[];
  scanNumber?: number;
  colorState?: number;
  chain?: { txHash?: string; blockNumber?: number };
  medicine?: {
    id?: string;
    name: string;
    batchNumber: string;
    manufacturerName: string;
    manufacturingDate?: string;
    expiryDate?: string;
    saltComposition?: string;
    status?: string;
    dataSource?: string;
    sourceReference?: string;
  } | null;
}

interface VerificationResultProps {
  data: VerificationData;
  isScanning?: boolean;
  scanProgress?: string;
}

const VERDICT_CONFIG = {
  GREEN: {
    label: '✓ AUTHENTIC MEDICINE',
    sublabel: 'Medicine Verified Successfully',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.4)',
    bg: 'from-emerald-900/40 to-emerald-800/20',
    borderGlow: '0 0 30px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.1)',
    icon: CheckCircle,
  },
  BLUE: {
    label: '✓ VERIFIED',
    sublabel: 'This medicine has been previously authenticated',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.4)',
    bg: 'from-blue-900/40 to-blue-800/20',
    borderGlow: '0 0 30px rgba(59,130,246,0.3), 0 0 60px rgba(59,130,246,0.1)',
    icon: CheckCircle,
  },
  ORANGE: {
    label: '⚠ SUSPICIOUS ACTIVITY',
    sublabel: 'Please verify the medicine carefully',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.4)',
    bg: 'from-amber-900/40 to-amber-800/20',
    borderGlow: '0 0 30px rgba(245,158,11,0.3), 0 0 60px rgba(245,158,11,0.1)',
    icon: AlertTriangle,
  },
  RED: {
    label: '✕ WARNING',
    sublabel: 'POTENTIAL COUNTERFEIT MEDICINE — Do not consume. Report immediately.',
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.4)',
    bg: 'from-red-900/40 to-red-800/20',
    borderGlow: '0 0 30px rgba(239,68,68,0.3), 0 0 60px rgba(239,68,68,0.1)',
    icon: XCircle,
  },
};

export default function VerificationResult({ data, isScanning = false, scanProgress = '' }: VerificationResultProps) {
  const config = VERDICT_CONFIG[data.verdict] || VERDICT_CONFIG.RED;
  const Icon = config.icon;
  const isAuthentic = data.verdict === 'GREEN' || data.verdict === 'BLUE';

  // Scanning / loading state
  if (isScanning) {
    return (
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-slate-900/50 border border-indigo-500/30 backdrop-blur-xl p-8 text-center"
          style={{ boxShadow: '0 0 40px rgba(99,102,241,0.15)' }}
        >
          {/* Animated scanning ring */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-400"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-4 rounded-full border-4 border-transparent border-t-blue-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanLine size={28} className="text-indigo-300" />
            </div>
          </div>

          <motion.h3
            className="text-lg font-bold text-white mb-2"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {scanProgress || 'Verifying Medicine...'}
          </motion.h3>

          {/* Step indicators */}
          <div className="space-y-2 text-left max-w-xs mx-auto">
            {['SCANNING QR', 'VERIFYING', 'CHECKING DATABASE', 'CHECKING BLOCKCHAIN', 'ANALYZING SCAN HISTORY'].map((step, i) => {
              const steps = ['SCANNING QR', 'VERIFYING', 'CHECKING DATABASE', 'CHECKING BLOCKCHAIN', 'ANALYZING SCAN HISTORY'];
              const currentIdx = steps.indexOf(scanProgress || '');
              const done = currentIdx > i;
              const active = currentIdx === i;
              return (
                <motion.div
                  key={step}
                  className="flex items-center gap-2 text-xs"
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: done ? 0.6 : active ? 1 : 0.3 }}
                >
                  <div className={`w-2 h-2 rounded-full ${done ? 'bg-green-400' : active ? 'bg-indigo-400' : 'bg-gray-600'}`} />
                  <span className={`${done ? 'text-green-300' : active ? 'text-indigo-200' : 'text-gray-500'}`}>{step}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={data.verdict}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative rounded-3xl overflow-hidden border"
          style={{
            borderColor: config.color,
            boxShadow: config.borderGlow,
          }}
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 opacity-10"
            animate={{
              background: [
                `radial-gradient(circle at 50% 50%, ${config.glow} 0%, transparent 70%)`,
                `radial-gradient(circle at 30% 70%, ${config.glow} 0%, transparent 70%)`,
                `radial-gradient(circle at 70% 30%, ${config.glow} 0%, transparent 70%)`,
                `radial-gradient(circle at 50% 50%, ${config.glow} 0%, transparent 70%)`,
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative p-6 bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-xl">
            {/* Verdict Header */}
            <motion.div
              className="text-center mb-5"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* Animated Icon */}
              <motion.div
                className="w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${config.color}15` }}
                animate={{
                  boxShadow: [
                    `0 0 20px ${config.glow}`,
                    `0 0 40px ${config.glow}`,
                    `0 0 20px ${config.glow}`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: data.verdict === 'RED' ? [0, -5, 5, 0] : 0,
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Icon size={40} style={{ color: config.color }} />
                </motion.div>
              </motion.div>

              <motion.h2
                className="text-xl font-bold mb-1"
                style={{ color: config.color }}
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {config.label}
              </motion.h2>
              <p className="text-sm text-gray-400">{config.sublabel}</p>
            </motion.div>

            {/* Reason Codes */}
            {data.reasonCodes && data.reasonCodes.length > 0 && (
              <motion.div
                className="flex flex-wrap gap-1.5 justify-center mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {data.reasonCodes.map((rc: string) => (
                  <span
                    key={rc}
                    className="text-xs font-mono px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${config.color}15`, color: config.color, border: `1px solid ${config.color}30` }}
                  >
                    {rc}
                  </span>
                ))}
              </motion.div>
            )}

            {/* Medicine Details */}
            {data.medicine && (
              <motion.div
                className="space-y-3 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{data.medicine.name}</p>
                  <p className="text-xs text-gray-400">Batch: {data.medicine.batchNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Manufacturer</p>
                    <p className="text-gray-300">{data.medicine.manufacturerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: data.medicine.status === 'active' ? '#05966930' : '#DC262630',
                        color: data.medicine.status === 'active' ? '#34D399' : '#F87171',
                      }}
                    >
                      {data.medicine.status}
                    </span>
                  </div>
                  {data.medicine.manufacturingDate && (
                    <div>
                      <p className="text-xs text-gray-500">Mfg Date</p>
                      <p className="text-gray-300">{new Date(data.medicine.manufacturingDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {data.medicine.expiryDate && (
                    <div>
                      <p className="text-xs text-gray-500">Expiry</p>
                      <p className="text-gray-300">{new Date(data.medicine.expiryDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {data.medicine.saltComposition && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Composition</p>
                      <p className="text-gray-300">{data.medicine.saltComposition}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Blockchain Record */}
            {data.chain && (
              <motion.div
                className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span className="flex items-center gap-1">
                  <ShieldAlert size={12} /> Blockchain Record
                </span>
                <span className="font-mono">
                  {String(data.chain.txHash || '').slice(0, 18)}… · block #{data.chain.blockNumber}
                </span>
              </motion.div>
            )}

            {/* Scan Number */}
            {data.scanNumber && (
              <motion.div
                className="mt-3 text-center text-xs text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                Scan #{data.scanNumber}
                {data.colorState !== undefined && ` · Color State: ${data.colorState}`}
              </motion.div>
            )}

            {/* Alert for non-authentic */}
            {!isAuthentic && (
              <motion.div
                className="mt-4 p-3 rounded-xl text-sm font-medium text-center"
                style={{ backgroundColor: `${config.color}15`, color: config.color, border: `1px solid ${config.color}30` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {data.verdict === 'RED'
                  ? '🚫 Do Not Consume / Contact Authorities'
                  : '⚠ Verify this medicine carefully before use'}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
