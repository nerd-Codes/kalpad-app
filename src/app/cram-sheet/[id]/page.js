// /src/app/cram-sheet/[id]/page.js
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { FullscreenNoteViewer } from '@/components/FullscreenNoteViewer';
import { Container, Loader, Alert, Group } from '@mantine/core';

export default function CramSheetViewerPage() {
    const params = useParams();
    const router = useRouter();
    const { id: cramSheetId } = params;

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cramSheet, setCramSheet] = useState(null);

    useEffect(() => {
        const getSessionAndData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            if (!session) {
                setError("Authentication required to view this page.");
                setLoading(false);
                return;
            }

            if (!cramSheetId) {
                setError("Cram Sheet ID not found.");
                setLoading(false);
                return;
            }
            
            try {
                const { data, error: fetchError } = await supabase
                    .from('generated_cram_sheets')
                    .select(`
                        id,
                        plan_id, 
                        markdown_content,
                        plan:study_plans(exam_name)
                    `)
                    .eq('id', cramSheetId)
                    .eq('user_id', session.user.id)
                    .single();

                if (fetchError) throw fetchError;
                if (!data) throw new Error("Cram Sheet not found or you don't have permission.");

                // We must transform the fetched data into the exact shape
                // that FullscreenNoteViewer expects for a seamless integration.
                const noteViewerData = {
                    id: data.id,
                    plan_id: data.plan_id, 
                    notes_markdown: data.markdown_content,
                    sub_topic: { text: `Your Ultimate Cram Sheet` },
                    day_topic: { topic_name: `Revision for ${data.plan.exam_name}` },
                    exam_name: data.plan.exam_name,
                };
                
                setCramSheet(noteViewerData);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getSessionAndData();
    }, [cramSheetId]);

    const handleCloseViewer = () => {
            if (cramSheet && cramSheet.plan_id) {
                router.push(`/plan/${cramSheet.plan_id}`);
            } else {
                router.push('/plans'); // Keep the safe fallback
            }
        };

    if (loading) {
        return (
            <AppLayout session={session}>
                <Container>
                    <Group justify="center" p="xl"><Loader /></Group>
                </Container>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout session={session}>
                <Container>
                    <Alert color="red" title="Error">{error}</Alert>
                </Container>
            </AppLayout>
        );
    }

    // The FullscreenNoteViewer is always "opened" on this page.
    // We pass our transformed data and a custom close handler.
    return (
        <AppLayout session={session}>
            {cramSheet ? (
                <FullscreenNoteViewer
                    noteData={cramSheet}
                    onClose={handleCloseViewer}
                    onUpdate={() => {}} // onUpdate is not applicable here, so we provide a no-op.
                    isCramSheet={true} 
                />
            ) : (
                 <Container>
                    <Alert color="yellow">No Cram Sheet data to display.</Alert>
                </Container>
            )}
        </AppLayout>
    );
}