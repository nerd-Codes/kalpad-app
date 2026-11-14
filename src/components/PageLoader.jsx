// src/components/PageLoader.jsx
"use client";

import { GenerationDock } from '@/components/kalpad/GenerationDock';

/**
 * Non-blocking generation HUD.
 * Replaces the legacy fullscreen blocking modal overlay with a sleek, non-intrusive
 * floating progress dock that persists across page navigation.
 */
export function PageLoader() {
  return <GenerationDock />;
}

export default PageLoader;
