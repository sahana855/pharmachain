import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { Clock, Loader2, LogOut } from 'lucide-react';

export default function Verification() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    logout(); // Log out the pending user so they can login as a different account
    navigate('/login', { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <div className="glass-card-solid p-8 text-center">
          <Loader2 size={48} className="mx-auto mb-4 text-primary-500 animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  // If verified, go to dashboard
  if (user.verificationStatus === 'verified') {
    navigate(`/dashboard/${user.role}`, { replace: true });
    return null;
  }

  // If rejected
  if (user.verificationStatus === 'rejected') {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <div className="glass-card-solid p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Rejected</h1>
          <p className="text-gray-500">Your account was rejected by the admin. Please contact support.</p>
          <button
            onClick={handleBackToLogin}
            className="mt-6 px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Pending
  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <div className="glass-card-solid p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock size={32} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Awaiting Approval</h1>
        <p className="text-gray-500 mb-4">
          Your account is pending admin approval. You'll be able to login once the admin verifies your account.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
          <Clock size={16} />
          Status: Pending Review
        </div>
        <button
          onClick={handleBackToLogin}
          className="mt-6 px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

