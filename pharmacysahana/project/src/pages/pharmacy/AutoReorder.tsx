import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB, generateId } from '../../lib/db';
import { RefreshCw, Package, Send } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function AutoReorder() {
  const { user } = useAuth();
  const [stock, setStock] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [reorderOrders, setReorderOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const users = await db.getAll('users');
      const allStock = await db.getAll('stock');
      const allOrders = await db.getAll('orders');

      setDealers(users.filter(u => u.role === 'dealer'));
      setStock(allStock.filter(s => s.ownerId === user?.id));
      setReorderOrders(allOrders.filter(o => o.fromId === user?.id && o.toRole === 'dealer').reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleReorder = async () => {
    const db = await getDB();
    const lowStock = stock.filter(s => s.quantity < 50);

    if (lowStock.length === 0) {
      setSuccess('All items are well-stocked!');
      return;
    }

    const dealer = dealers[0];
    if (!dealer) { alert('No dealer available'); return; }

    const now = new Date().toISOString();
    const orderId = generateId();
    const items = lowStock.map(s => ({
      medicineId: s.medicineId,
      medicineName: s.medicineName,
      quantity: 100 - s.quantity,
      price: s.price,
    }));
    const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    await db.add('orders', {
      id: orderId,
      orderNumber: `REORDER-${Date.now().toString(36).toUpperCase()}`,
      fromId: user!.id,
      fromName: user!.name,
      fromRole: 'pharmacy',
      toId: dealer.id,
      toName: dealer.name,
      toRole: 'dealer',
      items,
      totalAmount: total,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    setSuccess(`Reorder sent for ${items.length} items (Total: ₹${total})`);
    const allOrders = await db.getAll('orders');
    setReorderOrders(allOrders.filter(o => o.fromId === user?.id && o.toRole === 'dealer').reverse());
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const lowStockItems = stock.filter(s => s.quantity < 50);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Auto Reorder</h1><p className="text-gray-500 mt-1">Automatically reorder low stock from dealers</p></div>
        <Button onClick={handleReorder} variant="success"><RefreshCw size={16} /> Reorder All Low Items</Button>
      </div>
      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Low Stock Items" subtitle={`${lowStockItems.length} items need reorder`} icon={<Package />}>
          {lowStockItems.length === 0 ? <p className="text-center py-8 text-gray-500">All items are well-stocked!</p> : (
            <div className="space-y-2">{lowStockItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <div><p className="font-medium text-sm">{item.medicineName}</p><p className="text-xs text-gray-500">Batch: {item.batchNumber}</p></div>
                <div className="text-right"><p className="text-sm font-bold text-red-600">{item.quantity}</p><p className="text-xs text-gray-400">in stock</p></div>
              </div>
            ))}</div>
          )}
        </Card>
        <Card title="Reorder History" icon={<RefreshCw />}>
          <div className="overflow-y-auto max-h-96">
            {reorderOrders.map(order => (
              <div key={order.id} className="p-3 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                  <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'info'}>{order.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">To: {order.toName} | ₹{order.totalAmount}</p>
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {reorderOrders.length === 0 && <p className="text-center text-gray-500 py-8">No reorder history</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
