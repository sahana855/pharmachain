import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { Truck, MapPin, Clock, Package } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function TransportData() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const orders = await db.getAll('orders');
      const allDeliveries = await db.getAll('deliveries');

      // Find orders related to this patient's pharmacy
      const pharmacy = (await db.getAll('users')).find(u => u.role === 'pharmacy');
      const relevantOrders = orders.filter(o => o.toId === pharmacy?.id || o.fromId === pharmacy?.id);
      const relevantDeliveries = allDeliveries.filter(d => relevantOrders.some(o => o.id === d.orderId));
      setDeliveries(relevantDeliveries.reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'dispatched': return <Badge variant="warning">Dispatched</Badge>;
      case 'in_transit': return <Badge variant="info">In Transit</Badge>;
      case 'delivered': return <Badge variant="success">Delivered</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Transport Tracking</h1><p className="text-gray-500 mt-1">Track your medicine deliveries in real-time</p></div>
      <Card title="Delivery Tracking" icon={<Truck />}>
        {deliveries.length === 0 ? (
          <div className="text-center py-12"><Package size={48} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-500">No deliveries to track</p></div>
        ) : (
          <div className="space-y-4">
            {deliveries.map(d => (
              <div key={d.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-gray-900">Order #{d.orderId.substring(0, 8)}</p>
                    <p className="text-sm text-gray-500 mt-1">Transport: {d.transportName}</p>
                  </div>
                  {getStatusIcon(d.status)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /><span className="text-gray-600">Current: {d.currentLocation}</span></div>
                  <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /><span className="text-gray-600">Expected: {d.expectedDelivery ? new Date(d.expectedDelivery).toLocaleString() : 'N/A'}</span></div>
                </div>
                {d.delayAlert && (
                  <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded flex items-center gap-1"><Badge variant="danger">Delay Alert</Badge> Delivery is delayed</div>
                )}
                <div className="mt-3">
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${d.status === 'dispatched' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <span className="text-xs text-gray-500">Dispatched</span>
                    <div className="flex-1 h-0.5 bg-gray-200 mx-1" />
                    <div className={`w-3 h-3 rounded-full ${d.status === 'in_transit' ? 'bg-blue-500' : d.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-xs text-gray-500">In Transit</span>
                    <div className="flex-1 h-0.5 bg-gray-200 mx-1" />
                    <div className={`w-3 h-3 rounded-full ${d.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-xs text-gray-500">Delivered</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
