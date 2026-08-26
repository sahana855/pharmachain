import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function PendingOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const db = await getDB();
    const all = await db.getAll('orders');
    const pending = all.filter(o => (o.toId === user?.id || o.fromId === user?.id) && o.status === 'pending');
    setOrders(pending);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const handleAction = async (orderId: string, action: 'approved' | 'cancelled') => {
    const db = await getDB();
    const order = await db.get('orders', orderId);
    if (order) {
      order.status = action;
      order.updatedAt = new Date().toISOString();
      await db.put('orders', order);
      fetchOrders();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Orders</h1>
        <p className="text-gray-500 mt-1">Orders awaiting your approval</p>
      </div>

      <Card title="Pending Orders" subtitle={`${orders.length} orders pending`} icon={<ShoppingCart />}>
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
            <p className="text-gray-500 font-medium">No pending orders</p>
            <p className="text-gray-400 text-sm mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-500">From: {order.fromName} ({order.fromRole})</p>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </div>
                <div className="space-y-2 mb-3">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.medicineName} x{item.quantity}</span>
                      <span className="text-gray-700">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{order.totalAmount}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button size="sm" variant="success" onClick={() => handleAction(order.id, 'approved')}>
                    <CheckCircle size={14} /> Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleAction(order.id, 'cancelled')}>
                    <XCircle size={14} /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
