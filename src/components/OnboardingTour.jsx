// /src/components/OnboardingTour.jsx
"use client";

import { useEffect, useState, useLayoutEffect } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import onboardingSteps from '@/lib/onboardingSteps';
import { Popover, Text, Title, Button, Group, Box } from '@mantine/core';
import { useRouter, usePathname } from 'next/navigation';
import classes from './OnboardingTour.module.css';
import { GlassCard } from './GlassCard';

export function OnboardingTour() {
    const { isTourActive, currentStep, nextStep, endTour, isPaused } = useOnboarding();
    const router = useRouter();
    const pathname = usePathname();
    const step = isTourActive ? onboardingSteps[currentStep] : null;
    
    // State to hold the position of the highlighted element
    const [targetRect, setTargetRect] = useState(null);



    // This effect finds the target element and measures it
useLayoutEffect(() => {
    // Only run the logic if the tour is active, unpaused, and on the correct page.
    if (isTourActive && !isPaused && step && step.route === pathname) {
        let attempts = 0;
        const maxAttempts = 10; // Try for 1 second (10 * 100ms)

        const findAndMeasureElement = () => {
            const element = document.querySelector(step.target);

            if (element) {
                // --- DEFINITIVE FIX: Get the final, stable position ---
                const rect = element.getBoundingClientRect();
                
                // If the element is found but its position is 0,0 (a sign of not being rendered yet), retry.
                if (rect.top === 0 && rect.left === 0 && attempts < maxAttempts) {
                    attempts++;
                    setTimeout(findAndMeasureElement, 100);
                    return;
                }

                setTargetRect(rect); // Set the final, correct position

                // Handle auto-scrolling
                if (step.target === '#generate-plan-button' || step.target === '#save-plan-button') {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else if (attempts < maxAttempts) {
                // If the element doesn't exist yet, wait and retry.
                attempts++;
                setTimeout(findAndMeasureElement, 100);
            } else {
                // If we fail after all attempts, clear the rect.
                console.warn(`Onboarding tour could not find target element: ${step.target}`);
                setTargetRect(null);
            }
        };

        findAndMeasureElement();

    } else {
        // If the tour is not active/paused, ensure the rect is cleared.
        setTargetRect(null);
    }
}, [isTourActive, isPaused, step, pathname]); // Dependencies are correct

   const handleNext = () => {
        const isLastStep = currentStep === onboardingSteps.length - 1;

        // If it's the last step, the button's only job is to end the tour.
        if (isLastStep) {
            endTour();
            return; // Stop execution
        }
        
        const nextStepConfig = onboardingSteps[currentStep + 1];
        if (nextStepConfig && nextStepConfig.route !== pathname) {
            router.push(nextStepConfig.route);
        }
        
        nextStep();
    };

    const handleSkip = () => {
        endTour();
    };
    
    if (!isTourActive || !step || !targetRect || isPaused) {
        return null;
    }

    const isLastStep = currentStep === onboardingSteps.length - 1;

return (
    <>
        {/* We keep the dark overlay, but remove the spotlight from here. */}
        {/* The overlay is created by the spotlight's box-shadow now. */}

        <Popover
            opened={true}
            position={step.placement}
            withArrow
            shadow="xl"
            radius="lg"
            zIndex={4000}
            offset={10}
            // --- DEFINITIVE FIX #1: Don't render the Popover until the target is stable ---
            // This prevents a single-frame flash in the wrong position.
            transitionProps={{ duration: targetRect ? 150 : 0 }}
        >
            <Popover.Target>
                {/* --- DEFINITIVE FIX #2: The Spotlight IS the target. --- */}
                {/* This single div is now responsible for both the visual effect and anchoring the popover. */}
                <div
                    className={classes.spotlight}
                    style={{
                        position: 'absolute', // Ensure it's absolutely positioned
                        width: `${targetRect.width + 8}px`,
                        height: `${targetRect.height + 8}px`,
                        top: `${targetRect.top - 4}px`,
                        left: `${targetRect.left - 4}px`,
                        pointerEvents: 'none', // Critical for not blocking clicks on the actual element
                    }}
                />
            </Popover.Target>
            
            <Popover.Dropdown style={{ border: 'none', pointerEvents: 'auto' }}>
                    <Title order={4} mb="xs">{step.title}</Title>
                    <Text size="sm" mb="md">{step.body}</Text>
                    <Group justify="flex-end">
                        {/* --- DEFINITIVE FIX: Only show buttons if it's NOT the last step --- */}
                        {currentStep < onboardingSteps.length - 1 ? (
                            <>
                                <Button variant="subtle" size="xs" onClick={endTour}>Skip</Button>
                                <Button size="xs" onClick={handleNext}>Next</Button>
                            </>
                        ) : (
                            // On the last step, render nothing. The user's only action is to click the real save button.
                            null
                        )}
                    </Group>
            </Popover.Dropdown>
        </Popover>
    </>
);
}