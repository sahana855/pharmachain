import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { shipmentApi, trackingApi } from '../../lib/api';
import { ScanLine, QrCode, CheckCircle, Truck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function DeliveryProof() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofType, setProofType] = useState('photo');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await shipmentApi.list();
        const all = data.items || [];
        const myDeliveries = all.filter((s: any) =>
          s.transportId === user?.id &&
          ['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(s.status)
        );
        setDeliveries(myDeliveries);
      } catch (e) {
        console.error('Failed to load deliveries:', e);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleUploadProof = async () => {
    if (!selectedDelivery || !proofUrl.trim()) return;
    setSuccess('');
    try {
      await trackingApi.uploadProof(selectedDelivery._id || selectedDelivery.id, {
        proofUrl: proofUrl.trim(),
        proofType,
        location: selectedDelivery.currentLocation,
      });
      await shipmentApi.updateStatus(selectedDelivery._id || selectedDelivery.id, {
        status: 'DELIVERED',
        location: selectedDelivery.currentLocation,
      });
      setSuccess('Delivery proof uploaded and shipment marked as delivered!');
      setSelectedDelivery(null);
      setProofUrl('');
      const data = await shipmentApi.list();
      const all = data.items || [];
      setDeliveries(all.filter((s: any) =>
        s.transportId === user?.id &&
        ['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(s.status)
      ));
    } catch (err: any) {
      alert(err?.message || 'Failed to upload proof');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Proof</h1>
        <p className="text-gray-500 mt-1">Upload proof and confirm delivery</p>
      </div>

      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Active Deliveries" subtitle="Select a delivery to upload proof" icon={<Truck />}>
          <div className="space-y-2">
            {deliveries.map(d => (
              <button
                key={d._id || d.id}
                onClick={() => setSelectedDelivery(d)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  (selectedDelivery?._id || selectedDelivery?.id) === (d._id || d.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">{d.shipmentNumber}</p>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">{d.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">To: {d.toName}</p>
                <p className="text-xs text-gray-400">Location: {d.currentLocation || 'Not set'}</p>
              </button>
            ))}
            {deliveries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Truck size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No deliveries in transit</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Upload Proof" icon={<ScanLine />}>
          {selectedDelivery ? (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{selectedDelivery.shipmentNumber}</p>
                <p className="text-xs text-gray-500">To: {selectedDelivery.toName}</p>
                <p className="text-xs text-gray-400">Status: {selectedDelivery.status.replace(/_/g, ' ')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof Type</label>
                <select
                  value={proofType}
                  onChange={e => setProofType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="photo">Photo</option>
                  <option value="signature">Signature</option>
                  <option value="otp">OTP Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof URL</label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={e => setProofUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://example.com/proof-photo.jpg"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">URL to the proof image or document</p>
              </div>

              <Button onClick={handleUploadProof} className="w-full" disabled={!proofUrl.trim()}>
                <CheckCircle size={16} /> Upload Proof & Mark Delivered
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <ScanLine size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Select a delivery to upload proof</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
