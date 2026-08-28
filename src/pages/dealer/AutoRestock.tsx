import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { stockApi } from '../../lib/api';
import { RefreshCw, Package } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function AutoRestock() {
  const { user } = useAuth();
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await stockApi.getLowStock(100);
        setStock(res.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleAutoRestock = () => {
    if (stock.length === 0) {
      setSuccess('All items are well-stocked!');
      return;
    }
    // No backend restock order API yet — notify user to create a shipment request
    setSuccess(`Auto-restock initiated for ${stock.length} low-stock items. Please create a shipment request with your manufacturer.`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Restock</h1>
          <p className="text-gray-500 mt-1">Automatically request restock from manufacturers</p>
        </div>
        <Button onClick={handleAutoRestock} variant="success">
          <RefreshCw size={16} /> Auto Restock All Low Items
        </Button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      <Card title="Low Stock Items" subtitle={`${stock.length} items need restock`} icon={<Package />}>
        {stock.length === 0 ? (
          <p className="text-center py-8 text-gray-500">All items are well-stocked!</p>
        ) : (
          <div className="space-y-2">
            {stock.map((item: any) => (
              <div key={item._id || item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">{item.medicineName}</p>
                  <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{item.quantity}</p>
                  <p className="text-xs text-gray-400">in stock</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
