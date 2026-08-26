import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { ShoppingCart, DollarSign, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';

export default function PurchaseHistory() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('sales');
      setPurchases(all.filter(s => s.patientId === user?.id).reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const totalSpent = purchases.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Purchase History</h1><p className="text-gray-500 mt-1">View your medicine purchase records</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Purchases</p><p className="text-2xl font-bold text-gray-900">{purchases.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Spent</p><p className="text-2xl font-bold text-green-600">₹{totalSpent}</p></Card>
        <Card><p className="text-sm text-gray-500">Items Bought</p><p className="text-2xl font-bold text-gray-900">{purchases.reduce((s, p) => s + p.quantity, 0)}</p></Card>
      </div>
      <Card title="Purchase Records" icon={<ShoppingCart />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{p.medicineName}</td>
                  <td className="px-4 py-3 text-sm">{p.quantity}</td>
                  <td className="px-4 py-3 text-sm">₹{p.price}</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{p.totalAmount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {purchases.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No purchase history</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
