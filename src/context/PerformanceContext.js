// src/context/PerformanceContext.js
"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { IconBolt, IconCheck } from '@tabler/icons-react';
import { Button, Group, Text } from '@mantine/core';
import { usePathname } from 'next/navigation';

const PerformanceContext = createContext();

export const PerformanceProvider = ({ children }) => {
    // Default to 'high' quality unless detected otherwise
    const [isLiteMode, setIsLiteMode] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false); // To prevent hydration mismatch

    const fpsFrameCount = useRef(0);
    const fpsStartTime = useRef(0);
    const rafId = useRef(null);

    const pathname = usePathname();

    // --- 1. INITIALIZATION & STORAGE CHECK ---
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedMode = localStorage.getItem('kalpad_perf_mode');
        
        if (storedMode === 'lite') {
            setIsLiteMode(true);
            setIsLoaded(true);
        } else {
            // Logic Update: 
            // 1. Skip check on Landing Page ('/')
            // 2. Delay check by 10 seconds to avoid initialization noise
            
            if (storedMode === 'high') setIsLiteMode(false);

            if (pathname !== '/') {
                const timer = setTimeout(() => {
                    runBenchmark();
                }, 10000); // 10-second delay

                return () => {
                    clearTimeout(timer);
                    if (rafId.current) cancelAnimationFrame(rafId.current);
                };
            } else {
                setIsLoaded(true);
            }
        }
    }, [pathname]); // Added pathname dependency

    // --- 2. THE FPS BENCHMARK ---
    const runBenchmark = () => {
        fpsFrameCount.current = 0;
        fpsStartTime.current = performance.now();
        
        const loop = (time) => {
            fpsFrameCount.current++;
            
            // Run for 2 seconds
            if (time - fpsStartTime.current < 2000) {
                rafId.current = requestAnimationFrame(loop);
            } else {
                // Calculation Time
                const duration = time - fpsStartTime.current;
                const fps = Math.round((fpsFrameCount.current / duration) * 1000);
                
                console.log(`[KalPad Core] Device Benchmark: ${fps} FPS`);
                
                // Threshold: If FPS < 35, suggest Lite Mode
                if (fps < 35) {
                    promptForLiteMode(fps);
                }
                setIsLoaded(true);
            }
        };
        
        rafId.current = requestAnimationFrame(loop);
    };

    // --- 3. THE PROMPT ---
    const promptForLiteMode = (fps) => {
        const id = notifications.show({
            title: 'Optimize Performance?',
            message: (
                <div style={{ marginTop: 8 }}>
                    <Text size="sm" c="dimmed" mb="xs">
                        We detected some lag ({fps} FPS). Switch to Lite Mode for a faster, smoother experience?
                    </Text>
                    <Group mt="sm">
                        <Button 
                            size="xs" 
                            variant="default" 
                            onClick={() => {
                                toggleMode(false); // Stay High
                                notifications.hide(id);
                            }}
                        >
                            Keep Visuals
                        </Button>
                        <Button 
                            size="xs" 
                            color="yellow" 
                            variant="light"
                            leftSection={<IconBolt size={14} />}
                            onClick={() => {
                                toggleMode(true); // Switch to Lite
                                notifications.hide(id);
                            }}
                        >
                            Switch to Lite
                        </Button>
                    </Group>
                </div>
            ),
            color: 'yellow',
            icon: <IconBolt size={18} />,
            autoClose: false, // Wait for user decision
            withCloseButton: false
        });
    };

    // --- 4. TOGGLE ACTION ---
    const toggleMode = (forceLiteState) => {
        const newState = forceLiteState !== undefined ? forceLiteState : !isLiteMode;
        setIsLiteMode(newState);
        localStorage.setItem('kalpad_perf_mode', newState ? 'lite' : 'high');
        
        // Immediate Feedback
        if (newState) {
            document.body.classList.add('lite-mode');
        } else {
            document.body.classList.remove('lite-mode');
        }
    };

    // --- 5. SYNC BODY CLASS ---
    // Ensures the class is present on reload if 'lite' was saved
    useEffect(() => {
        if (isLiteMode) {
            document.body.classList.add('lite-mode');
        } else {
            document.body.classList.remove('lite-mode');
        }
    }, [isLiteMode]);

    return (
        <PerformanceContext.Provider value={{ isLiteMode, toggleMode, isLoaded }}>
            {children}
        </PerformanceContext.Provider>
    );
};

export const usePerformance = () => useContext(PerformanceContext);