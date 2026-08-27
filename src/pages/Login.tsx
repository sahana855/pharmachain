import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { Pill, Shield, Loader2, Lock, Mail, UserPlus, UserCheck } from 'lucide-react';
import InstallAppButton from '../components/InstallAppButton';

export default function Login() {
  const { user, loading: authLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'manufacturer' | 'dealer' | 'transport' | 'pharmacy' | 'patient'>('pharmacy');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Extra registration fields
  const [aadharNumber, setAadharNumber] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [idProofType, setIdProofType] = useState('aadhar');
  const [idProofNumber, setIdProofNumber] = useState('');

  // Roles that require extra verification fields
  const VERIFICATION_REQUIRED_ROLES = ['manufacturer', 'dealer', 'transport', 'pharmacy'];
  const showExtraFields = isRegistering && VERIFICATION_REQUIRED_ROLES.includes(role);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(`/dashboard/${user.role}`, { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <div className="glass-card-solid p-8 text-center">
          <Loader2 size={48} className="mx-auto mb-4 text-primary-500 animate-spin" />
          <p className="text-gray-600 font-medium">Initializing...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      let result;
      if (isRegistering) {
        const extraFields: any = {};
        if (VERIFICATION_REQUIRED_ROLES.includes(role)) {
          extraFields.aadharNumber = aadharNumber;
          extraFields.businessLicense = businessLicense;
          extraFields.idProofType = idProofType;
          extraFields.idProofNumber = idProofNumber;
        }
        result = await register(email, password, name, role, extraFields);
        if (!result.success) {
          setError(result.error || 'Registration failed');
        } else if (result.message) {
          setMessage(result.message);
        }
      } else {
        result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Login failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed top-4 right-4 z-[100]">
        <InstallAppButton />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      <div className="w-full max-w-md animate-slide-up relative z-10">
        <div className="glass-card-solid p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl shadow-lg shadow-primary-500/30 mb-4">
              <Pill className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">PharmaChain</h1>
            <p className="text-gray-500 text-sm mt-1">
              {isRegistering ? 'Create a new account' : 'Pharmaceutical Supply Chain Platform'}
            </p>
          </div>

          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
              <Shield size={16} />
              {message}
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name / Business Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input-modern"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Mail size={14} className="text-primary-500" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-modern"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Lock size={14} className="text-primary-500" /> Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-modern"
                  placeholder="Enter password"
                  required
                />
              </div>

              {isRegistering && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-primary-500" /> Role
                  </label>
                  <select
                    value={role}
                    onChange={e => {
                      setRole(e.target.value as any);
                      setAadharNumber('');
                      setBusinessLicense('');
                      setIdProofType('aadhar');
                      setIdProofNumber('');
                    }}
                    className="input-modern"
                    required
                  >
                    <option value="manufacturer">Manufacturer</option>
                    <option value="dealer">Dealer / Distributor</option>
                    <option value="transport">Transport / Logistics</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="patient">Patient / Consumer</option>
                  </select>
                  {showExtraFields && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Shield size={12} /> Business verification details required
                    </p>
                  )}
                </div>
              )}

              {showExtraFields && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Aadhar Number</label>
                    <input
                      type="text"
                      value={aadharNumber}
                      onChange={e => setAadharNumber(e.target.value)}
                      className="input-modern"
                      placeholder="Enter Aadhar number"
                      required
                      pattern="[0-9]{12}"
                      title="12-digit Aadhar number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business License Number</label>
                    <input
                      type="text"
                      value={businessLicense}
                      onChange={e => setBusinessLicense(e.target.value)}
                      className="input-modern"
                      placeholder="Enter business license number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Proof Type</label>
                    <select
                      value={idProofType}
                      onChange={e => setIdProofType(e.target.value)}
                      className="input-modern"
                      required
                    >
                      <option value="aadhar">Aadhar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="passport">Passport</option>
                      <option value="driving_license">Driving License</option>
                      <option value="voter_id">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Proof Number</label>
                    <input
                      type="text"
                      value={idProofNumber}
                      onChange={e => setIdProofNumber(e.target.value)}
                      className="input-modern"
                      placeholder="Enter ID proof number"
                      required
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <Shield size={16} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gradient py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                {loading ? 'Please wait...' : isRegistering ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsRegistering(prev => !prev); setError(''); setMessage(''); }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1.5 mx-auto cursor-pointer"
            >
              <UserPlus size={14} />
              {isRegistering || message ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>

          {!isRegistering && !message && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Admin: admin@pharma.com / admin123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
