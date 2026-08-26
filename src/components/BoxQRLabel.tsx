// PharmaChain Transport Box QR Label
// Printable label containing the PharmaChain logo, Box ID, Shipment ID, QR code,
// source/destination, and "Scan to Track Shipment".
// Provides PNG download + browser print / Save as PDF (no PDF library needed).
import { useRef, useState } from 'react';
import { Download, Printer, Pill, ArrowRight, Package } from 'lucide-react';
import Button from './ui/Button';

interface BoxQRLabelProps {
  box: any;
  qrDataUrl?: string;
}

export default function BoxQRLabel({ box, qrDataUrl }: BoxQRLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!labelRef.current) return;
    setDownloading(true);
    try {
      // Render the label onto a canvas so we get a clean PNG download.
      const canvas = document.createElement('canvas');
      const scale = 3; // hi-res
      canvas.width = 480 * scale;
      canvas.height = 640 * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Helper: draw rounded rect
      const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };

      // Logo box (gradient approximation)
      const logoX = 40 * scale;
      const logoY = 36 * scale;
      const logoSize = 56 * scale;
      const grad = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
      grad.addColorStop(0, '#4f46e5');
      grad.addColorStop(1, '#6366f1');
      ctx.fillStyle = grad;
      roundRect(logoX, logoY, logoSize, logoSize, 14 * scale);
      ctx.fill();
      // Pill icon approximation
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(logoX + logoSize / 2, logoY + logoSize / 2, 16 * scale, 9 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(logoX + logoSize / 2 - 2 * scale, logoY + logoSize / 2 - 9 * scale, 4 * scale, 18 * scale);

      // Title
      ctx.fillStyle = '#1f2937';
      ctx.font = `bold ${30 * scale}px Inter, sans-serif`;
      ctx.fillText('PharmaChain', 108 * scale, 66 * scale);
      ctx.fillStyle = '#6b7280';
      ctx.font = `${15 * scale}px Inter, sans-serif`;
      ctx.fillText('Transport Box QR Label', 108 * scale, 90 * scale);

      // Divider
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(40 * scale, 120 * scale);
      ctx.lineTo(440 * scale, 120 * scale);
      ctx.stroke();

      // Load QR image and draw when ready
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = qrDataUrl || box?.qrDataUrl || '';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      // QR image centered
      const qrSize = 220 * scale;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 150 * scale;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - 8 * scale, qrY - 8 * scale, qrSize + 16 * scale, qrSize + 16 * scale);
      if (img.width > 0) {
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      } else {
        // placeholder
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
      }

      // Scan-to-track text under QR
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${20 * scale}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Scan to Track Shipment', canvas.width / 2, qrY + qrSize + 38 * scale);

      // Box ID + Shipment ID
      ctx.fillStyle = '#374151';
      ctx.font = `600 ${17 * scale}px monospace`;
      ctx.fillText(`Box ID: ${box?.boxId || ''}`, canvas.width / 2, qrY + qrSize + 70 * scale);
      ctx.font = `600 ${15 * scale}px monospace`;
      ctx.fillText(`Shipment: ${box?.shipmentNumber || ''}`, canvas.width / 2, qrY + qrSize + 94 * scale);

      // Route
      ctx.font = `${16 * scale}px Inter, sans-serif`;
      ctx.fillStyle = '#4b5563';
      const source = String(box?.source || 'Source');
      const dest = String(box?.destination || 'Destination');
      ctx.fillText(`${source} → ${dest}`, canvas.width / 2, qrY + qrSize + 124 * scale);

      // Bottom border box
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2 * scale;
      roundRect(30 * scale, 590 * scale, canvas.width - 60 * scale, 30 * scale, 10 * scale);
      ctx.stroke();

      // Trigger download
      const link = document.createElement('a');
      link.download = `${box?.boxId || 'transport-box'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Failed to generate PNG label:', e);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Printable label */}
      <div ref={labelRef} className="print-only block w-full">
        <div className="border-2 border-gray-300 rounded-2xl p-6 bg-white max-w-sm mx-auto">
          {/* Logo + title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Pill size={22} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-tight">PharmaChain</p>
              <p className="text-xs text-gray-500">Transport Box QR Label</p>
            </div>
          </div>
          <div className="border-t border-gray-200 mb-3" />

          {/* QR code */}
          <div className="flex justify-center mb-3">
            {qrDataUrl || box?.qrDataUrl ? (
              <img
                src={qrDataUrl || box.qrDataUrl}
                alt={`QR for ${box?.boxId}`}
                className="w-52 h-52 border border-gray-200 rounded-xl p-1 bg-white"
              />
            ) : (
              <div className="w-52 h-52 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                <Package size={48} />
              </div>
            )}
          </div>
          <p className="text-center font-bold text-gray-800 mb-3">Scan to Track Shipment</p>

          {/* Details */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Box ID</span>
              <span className="font-mono font-semibold text-gray-900">{box?.boxId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Shipment</span>
              <span className="font-mono font-semibold text-gray-900">{box?.shipmentNumber}</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
              <span className="text-gray-500 text-xs">Source</span>
              <span className="text-sm font-medium text-gray-800">{box?.source}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <ArrowRight size={12} className="text-gray-300" />
              <span className="text-xs text-gray-400">to</span>
              <ArrowRight size={12} className="text-gray-300" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500 text-xs">Destination</span>
              <span className="text-sm font-medium text-gray-800">{box?.destination}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 mt-1">
              <p className="text-[10px] text-gray-400 text-center">
                Track at {window.location.origin}{box?.trackingUrl || `/track/${box?.boxId}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center mt-4 no-print">
        <Button onClick={handleDownload} variant="secondary" disabled={downloading}>
          <Download size={16} /> {downloading ? 'Generating...' : 'Download PNG'}
        </Button>
        <Button onClick={handlePrint} variant="secondary">
          <Printer size={16} /> Print / Save as PDF
        </Button>
      </div>
    </div>
  );
}

