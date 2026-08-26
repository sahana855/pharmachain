import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { ShoppingCart, DollarSign } from 'lucide-react';
import Card from '../../components/ui/Card';

export default function SoldStock() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('sales');
      setSales(all.filter(s => s.pharmacyId === user?.id).reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const totalRevenue = sales.reduce((s, i) => s + i.totalAmount, 0);
  const totalItems = sales.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Sold Stock</h1><p className="text-gray-500 mt-1">Record of all sold medicines</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Sales</p><p className="text-2xl font-bold text-gray-900">{sales.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Items Sold</p><p className="text-2xl font-bold text-gray-900">{totalItems}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Revenue</p><p className="text-2xl font-bold text-green-600">₹{totalRevenue}</p></Card>
      </div>
      <Card title="Sales History" icon={<ShoppingCart />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Unit Price</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{s.medicineName}</td>
                  <td className="px-4 py-3 text-sm">{s.quantity}</td>
                  <td className="px-4 py-3 text-sm">₹{s.price}</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{s.totalAmount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No sales recorded</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
