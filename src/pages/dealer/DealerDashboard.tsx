import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { shipmentApi, transportBoxApi, stockApi } from '../../lib/api';
import { useLiveSync } from '../../lib/events';
import { Package, Truck, ShoppingCart, AlertTriangle, ArrowLeftRight, RefreshCw, Waypoints, Boxes } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function DealerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStock: 0, lowStock: 0, expiredStock: 0, pendingOrders: 0, dispatches: 0, returns: 0, activeShipments: 0, inTransitBoxes: 0 });
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [recentBoxes, setRecentBoxes] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [shipData, boxData, stockResponse] = await Promise.all([
        shipmentApi.list(),
        transportBoxApi.list(),
        stockApi.list(),
      ]);

      const shipments = shipData.items || [];
      const boxes = boxData.boxes || [];
      const myStock = stockResponse.items || [];

      const myShipments = shipments.filter((s: any) => s.toId === user?.id || s.toId?._id === user?.id || s.fromId === user?.id || s.fromId?._id === user?.id);
      const myBoxes = boxes.filter((b: any) => b.dealerId === user?.id || b.dealerId?._id === user?.id);

      const now = new Date();
      
      setStats({
        totalStock: myStock.reduce((sum, item) => sum + (item.quantity || 0), 0),
        lowStock: myStock.filter(item => item.quantity < 50).length,
        expiredStock: myStock.filter(item => new Date(item.expiryDate) < now).length,
        pendingOrders: myShipments.filter((s: any) => s.status === 'CREATED' || s.status === 'DISPATCHED').length,
        dispatches: myShipments.filter((s: any) => s.status === 'IN_TRANSIT').length,
        returns: 0,
        activeShipments: myShipments.filter((s: any) => s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT').length,
        inTransitBoxes: myBoxes.filter((b: any) => b.status === 'IN_TRANSIT' || b.status === 'PICKED_UP').length,
      });

      setStockData([
        { name: 'Healthy Stock', value: myStock.filter(item => item.quantity >= 50 && new Date(item.expiryDate) >= now).length },
        { name: 'Low Stock', value: myStock.filter(item => item.quantity < 50 && new Date(item.expiryDate) >= now).length },
        { name: 'Expired', value: myStock.filter(item => new Date(item.expiryDate) < now).length },
      ]);

      setRecentShipments(myShipments.slice(-5).reverse());
      setRecentBoxes(myBoxes.slice(-3).reverse());
    } catch (e) {
      console.error('Failed to load dealer dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    // SSE real-time updates
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Hook handles auto-refresh on server events
  useLiveSync(fetchData);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dealer Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStock}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg"><ShoppingCart className="w-6 h-6 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Dispatches</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dispatches}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg"><Truck className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">In Transit</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeShipments}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg"><ArrowLeftRight className="w-6 h-6 text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Transit Boxes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inTransitBoxes}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Live Shipment Tracking" subtitle="Your incoming and outgoing shipments" icon={<Waypoints />}>
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
                {shipment.routePath && <p className="text-xs text-blue-600">Route: {shipment.routePath}</p>}
              </div>
            ))}
            {recentShipments.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <Truck size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No shipments yet</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Transport Boxes" subtitle="Physical box tracking" icon={<Boxes />}>
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
                <p className="text-sm">No transport boxes yet</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Stock Distribution" subtitle="Healthy vs Low vs Expired Stock" icon={<Package />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stockData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                {stockData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
