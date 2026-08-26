import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { AlertTriangle, Clock, Bell } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function DelayAlerts() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('deliveries');
      setDeliveries(all.filter(d => d.transportId === user?.id).reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const checkForDelays = () => {
    const now = new Date();
    deliveries.forEach(async (d) => {
      if (d.expectedDelivery && d.status !== 'delivered') {
        const expected = new Date(d.expectedDelivery);
        if (now > expected && !d.delayAlert) {
          const db = await getDB();
          const delivery = await db.get('deliveries', d.id);
          if (delivery) {
            delivery.delayAlert = true;
            delivery.updatedAt = now.toISOString();
            await db.put('deliveries', delivery);

            // Create alert
            const allUsers = await db.getAll('users');
            const order = (await db.getAll('orders')).find(o => o.id === d.orderId);
            if (order) {
              const recipients = allUsers.filter(u => u.id === order.fromId || u.id === order.toId);
              for (const r of recipients) {
                await db.add('alerts', {
                  id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                  userId: r.id,
                  type: 'delay' as const,
                  title: 'Delivery Delay',
                  message: `Delivery for order ${order.orderNumber} is delayed. Expected: ${new Date(d.expectedDelivery).toLocaleString()}`,
                  read: false,
                  createdAt: now.toISOString(),
                });
              }
            }
          }
          setSuccess('Delay alerts checked and notifications sent');
        }
      }
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const delayedDeliveries = deliveries.filter(d => d.delayAlert);
  const onTimeDeliveries = deliveries.filter(d => !d.delayAlert && d.status !== 'delivered');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Delay Alerts</h1><p className="text-gray-500 mt-1">Monitor and manage delivery delays</p></div>
        <Button onClick={checkForDelays} variant="warning"><Bell size={16} /> Check for Delays</Button>
      </div>

      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Deliveries</p><p className="text-2xl font-bold text-gray-900">{deliveries.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Delayed</p><p className="text-2xl font-bold text-red-600">{delayedDeliveries.length}</p></Card>
        <Card><p className="text-sm text-gray-500">On Time</p><p className="text-2xl font-bold text-green-600">{onTimeDeliveries.length}</p></Card>
      </div>

      <Card title="Delay Alerts" icon={<AlertTriangle />}>
        {delayedDeliveries.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto mb-3 text-green-400" />
            <p className="text-gray-500 font-medium">No delays detected</p>
            <p className="text-gray-400 text-sm mt-1">All deliveries are on schedule</p>
          </div>
        ) : (
          <div className="space-y-3">
            {delayedDeliveries.map(d => (
              <div key={d.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Order #{d.orderId.substring(0, 8)}</p>
                    <p className="text-sm text-red-600 mt-1">Expected: {d.expectedDelivery ? new Date(d.expectedDelivery).toLocaleString() : 'N/A'}</p>
                    <p className="text-sm text-gray-500">Location: {d.currentLocation}</p>
                  </div>
                  <Badge variant="danger">Delayed</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
