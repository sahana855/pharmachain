import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { ScanLine, QrCode, KeyRound, CheckCircle, Truck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function DeliveryProof() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [mode, setMode] = useState<'otp' | 'qr'>('otp');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('deliveries');
      const myDeliveries = all.filter(d => d.transportId === user?.id && d.status === 'in_transit');
      setDeliveries(myDeliveries);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleStartDelivery = async (delivery: any) => {
    const db = await getDB();
    const d = await db.get('deliveries', delivery.id);
    if (d) {
      d.otpCode = generateOTP();
      d.qrCode = btoa(JSON.stringify({ deliveryId: d.id, otp: d.otpCode, timestamp: Date.now() }));
      await db.put('deliveries', d);
      setSelectedDelivery(d);
    }
  };

  const handleVerifyProof = async () => {
    if (!selectedDelivery) return;
    const db = await getDB();
    const d = await db.get('deliveries', selectedDelivery.id);
    if (!d) return;

    if (d.otpCode === otpInput) {
      d.status = 'delivered';
      d.actualDelivery = new Date().toISOString();
      d.updatedAt = new Date().toISOString();
      await db.put('deliveries', d);

      const allOrders = await db.getAll('orders');
      const order = allOrders.find(o => o.id === d.orderId);
      if (order) {
        order.status = 'delivered';
        order.updatedAt = new Date().toISOString();
        await db.put('orders', order);
      }

      setSuccess('Delivery verified successfully! Package delivered.');
      setSelectedDelivery(null);
      setOtpInput('');
      const all = await db.getAll('deliveries');
      const myDeliveries = all.filter(del => del.transportId === user?.id && del.status === 'in_transit');
      setDeliveries(myDeliveries);
    } else {
      alert('Invalid OTP! Please try again.');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Delivery Proof</h1><p className="text-gray-500 mt-1">Verify delivery with OTP or QR scan</p></div>
      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Active Deliveries" subtitle="Select a delivery to verify" icon={<Truck />}>
          <div className="space-y-2">
            {deliveries.map(d => (
              <button key={d.id} onClick={() => handleStartDelivery(d)} className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition">
                <p className="font-medium text-sm">Order #{d.orderId.substring(0, 8)}</p>
                <p className="text-xs text-gray-500">Location: {d.currentLocation}</p>
              </button>
            ))}
            {deliveries.length === 0 && <p className="text-center py-8 text-gray-500">No deliveries in transit</p>}
          </div>
        </Card>

        <Card title="Verification" icon={<ScanLine />}>
          {selectedDelivery ? (
            <div className="space-y-6">
              <div className="flex gap-2 mb-4">
                <Button size="sm" variant={mode === 'otp' ? 'primary' : 'secondary'} onClick={() => setMode('otp')}><KeyRound size={14} /> OTP</Button>
                <Button size="sm" variant={mode === 'qr' ? 'primary' : 'secondary'} onClick={() => setMode('qr')}><QrCode size={14} /> QR Code</Button>
              </div>

              {mode === 'otp' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">Generated OTP</p>
                    <p className="text-3xl font-bold text-blue-700 font-mono tracking-widest">{selectedDelivery.otpCode}</p>
                    <p className="text-xs text-gray-400 mt-1">Share this OTP with the receiver</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP from Receiver</label>
                    <input type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl font-mono tracking-widest" placeholder="000000" maxLength={6} />
                  </div>
                  <Button onClick={handleVerifyProof} className="w-full" disabled={otpInput.length !== 6}>
                    <CheckCircle size={16} /> Verify Delivery
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="inline-block p-6 bg-white border-2 border-gray-200 rounded-xl">
                    <QrCode size={180} className="text-blue-600 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-500">Scan this QR code at delivery location</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500"><ScanLine size={48} className="mx-auto mb-3 text-gray-300" /><p>Select a delivery to start verification</p></div>
          )}
        </Card>
      </div>
    </div>
  );
}
