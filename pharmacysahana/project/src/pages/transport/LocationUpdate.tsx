import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { shipmentApi, trackingApi } from '../../lib/api';
import { MapPin, Navigation } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function LocationUpdate() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Real backend - active shipments assigned to this transporter
        const data = await shipmentApi.list();
        setDeliveries((data.items || []).filter((d: any) => d.status !== 'DELIVERED'));
      } catch (e) {
        console.error('Failed to load shipments:', e);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleUpdateLocation = async () => {
    if (!selectedDelivery || !location) return;
    try {
      // Real backend - records a tracking event + blockchain record
      await trackingApi.updateLocation(selectedDelivery._id || selectedDelivery.id, {
        location,
        note: 'Transporter location update',
        isDemo: false,
      });
      setSuccess(`Location updated to "${location}"`);
      // Refresh
      const data = await shipmentApi.list();
      setDeliveries((data.items || []).filter((d: any) => d.status !== 'DELIVERED'));
    } catch (e: any) {
      alert(e?.message || 'Failed to update location');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Location Update</h1><p className="text-gray-500 mt-1">Update your current delivery location</p></div>

      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Active Deliveries" subtitle="Select a shipment to update location" icon={<Navigation />}>
          <div className="space-y-2">
            {deliveries.map(d => (
              <button key={d._id || d.id} onClick={() => { setSelectedDelivery(d); setLocation(d.currentLocation || ''); }} className={`w-full text-left p-3 rounded-lg border transition ${selectedDelivery?._id === d._id || selectedDelivery?.id === d.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <p className="font-medium text-sm">{d.shipmentNumber}</p>
                <p className="text-xs text-gray-500">Current: {d.currentLocation || 'Not set'}</p>
                <p className="text-xs text-gray-400">Status: {d.status.replace('_', ' ')}</p>
              </button>
            ))}
            {deliveries.length === 0 && <p className="text-center py-8 text-gray-500">No active shipments</p>}
          </div>
        </Card>

        <Card title="Update Location" icon={<MapPin />}>
          {selectedDelivery ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedDelivery.shipmentNumber}</p>
                <p className="text-sm text-gray-500 mt-1">Current Status: {selectedDelivery.status.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Location</label>
                <textarea value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="e.g., Mumbai - Andheri Warehouse (Demo Tracking Data)" />
              </div>
              <Button onClick={handleUpdateLocation} className="w-full" disabled={!location}><MapPin size={16} /> Update Location</Button>
              <p className="text-xs text-amber-600">Demo location data is clearly labelled in the system.</p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500"><MapPin size={48} className="mx-auto mb-3 text-gray-300" /><p>Select a shipment to update location</p></div>
          )}
        </Card>
      </div>
    </div>
  );
}

