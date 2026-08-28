import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { stockApi } from '../../lib/api';
import { ArrowLeftRight, Plus, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function DamagedReturns() {
  const { user } = useAuth();
  const [returns] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ stockId: '', quantity: '', reason: '' });
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const stockRes = await stockApi.list();
      setStock((stockRes.items || []).filter((s: any) => s.quantity > 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stockItem = stock.find((s: any) => (s._id || s.id) === form.stockId);
    if (!stockItem) return;
    // No backend returns API yet — notify user
    setSuccess(`Return request for ${stockItem.medicineName} noted. Please contact your manufacturer directly.`);
    setShowModal(false);
    setForm({ stockId: '', quantity: '', reason: '' });
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returns.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No return requests</td></tr>}
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
              {stock.map((s: any) => <option key={s._id || s.id} value={s._id || s.id}>{s.medicineName} (Batch: {s.batchNumber})</option>)}
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
