import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { medicineApi } from '../../lib/api';
import { RotateCcw, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

export default function BatchManagement() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  const fetchBatches = async () => {
    try {
      const res = await medicineApi.list();
      setBatches(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
          <p className="text-gray-500 mt-1">View all registered medicine batches. Use "Register Medicine" to create a new batch.</p>
        </div>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map(batch => (
                <tr key={batch._id || batch.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedBatch(batch)}>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{batch.batchNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{batch.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{batch.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(batch.manufacturingDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(batch.expiryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={batch.status === 'active' ? 'success' : batch.status === 'recalled' ? 'danger' : 'warning'}>
                      {batch.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-800" onClick={(e) => { e.stopPropagation(); setSelectedBatch(batch); }}><Eye size={16} /></button>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No batches found. Register medicines to see them here.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={!!selectedBatch} onClose={() => setSelectedBatch(null)} title="Batch Details" size="lg">
        {selectedBatch && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Batch Number</label>
                <p className="font-mono font-medium">{selectedBatch.batchNumber}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Medicine Name</label>
                <p className="font-medium">{selectedBatch.name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">QR Code ID</label>
                <p className="font-mono text-sm text-blue-600">{selectedBatch.qrCodeId}</p>
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
                <label className="text-xs text-gray-500 uppercase">Category</label>
                <p>{selectedBatch.category || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Manufacturing Date</label>
                <p>{new Date(selectedBatch.manufacturingDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Expiry Date</label>
                <p>{new Date(selectedBatch.expiryDate).toLocaleDateString()}</p>
              </div>
              {selectedBatch.saltComposition && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase">Salt Composition</label>
                  <p className="text-sm">{selectedBatch.saltComposition}</p>
                </div>
              )}
              {selectedBatch.blockchainRecord && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase">Blockchain TX Hash</label>
                  <p className="font-mono text-xs text-gray-600 break-all">{selectedBatch.blockchainRecord}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
