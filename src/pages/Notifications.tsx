import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { getDB } from '../lib/db';
import { Bell, CheckCheck, Mail, MessageSquare } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('notifications');
      setNotifications(all.filter(n => n.userId === user?.id).reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const markAllRead = async () => {
    const db = await getDB();
    for (const n of notifications) {
      if (!n.sent) {
        n.sent = true;
        await db.put('notifications', n);
      }
    }
    setNotifications(notifications.map(n => ({ ...n, sent: true })));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const unread = notifications.filter(n => !n.sent).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Email and SMS notifications</p>
        </div>
        {unread > 0 && (
          <Button onClick={markAllRead} variant="secondary">
            <CheckCheck size={16} /> Mark All Read
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold text-gray-900">{notifications.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Unread</p><p className="text-2xl font-bold text-red-600">{unread}</p></Card>
        <Card><p className="text-sm text-gray-500">Read</p><p className="text-2xl font-bold text-green-600">{notifications.length - unread}</p></Card>
      </div>
      <Card title="Notification History" icon={<Bell />}>
        {notifications.length === 0 ? (
          <div className="text-center py-12"><Bell size={48} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-500">No notifications</p></div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id} className={`p-4 rounded-lg border ${n.sent ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${n.type === 'email' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {n.type === 'email' ? <Mail size={16} className="text-blue-600" /> : <MessageSquare size={16} className="text-green-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={n.type === 'email' ? 'info' : 'success'}>{n.type}</Badge>
                      <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                      {!n.sent && <Badge variant="warning">New</Badge>}
                    </div>
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
