import { createContext } from 'react';
import type { User } from '../types/api';

// Shape of the auth context value
export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Auth context shared between provider and consumer hook
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
