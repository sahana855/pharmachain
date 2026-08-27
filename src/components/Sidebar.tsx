import { useAuth } from '../lib/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, AlertTriangle, FileText,
  QrCode, BarChart3, Activity, ShoppingCart, ClipboardList,
  MapPin, Clock, ScanLine, Heart, Users, RefreshCw,
  ArrowLeftRight, Search, Percent, Bell, BookOpen,
  Thermometer, RotateCcw, Store, History, Pill,
  ChevronRight, Boxes, Waypoints, Navigation
} from 'lucide-react';

export type RoleNavItem = {
  label: string;
  icon: any;
  path: string;
};

export const roleNavItems: Record<string, RoleNavItem[]> = {
  manufacturer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/manufacturer' },
    { label: 'Track Box', icon: Boxes, path: '/shipment-scan' },
    { label: 'Data Entry', icon: Package, path: '/manufacturer/data-entry' },
    { label: 'Stock Maintenance', icon: ClipboardList, path: '/manufacturer/stock' },
    { label: 'Dispatch', icon: Truck, path: '/manufacturer/dispatch' },
    { label: 'QR Generation', icon: QrCode, path: '/manufacturer/qr-generation' },
    { label: 'Batch Management', icon: RotateCcw, path: '/manufacturer/batches' },
    { label: 'Transport Box', icon: Boxes, path: '/manufacturer/transport-box' },
    { label: 'Product Recall', icon: AlertTriangle, path: '/manufacturer/recall' },
    { label: 'Production Report', icon: FileText, path: '/manufacturer/reports' },
    { label: 'Low Stock Alert', icon: Bell, path: '/manufacturer/low-stock' },
  ],
  dealer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/dealer' },
    { label: 'Track Box', icon: Boxes, path: '/shipment-scan' },
    { label: 'Stock', icon: Package, path: '/dealer/stock' },
    { label: 'Dispatch', icon: Truck, path: '/dealer/dispatch' },
    { label: 'Transport Box', icon: Boxes, path: '/manufacturer/transport-box' },
    { label: 'Stock History', icon: History, path: '/dealer/stock-history' },
    { label: 'Pending Orders', icon: ShoppingCart, path: '/dealer/pending-orders' },
    { label: 'Auto Restock', icon: RefreshCw, path: '/dealer/auto-restock' },
    { label: 'Damaged Returns', icon: ArrowLeftRight, path: '/dealer/returns' },
  ],
  transport: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/transport' },
    { label: 'Scan Box', icon: Boxes, path: '/shipment-scan' },
    { label: 'Location Update', icon: MapPin, path: '/transport/location' },
    { label: 'Delivery Status', icon: Clock, path: '/transport/delivery-status' },
    { label: 'Delivery Proof', icon: ScanLine, path: '/transport/delivery-proof' },
    { label: 'Delay Alerts', icon: AlertTriangle, path: '/transport/delay-alerts' },
  ],
  pharmacy: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/pharmacy' },
    { label: 'Scan Box', icon: Boxes, path: '/shipment-scan' },
    { label: 'QR Checking', icon: ScanLine, path: '/pharmacy/qr-checking' },
    { label: 'Current Stock', icon: Package, path: '/pharmacy/stock' },
    { label: 'Sold Stock', icon: ShoppingCart, path: '/pharmacy/sold-stock' },
    { label: 'Expiry Alert', icon: AlertTriangle, path: '/pharmacy/expiry-alert' },
    { label: 'Nearby Dealers', icon: Store, path: '/pharmacy/nearby-dealers' },
    { label: 'Low Stock Alert', icon: Bell, path: '/pharmacy/low-stock' },
    { label: 'Auto Reorder', icon: RefreshCw, path: '/pharmacy/auto-reorder' },
    { label: 'Medicine Search', icon: Search, path: '/pharmacy/search' },
    { label: 'Sales Report', icon: BarChart3, path: '/pharmacy/sales-report' },
    { label: 'Returns', icon: ArrowLeftRight, path: '/pharmacy/returns' },
    { label: 'Discount Alert', icon: Percent, path: '/pharmacy/discount-alert' },
  ],
  patient: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/patient' },
    { label: 'Drug Alert', icon: AlertTriangle, path: '/patient/drug-alert' },
    { label: 'Expiry Alert', icon: Thermometer, path: '/patient/expiry-alert' },
    { label: 'Transport Data', icon: Truck, path: '/patient/transport' },
    { label: 'Authenticity Check', icon: ScanLine, path: '/patient/authenticity' },
    { label: 'Usage Reminder', icon: Clock, path: '/patient/reminders' },
    { label: 'Purchase History', icon: BookOpen, path: '/patient/purchase-history' },
    { label: 'Side Effect Report', icon: Activity, path: '/patient/side-effects' },
    { label: 'Refill Reminder', icon: RefreshCw, path: '/patient/refill' },
  ],
};

const roleIcons: Record<string, any> = {
  manufacturer: Package,
  dealer: Truck,
  transport: Activity,
  pharmacy: Store,
  patient: Heart,
};

const roleColors: Record<string, string> = {
  manufacturer: 'from-blue-500 to-indigo-600',
  dealer: 'from-emerald-500 to-teal-600',
  transport: 'from-orange-500 to-amber-600',
  pharmacy: 'from-purple-500 to-violet-600',
  patient: 'from-rose-500 to-pink-600',
};

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems = roleNavItems[user.role] || [];
  const RoleIcon = roleIcons[user.role] || Package;

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 overflow-y-auto z-30 hidden lg:block shadow-xl shadow-indigo-500/5">
      <div className="py-4 px-4">
        {/* Role Header */}
        <div className="mb-5 px-3 py-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[user.role]} flex items-center justify-center shadow-md`}>
              <RoleIcon size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 capitalize">{user.role}</h2>
              <p className="text-xs text-gray-400">Menu</p>
            </div>
          </div>
        </div>

        {/* Live Tracking - always visible at top for all roles */}
        <button
          onClick={() => navigate('/scan')}
          className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-3 ${
            location.pathname === '/scan'
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-100 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80 hover:border-gray-100 border border-transparent'
          }`}
        >
          <div className={`p-1.5 rounded-lg transition-all duration-200 ${
            location.pathname === '/scan' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'
          }`}>
            <Navigation size={16} />
          </div>
           <span className="flex-1 text-left font-semibold">Live Tracking</span>
           {location.pathname === '/scan' && <ChevronRight size={14} className="text-emerald-400" />}
         </button>

         {/* Tracking Dashboard - real-time SSE-powered overview */}
         <button
           onClick={() => navigate('/live-tracking')}
           className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-3 ${
             location.pathname === '/live-tracking'
               ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100 shadow-sm'
               : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80 hover:border-gray-100 border border-transparent'
           }`}
         >
           <div className={`p-1.5 rounded-lg transition-all duration-200 ${
             location.pathname === '/live-tracking' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
           }`}>
             <Waypoints size={16} />
           </div>
           <span className="flex-1 text-left font-semibold">Tracking Dashboard</span>
           {location.pathname === '/live-tracking' && <ChevronRight size={14} className="text-indigo-400" />}
         </button>

         <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 border border-primary-100 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80 hover:border-gray-100 border border-transparent'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-primary-100 text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                }`}>
                  <Icon size={16} />
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-primary-400" />}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
