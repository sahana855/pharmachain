import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { stockApi } from '../../lib/api';
import { Package, DollarSign } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function CurrentStock() {
  const { user } = useAuth();
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await stockApi.list();
        setStock(res.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const expiringSoon = stock.filter(s => {
    const exp = new Date(s.expiryDate);
    const diff = exp.getTime() - Date.now();
    return diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Current Stock</h1><p className="text-gray-500 mt-1">View your pharmacy inventory</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Items</p><p className="text-2xl font-bold text-gray-900">{stock.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Units</p><p className="text-2xl font-bold text-gray-900">{stock.reduce((s, i) => s + i.quantity, 0)}</p></Card>
        <Card><p className="text-sm text-gray-500">Expiring Soon</p><p className="text-2xl font-bold text-yellow-600">{expiringSoon.length}</p></Card>
      </div>
      <Card title="Stock Inventory" icon={<Package />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map(s => {
                const isExpired = new Date(s.expiryDate) < new Date();
                const isExpiring = new Date(s.expiryDate) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && !isExpired;
                const isLow = s.quantity < 50;
                return (
                  <tr key={s._id || s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{s.medicineName}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{s.batchNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{s.quantity}</td>
                    <td className="px-4 py-3 text-sm">₹{s.price}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(s.expiryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{isExpired ? <Badge variant="danger">Expired</Badge> : isExpiring ? <Badge variant="warning">Expiring Soon</Badge> : isLow ? <Badge variant="warning">Low Stock</Badge> : <Badge variant="success">In Stock</Badge>}</td>
                  </tr>
                );
              })}
              {stock.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No stock items found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
