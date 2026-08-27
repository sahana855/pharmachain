import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { AlertTriangle, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function ExpiryAlert() {
  const { user } = useAuth();
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('stock');
      const myStock = all.filter(s => s.ownerId === user?.id);
      const now = new Date();
      const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      const expiring = myStock.filter(s => {
        const exp = new Date(s.expiryDate);
        return exp <= threeMonths;
      }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      setStock(expiring);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const expired = stock.filter(s => new Date(s.expiryDate) < new Date());
  const expiringSoon = stock.filter(s => new Date(s.expiryDate) >= new Date());

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Expiry Alert</h1><p className="text-gray-500 mt-1">Medicines expiring within 3 months</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Expiring</p><p className="text-2xl font-bold text-orange-600">{stock.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Expired</p><p className="text-2xl font-bold text-red-600">{expired.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Expiring Soon</p><p className="text-2xl font-bold text-yellow-600">{expiringSoon.length}</p></Card>
      </div>
      <Card title="Expiring Medicines" icon={<AlertTriangle />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stock</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Days Left</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map(s => {
                const now = new Date();
                const exp = new Date(s.expiryDate);
                const diff = exp.getTime() - now.getTime();
                const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft <= 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{s.medicineName}</td>
                    <td className="px-4 py-3 text-sm font-mono">{s.batchNumber}</td>
                    <td className="px-4 py-3 text-sm">{s.quantity}</td>
                    <td className="px-4 py-3 text-sm">{new Date(s.expiryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-bold ${daysLeft <= 0 ? 'text-red-600' : daysLeft <= 30 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft} days`}
                      </span>
                    </td>
                    <td className="px-4 py-3">{isExpired ? <Badge variant="danger">Expired</Badge> : <Badge variant="warning">Expiring</Badge>}</td>
                  </tr>
                );
              })}
              {stock.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No medicines expiring soon</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
