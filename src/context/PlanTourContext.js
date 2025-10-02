// /src/context/PlanTourContext.js
"use client";

import { createContext, useContext, useState, useCallback } from 'react';
import supabase from '@/lib/supabaseClient';

const PlanTourContext = createContext();
export const usePlanTour = () => useContext(PlanTourContext);

export function PlanTourProvider({ children, profile, session }) {
    const [isTourActive, setIsTourActive] = useState(false);

    const startTour = useCallback(() => {
        if (profile && !profile.has_viewed_plan_tour) {
            setIsTourActive(true);
        }
    }, [profile]);

    const endTour = useCallback(async () => {
        setIsTourActive(false);
        if (!session) return;
        // Optimistically update local state to prevent re-trigger
        if (profile) profile.has_viewed_plan_tour = true;
        // Update the database in the background
        await supabase
            .from('profiles')
            .update({ has_viewed_plan_tour: true })
            .eq('id', session.user.id);
    }, [session, profile]);

    const value = { isTourActive, startTour, endTour };

    return (
        <PlanTourContext.Provider value={value}>
            {children}
        </PlanTourContext.Provider>
    );
}