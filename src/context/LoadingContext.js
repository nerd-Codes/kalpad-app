// src/context/LoadingContext.js
"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname(); // Get the current URL path

  // --- THIS IS THE FIX ---
  // This effect will run every time the URL path changes.
  useEffect(() => {
    setIsLoading(false); // Turn off the loader when the new page is rendered
  }, [pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}