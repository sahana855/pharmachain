// PharmaChain Public Transport Box Tracking Page
// /track/BOX-XXX - opened when a Transport Box QR is scanned with an external scanner.
// Also handles /track/SHIP-XXX (shipment tracking) so the page is future-proof.
// No authentication required (public tracking).
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { transportBoxApi, trackingApi } from '../../lib/api';
import { useLiveSync } from '../../lib/events';
import { extractBoxId, extractQrId } from '../../lib/qr';
import {
  Package, Truck, MapPin, CheckCircle, AlertTriangle, XCircle, Loader2,
  Pill, Boxes, ArrowRight, Calendar, User, RefreshCw, LayoutDashboard, Radio,
} from 'lucide-react';
import ShipmentTimeline from '../../components/ShipmentTimeline';

// Fallback refresh interval when SSE is unavailable (ms)
const LIVE_REFRESH_MS = 60000;

export default function TrackBox() {
  const { qrId } = useParams<{ qrId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [isBox, setIsBox] = useState(false);
  const [live, setLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const tokenRef = useRef<string>('');
  const isBoxRef = useRef<boolean>(false);

  // Initial load - fetch tracking info for the scanned QR
  useEffect(() => {
    const token = extractQrId(qrId || '');
    if (!token) {
      setError('Invalid QR code format. This is not a valid PharmaChain tracking QR.');
      setLoading(false);
      return;
    }
    tokenRef.current = token;
    const boxId = extractBoxId(token);
    isBoxRef.current = !!boxId;
    setIsBox(!!boxId);

    const fetch = () => {
      if (boxId) {
        return transportBoxApi.getPublic(boxId);
      }
      return trackingApi.getPublicTracking(token);
    };

    fetch()
      .then((res) => { setData(res); setLoading(false); })
      .catch((e: any) => {
        setError(e?.message || 'Unable to load tracking info.');
        setLoading(false);
      });
  }, [qrId]);

  // Live-tracking auto-refresh: poll every 5s while `live` is enabled
  const refresh = useCallback(async () => {
    if (!tokenRef.current) return;
    setRefreshing(true);
    try {
      const res = isBoxRef.current
        ? await transportBoxApi.getPublic(tokenRef.current)
        : await trackingApi.getPublicTracking(tokenRef.current);
      setData(res);
      setError('');
    } catch {
      // keep last data on transient errors
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(refresh, LIVE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [live, refresh]);

  // SSE real-time updates replace polling
  useLiveSync(() => {
    if (live && tokenRef.current) {
      refresh();
    }
  });

  const dashboardPath = user ? `/dashboard/${user.role}` : '/login';

  const statusBadge = (status: string) => {
    if (status === 'DELIVERED') return 'bg-emerald-100 text-emerald-700';
    if (status === 'DELAYED' || status === 'DAMAGED' || status === 'CANCELLED') return 'bg-red-100 text-red-700';
    if (status === 'IN_TRANSIT') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  };

  const box = isBox ? (data?.box || null) : null;
  const shipment = !isBox ? (data?.shipment || null) : null;
  const events = isBox ? (data?.events || []) : (data?.events || []);
  const boxStatus = box?.status || shipment?.status || '';
  const trackedItem = box || shipment;
  const isMoving = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELAYED'].includes(boxStatus);
  const markerPosition = boxStatus === 'DELIVERED'
    ? 94
    : boxStatus === 'IN_TRANSIT'
    ? 68
    : boxStatus === 'PICKED_UP'
    ? 52
    : boxStatus === 'ASSIGNED'
    ? 34
    : boxStatus === 'DELAYED'
    ? 60
    : 18;
  const traveledLocations = events
    .filter((event: any) => event.location)
    .reduce((locations: any[], event: any) => {
      const location = String(event.location).trim();
      if (!location || locations.some(item => item.location.toLowerCase() === location.toLowerCase())) return locations;
      locations.push({ location, createdAt: event.createdAt, type: event.eventType || event.type });
      return locations;
    }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4">
      <div className="w-full max-w-lg mt-6">
{/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 mb-3">
            <Pill size={16} className="text-indigo-600" />
            <span className="text-sm font-semibold text-gray-700">PharmaChain</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {isBox ? 'Transport Box Tracking' : 'Shipment Tracking'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Verify the journey of your shipment in real-time
          </p>

          {/* Back to Dashboard + Live controls */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {user && (
              <button
                onClick={() => navigate(dashboardPath)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <LayoutDashboard size={13} /> Back to Dashboard
              </button>
            )}
            <button
              onClick={() => setLive(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                live
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}
            >
              <Radio size={13} className={live ? 'animate-pulse' : ''} />
              {live ? '● LIVE' : 'Live OFF'}
            </button>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <Loader2 size={36} className="mx-auto mb-3 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-600">Loading tracking information...</p>
            <p className="text-xs text-gray-400 font-mono mt-1 break-all">{qrId}</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
            <XCircle size={40} className="mx-auto mb-3 text-red-500" />
            <h2 className="font-bold text-red-600 mb-1">Tracking Not Found</h2>
            <p className="text-sm text-gray-600">{error}</p>
            <p className="text-xs text-gray-400 mt-3 font-mono break-all">{qrId}</p>
          </div>
        )}

        {/* Result */}
        {!loading && !error && data && (
          <div className="space-y-4">
            {/* Status banner */}
            <div className={`p-4 rounded-xl border text-sm ${statusBadge(boxStatus)}`}>
              <div className="flex items-center gap-3">
                {isBox ? <Boxes size={20} /> : <Package size={20} />}
                <div>
                  <p className="font-bold">{boxStatus || 'UNKNOWN'}</p>
                  <p className="text-xs opacity-80">
                    {box ? `Box ${box.boxId} · Track ${box.trackingUrl}` : `Shipment ${shipment.shipmentNumber}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Delay alert */}
            {(box?.delayAlert || shipment?.delayAlert) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle size={16} /> This item has been flagged as delayed.
              </div>
            )}

            {/* Row fields */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-0.5 flex items-center gap-1"><User size={11} /> Transporter</p>
                  <p className="font-medium text-gray-800">{box?.transporterName || shipment?.transportName || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-0.5 flex items-center gap-1"><MapPin size={11} /> Current Location</p>
                  <p className="font-medium text-gray-800">{box?.currentLocation || shipment?.currentLocation || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-600 flex-1">{trackedItem?.source}</span>
                <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                <span className="text-gray-600 flex-1 text-right">{trackedItem?.destination}</span>
              </div>
              {shipment?.routePath && (
                <p className="text-xs text-indigo-600"><span className="font-semibold">Dispatch path:</span> {shipment.routePath}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-0.5 flex items-center gap-1"><Calendar size={11} /> Expected Delivery</p>
                  <p className="font-medium text-gray-800">
                    {box?.expectedDeliveryDate || shipment?.expectedDelivery
                      ? new Date(box?.expectedDeliveryDate || shipment?.expectedDelivery).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-0.5">Delivered At</p>
                  <p className="font-medium text-gray-800">
                    {box?.deliveredAt ? new Date(box.deliveredAt).toLocaleDateString() : shipment?.deliveredAt ? new Date(shipment.deliveredAt).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>

              {/* Medicines */}
              {(box?.medicineNames?.length > 0 || shipment?.items?.length > 0) && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Truck size={11} /> Contents</p>
                  {box?.medicineNames?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {box.medicineNames.map((m: string, i: number) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-0.5 font-medium">{m}</span>
                      ))}
                    </div>
                  )}
                  {shipment?.items?.map((it: any, i: number) => (
                    <p key={i} className="text-sm text-gray-700">
                      {it.medicineName} × {it.quantity}
                    </p>
                  ))}
                  {box?.quantity > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Total quantity: {box.quantity}</p>
                  )}
                </div>
              )}

              {/* Vehicle */}
              {box?.vehicleNumber && (
                <div className="text-sm">
                  <span className="text-gray-500">Vehicle:</span> <span className="font-mono font-medium">{box.vehicleNumber}</span>
                </div>
              )}
            </div>

            {/* Live route map */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <MapPin size={15} className="text-indigo-500" /> Live route map
                </p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isMoving ? 'text-emerald-600' : 'text-gray-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${isMoving ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  {isMoving ? 'Moving' : boxStatus || 'Inactive'}
                </span>
              </div>
              <div className="relative h-36 rounded-xl overflow-hidden border border-indigo-100 bg-gradient-to-br from-slate-50 via-indigo-50 to-emerald-50">
                <div className="absolute inset-x-8 top-1/2 border-t-2 border-dashed border-indigo-300" />
                <div className={`absolute top-[calc(50%-8px)] w-4 h-4 rounded-full border-4 border-white shadow-md transition-all duration-700 ${isMoving ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} style={{ left: `calc(${markerPosition}% - 8px)` }} />
                <div className="absolute left-3 top-3 max-w-[38%] text-xs font-semibold text-gray-700 truncate" title={trackedItem?.source || 'Source'}>{trackedItem?.source || 'Source'}</div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-3 max-w-[42%] text-center text-xs font-semibold text-indigo-700 truncate" title={trackedItem?.currentLocation || 'Current location'}>{trackedItem?.currentLocation || 'Location not set'}</div>
                <div className="absolute right-3 top-3 max-w-[38%] text-right text-xs font-semibold text-gray-700 truncate" title={trackedItem?.destination || 'Destination'}>{trackedItem?.destination || 'Destination'}</div>
                <div className="absolute left-3 top-[calc(50%-5px)] w-2.5 h-2.5 rounded-full bg-slate-500 border-2 border-white" />
                <div className="absolute right-3 top-[calc(50%-5px)] w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white" />
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{live ? 'Live updates via SSE' : 'Live updates paused'}</span>
                <span>{trackedItem?.locationUpdatedAt ? `Updated ${new Date(trackedItem.locationUpdatedAt).toLocaleTimeString()}` : 'Awaiting location update'}</span>
              </div>
            </div>

            {/* Locations already traveled */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Truck size={15} className="text-indigo-500" /> Journey traveled
                </p>
                <span className="text-xs text-gray-500">{traveledLocations.length} recorded location{traveledLocations.length === 1 ? '' : 's'}</span>
              </div>
              {traveledLocations.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">No location updates recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {traveledLocations.map((item: any, index: number) => {
                    const isCurrent = item.location === trackedItem?.currentLocation;
                    return (
                      <div key={`${item.location}-${index}`} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`w-3 h-3 rounded-full mt-1.5 ${isCurrent ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-indigo-400'}`} />
                          {index < traveledLocations.length - 1 && <span className="w-px h-7 bg-indigo-100" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm font-medium ${isCurrent ? 'text-emerald-700' : 'text-gray-700'}`}>{item.location}</p>
                            {isCurrent && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Live now</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Time unavailable'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tracking timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-indigo-500" /> Tracking Timeline
              </p>
              <ShipmentTimeline events={events} />
            </div>


          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          PharmaChain · Blockchain-tracked medicine supply chain
        </p>
      </div>
    </div>
  );
}

