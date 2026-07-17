import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) return null;
        if (!r.ok) throw new Error('Auth check failed');
        return r.json();
      })
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => { window.location.href = '/api/logout'; };
  const login  = () => { window.location.href = '/api/login'; };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, logout, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
