"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Box, Button, Group, Loader, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPrinter } from '@tabler/icons-react';

import supabase from '@/lib/supabaseClient';
import { PrintableMarkdownBlock } from '@/components/print/PrintableMarkdownBlock';

import './print.css';

export default function PrintNotePage() {
    const params = useParams();
    const { noteId } = params;
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [highlightsReady, setHighlightsReady] = useState(false);

    const isMobile = useMediaQuery('(max-width: 768px)');

    useEffect(() => {
        if (!noteId) return;

        const fetchNote = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('generated_notes')
                    .select('notes_markdown, highlights, sub_topic_text, plan_topics ( topic_name )')
                    .eq('id', noteId)
                    .single();

                if (fetchError) throw fetchError;
                if (!data) throw new Error("The requested note could not be found.");
                setNote(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchNote();
    }, [noteId]);

    useEffect(() => {
        setHighlightsReady(false);
    }, [note?.highlights, note?.notes_markdown, noteId]);

    useEffect(() => {
        if (!loading && note && highlightsReady && !isMobile) {
            if (window.opener) {
                try {
                    window.opener.postMessage('KALPAD_PRINT_READY', '*');
                } catch (e) {
                    console.warn("Could not auto-trigger print via opener.");
                }
            } else {
                setTimeout(() => window.print(), 500);
            }
        }
    }, [highlightsReady, loading, note, isMobile]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Group justify="center" p="xl"><Loader color="black" /></Group>;
    if (error) return <Box p="xl"><Alert color="red" title="Error">{error}</Alert></Box>;
    if (!note) return <Box p="xl"><Alert color="yellow">Note not found.</Alert></Box>;

    return (
        <Box>
            <Box
                className="no-print"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '16px',
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 100,
                    borderBottom: '1px solid #ddd',
                }}
            >
                <Group justify="center" align="center">
                    <Button
                        leftSection={<IconPrinter size={18} />}
                        onClick={handlePrint}
                        color="black"
                        radius="md"
                        size="md"
                    >
                        {isMobile ? "Generate PDF" : "Print Note"}
                    </Button>
                </Group>
                {isMobile && (
                    <Text size="xs" c="dimmed" ta="center" mt={4}>
                        Tap to save as PDF. Select &apos;ISO A4&apos; size.
                    </Text>
                )}
            </Box>

            <div className="paper-sheet">
                <div className="printable-content">
                    <Title order={2} className="print-title">{note.plan_topics.topic_name}</Title>
                    <Title order={1} className="print-subtitle">{note.sub_topic_text}</Title>

                    <PrintableMarkdownBlock
                        markdown={note.notes_markdown}
                        highlights={note.highlights}
                        onHighlightsRendered={() => setHighlightsReady(true)}
                    />

                    <hr />
                    <Text component="p" className="print-footer">
                        Crafted with the KalPad AI Study Mentor
                    </Text>
                </div>
            </div>
        </Box>
    );
}
