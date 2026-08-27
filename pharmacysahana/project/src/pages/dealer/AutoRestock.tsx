import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB, generateId } from '../../lib/db';
import { RefreshCw, Package, Send } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function AutoRestock() {
  const { user } = useAuth();
  const [stock, setStock] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [restockOrders, setRestockOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  const getLowStockItems = (items: any[]) => items.filter(s => s.quantity < 100);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const users = await db.getAll('users');
      const allStock = await db.getAll('stock');
      const allOrders = await db.getAll('orders');

      setManufacturers(users.filter(u => u.role === 'manufacturer'));
      setStock(allStock.filter(s => s.ownerId === user?.id));
      setRestockOrders(allOrders.filter(o => o.fromId === user?.id && o.toRole === 'manufacturer').reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleAutoRestock = async () => {
    const db = await getDB();
    const lowStock = getLowStockItems(stock);

    if (lowStock.length === 0) {
      setSuccess('All items are well-stocked!');
      return;
    }

    const manufacturer = manufacturers[0];
    if (!manufacturer) {
      alert('No manufacturer available');
      return;
    }

    const now = new Date().toISOString();
    const orderId = generateId();
    const items = lowStock.map(s => ({
      medicineId: s.medicineId,
      medicineName: s.medicineName,
      quantity: 200 - s.quantity, // Restock to 200
      price: s.price,
    }));
    const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    await db.add('orders', {
      id: orderId,
      orderNumber: `RESTOCK-${Date.now().toString(36).toUpperCase()}`,
      fromId: user!.id,
      fromName: user!.name,
      fromRole: 'dealer',
      toId: manufacturer.id,
      toName: manufacturer.name,
      toRole: 'manufacturer',
      items,
      totalAmount: total,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
    });

    setSuccess(`Auto-restock request sent for ${items.length} items (Total: ₹${total})`);
    const allOrders = await db.getAll('orders');
    setRestockOrders(allOrders.filter(o => o.fromId === user?.id && o.toRole === 'manufacturer').reverse());
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const lowStockItems = getLowStockItems(stock);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Restock</h1>
          <p className="text-gray-500 mt-1">Automatically request restock from manufacturers</p>
        </div>
        <Button onClick={handleAutoRestock} variant="success">
          <RefreshCw size={16} /> Auto Restock All Low Items
        </Button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Low Stock Items" subtitle={`${lowStockItems.length} items need restock`} icon={<Package />}>
          {lowStockItems.length === 0 ? (
            <p className="text-center py-8 text-gray-500">All items are well-stocked!</p>
          ) : (
            <div className="space-y-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.medicineName}</p>
                    <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{item.quantity}</p>
                    <p className="text-xs text-gray-400">in stock</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Restock History" subtitle="Previous auto-restock requests" icon={<RefreshCw />}>
          <div className="overflow-y-auto max-h-96">
            {restockOrders.map(order => (
              <div key={order.id} className="p-3 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                  <Badge variant={order.status === 'approved' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'}>{order.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">To: {order.toName} | ₹{order.totalAmount}</p>
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {restockOrders.length === 0 && <p className="text-center text-gray-500 py-8">No restock orders yet</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
