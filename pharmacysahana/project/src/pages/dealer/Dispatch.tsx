import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { shipmentApi, authApi } from '../../lib/api';
import { Truck, Send, Package } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function DealerDispatch() {
  const { user } = useAuth();
  const [acceptedShipments, setAcceptedShipments] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ pharmacyId: '', shipmentId: '', quantity: '', routePath: '' });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [shipResult, pharmResult] = await Promise.allSettled([
          shipmentApi.list(),
          authApi.getPharmacies(),
        ]);

        const shipments = shipResult.status === 'fulfilled' ? (shipResult.value.items || []) : [];
        const myAccepted = shipments.filter((s: any) =>
          s.toId === user?.id &&
          ['DEALER_ACCEPTED', 'DELIVERED_TO_DEALER', 'DELIVERED'].includes(s.status)
        );
        setAcceptedShipments(myAccepted);
        setRecentShipments(shipments.filter((s: any) => s.fromId === user?.id).slice(0, 20));

        const pharms = pharmResult.status === 'fulfilled' ? (pharmResult.value.pharmacies || []) : [];
        setPharmacies(pharms);

        if (pharmResult.status !== 'fulfilled') setLoadError('Could not load pharmacy list');
      } catch (e: any) {
        setLoadError(e?.message || 'Failed to load dispatch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');

    try {
      const shipment = acceptedShipments.find(s => (s._id || s.id) === form.shipmentId);
      const pharmacy = pharmacies.find(p => (p._id || p.id) === form.pharmacyId);
      const quantity = parseInt(form.quantity, 10);

      if (!shipment || !pharmacy || !Number.isFinite(quantity) || quantity <= 0) {
        setSuccess('Please select a valid shipment, pharmacy, and quantity.');
        return;
      }

      const items = (shipment.items || []).map((item: any) => ({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: item.quantity,
        price: item.price,
      }));

      const data = await shipmentApi.create({
        toId: pharmacy._id || pharmacy.id,
        items,
        expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        routePath: form.routePath || `${shipment.fromName || 'Dealer'} → ${pharmacy.name}`,
      });

      setSuccess(`Shipment ${data.shipment.shipmentNumber} created to ${pharmacy.name}`);
      setForm({ pharmacyId: '', shipmentId: '', quantity: '', routePath: '' });

      const refreshData = await shipmentApi.list();
      setRecentShipments((refreshData.items || []).filter((s: any) => s.fromId === user?.id).slice(0, 20));
    } catch (err: any) {
      setSuccess('');
      alert(err?.message || 'Failed to create shipment');
    }
  };

  const selectedShipment = acceptedShipments.find(s => (s._id || s.id) === form.shipmentId);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch to Pharmacies</h1>
        <p className="text-gray-500 mt-1">Forward accepted shipments to pharmacies</p>
      </div>

      {loadError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">{loadError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="New Dispatch" icon={<Truck />}>
          {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

          {acceptedShipments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No accepted shipments to forward</p>
              <p className="text-sm mt-1">Accept incoming shipments from manufacturers first</p>
            </div>
          ) : (
            <form onSubmit={handleDispatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Shipment to Forward</label>
                <select
                  value={form.shipmentId}
                  onChange={e => setForm({ ...form, shipmentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Choose a shipment...</option>
                  {acceptedShipments.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.shipmentNumber} — {s.items?.[0]?.medicineName || 'Medicine'} ({s.items?.length || 0} item{(s.items?.length || 0) !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Pharmacy</label>
                <select
                  value={form.pharmacyId}
                  onChange={e => setForm({ ...form, pharmacyId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Choose a pharmacy...</option>
                  {pharmacies.map(p => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} — {p.location || 'No location'}
                    </option>
                  ))}
                </select>
              </div>
              {selectedShipment && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium text-blue-900">Shipment Items:</p>
                  {(selectedShipment.items || []).map((item: any, idx: number) => (
                    <p key={idx} className="text-blue-700 text-xs">
                      {item.medicineName} x{item.quantity} @ ₹{item.price}
                    </p>
                  ))}
                  <p className="text-blue-900 text-xs font-semibold mt-1">
                    Total: ₹{selectedShipment.totalAmount}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Path</label>
                <input
                  type="text"
                  value={form.routePath}
                  onChange={e => setForm({ ...form, routePath: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Delhi Hub → City Pharmacy"
                />
              </div>
              <Button type="submit" className="w-full">
                <Send size={18} /> Dispatch to Pharmacy
              </Button>
            </form>
          )}
        </Card>

        <Card title="Recent Dispatches" icon={<Truck />}>
          <div className="overflow-y-auto max-h-96">
            {recentShipments.map(s => (
              <div key={s._id || s.id} className="p-3 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">{s.shipmentNumber}</span>
                  <Badge variant={
                    s.status === 'DELIVERED' || s.status === 'DELIVERED_TO_PHARMACY' ? 'success' :
                    s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED' ? 'info' : 'warning'
                  }>
                    {s.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">To: {s.toName}</p>
                {s.routePath && <p className="text-xs text-blue-600">Path: {s.routePath}</p>}
                <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {recentShipments.length === 0 && <p className="text-center text-gray-500 py-8">No dispatches yet</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
