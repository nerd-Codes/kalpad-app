import { useState, useEffect, useRef, useCallback } from 'react';
import supabase from '@/lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

export function useResearchSync(projectId) {
    const [project, setProject] = useState(null);
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch the latest data snapshot
    const refreshData = useCallback(async () => {
        if (!projectId) return;
        const { data } = await supabase
            .from('research_papers')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
        
        if (data) {
            setPapers(current => {
                // Only update if data actually changed to prevent flicker
                if (JSON.stringify(current) !== JSON.stringify(data)) {
                    return data;
                }
                return current;
            });
        }
    }, [projectId]);

    // Initial Load
    useEffect(() => {
        if (!projectId) return;
        
        const init = async () => {
            setLoading(true);
            const { data: proj } = await supabase.from('research_projects').select('*').eq('id', projectId).single();
            setProject(proj);
            await refreshData();
            setLoading(false);
        };
        init();
    }, [projectId, refreshData]);

    // Realtime Subscription
    useEffect(() => {
        if (!projectId) return;

        const channel = supabase
            .channel(`sync-${projectId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'research_papers', filter: `project_id=eq.${projectId}` },
                (payload) => {
                    // On any change, just re-fetch the whole list to be safe and consistent
                    refreshData(); 

                    // Notifications
                    if (payload.eventType === 'UPDATE') {
                        if (payload.new.status === 'analyzed' && payload.old.status !== 'analyzed') {
                            notifications.show({ title: 'Analysis Complete', message: payload.new.title, color: 'green', icon: <IconCheck size={16}/> });
                        }
                        if (payload.new.status === 'upload_needed') {
                            notifications.show({ title: 'Manual Upload Required', message: 'Check the paper.', color: 'orange' });
                        }
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [projectId, refreshData]);

    // Heartbeat Poller (The Backup)
    useEffect(() => {
        let interval;
        // Check if ANY paper is processing
        const isProcessing = papers.some(p => p.status === 'processing' || p.status === 'pending');
        
        if (isProcessing) {
            interval = setInterval(() => {
                console.log("⚡ Polling for updates...");
                refreshData();
            }, 4000); // Poll every 4 seconds
        }

        return () => clearInterval(interval);
    }, [papers, refreshData]);

    return { project, papers, loading, refreshData };
}