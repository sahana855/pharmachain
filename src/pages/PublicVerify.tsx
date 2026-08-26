// PharmaChain Public Verification Page
// Opened when a physical QR code is scanned with an EXTERNAL scanner
// (Google Lens, phone camera, etc). Shows basic medicine verification
// info WITHOUT the in-app animated colour-shifting interface.
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { qrApi } from '../lib/api';
import { extractQrId } from '../lib/qr';
import {
  CheckCircle, XCircle, AlertTriangle, ShieldAlert, Loader2,
  Pill, Calendar, Factory, Barcode,
} from 'lucide-react';

export default function PublicVerify() {
  const { qrId } = useParams<{ qrId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const normalized = extractQrId(qrId || '');
    if (!normalized) {
      setError('Invalid QR code format. This does not look like a PharmaChain medicine QR.');
      setLoading(false);
      return;
    }

    qrApi
      .getByQrId(normalized)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || 'Unable to verify this QR code. Please try again later.');
        setLoading(false);
      });
  }, [qrId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 mb-3">
            <Pill size={16} className="text-indigo-600" />
            <span className="text-sm font-semibold text-gray-700">PharmaChain Verification</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Medicine Authenticity Check</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verified against the PharmaChain supply-chain database
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <Loader2 size={36} className="mx-auto mb-3 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-600">Verifying QR code...</p>
            <p className="text-xs text-gray-400 font-mono mt-1 break-all">{qrId}</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
            <XCircle size={40} className="mx-auto mb-3 text-red-500" />
            <h2 className="font-bold text-red-600 mb-1">Verification Failed</h2>
            <p className="text-sm text-gray-600">{error}</p>
            <p className="text-xs text-gray-400 mt-3 font-mono break-all">{qrId}</p>
          </div>
        )}

        {/* Result */}
        {!loading && !error && data?.medicine && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Status banner */}
            <div className={`p-4 text-center ${
              data.medicine.status === 'recalled'
                ? 'bg-red-50 border-b border-red-100'
                : 'bg-green-50 border-b border-green-100'
            }`}>
              {data.medicine.status === 'recalled' ? (
                <div className="flex items-center justify-center gap-2 text-red-700">
                  <XCircle size={20} />
                  <span className="font-bold">⚠ RECALLED — Do Not Consume</span>
                </div>
              ) : data.medicine.status === 'discontinued' ? (
                <div className="flex items-center justify-center gap-2 text-amber-600">
                  <AlertTriangle size={20} />
                  <span className="font-bold">Discontinued Product</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle size={20} />
                  <span className="font-bold">✓ Registered in PharmaChain</span>
                </div>
              )}
            </div>

            {/* Medicine details */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">{data.medicine.name}</h2>
                <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <Barcode size={13} /> Batch: <span className="font-mono">{data.medicine.batchNumber}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-0.5 flex items-center gap-1">
                    <Factory size={11} /> Manufacturer
                  </p>
                  <p className="font-medium text-gray-800">{data.medicine.manufacturerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-0.5">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    data.medicine.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {data.medicine.status}
                  </span>
                </div>
                {data.medicine.manufacturingDate && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-0.5 flex items-center gap-1">
                      <Calendar size={11} /> Mfg Date
                    </p>
                    <p className="font-medium text-gray-800">
                      {new Date(data.medicine.manufacturingDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {data.medicine.expiryDate && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-0.5">Expiry</p>
                    <p className={`font-medium ${new Date(data.medicine.expiryDate) < new Date() ? 'text-red-600' : 'text-gray-800'}`}>
                      {new Date(data.medicine.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {data.medicine.saltComposition && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-0.5">Composition</p>
                  <p className="text-sm text-gray-800">{data.medicine.saltComposition}</p>
                </div>
              )}

              {data.medicine.dataSource && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase mb-0.5">Data Source</p>
                  <p className="text-sm text-gray-800">
                    {data.medicine.dataSource}
                    {data.medicine.sourceReference && (
                      <span className="text-xs text-gray-400"> · {data.medicine.sourceReference}</span>
                    )}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <ShieldAlert size={12} /> Scanned {data.scanCount || 0} time(s)
                </span>
                <span className="font-mono">{data.qrId}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          PharmaChain · For advanced colour-shifting authentication, open this QR inside the PharmaChain app.
        </p>
      </div>
    </div>
  );
}

