// src/components/GlassCard.jsx
"use client";
import { Paper } from '@mantine/core';
import { cn } from "@/lib/utils"; // This is a helper function from Shadcn/ui

// --- We need to create the AnimatedShinyText component from magic-ui ---
// It's a bit complex, so we'll put it in the same file for simplicity.
import React from "react";

const AnimatedShinyText = ({
  children,
  className,
  shimmerWidth = 100,
}) => {
  return (
    <p
      style={{
        "--shimmer-width": `${shimmerWidth}px`,
      }}
      className={cn(
        "mx-auto max-w-md text-neutral-600/50 dark:text-neutral-400/50",
        "animate-shimmer bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shimmer-width)_100%] [transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite]",
        "bg-gradient-to-r from-transparent via-black/80 via-50% to-transparent  dark:via-white/80",
        className,
      )}
    >
      {children}
    </p>
  );
};
// --- End of AnimatedShinyText component ---


// --- OUR NEW GLASS CARD COMPONENT ---
export function GlassCard({ children, ...props }) {
  return (
    <Paper
      withBorder
      shadow="md"
      p="xl"
      radius="lg"
      style={{
        position: 'relative', // Needed for the shine to be contained
        backgroundColor: 'rgba(37, 38, 43, 0.5)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden', // Crucial
      }}
      {...props}
    >
      {/* This is the magic: an invisible shiny text element that creates the border effect */}
      <div className="absolute inset-0 z-10 overflow-hidden rounded-lg">
        <AnimatedShinyText className="group-hover:animate-shimmer absolute inset-0 h-full w-full" />
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </Paper>
  );
}