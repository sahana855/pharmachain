import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';
import { FileText, Download, BarChart3 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProductionReport() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const allMeds = await db.getAll('medicines');
      const allBatches = await db.getAll('batches');
      setMedicines(allMeds.filter(m => m.manufacturerId === user?.id));
      setBatches(allBatches.filter(b => b.manufacturerId === user?.id));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const generateCSV = () => {
    const headers = ['Medicine Name', 'Batch Number', 'Quantity', 'Price', 'Mfg Date', 'Exp Date', 'Created At'];
    const rows = medicines.map(m => [
      m.name, m.batchNumber, m.quantity, m.price,
      new Date(m.manufacturingDate).toLocaleDateString(),
      new Date(m.expiryDate).toLocaleDateString(),
      new Date(m.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = medicines.map(m => ({
    name: m.name.length > 15 ? m.name.substring(0, 15) + '...' : m.name,
    quantity: m.quantity,
    price: m.price,
  }));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Report</h1>
          <p className="text-gray-500 mt-1">View and export production data</p>
        </div>
        <Button onClick={generateCSV}><Download size={16} /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Medicines</p>
          <p className="text-2xl font-bold text-gray-900">{medicines.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Batches</p>
          <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Production</p>
          <p className="text-2xl font-bold text-gray-900">{medicines.reduce((s, m) => s + m.quantity, 0)} units</p>
        </Card>
      </div>

      <Card title="Production by Medicine" icon={<BarChart3 />}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="quantity" fill="#3B82F6" name="Quantity" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Detailed Production List" icon={<FileText />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mfg</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Exp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicines.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-sm font-mono">{m.batchNumber}</td>
                  <td className="px-4 py-3 text-sm">{m.quantity}</td>
                  <td className="px-4 py-3 text-sm">₹{m.price}</td>
                  <td className="px-4 py-3 text-sm">{new Date(m.manufacturingDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{new Date(m.expiryDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
