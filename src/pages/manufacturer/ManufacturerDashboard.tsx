import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { shipmentApi, transportBoxApi, medicineApi } from '../../lib/api';
import { useLiveSync } from '../../lib/events';
import { Package, AlertTriangle, TrendingUp, Truck, DollarSign, RefreshCw, Waypoints, Boxes } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function ManufacturerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMedicines: 0,
    totalBatches: 0,
    activeBatches: 0,
    recalledBatches: 0,
    totalOrders: 0,
    lowStockItems: 0,
    totalStock: 0,
    activeShipments: 0,
    inTransitBoxes: 0,
  });
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [recentBoxes, setRecentBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [medData, shipData, boxData] = await Promise.all([
        medicineApi.list({ manufacturerId: user?.id || '' }),
        shipmentApi.list(),
        transportBoxApi.list(),
      ]);

      const medicines = medData.items || [];
      const shipments = shipData.items || [];
      const boxes = boxData.boxes || [];

      const myMedicines = medicines.filter((m: any) => m.manufacturerId === user?.id || m.manufacturerId?._id === user?.id || m.manufacturerId === user?.id);
      const myShipments = shipments.filter((s: any) => s.fromId === user?.id || s.fromId?._id === user?.id);
      const myBoxes = boxes.filter((b: any) => b.manufacturerId === user?.id || b.manufacturerId?._id === user?.id);

      setStats({
        totalMedicines: myMedicines.length,
        totalBatches: myMedicines.length,
        activeBatches: myMedicines.filter((m: any) => m.status === 'active').length,
        recalledBatches: myMedicines.filter((m: any) => m.status === 'recalled').length,
        totalOrders: myShipments.length,
        lowStockItems: myMedicines.filter((m: any) => m.quantity < 100).length,
        totalStock: myMedicines.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0),
        activeShipments: myShipments.filter((s: any) => s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT').length,
        inTransitBoxes: myBoxes.filter((b: any) => b.status === 'IN_TRANSIT' || b.status === 'PICKED_UP').length,
      });

      setRecentShipments(myShipments.slice(-5).reverse());
      setRecentBoxes(myBoxes.slice(-3).reverse());
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    // SSE real-time updates — instant refresh on backend changes
    useLiveSync(fetchData);
    const timer = setInterval(fetchData, 30000); // fallback
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const batchData = [
    { name: 'Active', value: stats.activeBatches },
    { name: 'Recalled', value: stats.recalledBatches },
    { name: 'Expired', value: stats.totalBatches - stats.activeBatches - stats.recalledBatches },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manufacturer Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Medicines</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMedicines}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg"><TrendingUp className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Batches</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeBatches}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg"><Truck className="w-6 h-6 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Shipments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeShipments}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Live Shipment Tracking" subtitle="Recent dispatches and their current status" icon={<Waypoints />}>
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
                <p className="text-xs text-gray-500">To: {shipment.toName} ({shipment.toRole})</p>
                {shipment.routePath && <p className="text-xs text-blue-600">Route: {shipment.routePath}</p>}
                {shipment.currentLocation && <p className="text-xs text-gray-400">Location: {shipment.currentLocation}</p>}
              </div>
            ))}
            {recentShipments.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <Truck size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No shipments yet</p>
                <Button size="sm" onClick={() => navigate('/manufacturer/dispatch')} className="mt-2">
                  Create Shipment
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card title="Transport Boxes" subtitle="Physical box tracking status" icon={<Boxes />}>
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
                {box.transporterName && <p className="text-xs text-gray-400">Transporter: {box.transporterName}</p>}
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
        <Card title="Stock Overview" subtitle="Total stock across all medicines" icon={<Package />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Total Stock', value: stats.totalStock },
              { name: 'Low Stock', value: stats.lowStockItems },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Batch Distribution" subtitle="Active vs Recalled vs Expired" icon={<Package />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={batchData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                {batchData.map((_, index) => (
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
