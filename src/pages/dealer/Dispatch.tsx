import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { shipmentApi, authApi, stockApi } from '../../lib/api';
import { Truck, Send } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function DealerDispatch() {
  const { user } = useAuth();
  const [stock, setStock] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ pharmacyId: '', stockId: '', quantity: '', routePath: '' });
  const [success, setSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockRes, usersRes, shipmentsRes] = await Promise.all([
        stockApi.list(),
        authApi.listUsers('pharmacy'),
        shipmentApi.list()
      ]);
      setStock(stockRes.items || []);
      setPharmacies(usersRes.users || []);
      setOrders(shipmentsRes.items || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setErrorMsg('');

    const stockItem = stock.find(s => s._id === form.stockId || s.id === form.stockId);
    const pharmacy = pharmacies.find(p => p._id === form.pharmacyId || p.id === form.pharmacyId);
    const quantity = parseInt(form.quantity);

    if (!stockItem || stockItem.quantity < quantity) {
      setErrorMsg('Insufficient stock!');
      return;
    }

    try {
      await shipmentApi.create({
        toId: pharmacy._id || pharmacy.id,
        expectedDelivery: new Date(Date.now() + 86400000 * 3).toISOString(), // +3 days
        routePath: form.routePath,
        items: [
          {
            medicineId: stockItem.medicineId,
            medicineName: stockItem.medicineName,
            batchNumber: stockItem.batchNumber,
            quantity: quantity,
            price: stockItem.price
          }
        ]
      });

      setSuccess(`Dispatched ${quantity} units of ${stockItem.medicineName} to ${pharmacy.name}`);
      setForm({ pharmacyId: '', stockId: '', quantity: '', routePath: '' });
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Dispatch failed');
    }
  };

  const selectedStock = stock.find(s => s._id === form.stockId || s.id === form.stockId);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch to Pharmacies</h1>
        <p className="text-gray-500 mt-1">Send medicines to pharmacies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="New Dispatch" icon={<Truck />}>
          {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
          {errorMsg && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{errorMsg}</div>}
          
          <form onSubmit={handleDispatch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Pharmacy</label>
              <select value={form.pharmacyId} onChange={e => setForm({ ...form, pharmacyId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                <option value="">Choose a pharmacy...</option>
                {pharmacies.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Medicine</label>
              <select value={form.stockId} onChange={e => setForm({ ...form, stockId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                <option value="">Choose a medicine...</option>
                {stock.filter(s => s.quantity > 0).map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.medicineName} (Stock: {s.quantity})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min="1" max={selectedStock?.quantity || 1} required />
              {selectedStock && <p className="text-xs text-gray-400 mt-1">Available: {selectedStock.quantity} units</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Path</label>
              <input
                type="text"
                value={form.routePath}
                onChange={e => setForm({ ...form, routePath: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Delhi Hub → City Pharmacy"
                required
              />
            </div>
            <Button type="submit" className="w-full"><Send size={18} /> Dispatch to Pharmacy</Button>
          </form>
        </Card>

        <Card title="Recent Dispatches" icon={<Truck />}>
          <div className="overflow-y-auto max-h-96">
            {orders.map(order => (
              <div key={order._id || order.id} className="p-3 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">{order.shipmentNumber || order.orderNumber}</span>
                  <Badge variant={order.status === 'DELIVERED' || order.status === 'DELIVERED_TO_PHARMACY' ? 'success' : order.status === 'IN_TRANSIT' ? 'info' : 'warning'}>{order.status?.replace('_', ' ')}</Badge>
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
    </div>
  );
}
