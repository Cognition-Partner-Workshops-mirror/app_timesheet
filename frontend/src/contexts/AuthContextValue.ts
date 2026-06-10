import { createContext } from 'react';
import { type User } from '../types/api';

/**
 * AuthContextType defines the shape of the authentication context.
 * login() triggers MSAL SSO popup by default; accepts optional email
 * for legacy email-only login fallback (when VITE_ENABLE_EMAIL_LOGIN=true).
 */
export interface AuthContextType {
  user: User | null;
  login: (email?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Whether the legacy email-only login fallback is enabled */
  isEmailLoginEnabled: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
