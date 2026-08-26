import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB, generateId } from '../../lib/db';
import { RefreshCw, Plus, Bell, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

export default function RefillReminder() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [refills, setRefills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ medicineName: '', frequency: '' });

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const allSales = await db.getAll('sales');
      const allReminders = await db.getAll('usageReminders');
      setPurchases(allSales.filter(s => s.patientId === user?.id).reverse());
      setRefills(allReminders.filter(r => r.patientId === user?.id && r.active));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = await getDB();
    await db.add('alerts', {
      id: generateId(),
      userId: user!.id,
      type: 'low_stock',
      title: 'Refill Reminder',
      message: `It's time to refill your medicine: ${form.medicineName} (${form.frequency})`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    setShowModal(false);
    setForm({ medicineName: '', frequency: '' });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Refill Reminder</h1><p className="text-gray-500 mt-1">Set reminders to refill your medicines</p></div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} /> Set Reminder</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Purchases" subtitle="Medicines you may need to refill" icon={<RefreshCw />}>
          <div className="overflow-y-auto max-h-80">
            {purchases.map(p => (
              <div key={p.id} className="p-3 border-b border-gray-100 last:border-0">
                <p className="font-medium text-sm text-gray-900">{p.medicineName}</p>
                <p className="text-xs text-gray-500">Last purchased: {new Date(p.createdAt).toLocaleDateString()}</p>
                <p className="text-xs text-gray-400">Qty: {p.quantity}</p>
              </div>
            ))}
            {purchases.length === 0 && <p className="text-center py-8 text-gray-500">No purchases yet</p>}
          </div>
        </Card>
        <Card title="Active Refill Reminders" icon={<Bell />}>
          {refills.length === 0 ? (
            <div className="text-center py-12"><Clock size={48} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-500">No refill reminders set</p></div>
          ) : (
            <div className="space-y-2">
              {refills.map(r => (
                <div key={r.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="font-medium text-sm text-gray-900">{r.medicineName}</p>
                  <p className="text-xs text-gray-500">{r.dosage} - {r.frequency}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Set Refill Reminder">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label><input type="text" value={form.medicineName} onChange={e => setForm({ ...form, medicineName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label><input type="text" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Every 30 days" required /></div>
          <Button type="submit" className="w-full">Set Reminder</Button>
        </form>
      </Modal>
    </div>
  );
}
