import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { getDB } from '../lib/db';
import { Activity, Clock, User } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

export default function ActivityLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('activityLogs');
      setLogs(all.reverse().slice(0, 100));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Activity Log</h1><p className="text-gray-500 mt-1">Track all system activities</p></div>
      <Card title="System Activity" subtitle={`${logs.length} recent activities`} icon={<Activity />}>
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{log.userName}</span>
                  <span className="text-gray-500"> {log.action}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default">{log.userRole}</Badge>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-center py-8 text-gray-500">No activity logs</p>}
        </div>
      </Card>
    </div>
  );
}
