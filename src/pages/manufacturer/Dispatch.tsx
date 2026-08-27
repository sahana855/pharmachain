import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { medicineApi, shipmentApi } from '../../lib/api';
import { authApi } from '../../lib/api';
import { saveDraft, loadDraft, clearDraft, getAllDrafts } from '../../lib/drafts';
import { Truck, Package, Send, QrCode, Save, FileText, Home } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

const MOCK_DEALERS = [
  { id: 'mock-dealer-1', name: 'Sample Medical Distributors', email: 'dealer@example.com', location: 'Pune', businessLicense: 'DEMO-LICENSE', isMock: true },
];

const MOCK_MEDICINES = [
  { id: 'mock-medicine-1', name: 'Paracetamol 500mg (Sample)', quantity: 100, price: 25, batchNumber: 'DEMO-BATCH-001', isMock: true },
];

export default function Dispatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ dealerId: '', medicineId: '', quantity: '', routePath: '' });
  const [success, setSuccess] = useState('');
  const [newShipmentQr, setNewShipmentQr] = useState<any>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [medResult, dealerResult, shipmentResult] = await Promise.allSettled([
          medicineApi.list({ manufacturerId: user?.id || '' }),
          authApi.getDealers(),
          shipmentApi.list(),
        ]);
        const errors: string[] = [];

        if (medResult.status === 'fulfilled') {
          const items = (medResult.value.items || []).filter((m: any) => m.quantity > 0);
          setMedicines(items.length ? items : MOCK_MEDICINES);
          if (!items.length) errors.push('No medicines with stock were found');
        } else {
          setMedicines(MOCK_MEDICINES);
          errors.push('Medicine API unavailable');
        }

        if (dealerResult.status === 'fulfilled') {
          const items = dealerResult.value.dealers || [];
          setDealers(items.length ? items : MOCK_DEALERS);
          if (!items.length) errors.push('No verified dealers were found');
        } else {
          setDealers(MOCK_DEALERS);
          errors.push('Dealer API unavailable');
        }

        if (shipmentResult.status === 'fulfilled') {
          setOrders(shipmentResult.value.items || []);
        } else {
          setOrders([]);
          errors.push('Shipment history unavailable');
        }

        if (errors.length) setLoadError(`${errors.join('. ')}. Sample options are shown where needed.`);
      } catch (e: any) {
        setMedicines(MOCK_MEDICINES);
        setDealers(MOCK_DEALERS);
        setOrders([]);
        setLoadError(e?.message || 'Dispatch data could not be loaded. Sample options are shown.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Check for existing draft
    if (user?.id) {
      const draft = loadDraft(user.id, 'manufacturer_dispatch');
      setHasDraft(!!draft);
    }
  }, [user]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setNewShipmentQr(null);

    try {
      const medId = form.medicineId;
      const medicine = medicines.find(m => (m._id || m.id) === medId);
      const dealer = dealers.find(d => (d._id || d.id) === form.dealerId);
      const quantity = parseInt(form.quantity, 10);

      if (!medicine || !dealer || !Number.isFinite(quantity) || medicine.quantity < quantity) {
        setSuccess('Select a valid dealer, medicine, and quantity within available stock.');
        return;
      }

      if (medicine?.isMock || dealer?.isMock) {
        setSuccess('Sample data is for display only. Add real inventory and an approved dealer before dispatching.');
        return;
      }

      // Real backend - create a shipment with a separate shipment QR
      const data = await shipmentApi.create({
        toId: dealer._id || dealer.id,
        items: [{ medicineId: medId, medicineName: medicine.name, quantity, price: medicine.price }],
        expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        routePath: form.routePath,
      });

      setSuccess(`Shipment created: ${quantity} units of ${medicine.name} to ${dealer.name}`);
      setNewShipmentQr({
        shipmentNumber: data.shipment.shipmentNumber,
        shipmentQrId: data.shipment.shipmentQrId,
        trackingUrl: data.trackingUrl,
        qr: data.qr,
      });
      setForm({ dealerId: '', medicineId: '', quantity: '', routePath: '' });

      // Refresh
      const shipData = await shipmentApi.list();
      setOrders(shipData.items || []);
    } catch (err: any) {
      alert(err?.message || 'Failed to create shipment');
    }
  };

  const selectedMedicine = medicines.find(m => (m._id || m.id) === form.medicineId);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch to Dealers</h1>
        <p className="text-gray-500 mt-1">Send medicines to dealers</p>
      </div>

      {loadError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="New Dispatch" subtitle="Select medicine and dealer" icon={<Truck />}>
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
          )}

          <form onSubmit={handleDispatch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Dealer</label>
              <select
                value={form.dealerId}
                onChange={e => setForm({ ...form, dealerId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Choose a dealer...</option>
                {dealers.map(d => (
                  <option key={d.id || d._id} value={d.id || d._id}>
                    {d.name} | {d.location || 'No location'} | {d.phone || 'No phone'} | {d.businessLicense || 'No license'} | {d.verificationStatus || 'unknown'}
                  </option>
                ))}
                {dealers.length === 0 && <option disabled>No verified dealers available</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Medicine</label>
              <select
                value={form.medicineId}
                onChange={e => setForm({ ...form, medicineId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Choose a medicine...</option>
                {medicines.map(m => <option key={m.id || m._id} value={m.id || m._id}>{m.name} (Stock: {m.quantity}){m.isMock ? ' - sample' : ''}</option>)}
                {medicines.length === 0 && <option disabled>No medicines with stock available</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter quantity"
                min="1"
                max={selectedMedicine?.quantity || 1}
                required
              />
              {selectedMedicine && (
                <p className="text-xs text-gray-400 mt-1">Available stock: {selectedMedicine.quantity} units</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Path</label>
              <input
                type="text"
                value={form.routePath}
                onChange={e => setForm({ ...form, routePath: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Mumbai Warehouse → Pune Dealer"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              <Send size={18} />
              Dispatch to Dealer
            </Button>
          </form>
        </Card>

        <Card title="Recent Dispatches" subtitle="Latest shipment dispatches" icon={<Package />}>
          <div className="overflow-y-auto max-h-96">
            {orders.map(order => (
              <div key={order._id || order.id} className="p-3 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">{order.shipmentNumber}</span>
                  <Badge variant={
                    order.status === 'DELIVERED' ? 'success' :
                    order.status === 'IN_TRANSIT' || order.status === 'DISPATCHED' ? 'info' : 'warning'
                  }>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">To: {order.toName}</p>
                {order.routePath && <p className="text-xs text-blue-600">Path: {order.routePath}</p>}
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center text-gray-500 py-8">No dispatches yet</p>}
          </div>
        </Card>
      </div>

      {/* New shipment QR display */}
      {newShipmentQr && (
        <Card title="Shipment Created — Separate Shipment QR" subtitle="Use this QR for transport tracking (different from medicine QR)" icon={<QrCode />}>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {newShipmentQr.qr?.dataUrl ? (
              <img
                src={newShipmentQr.qr.dataUrl}
                alt={`Shipment QR ${newShipmentQr.shipmentQrId}`}
                className="w-44 h-44 border border-gray-200 rounded-xl p-1 bg-white"
              />
            ) : (
              <div className="w-44 h-44 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                <QrCode size={48} />
              </div>
            )}
            <div className="text-sm space-y-1.5">
              <p><span className="text-gray-500">Shipment:</span> <span className="font-medium">{newShipmentQr.shipmentNumber}</span></p>
              <p><span className="text-gray-500">Shipment QR ID:</span> <span className="font-mono text-blue-600 font-medium">{newShipmentQr.shipmentQrId}</span></p>
              <p><span className="text-gray-500">Track URL:</span> <span className="font-mono text-xs text-gray-600">{newShipmentQr.trackingUrl}</span></p>
              <p className="text-xs text-gray-400">This is a separate QR from the medicine QR — it is used by transporters for delivery tracking.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}


