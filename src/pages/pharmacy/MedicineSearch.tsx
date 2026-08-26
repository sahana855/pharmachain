import { useState, useEffect } from 'react';
import { getDB } from '../../lib/db';
import { Search, Package, Filter } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function MedicineSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [allMedicines, setAllMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const medicines = await db.getAll('medicines');
      setAllMedicines(medicines);
      setResults(medicines);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults(allMedicines);
      return;
    }
    const q = value.toLowerCase();
    const filtered = allMedicines.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.batchNumber.toLowerCase().includes(q) ||
      m.manufacturerName.toLowerCase().includes(q)
    );
    setResults(filtered);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Medicine Search</h1><p className="text-gray-500 mt-1">Search medicines by name, batch, or manufacturer</p></div>
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Search by medicine name, batch number, or manufacturer..."
          />
        </div>
      </Card>
      <Card title="Search Results" subtitle={`${results.length} medicines found`} icon={<Package />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Manufacturer</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stock</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {results.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-sm font-mono">{m.batchNumber}</td>
                  <td className="px-4 py-3 text-sm">{m.manufacturerName}</td>
                  <td className="px-4 py-3 text-sm">₹{m.price}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(m.expiryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><span className={`text-sm font-medium ${m.quantity < 100 ? 'text-red-600' : 'text-green-600'}`}>{m.quantity}</span></td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No medicines found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
