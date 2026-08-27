// PharmaChain Transport Box QR Scanner Page
// /shipment-scan
// For manufacturer, dealer, transport, and pharmacy roles.
// Scans a Transport Box QR (BOX-XXX), displays box info, status,
// allows status updates and location updates (for transport).
import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { transportBoxApi } from '../../lib/api';
import { extractBoxId } from '../../lib/qr';
import QRScanner from '../../components/QRScanner';
import ShipmentTimeline from '../../components/ShipmentTimeline';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import {
  ScanLine, Package, Truck, MapPin, CheckCircle, AlertTriangle,
  ArrowRight, Camera, ClipboardList, User, LayoutDashboard,
} from 'lucide-react';

const STATUS_BADGE: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  CREATED: 'info',
  ASSIGNED: 'warning',
  PICKED_UP: 'warning',
  IN_TRANSIT: 'info',
  DELAYED: 'danger',
  DAMAGED: 'danger',
  DELIVERED: 'success',
  CANCELLED: 'default',
};

// Allowed status transitions per role
const STATUS_TRANSITIONS: Record<string, string[]> = {
  manufacturer: ['ASSIGNED', 'CANCELLED'],
  dealer: ['ASSIGNED', 'DELIVERED', 'CANCELLED'],
  transport: ['PICKED_UP', 'IN_TRANSIT', 'DELAYED', 'DAMAGED', 'DELIVERED'],
  pharmacy: ['DELIVERED'],
  admin: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELAYED', 'DAMAGED', 'DELIVERED', 'CANCELLED'],
};

