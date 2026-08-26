import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { qrApi } from '../../lib/api';
import { extractQrId } from '../../lib/qr';
import QRScanner from '../../components/QRScanner';
import VerificationResult, { VerificationData } from '../../components/VerificationResult';
import { ScanLine, Search, XCircle, History, Keyboard } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function QRChecking() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [qrData, setQrData] = useState('');
  const [result, setResult] = useState<VerificationData | null>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runVerify = async (rawInput: string) => {
    setLoading(true);
    setError('');
    setResult(null);
    setScanHistory([]);

    const qrId = extractQrId(rawInput);
    if (!qrId) {
      setError('Invalid QR code. Please scan or paste a valid PharmaChain QR code (MED-XXXX).');
      setLoading(false);
      return;
    }

    try {
      // Real backend verification -> GREEN/BLUE/ORANGE/RED verdict
      const data = await qrApi.verify({
        qrId,
        location: navigator.geolocation ? 'pharmacy-counter' : undefined,
        device: `${navigator.platform || ''} ${navigator.userAgent?.slice(0, 60) || ''}`,
      });

      setResult({
        verdict: data.verdict,
        verdictLabel: data.verdictLabel,
        message: data.message,
        reasonCodes: data.reasonCodes,
        scanNumber: data.scanNumber,
        colorState: data.colorState,
        chain: data.chain,
        medicine: data.medicine,
      });

      // Load real scan history (authenticated)
      try {
        const hist = await qrApi.getHistory(qrId);
        setScanHistory(hist.history || []);
      } catch {}
    } catch (e: any) {
      // Backend returns 404 for unknown QR -> RED verdict already in response body
      if (e.status === 404) {
        setResult({
          verdict: 'RED',
          verdictLabel: 'Potential Counterfeit Medicine',
          reasonCodes: ['QR_NOT_FOUND'],
          message: e.message,
          medicine: null,
        });
      } else {
        setError(e?.message || 'Verification failed. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleCheck = async () => {
    await runVerify(qrData);
  };

  const handleScan = (decodedText: string) => {
    setQrData(decodedText);
    runVerify(decodedText);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Checking</h1>
        <p className="text-gray-500 mt-1">Verify medicine authenticity with the backend verification engine</p>
      </div>

      <Card
        title="Scan QR Code"
        subtitle="Use your camera to scan, or enter the QR data manually"
        icon={<ScanLine />}
        action={
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('scan')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${mode === 'scan' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              📷 Camera
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${mode === 'manual' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Keyboard size={12} className="inline mr-0.5" /> Manual
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {mode === 'scan' ? (
            <QRScanner onScan={handleScan} disabled={loading} />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QR Code Data</label>
              <textarea
                value={qrData}
                onChange={e => setQrData(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                rows={3}
                placeholder="Paste the QR code data here (e.g. MED-8F32A91 or the verify URL)..."
              />
              <p className="text-xs text-gray-400 mt-1">
                You can paste the QR token (MED-XXXX), the verify URL, or the full scanned text.
              </p>
              <Button onClick={handleCheck} loading={loading} className="w-full mt-3">
                <Search size={16} /> Verify Medicine
              </Button>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <XCircle size={20} /> {error}
        </div>
      )}

      {result && (
        <VerificationResult data={result} />
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card title="Scan History" subtitle="Previous verifications of this QR" icon={<History />}>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scanHistory.map((scan: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded">
                <Badge variant={
                  scan.result === 'GREEN' ? 'success' :
                  scan.result === 'BLUE' ? 'info' :
                  scan.result === 'ORANGE' ? 'warning' : 'danger'
                }>
                  {scan.result}
                </Badge>
                <span className="text-gray-600">{scan.scannedByName || 'Unknown'}</span>
                <span className="text-gray-400">({scan.scannedByRole})</span>
                <span className="text-gray-400 ml-auto">
                  {new Date(scan.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

