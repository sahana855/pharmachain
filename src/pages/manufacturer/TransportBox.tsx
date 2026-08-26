// PharmaChain Transport Box Management Page
// /manufacturer/transport-box
// For manufacturers and dealers: create transport boxes, assign transporters,
// generate QR, view box list and timeline, download printable labels.
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { shipmentApi, transportBoxApi } from '../../lib/api';
import {
  Package, QrCode, Truck, Plus, Eye, ArrowRight, MapPin, Download, Printer,
  User, Calendar, Hash, ClipboardList,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ShipmentTimeline from '../../components/ShipmentTimeline';
import BoxQRLabel from '../../components/BoxQRLabel';

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

export default function TransportBox() {
  const { user } = useAuth();
  const [boxes, setBoxes] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create box form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    shipmentId: '',
    transporterId: '',
    vehicleNumber: '',
    driverName: '',
    source: '',
    destination: '',
  });
  const [creating, setCreating] = useState(false);
  const [createdBox, setCreatedBox] = useState<any>(null);

  // View box detail
  const [viewBox, setViewBox] = useState<any>(null);
  const [viewEvents, setViewEvents] = useState<any[]>([]);
  const [viewing, setViewing] = useState(false);

  // QRLabel modal
  const [showLabel, setShowLabel] = useState(false);
  const [labelBox, setLabelBox] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [boxData, shipData, dirData] = await Promise.all([
        transportBoxApi.list(),
        shipmentApi.list(),
        transportBoxApi.directory(),
      ]);
      setBoxes(boxData.boxes || []);
      setShipments(shipData.items || []);
      setTransports(dirData.transports || []);
    } catch (e) {
      console.error('Failed to load transport data:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Filter relevant shipments for create form
  const myShipments = (shipments || []).filter((s: any) =>
    s.fromId === user?.id || s.toId === user?.id || s.fromId?._id === user?.id || s.toId?._id === user?.id
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.shipmentId) return;
    setCreating(true);
    try {
      const data = await transportBoxApi.create({
        shipmentId: createForm.shipmentId,
        transporterId: createForm.transporterId || undefined,
        vehicleNumber: createForm.vehicleNumber || undefined,
        driverName: createForm.driverName || undefined,
        source: createForm.source || undefined,
        destination: createForm.destination || undefined,
      });
      setCreatedBox(data.box);
      setCreateForm({ shipmentId: '', transporterId: '', vehicleNumber: '', driverName: '', source: '', destination: '' });
      // Refresh list
      const boxData = await transportBoxApi.list();
      setBoxes(boxData.boxes || []);
    } catch (err: any) {
      alert(err?.message || 'Failed to create transport box');
    }
    setCreating(false);
  };

  const handleViewDetail = async (box: any) => {
    setViewing(true);
    try {
      const data = await transportBoxApi.get(box.boxId);
      setViewBox(data.box);
      setViewEvents(data.events || []);
    } catch (e) {
      console.error('Failed to load box detail:', e);
    }
    setViewing(false);
  };

  const handlePrintLabel = (box: any) => {
    setLabelBox(box);
    setShowLabel(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Box Management</h1>
          <p className="text-gray-500 mt-1">Create and manage transport boxes with QR tracking</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setCreatedBox(null); }}>
          <Plus size={16} /> Create Box
        </Button>
      </div>

      {/* Create Box Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setCreatedBox(null); }} title="Create Transport Box" size="lg">
        {createdBox ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Transport box created successfully!
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-sm space-y-1">
              <p><span className="font-medium">Box ID:</span> <span className="font-mono">{createdBox.boxId}</span></p>
              <p><span className="font-medium">Shipment:</span> {createdBox.shipmentNumber}</p>
              <p><span className="font-medium">Status:</span> {createdBox.status}</p>
              {createdBox.transporterName && <p><span className="font-medium">Transporter:</span> {createdBox.transporterName}</p>}
            </div>
            {createdBox.qr?.dataUrl && (
              <div className="flex justify-center">
                <BoxQRLabel box={createdBox} qrDataUrl={createdBox.qr.dataUrl} />
              </div>
            )}
            <Button onClick={() => { setShowCreate(false); setCreatedBox(null); }} variant="secondary" className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipment *</label>
              <select
                value={createForm.shipmentId}
                onChange={e => {
                  const ship = myShipments.find((s: any) => (s._id || s.id) === e.target.value);
                  setCreateForm({
                    ...createForm,
                    shipmentId: e.target.value,
                    source: ship ? ship.fromName || '' : '',
                    destination: ship ? ship.toName || '' : '',
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select a shipment...</option>
                {myShipments.map((s: any) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.shipmentNumber} - {s.fromName} → {s.toName} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                type="text" value={createForm.source}
                onChange={e => setCreateForm({ ...createForm, source: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Auto-filled from shipment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <input
                type="text" value={createForm.destination}
                onChange={e => setCreateForm({ ...createForm, destination: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Auto-filled from shipment"
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Truck size={14} /> Transporter Details (optional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Transporter</label>
                  <select
                    value={createForm.transporterId}
                    onChange={e => setCreateForm({ ...createForm, transporterId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Assign later...</option>
                    {transports.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                  <input
                    type="text" value={createForm.vehicleNumber}
                    onChange={e => setCreateForm({ ...createForm, vehicleNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., MH-01-AB-1234"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                <input
                  type="text" value={createForm.driverName}
                  onChange={e => setCreateForm({ ...createForm, driverName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Driver name"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" loading={creating}>
                <Package size={16} /> Create Transport Box & Generate QR
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Detail Modal */}
      <Modal isOpen={!!viewBox && !showLabel} onClose={() => setViewBox(null)} title={`Box Details - ${viewBox?.boxId || ''}`} size="xl">
        {viewing ? (
          <div className="text-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : viewBox ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Shipment:</span> <span className="font-medium">{viewBox.shipmentNumber}</span></div>
              <div><span className="text-gray-500">Status:</span> <Badge variant={STATUS_BADGE[viewBox.status] || 'default'}>{viewBox.status}</Badge></div>
              <div><span className="text-gray-500">Source:</span> {viewBox.source}</div>
              <div><span className="text-gray-500">Destination:</span> {viewBox.destination}</div>
              {viewBox.transporterName && <div><span className="text-gray-500">Transporter:</span> {viewBox.transporterName}</div>}
              {viewBox.vehicleNumber && <div><span className="text-gray-500">Vehicle:</span> {viewBox.vehicleNumber}</div>}
              {viewBox.driverName && <div><span className="text-gray-500">Driver:</span> {viewBox.driverName}</div>}
              {viewBox.expectedDeliveryDate && <div><span className="text-gray-500">Expected:</span> {new Date(viewBox.expectedDeliveryDate).toLocaleDateString()}</div>}
              {viewBox.deliveredAt && <div><span className="text-gray-500">Delivered:</span> {new Date(viewBox.deliveredAt).toLocaleString()}</div>}
              {viewBox.medicineNames?.length > 0 && (
                <div className="col-span-2"><span className="text-gray-500">Medicines:</span> {viewBox.medicineNames.join(', ')}</div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><ClipboardList size={14} /> Tracking Timeline</h4>
              <ShipmentTimeline events={viewEvents} />
            </div>

            <div className="flex gap-3 pt-2">
              {viewBox.qrDataUrl && (
                <Button variant="secondary" onClick={() => handlePrintLabel(viewBox)}>
                  <Printer size={14} /> QR Label
                </Button>
              )}
              <Button variant="secondary" onClick={() => setViewBox(null)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* QR Label Modal */}
      <Modal isOpen={showLabel} onClose={() => setShowLabel(false)} title="Transport Box QR Label" size="md">
        {labelBox && <BoxQRLabel box={labelBox} qrDataUrl={labelBox.qrDataUrl} />}
      </Modal>

      {/* Box List */}
      <Card title="Transport Boxes" subtitle="All transport boxes you have access to" icon={<Package />}>
        <div className="space-y-3">
          {boxes.map((box: any) => (
            <div key={box._id || box.boxId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition cursor-pointer" onClick={() => handleViewDetail(box)}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm text-gray-900">{box.boxId}</span>
                  <Badge variant={STATUS_BADGE[box.status] || 'default'}>{box.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {box.shipmentNumber} · {box.source} <ArrowRight size={10} className="inline" /> {box.destination}
                </p>
                <p className="text-xs text-gray-400">
                  {box.transporterName ? <><Truck size={10} className="inline mr-1" />{box.transporterName} · </> : ''}
                  {box.expectedDeliveryDate ? `Expected: ${new Date(box.expectedDeliveryDate).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {box.qrDataUrl && (
                  <Button size="sm" variant="ghost" onClick={(e: any) => { e.stopPropagation(); handlePrintLabel(box); }}>
                    <QrCode size={14} />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={(e: any) => { e.stopPropagation(); handleViewDetail(box); }}>
                  <Eye size={14} />
                </Button>
              </div>
            </div>
          ))}
          {boxes.length === 0 && (
            <p className="text-center text-gray-400 py-8">No transport boxes yet. Click "Create Box" to get started.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

