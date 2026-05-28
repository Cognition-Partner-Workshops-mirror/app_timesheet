'use client';

/**
 * Theme hook for light/dark mode toggle.
 * Persists preference in localStorage and applies data-theme attribute to <html>.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export type Theme = 'light' | 'dark';

/**
 * Read saved theme preference from localStorage (client-side only).
 */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem('codevision-theme') as Theme) || 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const initialized = useRef(false);

  // Apply the data-theme attribute on mount and when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (!initialized.current) {
      initialized.current = true;
    }
  }, [theme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('codevision-theme', next);
      return next;
    });
  }, []);

  // Set a specific theme
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('codevision-theme', t);
  }, []);

  return { theme, toggleTheme, setTheme };
}
