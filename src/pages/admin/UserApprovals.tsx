import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { getToken } from '../../lib/api';
import { apiUrl } from '../../lib/config';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Loader2, LogOut, Shield, UserCheck, XCircle } from 'lucide-react';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  aadharNumber?: string;
  businessLicense?: string;
  idProofType?: string;
  idProofNumber?: string;
}

export default function UserApprovals() {
  const { user, logout, approveUser, approveAllUsers, rejectUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const response = await fetch(apiUrl('/api/auth/users'), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Failed to fetch users (${response.status})`);
      setUsers((data.users || []).filter((candidate: PendingUser & { verificationStatus?: string }) => (
        candidate.role !== 'admin' && candidate.verificationStatus === 'pending'
      )));
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login', { replace: true });
      return;
    }
    fetchUsers();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDecision = async (userId: string, decision: 'approve' | 'reject') => {
    setProcessing(userId);
    try {
      if (decision === 'approve') await approveUser(userId);
      else await rejectUser(userId);
      await fetchUsers();
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveAll = async () => {
    setApprovingAll(true);
    try {
      await approveAllUsers();
      await fetchUsers();
    } finally {
      setApprovingAll(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen animated-bg flex items-center justify-center"><Loader2 size={48} className="text-primary-500 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <div className="glass-card-solid p-8 max-w-md text-center">
          <XCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to load requests</h1>
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={fetchUsers} className="px-5 py-2 bg-primary-500 text-white rounded-xl">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg">
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20"><Shield size={18} className="text-white" /></div>
            <span className="text-lg font-bold gradient-text">User Approvals</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"><LogOut size={16} /> Logout</button>
          </div>
        </div>
      </nav>

      <main className="pt-24 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6"><ArrowLeft size={16} /> Back to admin dashboard</button>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">Admin workspace</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">Approve registered users</h1>
            <p className="text-gray-500 mt-2">Review pending accounts before they access the platform.</p>
          </div>
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 font-semibold"><Clock size={18} /> {users.length} pending</div>
        </div>

        {users.length === 0 ? (
          <div className="glass-card-solid p-10 text-center"><CheckCircle size={52} className="mx-auto mb-3 text-green-400" /><h2 className="text-xl font-bold text-gray-900">No pending approvals</h2><p className="text-gray-500 mt-1">All registered users have been reviewed.</p></div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end"><button onClick={handleApproveAll} disabled={approvingAll} className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-2 disabled:opacity-50">{approvingAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Approve all</button></div>
            {users.map((pendingUser) => (
              <section key={pendingUser.id} className="glass-card-solid p-5 sm:p-6 rounded-2xl border-l-4 border-amber-400">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0"><UserCheck size={22} className="text-white" /></div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{pendingUser.name}</h2>
                      <p className="text-sm text-gray-500">{pendingUser.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                        <span className="capitalize bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">{pendingUser.role}</span>
                        {pendingUser.aadharNumber && <span className="bg-gray-50 border px-2.5 py-1 rounded-lg">Aadhar: {pendingUser.aadharNumber}</span>}
                        {pendingUser.businessLicense && <span className="bg-gray-50 border px-2.5 py-1 rounded-lg">License: {pendingUser.businessLicense}</span>}
                        {pendingUser.idProofNumber && <span className="bg-gray-50 border px-2.5 py-1 rounded-lg">{pendingUser.idProofType?.replace('_', ' ').toUpperCase()}: {pendingUser.idProofNumber}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 lg:flex-shrink-0">
                    <button onClick={() => handleDecision(pendingUser.id, 'reject')} disabled={processing === pendingUser.id || approvingAll} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"><XCircle size={16} /> Reject</button>
                    <button onClick={() => handleDecision(pendingUser.id, 'approve')} disabled={processing === pendingUser.id || approvingAll} className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">{processing === pendingUser.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Approve</button>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
