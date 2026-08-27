import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getToken } from '../../lib/api';
import { apiUrl } from '../../lib/config';
import { useNavigate } from 'react-router-dom';
import { useLiveSync } from '../../lib/events';
import {
  Shield, CheckCircle, XCircle, Clock, UserCheck,
  Users, Loader2, LogOut, Package, Truck, Link2
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout, approveUser, approveAllUsers, rejectUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(apiUrl('/api/auth/users'), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to fetch users (${res.status})`);
      }
      const data = await res.json();
      setUsers((data.users || []).filter((u: any) => u.role !== 'admin'));
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const token = getToken();
      const res = await fetch(apiUrl('/api/admin/stats'), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data.stats || null);
      }
    } catch {}
  };

  // SSE real-time updates — refreshes user list when approvals happen
  useLiveSync(fetchUsers);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login', { replace: true });
      return;
    }
    fetchUsers();
    fetchSystemStats();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleApprove = async (userId: string) => {
    setProcessing(userId);
    await approveUser(userId);
    setProcessing(null);
    await fetchUsers();
    await fetchSystemStats();
  };

  const handleReject = async (userId: string) => {
    setProcessing(userId);
    await rejectUser(userId);
    setProcessing(null);
    await fetchUsers();
    await fetchSystemStats();
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
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Loader2 size={48} className="text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <div className="glass-card-solid p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Users</h1>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.verificationStatus === 'pending');
  const verifiedUsers = users.filter(u => u.verificationStatus === 'verified');
  const unverifiedUsers = users.filter(u => !u.verificationStatus || u.verificationStatus === 'rejected');

  return (
    <div className="min-h-screen animated-bg">
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                <Shield size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">Admin Panel</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/approvals')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition"
              >
                <UserCheck size={16} /> Approvals
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                  <UserCheck size={14} className="text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card-solid p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats?.users ?? users.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="glass-card-solid p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Medicines</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats?.medicines ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Package size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="glass-card-solid p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Shipments</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats?.shipments ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Truck size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          <div className="glass-card-solid p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Blockchain Records</p>
                <p className="text-2xl font-bold text-gray-900">{systemStats?.blockchainTransactions ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Link2 size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* User Approval Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card-solid p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-600">{pendingUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          <div className="glass-card-solid p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{verifiedUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="glass-card-solid p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected/New</p>
                <p className="text-2xl font-bold text-gray-600">{unverifiedUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <XCircle size={24} className="text-gray-600" />
              </div>
            </div>
          </div>
          <div className="glass-card-solid p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verified Scans</p>
                <p className="text-2xl font-bold text-emerald-600">{systemStats?.verifiedMedicines ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Users */}
        <div className="glass-card-solid p-6 rounded-2xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock size={20} className="text-amber-500" />
              Pending Approval Requests
              {pendingUsers.length > 0 && (
                <span className="text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {pendingUsers.length} pending
                </span>
              )}
            </h2>
            {pendingUsers.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {approvingAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Approve all
              </button>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
              <p className="text-gray-500 font-medium">No pending approvals</p>
              <p className="text-gray-400 text-sm mt-1">All users have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((pendingUser) => (
                <div key={pendingUser.id} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <UserCheck size={22} className="text-white" />
                      </div>
                       <div>
                         <h3 className="font-semibold text-gray-900 text-lg">{pendingUser.name}</h3>
                        <p className="text-sm text-gray-500">{pendingUser.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full capitalize">
                            {pendingUser.role}
                          </span>
                          <span className="text-xs text-gray-400">
                            Registered: {new Date(pendingUser.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        {/* Verification Details */}
                        <div className="mt-3 flex flex-wrap gap-3">
                          {pendingUser.aadharNumber && (
                            <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg">
                              Aadhar: {pendingUser.aadharNumber}
                            </span>
                          )}
                          {pendingUser.businessLicense && (
                            <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg">
                              License: {pendingUser.businessLicense}
                            </span>
                          )}
                          {pendingUser.idProofType && pendingUser.idProofNumber && (
                            <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg">
                              {pendingUser.idProofType.replace('_', ' ').toUpperCase()}: {pendingUser.idProofNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 lg:flex-shrink-0">
                      <button
                        onClick={() => handleReject(pendingUser.id)}
                        disabled={processing === pendingUser.id}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(pendingUser.id)}
                        disabled={processing === pendingUser.id}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {processing === pendingUser.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Users */}
        <div className="glass-card-solid p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-primary-500" />
            All Registered Users
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aadhar</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">License</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID Proof</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.aadharNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.businessLicense || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {u.idProofNumber ? (
                        <span title={u.idProofType?.replace('_', ' ') || 'ID'}>
                          {u.idProofType?.toUpperCase().replace('_', ' ')}: {u.idProofNumber}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {u.verificationStatus === 'pending' ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">Awaiting Approval</span>
                      ) : u.verificationStatus === 'verified' ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Approved</span>
                      ) : u.verificationStatus === 'rejected' ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">Rejected</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">New</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
