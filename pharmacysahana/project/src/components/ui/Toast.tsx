import { useEffect } from 'react';
import { CheckCircle, Info, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  onClose: (id: string) => void;
  duration?: number;
}

export default function Toast({ id, type, title, message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="text-green-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertTriangle className="text-amber-500" size={20} />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
  };

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl shadow-lg ${bgColors[type]} pointer-events-auto transform transition-all duration-300 ease-in-out`}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {message && <p className="text-sm text-gray-600 mt-1">{message}</p>}
      </div>
      <button onClick={() => onClose(id)} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  );
}
