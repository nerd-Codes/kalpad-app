"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";

// --- GROUND TRUTH IMPORTS ---
import { Group as ResizableGroup, Panel, Separator } from "react-resizable-panels";

import {
  Box,
  Loader,
  Group,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

// --- VISUAL CONSTANTS ---
const LAB_BLUE = "#5538f8";
const HANDLE_WIDTH = 8;

// --- COMPONENT: BACKGROUND ---
function IDEBackground() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        backgroundColor: "#020617",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${LAB_BLUE}15 0%, transparent 60%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.07,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)",
        }}
      />
    </div>
  );
}

// --- COMPONENT: RESIZE HANDLE ---
function ResizeHandle() {
  return (
    <Separator>
      <Box
        style={{
          width: HANDLE_WIDTH,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "col-resize",
          // Lighter background to distinguish separation
          backgroundColor: "rgba(255, 255, 255, 0.02)", 
          // More visible borders
          borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
          borderRight: "1px solid rgba(255, 255, 255, 0.1)",
          transition: "all 0.2s ease",
        }}
        // Add hover effect via simple inline-style override on hover (if using CSS modules)
        // or rely on the visual distinctness we just added.
      >
        {/* The "Grip" Pill - Now Glowing */}
        <div
          style={{
            height: "40px", // Taller
            width: "4px",
            borderRadius: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.5)", // Much brighter
            boxShadow: `0 0 10px ${LAB_BLUE}`, // Lab Blue Glow
          }}
        />
      </Box>
    </Separator>
  );
}

// --- MAIN LAYOUT COMPONENT ---
export default function ResearchLayout({ sidebar, children, title  }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // --- AUTH GUARD ---
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/sign-in");
      } else {
        setSession(session);
      }
      setLoading(false);
    };
    checkAuth();
    setMounted(true);
  }, [router]);

  // Safety check to prevent hydration mismatch or undefined imports
  if (loading || !mounted) {
    return (
      <Box
        h="100vh"
        w="100vw"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#020617",
        }}
      >
        <Loader color={LAB_BLUE} type="dots" />
      </Box>
    );
  }

  if (!session) return null;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <IDEBackground />

       {/* --- TOP BAR --- */}
            <Box 
                h={48} 
                px="md"
                style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.08)', 
                    backgroundColor: 'rgba(2, 6, 23, 0.8)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    zIndex: 50
                }}
            >
                {/* Left: Brand */}
                <Group gap="xs">
                    <ThemeIcon variant="transparent" color={"dimmed"} size="xs">
                        <IconFlask />
                    </ThemeIcon>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                        KalPad Research
                    </Text>
                </Group>

                {/* Center: Project Title (Prominent) */}
                <Text 
                    size="sm" fw={600} c="white" 
                    style={{ 
                        fontFamily: 'var(--font-lexend)', 
                        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                        letterSpacing: '-0.01em'
                    }}
                >
                    {title || "Loading Project..."}
                </Text>
                
                {/* Right: Exit */}
                <Tooltip label="Exit Research Mode" position="bottom">
                    <Text 
                        size="xs" c="dimmed" style={{ cursor: 'pointer' }} 
                        onClick={() => router.push('/research')}
                        fw={600}
                    >
                        EXIT
                    </Text>
                </Tooltip>
            </Box>

      {/* --- RESIZABLE WORKSPACE --- */}
      <Box style={{ flex: 1, position: "relative" }}>
        {/* Using ResizableGroup (Group) with 'orientation' prop per your docs */}
        <ResizableGroup orientation="horizontal" id="research-layout-v1">
          
          {/* LEFT: SIDEBAR - UPDATED WIDTHS */}
          <Panel 
            defaultSize={300} 
            minSize={200}    
            maxSize={600}     
          >
            <aside
              style={{
                height: "100%",
                width: "100%",
                backgroundColor: "rgba(2, 6, 23, 0.5)",
                overflow: "hidden", // Ensure internal content doesn't break layout
              }}
            >
              {sidebar}
            </aside>
          </Panel>

          <ResizeHandle />

          {/* RIGHT: MAIN WORKSPACE */}
          <Panel minSize={30}>
            <main style={{ height: "100%", width: "100%", overflow: "hidden" }}>
              {children}
            </main>
          </Panel>

        </ResizableGroup>
      </Box>
    </div>
  );
}