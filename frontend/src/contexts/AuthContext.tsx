import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import type { AuthResponse } from '../types/api';
import { AuthContext } from './AuthContextDef';

// Provides authentication state and actions to the component tree
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<import('../types/api').User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Verify stored token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await apiClient.get('/auth/me');
          setUser(response.data.user);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  // Authenticate with email and password
  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  // Create a new account and log in immediately
  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  // Clear auth state
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
