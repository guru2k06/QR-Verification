import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(() => {
    const stored = window.localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => window.localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (adminUser) {
      window.localStorage.setItem('admin_user', JSON.stringify(adminUser));
    } else {
      window.localStorage.removeItem('admin_user');
    }
  }, [adminUser]);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem('admin_token', token);
    } else {
      window.localStorage.removeItem('admin_token');
    }
  }, [token]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const value = useMemo(() => ({
    adminUser,
    token,
    loading,
    async login(credentials) {
      const response = await apiClient.post('/auth/login', credentials);
      setAdminUser(response.data.user);
      setToken(response.data.token);
      return response.data;
    },
    logout() {
      setAdminUser(null);
      setToken(null);
    },
  }), [adminUser, loading, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
