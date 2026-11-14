// src/context/KalPadThemeContext.js
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'kalpad_theme_mode';
const VALID_MODES = new Set(['light', 'dark', 'system']);

const KalPadThemeContext = createContext({
  themeMode: 'light',
  resolvedTheme: 'light',
  setThemeMode: () => {},
});

function getSystemPrefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function KalPadThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState('light');
  const [systemIsDark, setSystemIsDark] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && VALID_MODES.has(saved)) {
        setThemeModeState(saved);
      }
    } catch {
      // Ignore storage failures in restricted browser modes
    }

    setSystemIsDark(getSystemPrefersDark());

    if (typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => setSystemIsDark(e.matches);
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
  }, []);

  const resolvedTheme = useMemo(() => {
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'system') return systemIsDark ? 'dark' : 'light';
    return 'light';
  }, [themeMode, systemIsDark]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      document.documentElement.setAttribute('data-kalpad-theme', 'light');
      return;
    }
    document.documentElement.setAttribute('data-kalpad-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setThemeMode = (nextMode) => {
    if (!VALID_MODES.has(nextMode)) return;
    setThemeModeState(nextMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage errors
    }
  };

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      isDark: resolvedTheme === 'dark',
      setThemeMode,
    }),
    [themeMode, resolvedTheme]
  );

  return (
    <KalPadThemeContext.Provider value={value}>
      {children}
    </KalPadThemeContext.Provider>
  );
}

export function useKalPadTheme() {
  return useContext(KalPadThemeContext);
}
