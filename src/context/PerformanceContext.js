// src/context/PerformanceContext.js
"use client";

import { createContext, useContext, useEffect } from 'react';

const PerformanceContext = createContext({
  isLiteMode: false,
  toggleMode: () => {},
  isLoaded: true,
});

export const PerformanceProvider = ({ children }) => {
  // Reduced effects / lite mode is retired and permanently OFF across all surfaces.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem('kalpad_perf_mode');
    } catch {
      // ignore storage errors
    }
    document.body.classList.remove('lite-mode');
  }, []);

  return (
    <PerformanceContext.Provider
      value={{
        isLiteMode: false,
        toggleMode: () => {},
        isLoaded: true,
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = () => useContext(PerformanceContext);
