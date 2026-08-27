import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB, generateId } from '../../lib/db';
import { Activity, AlertTriangle, Plus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

export default function SideEffectReporting() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ medicineName: '', batchNumber: '', description: '', severity: 'mild' as 'mild' | 'moderate' | 'severe' });

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const all = await db.getAll('sideEffects');
      setReports(all.filter(r => r.patientId === user?.id).reverse());
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = await getDB();
    await db.add('sideEffects', {
      id: generateId(),
      patientId: user!.id,
      medicineName: form.medicineName,
      batchNumber: form.batchNumber,
      description: form.description,
      severity: form.severity,
      createdAt: new Date().toISOString(),
    });
    setShowModal(false);
    setForm({ medicineName: '', batchNumber: '', description: '', severity: 'mild' });
    const all = await db.getAll('sideEffects');
    setReports(all.filter(r => r.patientId === user?.id).reverse());
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Side Effect Reporting</h1><p className="text-gray-500 mt-1">Report any side effects you experience</p></div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} /> Report Side Effect</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Reports</p><p className="text-2xl font-bold text-gray-900">{reports.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Mild</p><p className="text-2xl font-bold text-green-600">{reports.filter(r => r.severity === 'mild').length}</p></Card>
        <Card><p className="text-sm text-gray-500">Severe</p><p className="text-2xl font-bold text-red-600">{reports.filter(r => r.severity === 'severe').length}</p></Card>
      </div>
      <Card title="Reported Side Effects" icon={<Activity />}>
        {reports.length === 0 ? (
          <div className="text-center py-12"><AlertTriangle size={48} className="mx-auto mb-3 text-green-400" /><p className="text-gray-500 font-medium">No side effects reported</p></div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{r.medicineName}</p>
                    <p className="text-sm text-gray-500">Batch: {r.batchNumber}</p>
                    <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={r.severity === 'severe' ? 'danger' : r.severity === 'moderate' ? 'warning' : 'default'}>{r.severity}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Report Side Effect">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label><input type="text" value={form.medicineName} onChange={e => setForm({ ...form, medicineName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label><input type="text" value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as any })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} required /></div>
          <Button type="submit" className="w-full">Submit Report</Button>
        </form>
      </Modal>
    </div>
  );
}
