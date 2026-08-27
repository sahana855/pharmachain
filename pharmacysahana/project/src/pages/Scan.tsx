// PharmaChain Smart QR Scanner — Dedicated /scan page
// Features: Camera QR scanner, animated scan frame, flashlight, camera switch,
// verification steps, and colour-shifting authentication result.
import { useState, useCallback, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../lib/auth';
import { qrApi, transportBoxApi, trackingApi } from '../lib/api';
import { useLiveSync } from '../lib/events';
import { extractQrId, extractBoxId } from '../lib/qr';
import VerificationResult, { VerificationData } from '../components/VerificationResult';
import ShipmentTimeline from '../components/ShipmentTimeline';
import {
  ScanLine, Camera, CameraOff, Sun, RefreshCw, Smartphone, ArrowLeft,
  Package, Boxes, MapPin, AlertTriangle, CheckCircle, Truck, Calendar, Clock,
} from 'lucide-react';
import Button from '../components/ui/Button';

type ScanStep = 'idle' | 'starting' | 'scanning' | 'verifying' | 'done';
type QrKind = 'medicine' | 'box' | 'shipment' | null;

const VERIFY_STEPS = ['SCANNING QR', 'VERIFYING', 'CHECKING DATABASE', 'CHECKING BLOCKCHAIN', 'ANALYZING SCAN HISTORY'];

export default function Scan() {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef<string>('');
  const [step, setStep] = useState<ScanStep>('idle');
  const [scanProgress, setScanProgress] = useState('');
const [result, setResult] = useState<VerificationData | null>(null);
  const [error, setError] = useState('');
  const [torch, setTorch] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [qrKind, setQrKind] = useState<QrKind>(null);
  const [boxData, setBoxData] = useState<any>(null);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
      } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

const startScanner = async () => {
    if (!containerRef.current) return;
    setStep('starting');
    setError('');
    setResult(null);
    setQrKind(null);
    setBoxData(null);
    setShipmentData(null);
    setTrackingEvents([]);

    await stopScanner();

    const id = `scan-camera-${Math.random().toString(36).slice(2, 8)}`;
    containerRef.current.id = id;
    scannerIdRef.current = id;

    try {
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: cameraFacing },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        (decodedText) => {
          // On successful scan, stop camera and verify
          handleScanResult(decodedText);
        },
        () => {} // ignore transient errors
      );
      setStep('scanning');
} catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : err?.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : err?.message || 'Failed to start camera.';
      setError(msg);
      setStep('idle');
    }
  };

  const handleScanResult = async (rawText: string) => {
    // Reset tracking state
    setQrKind(null);
    setBoxData(null);
    setShipmentData(null);
    setTrackingEvents([]);
    setResult(null);
    setError('');

    setStep('verifying');
    setScanProgress('SCANNING QR');

    // Simulate step progression for UX
    const advanceStep = (idx: number) => {
      if (idx < VERIFY_STEPS.length) {
        setScanProgress(VERIFY_STEPS[idx]);
        if (idx < VERIFY_STEPS.length - 1) {
          setTimeout(() => advanceStep(idx + 1), idx === 0 ? 400 : 300);
        }
      }
    };
    setTimeout(() => advanceStep(1), 400);

    const qrId = extractQrId(rawText);
    if (!qrId) {
      setError('Invalid QR code. Please scan a valid PharmaChain QR (MED-XXX / SHIP-XXX / BOX-XXX).');
      setStep('idle');
      setScanProgress('');
      return;
    }

    // Detect QR type: Transport Box (BOX-), Shipment (SHIP-), else Medicine (MED-)
    const boxId = extractBoxId(qrId);
    const isShipment = /^SHIP-/i.test(qrId);

    // --- Transport Box QR (BOX-XXX) ---
    if (boxId) {
      try {
        const data = await transportBoxApi.getPublic(boxId);
        setQrKind('box');
        setBoxData(data.box || null);
        setTrackingEvents(data.events || []);
        setStep('done');
      } catch (e: any) {
        setError(e?.message || 'Failed to load transport box tracking info.');
        setStep('idle');
      }
      setScanProgress('');
      return;
    }

    // --- Shipment QR (SHIP-XXX) ---
    if (isShipment) {
      try {
        const data = await trackingApi.getPublicTracking(qrId);
        setQrKind('shipment');
        setShipmentData(data.shipment || null);
        setTrackingEvents(data.events || []);
        setStep('done');
      } catch (e: any) {
        setError(e?.message || 'Failed to load shipment tracking info.');
        setStep('idle');
      }
      setScanProgress('');
      return;
    }

    // --- Medicine QR (MED-XXX) : existing verification flow ---
    try {
      const data = await qrApi.verify({
        qrId,
        location: navigator.geolocation ? 'scan-page' : undefined,
        device: `${navigator.platform || ''} ${navigator.userAgent?.slice(0, 60) || ''}`,
      });

      setQrKind('medicine');
      setResult({
        verdict: data.verdict,
        verdictLabel: data.verdictLabel,
        message: data.message,
        reasonCodes: data.reasonCodes,
        scanNumber: data.scanNumber,
        colorState: data.colorState,
        chain: data.chain,
        medicine: data.medicine,
      });
      setStep('done');
    } catch (e: any) {
      if (e.status === 404) {
        setQrKind('medicine');
        setResult({
          verdict: 'RED',
          verdictLabel: 'Potential Counterfeit Medicine',
          message: e.message,
          reasonCodes: ['QR_NOT_FOUND'],
          medicine: null,
        });
        setStep('done');
      } else {
        setError(e?.message || 'Verification failed. Please try again.');
        setStep('idle');
      }
    }
    setScanProgress('');
  };

