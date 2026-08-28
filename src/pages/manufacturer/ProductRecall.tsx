import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { medicineApi } from '../../lib/api';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

export default function ProductRecall() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmRecall, setConfirmRecall] = useState<any>(null);
  const [success, setSuccess] = useState('');
  const [recalling, setRecalling] = useState(false);

  const fetchMedicines = async () => {
    try {
      const res = await medicineApi.list({ status: 'active' });
      setMedicines(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedicines(); }, [user]);

  const handleRecall = async () => {
    if (!confirmRecall) return;
    setRecalling(true);
    try {
      await medicineApi.updateStatus(confirmRecall._id || confirmRecall.id, 'recalled');
      setSuccess(`${confirmRecall.name} (Batch: ${confirmRecall.batchNumber}) has been recalled successfully`);
      setConfirmRecall(null);
      fetchMedicines();
    } catch (e: any) {
      alert(e.message || 'Recall failed');
    } finally {
      setRecalling(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Recall</h1>
        <p className="text-gray-500 mt-1">Recall defective batches from the supply chain</p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      <Card title="Active Medicines" subtitle="Click on a medicine to recall it" icon={<AlertTriangle />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Exp Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicines.map(med => (
                <tr key={med._id || med.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{med.batchNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{med.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{med.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(med.expiryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={med.status === 'active' ? 'success' : 'danger'}>{med.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {med.status === 'active' && (
                      <Button size="sm" variant="danger" onClick={() => setConfirmRecall(med)}>
                        <AlertCircle size={14} /> Recall
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {medicines.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No active medicines found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={!!confirmRecall} onClose={() => setConfirmRecall(null)} title="Confirm Product Recall">
        {confirmRecall && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle size={20} />
                <span className="font-semibold">Warning: This action cannot be undone</span>
              </div>
              <p className="text-sm text-red-600">
                You are about to recall batch <strong>{confirmRecall.batchNumber}</strong>
                of <strong>{confirmRecall.name}</strong>. This will be recorded on the blockchain.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Batch:</span> {confirmRecall.batchNumber}</div>
              <div><span className="text-gray-500">Medicine:</span> {confirmRecall.name}</div>
              <div><span className="text-gray-500">Quantity:</span> {confirmRecall.quantity}</div>
              <div><span className="text-gray-500">Expiry:</span> {new Date(confirmRecall.expiryDate).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-3">
              <Button variant="danger" onClick={handleRecall} disabled={recalling} className="flex-1">
                {recalling ? 'Processing...' : 'Confirm Recall'}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmRecall(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
