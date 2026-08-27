import { useState, useCallback } from 'react';
import { useLiveEvents, LiveEventType } from '../lib/events';
import Toast, { ToastType, ToastProps } from './ui/Toast';
import { useAuth } from '../lib/auth';

export default function GlobalNotifications() {
  const [toasts, setToasts] = useState<Omit<ToastProps, 'onClose'>[]>([]);
  const { user } = useAuth();

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useLiveEvents((eventType: LiveEventType, data: any) => {
    // Only show notifications if a user is logged in
    if (!user) return;

    let type: ToastType = 'info';
    let title = 'New Update';
    let message = '';

    switch (eventType) {
      case 'shipment_created':
        title = 'Shipment Created';
        message = `Shipment ${data?.shipmentNumber || ''} has been created.`;
        type = 'info';
        break;
      case 'shipment_updated':
        title = 'Shipment Updated';
        message = `Shipment ${data?.shipmentNumber || ''} status changed to ${data?.status?.replace('_', ' ') || 'updated'}.`;
        type = data?.status === 'DELIVERED' ? 'success' : data?.status === 'DELAYED' ? 'warning' : 'info';
        break;
      case 'box_created':
        title = 'Box Added';
        message = `Transport Box ${data?.boxId || ''} prepared.`;
        break;
      case 'box_updated':
        title = 'Box Tracking Update';
        message = `Box ${data?.boxId || ''} status: ${data?.status?.replace('_', ' ') || 'updated'}.`;
        type = data?.status === 'DAMAGED' ? 'error' : 'info';
        break;
      case 'box_scanned':
        title = 'Box Scanned';
        message = `Box ${data?.boxId || ''} scanned at ${data?.location || 'a new location'}.`;
        break;
      case 'connected':
        // Don't show toast for SSE connection
        return;
      default:
        return;
    }

    addToast(type, title, message);
  });

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>
  );
}
