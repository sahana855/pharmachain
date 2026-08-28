import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { authApi } from '../../lib/api';
import { Store, MapPin, Package } from 'lucide-react';
import Card from '../../components/ui/Card';

export default function NearbyDealers() {
  const { user } = useAuth();
  const [dealers, setDealers] = useState<any[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authApi.getDealers();
        setDealers(res.dealers || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Nearby Dealers</h1><p className="text-gray-500 mt-1">Browse available verified dealers</p></div>
      <Card title="Dealers" subtitle={`${dealers.length} dealers available`} icon={<Store />}>
        <div className="space-y-2">
          {dealers.map(d => (
            <button
              key={d._id || d.id}
              onClick={() => setSelectedDealer(d)}
              className={`w-full text-left p-3 rounded-lg border transition ${selectedDealer?._id === d._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
            >
              <p className="font-medium text-sm">{d.name}</p>
              <p className="text-xs text-gray-500">{d.email}</p>
              {d.location && <p className="text-xs text-gray-400 mt-1"><MapPin size={10} className="inline mr-1" />{d.location}</p>}
              {d.businessLicense && <p className="text-xs text-blue-500 mt-1">License: {d.businessLicense}</p>}
            </button>
          ))}
          {dealers.length === 0 && <p className="text-center py-8 text-gray-500">No verified dealers found</p>}
        </div>
      </Card>
    </div>
  );
}
