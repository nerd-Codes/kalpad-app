// /src/components/PlanTour.jsx
"use client";

import { useState, useLayoutEffect, useEffect } from 'react';
import { usePlanTour } from '@/context/PlanTourContext';
import planTourSteps from '@/lib/planTourSteps';
import { Popover, Text, Title, Button, Group } from '@mantine/core';
import { GlassCard } from './GlassCard';
import classes from './OnboardingTour.module.css'; // We can reuse the same CSS

export function PlanTour() {
    const { isTourActive, endPlanTour } = usePlanTour();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const step = isTourActive ? planTourSteps[currentStep] : null;

    useLayoutEffect(() => {
        if (isTourActive && step) {
            const element = document.querySelector(step.target);
            if (element) {
                setTargetRect(element.getBoundingClientRect());
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            setTargetRect(null);
        }
    }, [isTourActive, step]);
    
    const handleNext = () => {
        if (currentStep < planTourSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            endPlanTour();
        }
    };
    
    if (!isTourActive || !step || !targetRect) {
        return null;
    }

    return (
        <Popover opened={true} position={step.placement} withArrow shadow="xl" radius="lg" zIndex={4000} offset={10}>
            <Popover.Target>
                <div
                    className={classes.spotlight}
                    style={{
                        position: 'absolute',
                        width: `${targetRect.width + 8}px`, height: `${targetRect.height + 8}px`,
                        top: `${targetRect.top - 4}px`, left: `${targetRect.left - 4}px`,
                        pointerEvents: 'none',
                    }}
                />
            </Popover.Target>
            <Popover.Dropdown style={{ background: 'none', border: 'none', pointerEvents: 'auto' }}>
                <GlassCard p="md">
                    <Title order={4} mb="xs">{step.title}</Title>
                    <Text size="sm" mb="md">{step.body}</Text>
                    <Group justify="flex-end">
                        <Button variant="subtle" size="xs" onClick={endPlanTour}>Skip</Button>
                        <Button size="xs" onClick={handleNext}>
                            {currentStep === planTourSteps.length - 1 ? 'Finish' : 'Next'}
                        </Button>
                    </Group>
                </GlassCard>
            </Popover.Dropdown>
        </Popover>
    );
}