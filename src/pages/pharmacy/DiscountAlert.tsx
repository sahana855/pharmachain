import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { Percent, Tag, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function DiscountAlert() {
  const { user } = useAuth();
  const [discountItems, setDiscountItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('stock');
      const myStock = all.filter(s => s.ownerId === user?.id);
      const now = new Date();
      const twoMonths = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
      const nearExpiry = myStock.filter(s => {
        const exp = new Date(s.expiryDate);
        return exp > now && exp <= twoMonths;
      });
      setDiscountItems(nearExpiry);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const applyDiscount = async (stockId: string) => {
    const db = await getDB();
    const item = await db.get('stock', stockId);
    if (item) {
      const alertId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      await db.add('alerts', {
        id: alertId,
        userId: user!.id,
        type: 'discount',
        title: 'Discount Available',
        message: `${item.medicineName} (${item.batchNumber}) is near expiry. Apply discount to sell faster.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      setSuccess(`Discount alert created for ${item.medicineName}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Discount Alert</h1><p className="text-gray-500 mt-1">Near-expiry medicines eligible for discount</p></div>
      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Discount Eligible</p><p className="text-2xl font-bold text-purple-600">{discountItems.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Units</p><p className="text-2xl font-bold text-gray-900">{discountItems.reduce((s, i) => s + i.quantity, 0)}</p></Card>
        <Card><p className="text-sm text-gray-500">Potential Revenue</p><p className="text-2xl font-bold text-gray-900">₹{discountItems.reduce((s, i) => s + i.quantity * i.price * 0.8, 0)}</p></Card>
      </div>
      <Card title="Discount Eligible Items" subtitle="Expiring within 2 months" icon={<Percent />}>
        {discountItems.length === 0 ? (
          <div className="text-center py-12"><AlertTriangle size={48} className="mx-auto mb-3 text-green-400" /><p className="text-gray-500 font-medium">No items near expiry</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stock</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Discount Price</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {discountItems.map(item => {
                  const discountPrice = Math.round(item.price * 0.8);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{item.medicineName}</td>
                      <td className="px-4 py-3 text-sm font-mono">{item.batchNumber}</td>
                      <td className="px-4 py-3 text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm">₹{item.price}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.expiryDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><Badge variant="success">₹{discountPrice} (20% off)</Badge></td>
                      <td className="px-4 py-3"><Button size="sm" variant="warning" onClick={() => applyDiscount(item.id)}><Tag size={14} /> Alert</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
