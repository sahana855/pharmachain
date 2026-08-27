// PharmaChain auth context - wired to the real MongoDB backend API
// Keeps the same useAuth() interface so existing components work unchanged.
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setToken, getToken, clearToken } from './api';
import { apiUrl } from './config';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manufacturer' | 'dealer' | 'transport' | 'pharmacy' | 'patient';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  aadharNumber?: string;
  businessLicense?: string;
  idProofType?: string;
  idProofNumber?: string;
  createdAt?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  register: (email: string, password: string, name: string, role: User['role'], extraFields?: {
    aadharNumber?: string;
    businessLicense?: string;
    idProofType?: string;
    idProofNumber?: string;
  }) => Promise<AuthResult>;
  approveUser: (userId: string) => Promise<void>;
  approveAllUsers: () => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  pendingVerifications: User[];
  demoLogin: (email: string, password: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerifications, setPendingVerifications] = useState<User[]>([]);

  const fetchPendingVerifications = async () => {
    try {
      const token = getToken();
      const res = await fetch(apiUrl('/api/auth/users'), {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return;
      const data = await res.json();
      const pending = (data.users || []).filter((u: any) => u.verificationStatus === 'pending');
      setPendingVerifications(pending);
    } catch {}
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await fetch(apiUrl('/api/auth/me'), {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          clearToken();
          setUser(null);
        } else {
          const data = await res.json();
          if (data.user) setUser(data.user);
        }
      } catch {
        clearToken();
        setUser(null);
      }
      try {
        await fetchPendingVerifications();
      } catch {}
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch(apiUrl('/api/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      const responseText = await res.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        return {
          success: false,
          error: 'The deployed API returned an HTML page instead of JSON. Configure the Vercel API function and redeploy.',
        };
      }
      if (!res.ok) {
        return { success: false, error: data?.error || data?.message || 'Login failed' };
      }
      if (data.token) {
        setToken(data.token);
        setUser(data.user || null);
        try { await fetchPendingVerifications(); } catch {}
        return { success: true };
      }
      return { success: false, error: 'Login did not return a token' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    clearToken();
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: User['role'],
    extraFields?: {
      aadharNumber?: string;
      businessLicense?: string;
      idProofType?: string;
      idProofNumber?: string;
    }
  ): Promise<AuthResult> => {
    try {
      const res = await fetch(apiUrl('/api/auth/register'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name, role, ...(extraFields || {}) }) });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || data?.message || 'Registration failed' };
      }
      if (data.message) return { success: true, message: data.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed' };
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const token = getToken();
      await fetch(apiUrl(`/api/auth/users/${userId}/approve`), { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : undefined });
      await fetchPendingVerifications();
    } catch {}
  };

  const approveAllUsers = async () => {
    const token = getToken();
    const res = await fetch(apiUrl('/api/auth/users/approve-all'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error('Failed to approve users');
    await fetchPendingVerifications();
  };

  const rejectUser = async (userId: string) => {
    try {
      const token = getToken();
      await fetch(apiUrl(`/api/auth/users/${userId}/reject`), { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : undefined });
      await fetchPendingVerifications();
    } catch {}
  };

  const demoLogin = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch(apiUrl('/api/auth/demo-login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data?.error || data?.message || 'Demo login failed' };
      if (data.token) {
        setToken(data.token);
        setUser(data.user || null);
        try { await fetchPendingVerifications(); } catch {}
        return { success: true };
      }
      return { success: false, error: 'Demo login did not return a token' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Demo login failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, approveUser, approveAllUsers, rejectUser, pendingVerifications, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

