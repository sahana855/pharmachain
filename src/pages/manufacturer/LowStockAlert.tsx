import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { Bell, AlertTriangle, Package } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const LOW_STOCK_THRESHOLD = 100;

export default function LowStockAlert() {
  const { user } = useAuth();
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('medicines');
      const myItems = all.filter(m => m.manufacturerId === user?.id);
      setLowStockItems(myItems.filter(m => m.quantity < LOW_STOCK_THRESHOLD));
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
        <h1 className="text-2xl font-bold text-gray-900">Low Stock Alert</h1>
        <p className="text-gray-500 mt-1">Raw materials and medicines below threshold ({LOW_STOCK_THRESHOLD} units)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Low Stock Items</p>
          <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Critical {'(<50)'}</p>
          <p className="text-2xl font-bold text-orange-600">{lowStockItems.filter(m => m.quantity < 50).length}</p>
        </Card>
      </div>

      <Card title="Low Stock Items" subtitle="Items needing restock" icon={<Bell />}>
        {lowStockItems.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={48} className="mx-auto mb-3 text-green-400" />
            <p className="text-gray-500 font-medium">All items are well-stocked</p>
            <p className="text-gray-400 text-sm mt-1">No items below the threshold</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Current Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStockItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.batchNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${item.quantity < 50 ? 'text-red-600' : 'text-orange-600'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.quantity < 50 ? 'danger' : 'warning'}>
                        {item.quantity < 50 ? 'Critical' : 'Low'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
