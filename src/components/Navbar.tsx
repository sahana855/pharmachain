import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell, Menu, X, Pill, LayoutDashboard, ScanLine } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getDB } from '../lib/db';
import InstallAppButton from './InstallAppButton';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user) return;
      const db = await getDB();
      const allAlerts = await db.getAll('alerts');
      const unread = allAlerts.filter(a => a.userId === user.id && !a.read).length;
      setUnreadAlerts(unread);
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors: Record<string, string> = {
    manufacturer: 'from-blue-500 to-indigo-600',
    dealer: 'from-emerald-500 to-teal-600',
    transport: 'from-orange-500 to-amber-600',
    pharmacy: 'from-purple-500 to-violet-600',
    patient: 'from-rose-500 to-pink-600',
  };

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden mr-2 text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Pill size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold gradient-text hidden sm:block">PharmaChain</span>
            </div>
          </div>

<div className="flex items-center gap-3">
            <InstallAppButton />
            <button
              onClick={() => navigate('/scan')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <ScanLine size={14} /> Scan QR
            </button>
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              <Bell size={20} />
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-red-500 to-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </span>
              )}
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="hidden sm:flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${user ? roleColors[user.role] : 'from-gray-400 to-gray-500'} flex items-center justify-center shadow-md`}>
                  <User size={16} className="text-white" />
                </div>
                <div className="text-sm leading-tight">
                  <p className="font-semibold text-gray-700">{user?.name}</p>
                  <p className="text-gray-400 capitalize text-xs font-medium">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <LogOut size={16} />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-xl px-4 py-4 animate-slide-up">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${user ? roleColors[user.role] : 'from-gray-400 to-gray-500'} flex items-center justify-center shadow-md`}>
              <User size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">{user?.name}</p>
              <p className="text-gray-400 capitalize text-xs font-medium">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition"
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
        </div>
      )}
    </nav>
  );
}
