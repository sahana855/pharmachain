import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { shipmentApi, transportBoxApi } from '../../lib/api';
import { useLiveSync } from '../../lib/events';
import { Truck, MapPin, Clock, AlertTriangle, CheckCircle, RefreshCw, Waypoints, Boxes } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function TransportDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeDeliveries: 0, completed: 0, delayed: 0, total: 0, inTransitBoxes: 0 });
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [recentBoxes, setRecentBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [shipData, boxData] = await Promise.all([
        shipmentApi.list(),
        transportBoxApi.list(),
      ]);

      const shipments = shipData.items || [];
      const boxes = boxData.boxes || [];

      const myShipments = shipments.filter((s: any) => s.transportId === user?.id || s.transportId?._id === user?.id);
      const myBoxes = boxes.filter((b: any) => b.transporterId === user?.id || b.transporterId?._id === user?.id);

      setStats({
        activeDeliveries: myShipments.filter((s: any) => s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED').length,
        completed: myShipments.filter((s: any) => s.status === 'DELIVERED').length,
        delayed: myShipments.filter((s: any) => s.delayAlert || s.status === 'DELAYED').length,
        total: myShipments.length,
        inTransitBoxes: myBoxes.filter((b: any) => b.status === 'IN_TRANSIT' || b.status === 'PICKED_UP').length,
      });

      setRecentShipments(myShipments.slice(-5).reverse());
      setRecentBoxes(myBoxes.slice(-3).reverse());
    } catch (e) {
      console.error('Failed to load transport dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    // SSE real-time updates
    useLiveSync(fetchData);
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg"><Truck className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Deliveries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeDeliveries}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Delayed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.delayed}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg"><Clock className="w-6 h-6 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Live Shipment Tracking" subtitle="Your assigned shipments" icon={<Waypoints />}>
          <div className="space-y-3">
            {recentShipments.map((shipment) => (
              <div key={shipment._id || shipment.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 transition cursor-pointer" onClick={() => navigate(`/track/${shipment.shipmentQrId}`)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 font-mono">{shipment.shipmentNumber}</span>
                  <Badge variant={
                    shipment.status === 'DELIVERED' ? 'success' :
                    shipment.status === 'IN_TRANSIT' || shipment.status === 'DISPATCHED' ? 'info' :
                    shipment.status === 'DELAYED' ? 'danger' : 'warning'
                  }>
                    {shipment.status?.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">From: {shipment.fromName} → To: {shipment.toName}</p>
                {shipment.currentLocation && <p className="text-xs text-gray-400">Location: {shipment.currentLocation}</p>}
              </div>
            ))}
            {recentShipments.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <Truck size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No shipments assigned</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Transport Boxes" subtitle="Physical boxes assigned to you" icon={<Boxes />}>
          <div className="space-y-3">
            {recentBoxes.map((box) => (
              <div key={box._id || box.boxId} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 transition cursor-pointer" onClick={() => navigate(`/track/${box.boxId}`)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 font-mono">{box.boxId}</span>
                  <Badge variant={
                    box.status === 'DELIVERED' ? 'success' :
                    box.status === 'DELAYED' || box.status === 'DAMAGED' ? 'danger' :
                    box.status === 'IN_TRANSIT' ? 'info' : 'warning'
                  }>
                    {box.status?.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{box.source} → {box.destination}</p>
              </div>
            ))}
            {recentBoxes.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <Boxes size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No boxes assigned</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
