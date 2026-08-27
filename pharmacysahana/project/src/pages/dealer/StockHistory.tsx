import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { History, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function StockHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const allOrders = await db.getAll('orders');
      const myOrders = allOrders.filter(o => o.fromId === user?.id || o.toId === user?.id).reverse();
      setOrders(myOrders);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock History</h1>
        <p className="text-gray-500 mt-1">Incoming & outgoing stock transactions</p>
      </div>

      <Card title="Transaction History" subtitle={`${orders.length} transactions`} icon={<History />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Party</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => {
                const isIncoming = order.toId === user?.id;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {isIncoming ? (
                        <div className="flex items-center gap-1 text-green-600"><ArrowDownRight size={16} /><span className="text-xs font-medium">IN</span></div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600"><ArrowUpRight size={16} /><span className="text-xs font-medium">OUT</span></div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-medium">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm">{isIncoming ? order.fromName : order.toName}</td>
                    <td className="px-4 py-3 text-sm">{order.items.map((i: any) => `${i.medicineName} x${i.quantity}`).join(', ')}</td>
                    <td className="px-4 py-3 text-sm">₹{order.totalAmount}</td>
                    <td className="px-4 py-3"><Badge variant={order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'info'}>{order.status.replace('_', ' ')}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No transactions found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
