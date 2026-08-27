import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB, generateId } from '../../lib/db';
import { ArrowLeftRight, Plus, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

export default function DamagedReturns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ stockId: '', quantity: '', reason: '' });
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    const db = await getDB();
    const allReturns = await db.getAll('returns');
    const allStock = await db.getAll('stock');
    const users = await db.getAll('users');

    setReturns(allReturns.filter(r => r.fromId === user?.id).reverse());
    setStock(allStock.filter(s => s.ownerId === user?.id && s.quantity > 0));
    setManufacturers(users.filter(u => u.role === 'manufacturer'));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = await getDB();
    const stockItem = stock.find(s => s.id === form.stockId);
    const manufacturer = manufacturers[0];

    if (!stockItem || !manufacturer) return;

    await db.add('returns', {
      id: generateId(),
      medicineId: stockItem.medicineId,
      medicineName: stockItem.medicineName,
      batchNumber: stockItem.batchNumber,
      fromId: user!.id,
      fromRole: 'dealer',
      toId: manufacturer.id,
      reason: form.reason,
      quantity: parseInt(form.quantity),
      status: 'requested' as const,
      createdAt: new Date().toISOString(),
    });

    setSuccess(`Return request for ${stockItem.medicineName} submitted`);
    setShowModal(false);
    setForm({ stockId: '', quantity: '', reason: '' });
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Damaged Medicine Returns</h1>
          <p className="text-gray-500 mt-1">Return damaged or expired medicines to manufacturer</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} /> New Return</Button>
      </div>

      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <Card title="Return Requests" subtitle={`${returns.length} returns`} icon={<ArrowLeftRight />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returns.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{r.medicineName}</td>
                  <td className="px-4 py-3 text-sm font-mono">{r.batchNumber}</td>
                  <td className="px-4 py-3 text-sm">{r.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{r.reason}</td>
                  <td className="px-4 py-3"><Badge variant={r.status === 'completed' ? 'success' : r.status === 'approved' ? 'info' : 'warning'}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {returns.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No return requests</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Return Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Medicine</label>
            <select value={form.stockId} onChange={e => setForm({ ...form, stockId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
              <option value="">Choose...</option>
              {stock.map(s => <option key={s.id} value={s.id}>{s.medicineName} (Batch: {s.batchNumber})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min="1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return</label>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="Describe the issue..." required />
          </div>
          <Button type="submit" className="w-full"><AlertCircle size={16} /> Submit Return Request</Button>
        </form>
      </Modal>
    </div>
  );
}
