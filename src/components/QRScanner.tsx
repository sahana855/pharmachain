import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, ScanLine, X } from 'lucide-react';
import Button from './ui/Button';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (err: string) => void;
  onClose?: () => void;
  disabled?: boolean;
}

/**
 * Real camera-based QR scanner using html5-qrcode.
 * Starts the webcam, continuously decodes QR codes, and calls onScan(rawText).
 * The parent is responsible for normalizing/verifying the decoded text.
 */
export default function QRScanner({ onScan, onError, onClose, disabled = false }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const scannedRef = useRef(false);

  // Stop the camera on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setActive(false);
    scannedRef.current = false;
  };

  const startScanner = async () => {
    if (!containerRef.current) return;
    setStarting(true);
    setErrMsg('');
    scannedRef.current = false;

    try {
      // Use the same element id that html5-qrcode manages
      const elId = `qrscanner-${Math.random().toString(36).slice(2, 8)}`;
      containerRef.current.id = elId;

      const scanner = new Html5Qrcode(elId);
      scannerRef.current = scanner;

      const successCb = (decodedText: string) => {
        if (scannedRef.current) return; // only fire once per start
        scannedRef.current = true;
        onScan(decodedText);
      };

      const errorCb = (_errMsg: string) => {
        // Ignore transient frame decode errors; only surface fatal ones.
      };

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        successCb,
        errorCb
      );
      setActive(true);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser/app settings.'
        : err?.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : err?.message || 'Failed to start camera scanner.';
      setErrMsg(msg);
      if (onError) onError(msg);
    } finally {
      setStarting(false);
    }
  };

return (
    <div className="space-y-3">
      <div className="w-full overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-900 relative" style={{ minHeight: 220, maxHeight: 360 }}>
        <div
          ref={containerRef}
          className="w-full h-full"
        />
      </div>

      {!active && (
        <div className="text-center -mt-40 relative z-10 pointer-events-none">
          <ScanLine size={40} className="mx-auto mb-2 text-gray-500" />
          <p className="text-sm text-gray-400">Camera preview appears here</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!active ? (
          <Button onClick={startScanner} disabled={disabled || starting} className="flex-1" variant="primary">
            <Camera size={16} /> {starting ? 'Starting camera…' : 'Start Scanner'}
          </Button>
        ) : (
          <Button onClick={stopScanner} className="flex-1" variant="secondary">
            <CameraOff size={16} /> Stop Scanner
          </Button>
        )}
        {onClose && (
          <Button onClick={async () => { await stopScanner(); onClose(); }} variant="ghost">
            <X size={16} /> Quit
          </Button>
        )}
      </div>

      {errMsg && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {errMsg}
        </p>
      )}
    </div>
  );
}

