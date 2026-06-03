import { createContext } from 'react';
import { type User } from '../types/api';

// Shape of the authentication context value
export interface AuthContextType {
  user: User | null;
  login: (email: string, displayName?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
