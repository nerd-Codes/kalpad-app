// src/context/LoadingContext.js
"use client";

import {
  GenerationProvider,
  useGeneration,
  useLoading as useGenerationLoading,
} from './GenerationContext';

export function LoadingProvider({ children }) {
  return <GenerationProvider>{children}</GenerationProvider>;
}

export function useLoading() {
  return useGenerationLoading();
}

export { useGeneration };
