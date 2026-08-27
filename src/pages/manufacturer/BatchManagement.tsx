import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB, generateId } from '../../lib/db';
import { RotateCcw, Plus, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

export default function BatchManagement() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [form, setForm] = useState({
    medicineName: '',
    quantity: '',
    manufacturingDate: '',
    expiryDate: '',
  });

  const fetchBatches = async () => {
    const db = await getDB();
    const all = await db.getAll('batches');
    setBatches(all.filter(b => b.manufacturerId === user?.id).reverse());
    setLoading(false);
  };

  useEffect(() => { fetchBatches(); }, [user]);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = await getDB();
    const batchNumber = `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    await db.add('batches', {
      id: generateId(),
      batchNumber,
      medicineName: form.medicineName,
      manufacturerId: user!.id,
      quantity: parseInt(form.quantity),
      manufacturingDate: form.manufacturingDate,
      expiryDate: form.expiryDate,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    });

    setForm({ medicineName: '', quantity: '', manufacturingDate: '', expiryDate: '' });
    setShowModal(false);
    fetchBatches();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
          <p className="text-gray-500 mt-1">Manage batch numbers, manufacturing & expiry dates</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} /> Generate Batch
        </Button>
      </div>

      <Card title="All Batches" subtitle={`${batches.length} batches found`} icon={<RotateCcw />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mfg Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Exp Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map(batch => (
                <tr key={batch.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedBatch(batch)}>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{batch.batchNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{batch.medicineName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{batch.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(batch.manufacturingDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(batch.expiryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={
                      batch.status === 'active' ? 'success' :
                      batch.status === 'recalled' ? 'danger' : 'warning'
                    }>
                      {batch.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Generate Batch Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate New Batch">
        <form onSubmit={handleGenerateBatch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
            <input
              type="text"
              value={form.medicineName}
              onChange={e => setForm({ ...form, medicineName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Paracetamol 500mg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="1000"
              min="1"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing Date</label>
              <input
                type="date"
                value={form.manufacturingDate}
                onChange={e => setForm({ ...form, manufacturingDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full">Generate Batch</Button>
        </form>
      </Modal>

      {/* Batch Detail Modal */}
      <Modal isOpen={!!selectedBatch} onClose={() => setSelectedBatch(null)} title="Batch Details" size="lg">
        {selectedBatch && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Batch Number</label>
                <p className="font-mono font-medium">{selectedBatch.batchNumber}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Medicine</label>
                <p className="font-medium">{selectedBatch.medicineName}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Quantity</label>
                <p className="font-medium">{selectedBatch.quantity}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Status</label>
                <Badge variant={selectedBatch.status === 'active' ? 'success' : 'danger'}>{selectedBatch.status}</Badge>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Manufacturing Date</label>
                <p>{new Date(selectedBatch.manufacturingDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Expiry Date</label>
                <p>{new Date(selectedBatch.expiryDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
