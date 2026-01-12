import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';

export function usePaymentStatus(session) {
    const [failedTransaction, setFailedTransaction] = useState(null);

    useEffect(() => {
        if (!session) return;

        const checkStatus = async () => {
            // Find the MOST RECENT transaction that is NOT success and NOT notified
            const { data, error } = await supabase
                .from('payment_transactions')
                .select('*')
                .eq('user_id', session.user.id)
                .neq('status', 'success')
                .eq('user_notified', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                // If it's "initiated" but created > 10 mins ago, consider it failed/abandoned
                const createdTime = new Date(data.created_at).getTime();
                const tenMinsAgo = Date.now() - 10 * 60 * 1000;
                
                if (data.status === 'failed' || (data.status === 'initiated' && createdTime < tenMinsAgo)) {
                    setFailedTransaction(data);
                }
            }
        };

        checkStatus();
    }, [session]);

    return { failedTransaction, setFailedTransaction };
}