/**
 * Hook to access the AuthContext from any component.
 * Separated from AuthContext.tsx to satisfy react-refresh/only-export-components.
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContextDef';
import type { AuthContextType } from '../contexts/AuthContextDef';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
