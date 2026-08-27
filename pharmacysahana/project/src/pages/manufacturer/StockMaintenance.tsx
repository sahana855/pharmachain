import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { Package, Edit2, Save, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function StockMaintenance() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: '', price: '' });

  const fetchMedicines = async () => {
    const db = await getDB();
    const all = await db.getAll('medicines');
    setMedicines(all.filter(m => m.manufacturerId === user?.id));
    setLoading(false);
  };

  useEffect(() => { fetchMedicines(); }, [user]);

  const handleEdit = (medicine: any) => {
    setEditingId(medicine.id);
    setEditForm({ quantity: medicine.quantity.toString(), price: medicine.price.toString() });
  };

  const handleSave = async (id: string) => {
    const db = await getDB();
    const medicine = await db.get('medicines', id);
    if (medicine) {
      medicine.quantity = parseInt(editForm.quantity);
      medicine.price = parseFloat(editForm.price);
      await db.put('medicines', medicine);
    }
    setEditingId(null);
    fetchMedicines();
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ quantity: '', price: '' });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Maintenance</h1>
        <p className="text-gray-500 mt-1">Manage your medicine inventory</p>
      </div>

      <Card title="Medicine Stock" subtitle={`${medicines.length} medicines found`} icon={<Package />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicines.map((med) => (
                <tr key={med.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{med.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{med.batchNumber}</td>
                  <td className="px-4 py-3">
                    {editingId === med.id ? (
                      <input
                        type="number"
                        value={editForm.quantity}
                        onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                      />
                    ) : (
                      <span className={`text-sm font-medium ${med.quantity < 100 ? 'text-red-600' : 'text-gray-900'}`}>
                        {med.quantity}
                        {med.quantity < 100 && <Badge variant="danger" className="ml-2">Low</Badge>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === med.id ? (
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">₹{med.price}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(med.expiryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {editingId === med.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => handleSave(med.id)}>
                          <Save size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel}>
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(med)}>
                        <Edit2 size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {medicines.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No medicines found. Add medicines from Data Entry.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