const handleReset = () => {
    setStep('idle');
    setResult(null);
    setQrKind(null);
    setBoxData(null);
    setShipmentData(null);
    setTrackingEvents([]);
    setError('');
    setScanProgress('');
    stopScanner();
  };

  // Live tracking: auto-refresh box/shipment data every 5s while a result is shown
  // Live tracking: SSE-driven auto-refresh for box/shipment data
  const [live, setLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const liveKeyRef = useRef<string>('');

  const refreshTrackedItem = useCallback(async () => {
    if (!live) return;
    const key = qrKind === 'box' ? (boxData?.boxId || '') : (shipmentData?.shipmentQrId || shipmentData?.shipmentNumber || '');
    if (!key || liveKeyRef.current !== key) return;
    setRefreshing(true);
    try {
      if (qrKind === 'box') {
        const data = await transportBoxApi.getPublic(key);
        setBoxData(data.box || null);
        setTrackingEvents(data.events || []);
      } else if (qrKind === 'shipment') {
        const data = await trackingApi.getPublicTracking(key);
        setShipmentData(data.shipment || null);
        setTrackingEvents(data.events || []);
      }
    } catch {}
    setRefreshing(false);
  }, [live, qrKind, boxData?.boxId, shipmentData?.shipmentQrId, shipmentData?.shipmentNumber]);

  // SSE real-time updates replace polling
  useLiveSync(refreshTrackedItem);

  useEffect(() => {
    // Reset live tracking when step changes (new scan or reset)
    liveKeyRef.current = qrKind === 'box' ? (boxData?.boxId || '') : (qrKind === 'shipment' ? (shipmentData?.shipmentQrId || shipmentData?.shipmentNumber || '') : '');
    setLive(true);
  }, [step, qrKind, boxData?.boxId, shipmentData?.shipmentQrId, shipmentData?.shipmentNumber]);

const toggleTorch = async () => {
    try {
      if (scannerRef.current) {
        // toggleTorch is available at runtime in html5-qrcode >= 2.3.8,
        // but not typed in all versions. Cast safely.
        const anyScanner = scannerRef.current as any;
        if (typeof anyScanner.toggleTorch === 'function') {
          await anyScanner.toggleTorch();
          setTorch(!torch);
        }
      }
    } catch {}
  };

  const toggleCamera = () => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    if (step === 'scanning' || step === 'starting') {
      startScanner();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-md mb-4">
        <div className="flex items-center justify-between">
          <div>
<h1 className="text-xl font-bold text-white">Smart QR Scanner</h1>
            <p className="text-xs text-gray-400">Scan medicine, shipment, or transport box QR</p>
          </div>
          {step !== 'idle' && (
            <div className="flex items-center gap-2">
              <Button onClick={handleReset} variant="ghost" size="sm">
                <RefreshCw size={16} /> New Scan
              </Button>
              <Button onClick={handleReset} variant="ghost" size="sm">
                <CameraOff size={16} /> Quit
              </Button>
            </div>
          )}
        </div>
      </div>

{/* Scanner / Result Area */}
      <div className="w-full max-w-md">
        {step === 'idle' && !result && (
          <div className="rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-xl p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <ScanLine size={48} className="text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Ready to Scan</h2>
            <p className="text-sm text-gray-400 mb-6">
              Position the QR code within the scan area to verify medicine authenticity.
              The QR code is a standard black-and-white QR — scannable with any app.
            </p>
            <Button onClick={startScanner} className="w-full" size="lg">
              <Camera size={18} /> Start Scanning
            </Button>
          </div>
        )}

        {/* Camera container — always rendered so ref is always available */}
        <div className={`relative rounded-3xl overflow-hidden bg-gray-900 border-2 border-indigo-500/30 ${step === 'idle' && !result ? 'hidden' : ''}`}>
          {/* Camera view */}
          <div ref={containerRef} className="w-full" style={{ minHeight: 360, maxHeight: 480 }} />

          {/* Scan frame overlay */}
          {step === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-400 rounded-br" />
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scan-line" />
                </div>
              </div>
            </div>
          )}

          {/* Controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleTorch}
                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition"
              >
                <Sun size={20} className={torch ? 'text-yellow-400' : 'text-white'} />
              </button>
              <button
                onClick={handleReset}
                className="w-14 h-14 rounded-full bg-red-500/80 backdrop-blur flex items-center justify-center hover:bg-red-600 transition"
              >
                <CameraOff size={22} className="text-white" />
              </button>
              <button
                onClick={toggleCamera}
                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition"
              >
                <Smartphone size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {step === 'verifying' && (
          <VerificationResult
            data={{ verdict: 'GREEN' } as VerificationData}
            isScanning
            scanProgress={scanProgress}
          />
        )}

{step === 'done' && result && (
          <VerificationResult data={result} />
        )}

        {/* Transport Box QR Result */}
        {step === 'done' && qrKind === 'box' && boxData && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-blue-900/60 to-slate-900/60 border border-blue-500/30 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Boxes size={24} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Transport Box Tracking</h2>
                  <p className="text-xs text-gray-400 font-mono">{boxData.boxId}</p>
                </div>
              </div>

              {/* Status badge */}
              <div className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full mb-4 ${
                boxData.status === 'DELIVERED' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                boxData.status === 'CANCELLED' || boxData.status === 'DAMAGED' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
                boxData.status === 'DELAYED' ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30' :
                'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              }`}>
                {boxData.status === 'DELIVERED' ? <CheckCircle size={16} /> :
                 boxData.status === 'CANCELLED' || boxData.status === 'DAMAGED' ? <AlertTriangle size={16} /> :
                 <Truck size={16} />}
                {String(boxData.status || 'UNKNOWN').replace(/_/g, ' ')}
              </div>

              {/* Delay alert */}
              {boxData.delayAlert && (
                <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center gap-2 text-sm text-orange-300">
                  <AlertTriangle size={16} /> This shipment has been flagged as delayed.
                </div>
              )}

              {/* Route */}
              <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-xl text-sm mb-4">
                <span className="text-gray-300 flex-1">{boxData.source}</span>
                <ArrowLeft size={14} className="text-gray-500 rotate-180" />
                <span className="text-gray-300 flex-1 text-right">{boxData.destination}</span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Truck size={11} /> Transporter</p>
                  <p className="text-gray-200">{boxData.transporterName || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={11} /> Current Location</p>
                  <p className="text-gray-200">{boxData.currentLocation || 'Not set'}</p>
                </div>
                {boxData.expectedDeliveryDate && (
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} /> Expected Delivery</p>
                    <p className="text-gray-200">{new Date(boxData.expectedDeliveryDate).toLocaleDateString()}</p>
                  </div>
                )}
                {boxData.deliveredAt && (
                  <div>
                    <p className="text-xs text-gray-500">Delivered At</p>
                    <p className="text-emerald-300">{new Date(boxData.deliveredAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Shipment ref */}
              {boxData.shipmentNumber && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs text-gray-400">
                  Shipment: <span className="font-mono">{boxData.shipmentNumber}</span>
                </div>
              )}

              {/* Medicines */}
              {boxData.medicineNames && boxData.medicineNames.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500 mb-1.5">Contents</p>
                  <div className="flex flex-wrap gap-1.5">
                    {boxData.medicineNames.map((m: string, i: number) => (
                      <span key={i} className="text-xs bg-blue-500/10 text-blue-300 rounded-full px-2.5 py-0.5 font-medium border border-blue-500/20">
                        {m}
                      </span>
                    ))}
                  </div>
                  {boxData.quantity > 0 && <p className="text-xs text-gray-500 mt-1">Total quantity: {boxData.quantity}</p>}
                </div>
              )}

              {/* Vehicle */}
              {boxData.vehicleNumber && (
                <div className="mt-3 text-xs text-gray-400">
                  Vehicle: <span className="font-mono">{boxData.vehicleNumber}</span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-xl p-6">
              <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-indigo-400" /> Tracking Timeline
              </p>
              <ShipmentTimeline events={trackingEvents} />
            </div>


          </div>
        )}

        {/* Shipment QR Result */}
        {step === 'done' && qrKind === 'shipment' && shipmentData && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-purple-900/60 to-slate-900/60 border border-purple-500/30 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Package size={24} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Shipment Tracking</h2>
                  <p className="text-xs text-gray-400 font-mono">{shipmentData.shipmentQrId || shipmentData.shipmentNumber}</p>
                </div>
              </div>

              {/* Status badge */}
              <div className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full mb-4 ${
                shipmentData.status === 'DELIVERED' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                shipmentData.status === 'CANCELLED' || shipmentData.status === 'DELAYED' ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30' :
                'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              }`}>
                {shipmentData.status === 'DELIVERED' ? <CheckCircle size={16} /> :
                 shipmentData.status === 'DELAYED' || shipmentData.status === 'CANCELLED' ? <AlertTriangle size={16} /> :
                 <Truck size={16} />}
                {String(shipmentData.status || 'UNKNOWN').replace(/_/g, ' ')}
              </div>

              {/* Delay alert */}
              {shipmentData.delayAlert && (
                <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center gap-2 text-sm text-orange-300">
                  <AlertTriangle size={16} /> This shipment has been flagged as delayed.
                </div>
              )}

              {/* Route */}
              <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-xl text-sm mb-4">
                <span className="text-gray-300 flex-1">{shipmentData.fromName}</span>
                <ArrowLeft size={14} className="text-gray-500 rotate-180" />
                <span className="text-gray-300 flex-1 text-right">{shipmentData.toName}</span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Truck size={11} /> Transporter</p>
                  <p className="text-gray-200">{shipmentData.transportName || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={11} /> Current Location</p>
                  <p className="text-gray-200">{shipmentData.currentLocation || 'Not set'}</p>
                </div>
                {shipmentData.expectedDelivery && (
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} /> Expected Delivery</p>
                    <p className="text-gray-200">{new Date(shipmentData.expectedDelivery).toLocaleDateString()}</p>
                  </div>
                )}
                {shipmentData.deliveredAt && (
                  <div>
                    <p className="text-xs text-gray-500">Delivered At</p>
                    <p className="text-emerald-300">{new Date(shipmentData.deliveredAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              {shipmentData.items && shipmentData.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500 mb-1.5">Items ({shipmentData.items.length})</p>
                  <div className="space-y-1">
                    {shipmentData.items.map((it: any, i: number) => (
                      <p key={i} className="text-sm text-gray-300">
                        {it.medicineName} <span className="text-gray-500">× {it.quantity}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {shipmentData.totalAmount > 0 && (
                <div className="mt-3 text-xs text-gray-400">
                  Total Amount: <span className="font-semibold text-gray-200">₹{Number(shipmentData.totalAmount).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-xl p-6">
              <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-purple-400" /> Tracking Timeline
              </p>
              <ShipmentTimeline events={trackingEvents} />
            </div>


          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-sm text-red-300 text-center">
            {error}
          </div>
        )}

{step === 'done' && (qrKind === 'box' || qrKind === 'shipment') && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setLive(v => !v)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition ${
                live
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              {live ? (refreshing ? 'LIVE · Updating…' : '● LIVE TRACKING ON') : 'LIVE TRACKING OFF'}
            </button>
            <Button onClick={handleReset} variant="primary" className="flex-1">
              <ScanLine size={16} /> Scan Another QR
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-600 text-center max-w-xs">
        The QR code on your medicine is a standard black-and-white QR code.
        The colour-shifting authentication is displayed only inside this app.
      </p>
    </div>
  );
}
