import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { type User } from '../types/api';
import apiClient from '../api/client';
import { loginRequest } from '../auth/msalConfig';
import { AuthContext, type AuthContextType } from './AuthContextValue';

/** Check if legacy email-only login is enabled via environment variable */
const isEmailLoginEnabled = import.meta.env.VITE_ENABLE_EMAIL_LOGIN === 'true';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider wraps the app and manages authentication state.
 *
 * Primary flow: Microsoft Entra ID (Azure AD) SSO via MSAL popup.
 * Fallback flow: Legacy email-only login when VITE_ENABLE_EMAIL_LOGIN=true.
 *
 * After MSAL login, acquires an access token silently and calls
 * the backend /api/auth/login with a Bearer token to ensure the
 * user exists in the local DB.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { instance, inProgress } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On mount or when MSAL auth state changes, check for an existing session.
   * For SSO: acquire token silently and sync with the backend.
   * For email fallback: check localStorage for stored email.
   */
  useEffect(() => {
    const checkAuth = async () => {
      // Wait until MSAL interaction is complete before checking auth
      if (inProgress !== InteractionStatus.None) {
        return;
      }

      try {
        // SSO path: if MSAL reports authenticated, acquire token and sync with backend
        if (isMsalAuthenticated) {
          const accounts = instance.getAllAccounts();
          if (accounts.length > 0) {
            const tokenResponse = await instance.acquireTokenSilent({
              scopes: loginRequest.scopes,
              account: accounts[0],
            });

            // Call backend to ensure user record exists in the DB
            const response = await apiClient.loginWithToken(tokenResponse.accessToken);
            setUser(response.user);
            setIsLoading(false);
            return;
          }
        }

        // Email fallback path: check localStorage for a previously stored email
        if (isEmailLoginEnabled) {
          const storedEmail = localStorage.getItem('userEmail');
          if (storedEmail) {
            try {
              const response = await apiClient.getCurrentUser();
              setUser(response.user);
            } catch (error) {
              console.error('Email auth check failed:', error);
              localStorage.removeItem('userEmail');
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [instance, isMsalAuthenticated, inProgress]);

  /**
   * login() — triggers authentication.
   * Without an email arg (or when email login is disabled): opens MSAL popup.
   * With an email arg and email login enabled: uses legacy email-based flow.
   */
  const login = useCallback(async (email?: string) => {
    // Legacy email-based login fallback
    if (email && isEmailLoginEnabled) {
      const response = await apiClient.login(email);
      setUser(response.user);
      localStorage.setItem('userEmail', email);
      return;
    }

    // MSAL SSO popup login
    const loginResponse = await instance.loginPopup(loginRequest);
    if (loginResponse.account) {
      // Acquire access token after popup login
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: loginResponse.account,
      });

      // Sync with backend — creates user in DB if not yet provisioned
      const backendResponse = await apiClient.loginWithToken(tokenResponse.accessToken);
      setUser(backendResponse.user);
    }
  }, [instance]);

  /**
   * logout() — clears local state and triggers MSAL or email logout.
   */
  const logout = useCallback(async () => {
    setUser(null);

    // Clear legacy email login storage
    localStorage.removeItem('userEmail');

    // If MSAL has active accounts, log out via MSAL popup
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      try {
        await instance.logoutPopup();
      } catch (error) {
        console.error('MSAL logout failed:', error);
      }
    }
  }, [instance]);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
    isEmailLoginEnabled,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
