// src/hooks/useAuthRedirect.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import supabase from '@/lib/supabaseClient';

export function useAuthRedirect() {
    const router = useRouter();
    const [session, setSession] = useState(null);
    const { setIsLoading } = useLoading();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, []);

    const handleNavigation = (path) => {
        setIsLoading(true);
        router.push(path);
    };

    const redirect = () => {
        if (session) {
            handleNavigation('/dashboard');
        } else {
            handleNavigation('/sign-up');
        }
    };

    return redirect;
}