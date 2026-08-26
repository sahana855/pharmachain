import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { AlertTriangle, Bell, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function DrugAlert() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('alerts');
      const myAlerts = all.filter(a => a.userId === user?.id).reverse();
      setAlerts(myAlerts);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const markAsRead = async (alertId: string) => {
    const db = await getDB();
    const alert = await db.get('alerts', alertId);
    if (alert) {
      alert.read = true;
      await db.put('alerts', alert);
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, read: true } : a));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const unreadAlerts = alerts.filter(a => !a.read);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Drug Alerts</h1><p className="text-gray-500 mt-1">Safety alerts and notifications about your medicines</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Alerts</p><p className="text-2xl font-bold text-gray-900">{alerts.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Unread</p><p className="text-2xl font-bold text-red-600">{unreadAlerts.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Read</p><p className="text-2xl font-bold text-green-600">{alerts.length - unreadAlerts.length}</p></Card>
      </div>
      <Card title="Alert History" icon={<Bell />}>
        {alerts.length === 0 ? (
          <div className="text-center py-12"><AlertCircle size={48} className="mx-auto mb-3 text-green-400" /><p className="text-gray-500 font-medium">No alerts yet</p></div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-4 rounded-lg border ${alert.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`mt-0.5 ${alert.type === 'recall' ? 'text-red-500' : alert.type === 'expiry' ? 'text-yellow-500' : 'text-blue-500'}`} size={18} />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{alert.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {!alert.read && (
                    <button onClick={() => markAsRead(alert.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Mark Read</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