export default function ShipmentScan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = `/dashboard/${user?.role}`;
  const [step, setStep] = useState<'idle' | 'scanning' | 'loading' | 'result'>('idle');
  const [error, setError] = useState('');
  const [box, setBox] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [location, setLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [qrInput, setQrInput] = useState('');

  const handleScanResult = async (rawText: string) => {
    setStep('loading');
    setError('');
    setAlerts([]);
    setStatusMsg('');
    setBox(null);

    const boxId = extractBoxId(rawText);
    if (!boxId) {
      setError('Invalid QR code. Please scan a valid Transport Box QR (BOX-XXX).');
      setStep('idle');
      return;
    }

    try {
      const data = await transportBoxApi.scan(boxId, { location: 'scan-page', remarks: `Scanned from Shipment Scan page` });
      setBox(data.box);
      setAlerts(data.alerts || []);
      setStatusMsg(data.message);

      // Get full timeline
      try {
        const timeline = await transportBoxApi.getTimeline(boxId);
        setEvents(timeline.events || []);
      } catch {}
      setStep('result');
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve transport box info');
      setStep('idle');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrInput.trim()) {
      handleScanResult(qrInput.trim());
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!box) return;
    setUpdating(true);
    try {
      const data = await transportBoxApi.updateStatus(box.boxId, {
        status: newStatus,
        location: location || box.currentLocation || undefined,
        remarks,
      });
      setBox(data.box);
      setStatusMsg(`Status updated to ${newStatus}`);
      setRemarks('');
      // Refresh timeline
      try {
        const timeline = await transportBoxApi.getTimeline(box.boxId);
        setEvents(timeline.events || []);
      } catch {}
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    }
    setUpdating(false);
  };

  const handleUpdateLocation = async () => {
    if (!box || !location) return;
    setUpdating(true);
    try {
      const data = await transportBoxApi.updateLocation(box.boxId, {
        location,
        isDemo: false,
        remarks: remarks || 'Location update from scan page',
      });
      setBox({ ...box, currentLocation: data.box.currentLocation, locationUpdatedAt: data.box.locationUpdatedAt });
      setStatusMsg(`Location updated to "${location}"`);
      setLocation('');
      setRemarks('');
      try {
        const timeline = await transportBoxApi.getTimeline(box.boxId);
        setEvents(timeline.events || []);
      } catch {}
    } catch (err: any) {
      alert(err?.message || 'Failed to update location');
    }
    setUpdating(false);
  };

  const role = user?.role || '';
  const transitions = STATUS_TRANSITIONS[role] || [];
  const canUpdateLocation = role === 'transport' || role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
<div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scan Transport Box QR</h1>
            <p className="text-gray-500 mt-1">Scan a Transport Box QR (BOX-XXX) to view and update tracking</p>
          </div>
          {user && (
            <Button variant="secondary" onClick={() => navigate(dashboardPath)} className="flex-shrink-0">
              <LayoutDashboard size={14} /> Back to Dashboard
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Success message */}
        {statusMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{statusMsg}</div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
            {alerts.map((a, i) => (
              <p key={i} className="text-sm text-amber-700 flex items-center gap-2"><AlertTriangle size={14} /> {a}</p>
            ))}
          </div>
        )}

        {/* Scanner / Manual Input */}
        <Card title="Scan or Enter Box QR" icon={<ScanLine />}>
          {step !== 'result' && (
            <QRScanner onScan={handleScanResult} />
          )}
          <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
            <input
              type="text" value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              placeholder="Or paste BOX-XXX code here..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
            />
            <Button type="submit" disabled={!qrInput.trim()}>
              <ScanLine size={14} /> Lookup
            </Button>
          </form>
        </Card>

        {/* Box Result */}
        {box && step === 'result' && (
          <>
            <Card title={`Box: ${box.boxId}`} icon={<Package />}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Shipment:</span> <span className="font-medium">{box.shipmentNumber}</span></div>
                <div><span className="text-gray-500">Status:</span> <Badge variant={STATUS_BADGE[box.status] || 'default'}>{box.status}</Badge></div>
                <div className="col-span-2 flex items-center gap-2 text-gray-600">
                  <span className="text-gray-500">{box.source}</span>
                  <ArrowRight size={12} />
                  <span className="text-gray-500">{box.destination}</span>
                </div>
                {box.transporterName && (
                  <div className="col-span-2"><span className="text-gray-500">Transporter:</span> {box.transporterName}</div>
                )}
                {box.expectedDeliveryDate && (
                  <div><span className="text-gray-500">Expected:</span> {new Date(box.expectedDeliveryDate).toLocaleDateString()}</div>
                )}
                {box.deliveredAt && (
                  <div><span className="text-gray-500">Delivered:</span> {new Date(box.deliveredAt).toLocaleString()}</div>
                )}
                {box.currentLocation && (
                  <div className="col-span-2"><span className="text-gray-500">Current Location:</span> {box.currentLocation}</div>
                )}
                {box.medicineNames?.length > 0 && (
                  <div className="col-span-2"><span className="text-gray-500">Medicines:</span> {box.medicineNames.join(', ')}</div>
                )}
                {box.batchNumbers?.length > 0 && (
                  <div className="col-span-2"><span className="text-gray-500">Batch Numbers:</span> {box.batchNumbers.join(', ')}</div>
                )}
                {box.quantity > 0 && (
                  <div><span className="text-gray-500">Quantity:</span> {box.quantity}</div>
                )}
                {box.delayAlert && (
                  <div className="col-span-2"><span className="text-red-600 font-semibold">⚠ DELAY ALERT</span></div>
                )}
              </div>
            </Card>

            {/* Status Update */}
            {transitions.length > 0 && (
              <Card title="Update Status" icon={<ClipboardList />}>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {transitions.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={
                          status === 'DELIVERED' ? 'success' :
                          status === 'CANCELLED' ? 'danger' :
                          status === 'DAMAGED' || status === 'DELAYED' ? 'warning' :
                          'primary'
                        }
                        loading={updating}
                        onClick={() => handleUpdateStatus(status)}
                      >
                        {status === 'PICKED_UP' ? <Truck size={12} /> :
                         status === 'DELIVERED' ? <CheckCircle size={12} /> :
                         <ArrowRight size={12} />
                        }
                        {status.replace(/_/g, ' ')}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Remarks (optional)</label>
                    <input
                      type="text" value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any notes about this update"
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Location Update (transport only) */}
            {canUpdateLocation && (
              <Card title="Update Location" icon={<MapPin />}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Current Location</label>
                    <input
                      type="text" value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Mumbai - Andheri Warehouse"
                    />
                  </div>
                  <Button onClick={handleUpdateLocation} disabled={!location} loading={updating} size="sm">
                    <MapPin size={14} /> Update Location
                  </Button>
                  <p className="text-xs text-amber-600">Demo tracking data — clearly labelled as such.</p>
                </div>
              </Card>
            )}

            {/* Timeline */}
            <Card title="Tracking Timeline" icon={<ClipboardList />}>
              <ShipmentTimeline events={events} />
            </Card>

            <Button variant="secondary" onClick={() => { setStep('idle'); setBox(null); setEvents([]); setAlerts([]); setStatusMsg(''); setLocation(''); setRemarks(''); }}>
              <ScanLine size={14} /> Scan Another Box
            </Button>
          </>
        )}

        {step === 'loading' && (
          <div className="text-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-500">Loading box data...</p></div>
        )}
      </div>
    </div>
  );
}

