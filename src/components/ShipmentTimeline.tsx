// PharmaChain Shipment / Transport Box Timeline
// Reusable vertical timeline for shipment or transport box tracking events.
import {
  Package, Truck, MapPin, CheckCircle, AlertTriangle, XCircle,
  Clock, User, Boxes,
} from 'lucide-react';

interface TimelineEvent {
  eventType?: string;
  type?: string;
  description?: string;
  location?: string;
  updatedByName?: string;
  updatedByRole?: string;
  userRole?: string;
  remarks?: string;
  isDemo?: boolean;
  createdAt?: string;
}

const EVENT_STYLE: Record<string, { icon: any; color: string; bg: string }> = {
  BOX_CREATED: { icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-100' },
  CREATED: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  TRANSPORTER_ASSIGNED: { icon: Truck, color: 'text-purple-600', bg: 'bg-purple-100' },
  ASSIGNED: { icon: Truck, color: 'text-purple-600', bg: 'bg-purple-100' },
  DISPATCHED: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  PICKED_UP: { icon: Truck, color: 'text-amber-600', bg: 'bg-amber-100' },
  IN_TRANSIT: { icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-100' },
  LOCATION_UPDATE: { icon: MapPin, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  DELAYED: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
  DAMAGED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  SCANNED: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' },
  DELIVERED: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  RECEIVED_BY_DEALER: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  RECEIVED_BY_PHARMACY: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  CANCELLED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
};

function getStyle(eventType = '') {
  const key = String(eventType || '').toUpperCase();
  return EVENT_STYLE[key] || { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' };
}

export default function ShipmentTimeline({ events = [] }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Clock size={36} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No tracking events yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-200 via-gray-200 to-emerald-200" />
      <div className="space-y-5">
        {events.map((event, idx) => {
          const key = event.eventType || event.type || '';
          const style = getStyle(key);
          const Icon = style.icon;
          const isLast = idx === events.length - 1;
          return (
            <div key={idx} className="relative flex gap-4">
              <div className="relative z-10 flex-shrink-0">
                <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center shadow-sm border border-white`}>
                  <Icon size={16} className={style.color} />
                </div>
              </div>
              <div className={`flex-1 pb-1 ${isLast ? '' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 capitalize">
                    {String(key).replace(/_/g, ' ').toLowerCase()}
                  </span>
                  {event.isDemo && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      Demo
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{event.description || key}</p>
                {(event.location || event.remarks) && (
                  <p className="text-xs text-gray-400 mt-1 space-y-0.5">
                    {event.location && <span className="block">📍 {event.location}</span>}
                    {event.remarks && <span className="block">{event.remarks}</span>}
                  </p>
                )}
                {(event.updatedByName || event.userRole || event.updatedByRole) && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <User size={11} />
                    {event.updatedByName || ''}
                    {(event.userRole || event.updatedByRole) && (
                      <span className="text-gray-300">·</span>
                    )}
                    <span className="capitalize">{event.userRole || event.updatedByRole || ''}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

