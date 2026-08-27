import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { medicineApi, qrApi } from '../../lib/api';
import { QrCode, Download, Printer, Tablet, Package, ShieldAlert, ExternalLink } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function QRGeneration() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<any>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Real backend list - manufacturer's registered medicines
        const data = await medicineApi.list({ manufacturerId: user?.id || '' });
        setMedicines(data.items || []);
      } catch (e) {
        console.error('Failed to load medicines:', e);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleGenerate = async () => {
    if (!selectedMed) return;
    setSuccess('');
    setQr(null);
    try {
      const qrCodeId = selectedMed.qrCodeId || selectedMed.verificationUrl?.replace('/verify/', '');
      if (!qrCodeId) {
        alert('This medicine has no QR code yet. Please re-register it.');
        return;
      }
      // Backend returns the real QR image + verify URL for this medicine
      const qrInfo = await qrApi.getByQrId(qrCodeId);
      setQr({
        qrId: qrInfo.qrId || qrCodeId,
        qrImage: qrInfo.qrImage || null,
        verifyUrl: `/verify/${qrCodeId}`,
      });
      setSuccess(`QR code for ${selectedMed.name} ready`);
    } catch (e: any) {
      alert(e?.message || 'Failed to generate QR');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qr?.qrImage) return;
    const a = document.createElement('a');
    a.href = qr.qrImage;
    a.download = `${qr.qrId}.png`;
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Code Generation</h1>
        <p className="text-gray-500 mt-1">Each medicine has a unique, real QR that encodes its verify URL</p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <ShieldAlert size={16} /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Select Medicine" subtitle="Choose a registered medicine to get its QR" icon={<QrCode />}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {medicines.map(med => (
              <button
                key={med._id || med.id}
                onClick={() => { setSelectedMed(med); setQr(null); setSuccess(''); }}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedMed?._id === med._id || selectedMed?.id === med.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <p className="font-medium text-gray-900">{med.name}</p>
                <p className="text-sm text-gray-500">Batch: {med.batchNumber}</p>
                <p className="text-xs text-gray-400">
                  QR: <span className="font-mono">{med.qrCodeId}</span>
                </p>
                <p className="text-xs text-gray-400">Exp: {new Date(med.expiryDate).toLocaleDateString()}</p>
              </button>
            ))}
            {medicines.length === 0 && (
              <p className="text-center text-gray-500 py-8">No medicines registered yet</p>
            )}
          </div>
        </Card>

        <Card title="Medicine QR Code" subtitle="Scan to verify authenticity via backend" icon={<QrCode />}>
          {selectedMed ? (
            <div className="text-center">
              {/* Medicine info */}
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">{selectedMed.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Batch: {selectedMed.batchNumber}</p>
                <p className="text-xs text-gray-500">QR ID: <span className="font-mono">{selectedMed.qrCodeId}</span></p>
              </div>

              {/* QR Code Visual */}
              {qr?.qrImage ? (
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl mb-4">
                  <img src={qr.qrImage} alt={`QR for ${selectedMed.name}`} className="w-48 h-48" />
                  <p className="text-xs text-gray-400 mt-2 font-mono">{qr.qrId}</p>
                </div>
              ) : (
                <div className="inline-block p-6 bg-white border-2 border-gray-200 rounded-xl mb-4">
                  <div className="w-48 h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <QrCode size={80} className="text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Click "Generate QR" to render</p>
                </div>
              )}

              {qr && (
                <div className="mb-4 text-left bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <ExternalLink size={12} /> Verify URL:
                  </p>
                  <p className="text-sm font-mono text-blue-600 break-all">{window.location.origin}{qr.verifyUrl}</p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button onClick={handlePrint} variant="secondary"><Printer size={16} /> Print</Button>
                {qr?.qrImage && <Button onClick={handleDownload} variant="secondary"><Download size={16} /> Download</Button>}
                <Button onClick={handleGenerate}>
                  <QrCode size={16} /> {qr ? 'Regenerate' : 'Generate QR'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <QrCode size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Select a medicine to view its QR code</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

