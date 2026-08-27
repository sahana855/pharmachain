import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'manufacturer' | 'dealer' | 'transport' | 'pharmacy' | 'patient'>;
}

const APPROVAL_REQUIRED_ROLES = ['manufacturer', 'dealer', 'pharmacy', 'transport'];

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin doesn't need verification - redirect to admin dashboard
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  // Check verification for roles that need admin approval
  if (APPROVAL_REQUIRED_ROLES.includes(user.role)) {
    if (!user.verificationStatus || user.verificationStatus === 'rejected') {
      return <Navigate to="/verification" replace />;
    }
    if (user.verificationStatus === 'pending') {
      return <Navigate to="/verification" replace />;
    }
  }

  return <>{children}</>;
}

