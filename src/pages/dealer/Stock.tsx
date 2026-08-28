import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { stockApi } from '../../lib/api';
import { Package } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function DealerStock() {
  const { user } = useAuth();
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await stockApi.list();
        setStockItems(res.items || []);
      } catch (e) {
        console.error('Failed to load stock', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
        <p className="text-gray-500 mt-1">View and manage your inventory</p>
      </div>

      <Card title="Current Stock" subtitle={`${stockItems.length} items in stock`} icon={<Package />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockItems.map(item => {
                const isExpired = new Date(item.expiryDate) < new Date();
                const isLow = item.quantity < 50;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.medicineName}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.batchNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm">₹{item.price}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.expiryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {isExpired ? <Badge variant="danger">Expired</Badge> : isLow ? <Badge variant="warning">Low Stock</Badge> : <Badge variant="success">In Stock</Badge>}
                    </td>
                  </tr>
                );
              })}
              {stockItems.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No stock items found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
