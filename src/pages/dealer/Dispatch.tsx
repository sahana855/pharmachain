import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB, generateId } from '../../lib/db';
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

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const users = await db.getAll('users');
      const allStock = await db.getAll('stock');
      const allOrders = await db.getAll('orders');

      setPharmacies(users.filter(u => u.role === 'pharmacy'));
      setStock(allStock.filter(s => s.ownerId === user?.id && s.quantity > 0));
      setOrders(allOrders.filter(o => o.fromId === user?.id || o.toId === user?.id).reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');

    const db = await getDB();
    const stockItem = await db.get('stock', form.stockId);
    const pharmacy = pharmacies.find(p => p.id === form.pharmacyId);
    const quantity = parseInt(form.quantity);

    if (!stockItem || stockItem.quantity < quantity) {
      alert('Insufficient stock!');
      return;
    }

    const orderId = generateId();
    const now = new Date().toISOString();

    stockItem.quantity -= quantity;
    if (stockItem.quantity <= 0) {
      await db.delete('stock', stockItem.id);
    } else {
      await db.put('stock', stockItem);
    }

    await db.add('orders', {
      id: orderId,
      orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
      fromId: user!.id,
      fromName: user!.name,
      fromRole: 'dealer',
      toId: pharmacy!.id,
      toName: pharmacy!.name,
      toRole: 'pharmacy',
      routePath: form.routePath,
      items: [{ medicineId: stockItem.medicineId, medicineName: stockItem.medicineName, quantity, price: stockItem.price }],
      totalAmount: quantity * stockItem.price,
      status: 'dispatched' as const,
      createdAt: now,
      updatedAt: now,
    });

    // Add stock to pharmacy
    await db.add('stock', {
      id: generateId(),
      medicineId: stockItem.medicineId,
      medicineName: stockItem.medicineName,
      batchNumber: stockItem.batchNumber,
      ownerId: pharmacy!.id,
      ownerRole: 'pharmacy',
      quantity,
      price: stockItem.price,
      expiryDate: stockItem.expiryDate,
      updatedAt: now,
    });

    setSuccess(`Dispatched ${quantity} units of ${stockItem.medicineName} to ${pharmacy!.name}`);
    setForm({ pharmacyId: '', stockId: '', quantity: '', routePath: '' });

    // Refresh
    const allStock = await db.getAll('stock');
    const allOrders = await db.getAll('orders');
    setStock(allStock.filter(s => s.ownerId === user?.id && s.quantity > 0));
    setOrders(allOrders.filter(o => o.fromId === user?.id || o.toId === user?.id).reverse());
  };

  const selectedStock = stock.find(s => s.id === form.stockId);

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
          <form onSubmit={handleDispatch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Pharmacy</label>
              <select value={form.pharmacyId} onChange={e => setForm({ ...form, pharmacyId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                <option value="">Choose a pharmacy...</option>
                {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Medicine</label>
              <select value={form.stockId} onChange={e => setForm({ ...form, stockId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                <option value="">Choose a medicine...</option>
                {stock.map(s => <option key={s.id} value={s.id}>{s.medicineName} (Stock: {s.quantity})</option>)}
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
              <div key={order.id} className="p-3 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                  <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'in_transit' ? 'info' : 'warning'}>{order.status.replace('_', ' ')}</Badge>
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
