import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { medicineApi } from '../../lib/api';
import { Package, Plus, Save, QrCode } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function DataEntry() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    price: '',
    manufacturingDate: '',
    expiryDate: '',
    quantity: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [reused, setReused] = useState(false);
  const [qrInfo, setQrInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setReused(false);
    setQrInfo(null);

    try {
      // Register medicine on the real backend -> gets unique MED-XXXX QR + blockchain record.
      // If the same medicine NAME already exists for this manufacturer, the backend
      // returns the EXISTING record + the SAME QR code (no random duplicate).
      const data = await medicineApi.register({
        name: form.name,
        batchNumber: `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        quantity: parseInt(form.quantity),
        price: parseFloat(form.price),
        manufacturingDate: form.manufacturingDate,
        expiryDate: form.expiryDate,
      });

      setForm({ name: '', price: '', manufacturingDate: '', expiryDate: '', quantity: '' });
      if (data.alreadyExists) {
        setReused(true);
        setSuccess(`"${data.medicine.name}" is already registered — the same QR code was reused. No duplicate created.`);
      } else {
        setSuccess(`Medicine "${form.name}" registered successfully with QR ${data.medicine.qrCodeId}`);
      }
      setQrInfo({
        qrId: data.medicine.qrCodeId,
        name: data.medicine.name,
        batch: data.medicine.batchNumber,
        qrImage: data.qr?.dataUrl || null,
        verifyUrl: data.medicine.verificationUrl,
        chain: data.chain,
      });
    } catch (err: any) {
      setSuccess('');
      alert(err?.message || 'Failed to register medicine');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medicine Data Entry</h1>
        <p className="text-gray-500 mt-1">Add new medicines to your inventory</p>
      </div>

      <Card title="New Medicine Entry" subtitle="Fill in the details below" icon={<Package />}>
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Paracetamol 500mg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="25"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="1000"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing Date</label>
              <input
                type="date"
                value={form.manufacturingDate}
                onChange={e => setForm({ ...form, manufacturingDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            <Save size={18} />
            Save Medicine
          </Button>
        </form>

        {qrInfo && (
          <div className="mt-6 pt-5 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <QrCode size={15} className="text-blue-600" /> Registered QR Code
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {qrInfo.qrImage ? (
                <img
                  src={qrInfo.qrImage}
                  alt={`QR for ${qrInfo.name}`}
                  className="w-40 h-40 border border-gray-200 rounded-xl p-1 bg-white"
                />
              ) : (
                <div className="w-40 h-40 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                  <QrCode size={40} />
                </div>
              )}
              <div className="text-sm space-y-1.5">
                <p><span className="text-gray-500">Medicine:</span> <span className="font-medium">{qrInfo.name}</span></p>
                <p><span className="text-gray-500">Batch:</span> <span className="font-mono">{qrInfo.batch}</span></p>
                <p><span className="text-gray-500">QR ID:</span> <span className="font-mono text-blue-600 font-medium">{qrInfo.qrId}</span></p>
                <p><span className="text-gray-500">Verify URL:</span> <span className="font-mono text-xs text-gray-600">{qrInfo.verifyUrl}</span></p>
                {qrInfo.chain && (
                  <p className="text-xs text-gray-400">
                    Blockchain: <span className="font-mono">{String(qrInfo.chain.txHash).slice(0, 18)}…</span> (block #{qrInfo.chain.blockNumber})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

