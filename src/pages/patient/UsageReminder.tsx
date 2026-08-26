import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB, generateId } from '../../lib/db';
import { Clock, Plus, Bell, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

export default function UsageReminder() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ medicineName: '', dosage: '', frequency: '', time: '' });

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('usageReminders');
      setReminders(all.filter(r => r.patientId === user?.id).reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = await getDB();
    await db.add('usageReminders', {
      id: generateId(),
      patientId: user!.id,
      medicineName: form.medicineName,
      dosage: form.dosage,
      frequency: form.frequency,
      time: form.time,
      active: true,
      createdAt: new Date().toISOString(),
    });
    setShowModal(false);
    setForm({ medicineName: '', dosage: '', frequency: '', time: '' });
    const all = await db.getAll('usageReminders');
    setReminders(all.filter(r => r.patientId === user?.id).reverse());
  };

  const toggleActive = async (reminderId: string, active: boolean) => {
    const db = await getDB();
    const reminder = await db.get('usageReminders', reminderId);
    if (reminder) {
      reminder.active = active;
      await db.put('usageReminders', reminder);
      setReminders(reminders.map(r => r.id === reminderId ? { ...r, active } : r));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Usage Reminders</h1><p className="text-gray-500 mt-1">Set reminders for your medicine intake</p></div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Reminder</Button>
      </div>
      <Card title="My Reminders" subtitle={`${reminders.filter(r => r.active).length} active reminders`} icon={<Clock />}>
        {reminders.length === 0 ? (
          <div className="text-center py-12"><Bell size={48} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-500">No reminders set</p></div>
        ) : (
          <div className="space-y-3">
            {reminders.map(r => (
              <div key={r.id} className={`p-4 rounded-lg border ${r.active ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{r.medicineName}</p>
                    <p className="text-sm text-gray-600 mt-1">{r.dosage} - {r.frequency}</p>
                    <p className="text-sm text-gray-500">Time: {r.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.active ? 'success' : 'default'}>{r.active ? 'Active' : 'Paused'}</Badge>
                    <button onClick={() => toggleActive(r.id, !r.active)} className="p-1 text-gray-400 hover:text-blue-600">
                      <Bell size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Reminder">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label><input type="text" value={form.medicineName} onChange={e => setForm({ ...form, medicineName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label><input type="text" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 1 tablet" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label><input type="text" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Twice daily" required /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Time</label><input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
          <Button type="submit" className="w-full">Save Reminder</Button>
        </form>
      </Modal>
    </div>
  );
}
