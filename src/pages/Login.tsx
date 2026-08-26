import { useState, useEffect } from 'react';
import { useAuth, getPendingOtp, clearPendingOtp } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { Pill, Shield, Loader2, Lock, Mail, UserPlus, UserCheck, Zap } from 'lucide-react';
import InstallAppButton from '../components/InstallAppButton';

export default function Login() {
  const { user, loading: authLoading, logout, login, register, verifyOtp, resendOtp, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'manufacturer' | 'dealer' | 'transport' | 'pharmacy' | 'patient'>('pharmacy');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  // Demo mode
  const [demoMode, setDemoMode] = useState(false);
  // OTP flow states
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Restore pending OTP state from sessionStorage (page refresh resilience)
  useEffect(() => {
    const pending = getPendingOtp();
    if (pending && pending.email) {
      setEmail(pending.email);
      setAwaitingOtp(true);
      setOtpMessage('Enter the code sent to your email');
      setResendIn(Math.max(0, 45 - Math.floor((Date.now() - pending.ts) / 1000)));
    }
  }, []);

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

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(n => Math.max(0, n - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

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
    setOtpError('');
    setOtpMessage('');
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
      } else if (demoMode) {
        result = await demoLogin(email, password);
        if (!result.success) {
          setError(result.error || 'Demo login failed');
        }
      } else {
        // Start login -> server will send OTP to email
        result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Login failed');
        } else {
          // OTP sent
          setAwaitingOtp(true);
          setOtp('');
          setOtpMessage(result.message || 'OTP sent to your email');
          setResendIn(45);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setOtpError('');
    setOtpMessage('');
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      setOtpError('Enter the 6-digit code from your email');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(email.trim(), code);
      if (!result.success) {
        setOtpError(result.error || 'OTP verification failed');
      }
    } catch {
      setOtpError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0) return;
    setOtpError('');
    setOtpMessage('');
    setResendLoading(true);
    try {
      const result = await resendOtp(email);
      if (!result.success) {
        setOtpError(result.error || 'Resend failed');
      } else {
        setOtpMessage(result.message || 'OTP resent');
        setResendIn(45);
      }
    } catch {
      setOtpError('An unexpected error occurred');
    } finally {
      setResendLoading(false);
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
              {awaitingOtp ? 'Enter the code we emailed you' : isRegistering ? 'Create a new account' : 'Pharmaceutical Supply Chain Platform'}
            </p>
          </div>

          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
              <Shield size={16} />
              {message}
            </div>
          )}

          {awaitingOtp && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-800">
                We sent a 6-digit login code to <span className="font-semibold">{email}</span>. Check your inbox and spam folder.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-modern tracking-[0.4em] text-center text-lg font-semibold"
                  placeholder="000000"
                  autoFocus
                />
                {otpMessage && <p className="text-sm text-green-600 mt-1">{otpMessage}</p>}
                {otpError && <p className="text-sm text-red-600 mt-1">{otpError}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gradient py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                {loading ? 'Verifying...' : 'Verify & continue'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading || resendIn > 0}
                  className="text-primary-600 font-medium disabled:text-gray-400"
                >
                  {resendLoading ? 'Sending...' : resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                   onClick={() => { setAwaitingOtp(false); setOtp(''); setOtpError(''); setOtpMessage(''); setResendIn(0); clearPendingOtp(); }}

                  className="text-gray-500"
                >
                  Use a different account
                </button>
              </div>
            </form>
          )}

          {!message && !awaitingOtp && !demoMode && (
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
                    // Reset extra fields when role changes
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

            {/* Extra verification fields for manufacturer, dealer, transport, pharmacy */}
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

          {!awaitingOtp && (
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
          )}

          {!awaitingOtp && !demoMode && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setDemoMode(true)}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                <Zap size={14} />
                Demo Login (bypass OTP)
              </button>
            </div>
          )}

          {!awaitingOtp && demoMode && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setDemoMode(false); setError(''); setMessage(''); }}
                className="text-sm text-gray-500 hover:text-gray-600 font-medium flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                Back to normal login
              </button>
            </div>
          )}

          {!isRegistering && !message && !awaitingOtp && !demoMode && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Admin: admin@pharma.com / admin123
              </p>
            </div>
          )}

          {!isRegistering && !message && !awaitingOtp && demoMode && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Demo mode active — OTP bypassed. Use any approved demo account.
              </div>
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
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                {loading ? 'Please wait...' : 'Demo Login'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
