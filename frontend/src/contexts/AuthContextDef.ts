/**
 * Auth context definition - separated to satisfy react-refresh/only-export-components.
 * This file exports the context object and type; AuthContext.tsx exports only the Provider component.
 */

import { createContext } from 'react';
import type { User, RegisterData } from '../types/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
