import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { shipmentApi, transportBoxApi } from '../../lib/api';
import { useLiveSync } from '../../lib/events';
import { Package, ShoppingCart, AlertTriangle, TrendingUp, DollarSign, Percent, RefreshCw, Waypoints, Boxes, Truck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStock: 0, totalSold: 0, expiringSoon: 0, lowStock: 0, revenue: 0, discountItems: 0, activeShipments: 0 });
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [shipData] = await Promise.all([
        shipmentApi.list(),
      ]);

      const shipments = shipData.items || [];
      const myShipments = shipments.filter((s: any) => s.toId === user?.id || s.toId?._id === user?.id);

      setStats({
        totalStock: 0,
        totalSold: 0,
        expiringSoon: 0,
        lowStock: 0,
        revenue: 0,
        discountItems: 0,
        activeShipments: myShipments.filter((s: any) => s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT').length,
      });

      setRecentShipments(myShipments.slice(-5).reverse());
    } catch (e) {
      console.error('Failed to load pharmacy dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    // SSE real-time updates — replaces polling for instant refresh on backend changes
    useLiveSync(fetchData);
    // Fallback polling (reduces refresh frequency)
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
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Shipments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeShipments}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg"><ShoppingCart className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Sold Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSold}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg"><DollarSign className="w-6 h-6 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.revenue}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Tracking Section */}
      <Card title="Live Shipment Tracking" subtitle="Incoming shipments to your pharmacy" icon={<Waypoints />}>
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
              <p className="text-xs text-gray-500">From: {shipment.fromName}</p>
              {shipment.currentLocation && <p className="text-xs text-gray-400">Current: {shipment.currentLocation}</p>}
            </div>
          ))}
          {recentShipments.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              <Truck size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No incoming shipments</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
