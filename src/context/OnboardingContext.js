// /src/context/OnboardingContext.js
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import onboardingSteps from '@/lib/onboardingSteps';

const OnboardingContext = createContext(null);
export const useOnboarding = () => useContext(OnboardingContext);

export function OnboardingProvider({ children }) {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);

    const [specialAction, setSpecialAction] = useState(null);
    
    const [isTourActive, setIsTourActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();

useEffect(() => {
    
const getProfile = async (session) => {
    if (!session) {
        setProfile(null);
        setIsLoading(false);
        return;
    }
    
    try {
        setIsLoading(true);
        
        // Step 1: Attempt to fetch the user's profile.
        let { data: profileData, error: selectError } = await supabase
            .from('profiles')
            .select('has_completed_onboarding')
            .eq('id', session.user.id)
            .single();

        // Step 2: If the profile does not exist, create it.
        // The 'PGRST116' error code specifically means "No rows found".
        if (selectError && selectError.code === 'PGRST116') {
            console.warn("Profile not found for user. Creating one now...");

            // --- THIS IS THE SELF-HEALING LOGIC ---
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({ 
                    id: session.user.id,
                    has_completed_onboarding: false 
                })
                .select()
                .single();

            if (insertError) {
                // If the insert fails, something is seriously wrong.
                throw new Error(`Failed to create profile: ${insertError.message}`);
            }

            // The new profile is now our profileData.
            profileData = newProfile;
        } else if (selectError) {
            // If there was any other type of error, throw it.
            throw selectError;
        }

        // Step 3: Set the state with the (now guaranteed to exist) profile.
        setProfile(profileData);

    } catch (error) {
        console.error("Critical error in getProfile:", error.message);
        setProfile(null); // Set to null on error to prevent bad state
    } finally {
        setIsLoading(false);
    }
};

    // ... (the rest of the useEffect with getSession and onAuthStateChange is correct) ...
    // Get the initial session and profile data
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        getProfile(session);
    });

    // Listen for changes in authentication state (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
            setSession(session);
            getProfile(session);
        }
    );

    // Cleanup listener on component unmount
    return () => {
        authListener?.subscription.unsubscribe();
    };
}, []);

    useEffect(() => {
        // This function will be called when a target component is clicked
        const handleAdvanceEvent = () => {
            console.log("Onboarding action detected, advancing tour...");
            const stepConfig = onboardingSteps[currentStep];
            if (isTourActive && !isPaused && stepConfig?.advancesOnAction) {
                // We reuse the nextStep logic to handle actions and pauses
                nextStep();
            }
        };

        // Listen for our custom event on the window
        window.addEventListener('kalpad-onboarding-advance', handleAdvanceEvent);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('kalpad-onboarding-advance', handleAdvanceEvent);
        };
    }, [isTourActive, isPaused, currentStep]); // Re-bind listener if state changes
    
    const startTour = useCallback(() => {
        if (profile && !profile.has_completed_onboarding) {
            setCurrentStep(0);
            setIsTourActive(true);
        }
    }, [profile]);

    const endTour = useCallback(async () => {
        setIsTourActive(false);
        setIsPaused(false);
        if (!session) return;
        try {
            await fetch('/api/onboarding/complete', { method: 'POST' });
            setProfile(p => ({ ...p, has_completed_onboarding: true }));
        } catch (error) {
            console.error("Failed to mark onboarding as complete:", error);
        }
    }, [session]);

    const nextStep = useCallback(() => {
        const currentStepConfig = onboardingSteps[currentStep];
        if (currentStepConfig.action) {
            setSpecialAction(currentStepConfig.action);
        }
        if (currentStepConfig.pausesTour) {
            setIsPaused(true); // <-- SET PAUSED STATE
        } else {
            setCurrentStep(prev => prev + 1);
        }
    }, [currentStep]);
    
    // --- ADD THIS NEW FUNCTION ---
    const clearSpecialAction = useCallback(() => {
        setSpecialAction(null);
    }, []);

    const resumeTour = useCallback(() => {
        setIsPaused(false); // <-- UNSET PAUSED STATE
        setCurrentStep(prev => prev + 1);
    }, []);

        const value = {
            isLoading,
            profile,
            isTourActive,
            currentStep,
            isPaused, // <-- THIS MUST BE EXPORTED
            startTour,
            endTour,
            nextStep,
            resumeTour,
            specialAction,
            clearSpecialAction
        };

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
}