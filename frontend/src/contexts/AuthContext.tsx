/**
 * Authentication context provider for the Event Services Marketplace.
 * Manages user session state (token, user object, role) via localStorage.
 * Provides login, register, and logout functions to the component tree.
 */

import { useState, useCallback, type ReactNode } from 'react';
import type { RegisterData } from '../types/api';
import type { User } from '../types/api';
import { AuthContext } from './AuthContextDef';
import apiClient from '../api/client';

// Read initial auth state from localStorage synchronously (avoids useEffect + setState)
function getInitialToken(): string | null {
  return localStorage.getItem('token');
}

function getInitialUser(): User | null {
  const saved = localStorage.getItem('user');
  if (saved) {
    try { return JSON.parse(saved); } catch { return null; }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [token, setToken] = useState<string | null>(getInitialToken);
  // No async loading needed since we read localStorage synchronously
  const isLoading = false;

  // Login with email and password, store JWT and user info
  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.login(email, password);
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  }, []);

  // Register a new user, store JWT and user info, return server message
  const register = useCallback(async (data: RegisterData): Promise<string> => {
    const response = await apiClient.register(data);
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
    return response.message || 'Registration successful';
  }, []);

  // Clear session
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // Re-fetch current user from server (e.g. after profile update)
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.getMe();
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
