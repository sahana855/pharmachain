import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { Thermometer, AlertTriangle, Package } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function ExpiryAlertPatient() {
  const { user } = useAuth();
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const stock = await db.getAll('stock');
      const pharmacy = (await db.getAll('users')).find(u => u.role === 'pharmacy');
      const myStock = stock.filter(s => s.ownerId === pharmacy?.id);
      const now = new Date();
      const twoMonths = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
      const expiring = myStock.filter(s => {
        const exp = new Date(s.expiryDate);
        return exp <= twoMonths;
      }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      setExpiringItems(expiring);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const expired = expiringItems.filter(s => new Date(s.expiryDate) < new Date());

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Expiry Alerts</h1><p className="text-gray-500 mt-1">Medicines expiring soon in your pharmacy</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Expiring Soon</p><p className="text-2xl font-bold text-yellow-600">{expiringItems.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Expired</p><p className="text-2xl font-bold text-red-600">{expired.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-green-600">{expiringItems.length - expired.length}</p></Card>
      </div>
      <Card title="Expiring Medicines" icon={<Thermometer />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {expiringItems.map(item => {
                const isExpired = new Date(item.expiryDate) < new Date();
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{item.medicineName}</td>
                    <td className="px-4 py-3 text-sm font-mono">{item.batchNumber}</td>
                    <td className="px-4 py-3 text-sm">{new Date(item.expiryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{isExpired ? <Badge variant="danger">Expired</Badge> : <Badge variant="warning">Expiring Soon</Badge>}</td>
                  </tr>
                );
              })}
              {expiringItems.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No expiring medicines</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
