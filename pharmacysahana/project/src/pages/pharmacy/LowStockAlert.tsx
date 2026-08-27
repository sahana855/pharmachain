import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { Bell, AlertTriangle, Package } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function LowStockAlertPharmacy() {
  const { user } = useAuth();
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('stock');
      const myStock = all.filter(s => s.ownerId === user?.id);
      setLowStock(myStock.filter(s => s.quantity < 50));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Low Stock Alert</h1><p className="text-gray-500 mt-1">Items that need reordering (below 50 units)</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Low Stock Items</p><p className="text-2xl font-bold text-red-600">{lowStock.length}</p></Card>
<Card><p className="text-sm text-gray-500">Critical {'(<20)'}</p><p className="text-2xl font-bold text-orange-600">{lowStock.filter(s => s.quantity < 20).length}</p></Card>
        <Card><p className="text-sm text-gray-500">Normal Stock</p><p className="text-2xl font-bold text-green-600">{(lowStock.length > 0 ? 'Check' : 'Good')}</p></Card>
      </div>
      <Card title="Low Stock Items" icon={<Bell />}>
        {lowStock.length === 0 ? (
          <div className="text-center py-12"><AlertTriangle size={48} className="mx-auto mb-3 text-green-400" /><p className="text-gray-500 font-medium">All items are well-stocked</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stock</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {lowStock.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{s.medicineName}</td>
                    <td className="px-4 py-3 text-sm font-mono">{s.batchNumber}</td>
                    <td className="px-4 py-3"><span className={`text-sm font-bold ${s.quantity < 20 ? 'text-red-600' : 'text-orange-600'}`}>{s.quantity}</span></td>
                    <td className="px-4 py-3"><Badge variant={s.quantity < 20 ? 'danger' : 'warning'}>{s.quantity < 20 ? 'Critical' : 'Low'}</Badge></td>
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
