import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { shipmentApi, trackingApi } from '../../lib/api';
import { Clock, ArrowRight, CheckCircle, Truck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function DeliveryStatus() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  const fetchDeliveries = async () => {
    try {
      // Real backend - shipments assigned to this transporter
      const data = await shipmentApi.list();
      setDeliveries(data.items || []);
    } catch (e) {
      console.error('Failed to load shipments:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDeliveries(); }, [user]);

  const handleStatusUpdate = async (shipmentId: string, newStatus: string) => {
    try {
      // Real backend - update shipment status (IN_TRANSIT / DELIVERED)
      await shipmentApi.updateStatus(shipmentId, { status: newStatus });
      setSuccess(`Delivery status updated to "${newStatus.replace('_', ' ')}"`);
      fetchDeliveries();
    } catch (e: any) {
      alert(e?.message || 'Failed to update status');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const getNextStatus = (status: string) => {
    if (status === 'DISPATCHED') return { next: 'IN_TRANSIT', label: 'Mark In Transit' };
    if (status === 'IN_TRANSIT') return { next: 'DELIVERED', label: 'Mark Delivered' };
    return null;
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Delivery Status</h1><p className="text-gray-500 mt-1">Dispatched → In Transit → Delivered</p></div>
      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <Card title="Delivery Stages" icon={<Truck />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Shipment</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expected Delivery</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {deliveries.map(d => {
                const nextAction = getNextStatus(d.status);
                return (
                  <tr key={d._id || d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium">{d.shipmentNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.currentLocation || 'Not set'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${d.status === 'DISPATCHED' ? 'bg-yellow-400' : d.status === 'IN_TRANSIT' ? 'bg-blue-400' : 'bg-green-400'}`} />
                        <Badge variant={d.status === 'DELIVERED' ? 'success' : d.status === 'IN_TRANSIT' ? 'info' : 'warning'}>
                          {d.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{d.expectedDelivery ? new Date(d.expectedDelivery).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      {nextAction && d.status !== 'DELIVERED' ? (
                        <Button size="sm" variant={d.status === 'DISPATCHED' ? 'primary' : 'success'} onClick={() => handleStatusUpdate(d._id || d.id, nextAction.next)}>
                          <ArrowRight size={14} /> {nextAction.label}
                        </Button>
                      ) : (
                        <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Complete</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {deliveries.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No deliveries assigned</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

