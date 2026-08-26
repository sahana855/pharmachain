// PharmaChain Live Tracking Dashboard
// Shows real-time status of all shipments and transport boxes.
// Uses SSE (Server-Sent Events) for instant updates without page refresh.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { shipmentApi, transportBoxApi } from '../lib/api';
import { useLiveSync } from '../lib/events';
import {
  Truck, Package, MapPin, CheckCircle, AlertTriangle, Clock,
  ArrowRight, RefreshCw, Waypoints, Boxes, Globe, Activity,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ShipmentTimeline from '../components/ShipmentTimeline';

type Tab = 'shipments' | 'boxes';

export default function LiveTracking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('shipments');
  const [shipments, setShipments] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time sync: whenever the backend pushes an event, refresh data
  const { connected, lastEvent } = useLiveSync(() => {
    fetchData();
  });

  const fetchData = useCallback(async () => {
    try {
      const [shipData, boxData] = await Promise.all([
        shipmentApi.list(),
        transportBoxApi.list(),
      ]);

      const userShipments = (shipData.items || []).filter((s: any) => {
        const matchesFrom = s.fromId === user?.id || s.fromId?._id === user?.id;
        const matchesTo = s.toId === user?.id || s.toId?._id === user?.id;
        const matchesTransport = s.transportId === user?.id || s.transportId?._id === user?.id;
        return user?.role === 'admin' ? true : matchesFrom || matchesTo || matchesTransport;
      });

      const userBoxes = (boxData.boxes || []).filter((b: any) => {
        const matches = ['manufacturerId', 'dealerId', 'transporterId']
          .some(k => b[k] === user?.id || b[k]?._id === user?.id);
        return user?.role === 'admin' ? true : matches;
      });

      setShipments(userShipments);
      setBoxes(userBoxes);
    } catch (e) {
      console.error('Failed to load tracking data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeShipments = shipments.filter(s =>
    !['DELIVERED', 'CANCELLED'].includes(s.status)
  );
  const activeBoxes = boxes.filter(b =>
    !['DELIVERED', 'CANCELLED'].includes(b.status)
  );

  const getStatusBadge = (status: string) => {
    const variant = status === 'DELIVERED' ? 'success' :
      status === 'IN_TRANSIT' || status === 'DISPATCHED' ? 'info' :
      status === 'DELAYED' || status === 'DAMAGED' ? 'danger' :
      status === 'ASSIGNED' ? 'warning' : 'default';
    return <Badge variant={variant}>{status?.replace(/_/g, ' ') || 'UNKNOWN'}</Badge>;
  };

  const shipmentIcon = (status: string) => {
    if (status === 'DELIVERED') return <CheckCircle size={16} className="text-emerald-500" />;
    if (['DELAYED', 'DAMAGED', 'CANCELLED'].includes(status)) return <AlertTriangle size={16} className="text-red-500" />;
    return <Truck size={16} className="text-indigo-500" />;
  };

  const boxIcon = (status: string) => {
    if (status === 'DELIVERED') return <CheckCircle size={16} className="text-emerald-500" />;
    if (['DELAYED', 'DAMAGED', 'CANCELLED'].includes(status)) return <AlertTriangle size={16} className="text-red-500" />;
    return <Boxes size={16} className="text-indigo-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Tracking Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Real-time visibility into all shipments and transport boxes
            {connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE CONNECTED
              </span>
            )}
            {!connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Offline mode
              </span>
            )}
          </p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Shipments</p>
              <p className="text-2xl font-bold text-gray-900">{shipments.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg"><Truck className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Shipments</p>
              <p className="text-2xl font-bold text-gray-900">{activeShipments.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg"><Boxes className="w-6 h-6 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Boxes</p>
              <p className="text-2xl font-bold text-gray-900">{activeBoxes.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Delayed</p>
              <p className="text-2xl font-bold text-gray-900">
                {[...activeShipments, ...activeBoxes].filter(item => item.delayAlert || item.status === 'DELAYED').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
            activeTab === 'shipments'
              ? 'bg-primary-500 text-white border-b-2 border-primary-500'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Package size={16} className="inline mr-1" /> Shipments
        </button>
        <button
          onClick={() => setActiveTab('boxes')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
            activeTab === 'boxes'
              ? 'bg-primary-500 text-white border-b-2 border-primary-500'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Boxes size={16} className="inline mr-1" /> Transport Boxes
        </button>
      </div>

      {/* Shipments Tab */}
      {activeTab === 'shipments' && (
        <Card title="Active Shipments" subtitle="In-transit and recently updated shipments" icon={<Waypoints />}>
          {activeShipments.length === 0 && shipments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No shipments found</p>
            </div>
          ) : activeShipments.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-emerald-300" />
              <p className="text-sm">All shipments are delivered</p>
              <p className="text-xs mt-1">Delivered shipments: {shipments.filter(s => s.status === 'DELIVERED').length}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeShipments.map((shipment) => (
                <div
                  key={shipment._id || shipment.id}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 transition cursor-pointer"
                  onClick={() => navigate(`/track/${shipment.shipmentQrId}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {shipmentIcon(shipment.status)}
                      <span className="text-sm font-semibold text-gray-900 font-mono">{shipment.shipmentNumber}</span>
                    </div>
                    {getStatusBadge(shipment.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span>{shipment.fromName}</span>
                    <ArrowRight size={10} />
                    <span>{shipment.toName}</span>
                  </div>
                  {shipment.currentLocation && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={10} /> {shipment.currentLocation}
                    </div>
                  )}
                  {shipment.transportName && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Truck size={10} /> {shipment.transportName}
                    </div>
                  )}
                  {shipment.delayAlert && (
                    <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle size={10} /> Delay alert flagged
                    </div>
                  )}
                  {shipment.routePath && (
                    <div className="text-xs text-blue-600 mt-1">Route: {shipment.routePath}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Boxes Tab */}
      {activeTab === 'boxes' && (
        <Card title="Active Transport Boxes" subtitle="Physical boxes in transit or at a stage" icon={<Boxes />}>
          {activeBoxes.length === 0 && boxes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Boxes size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No transport boxes found</p>
            </div>
          ) : activeBoxes.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-emerald-300" />
              <p className="text-sm">All boxes delivered</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBoxes.map((box) => (
                <div
                  key={box._id || box.boxId}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 transition cursor-pointer"
                  onClick={() => navigate(`/track/${box.boxId}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {boxIcon(box.status)}
                      <span className="text-sm font-semibold text-gray-900 font-mono">{box.boxId}</span>
                    </div>
                    {getStatusBadge(box.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span>{box.source}</span>
                    <ArrowRight size={10} />
                    <span>{box.destination}</span>
                  </div>
                  {box.currentLocation && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={10} /> {box.currentLocation}
                    </div>
                  )}
                  {box.transporterName && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Truck size={10} /> {box.transporterName} · {box.vehicleNumber}
                    </div>
                  )}
                  {box.medicineNames?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {box.medicineNames.slice(0, 3).map((name: string, i: number) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{name}</span>
                      ))}
                      {box.medicineNames.length > 3 && (
                        <span className="text-xs text-gray-400">+{box.medicineNames.length - 3} more</span>
                      )}
                    </div>
                  )}
                  {box.delayAlert && (
                    <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle size={10} /> Delay alert flagged
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Connection status */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Globe size={12} />
        <Activity size={12} className={connected ? 'text-emerald-500 animate-pulse' : 'text-gray-400'} />
        <span>
          {connected
            ? `Connected via SSE — live updates active (last event ${new Date(lastEvent).toLocaleTimeString()})`
            : 'Using polling fallback — reconnect in progress'}
        </span>
      </div>
    </div>
  );
}
