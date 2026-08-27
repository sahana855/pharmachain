import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { Store, MapPin, Package, DollarSign } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function NearbyDealers() {
  const { user } = useAuth();
  const [dealers, setDealers] = useState<any[]>([]);
  const [dealerStock, setDealerStock] = useState<any[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const users = await db.getAll('users');
      const allStock = await db.getAll('stock');

      const dealerUsers = users.filter(u => u.role === 'dealer');
      setDealers(dealerUsers);
      setDealerStock(allStock.filter(s => s.ownerRole === 'dealer'));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const dealerItems = selectedDealer
    ? dealerStock.filter(s => s.ownerId === selectedDealer.id)
    : [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Nearby Dealers</h1><p className="text-gray-500 mt-1">Browse stock from nearby dealers</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card title="Dealers" subtitle={`${dealers.length} dealers available`} icon={<Store />}>
            <div className="space-y-2">
              {dealers.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDealer(d)}
                  className={`w-full text-left p-3 rounded-lg border transition ${selectedDealer?.id === d.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <p className="font-medium text-sm">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {dealerStock.filter(s => s.ownerId === d.id).length} items available
                  </p>
                </button>
              ))}
              {dealers.length === 0 && <p className="text-center py-8 text-gray-500">No dealers found</p>}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title={selectedDealer ? `${selectedDealer.name} - Stock` : 'Select a Dealer'} icon={<Package />}>
            {selectedDealer ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stock</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {dealerItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{item.medicineName}</td>
                        <td className="px-4 py-3 text-sm font-mono">{item.batchNumber}</td>
                        <td className="px-4 py-3 text-sm">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm">₹{item.price}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.expiryDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {dealerItems.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No stock available from this dealer</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500"><Store size={48} className="mx-auto mb-3 text-gray-300" /><p>Select a dealer to view their stock</p></div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
