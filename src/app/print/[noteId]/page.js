// src/app/print/[noteId]/page.js
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Button, Group, Title, Loader, Alert, Text, Box } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPrinter, IconAlertTriangle } from '@tabler/icons-react';

import './print.css';

export default function PrintNotePage() {
    const params = useParams();
    const { noteId } = params;
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const isMobile = useMediaQuery('(max-width: 768px)');

    useEffect(() => {
        if (!noteId) return;
        const fetchNote = async () => {
            try {
                const { data, error } = await supabase
                    .from('generated_notes')
                    .select('notes_markdown, sub_topic_text, plan_topics ( topic_name )')
                    .eq('id', noteId)
                    .single();
                
                if (error) throw error;
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

    // Safety Valve: Auto-print only on Desktop
    useEffect(() => {
        if (!loading && note && !isMobile) {
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
    }, [loading, note, isMobile]);

    const handlePrint = () => { window.print(); };

    if (loading) return <Group justify="center" p="xl"><Loader color="black" /></Group>;
    if (error) return <Box p="xl"><Alert color="red" title="Error">{error}</Alert></Box>;
    if (!note) return <Box p="xl"><Alert color="yellow">Note not found.</Alert></Box>;

    const customRenderers = {
        img: ({ node, ...props }) => {
            const isSvg = props.src && props.src.endsWith('.svg');
            const finalStyle = {
                maxWidth: '100%',
                maxHeight: '1000px',
                borderRadius: '0',
                backgroundColor: 'transparent',
                padding: isSvg ? '1rem' : '0',
                margin: '1.5rem auto',
                display: 'block'
            };
            return (
                <img {...props} style={finalStyle} alt={props.alt || 'Figure'} />
            );
        },
    };

    const brandingFooter = "\n\n---\n\n*Crafted with the KalPad AI Study Mentor ✨*";
    const contentToRender = note.notes_markdown + brandingFooter;

    return (
        <Box>
            {/* Control Bar (Fixed to top of screen, hidden in print) */}
            <Box className="no-print" style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, 
                padding: '16px', background: 'rgba(255,255,255,0.9)', 
                backdropFilter: 'blur(10px)', zIndex: 100,
                borderBottom: '1px solid #ddd'
            }}>
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
                        Tap to save as PDF. Select 'ISO A4' size.
                    </Text>
                )}
            </Box>

            {/* The Paper Sheet */}
            <div className="paper-sheet">
                <div className="printable-content">
                    <Title order={1} className="print-title">{note.plan_topics.topic_name}</Title>
                    <Title order={2} className="print-subtitle">{note.sub_topic_text}</Title>
                    
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        components={customRenderers}
                    >
                        {contentToRender}
                    </ReactMarkdown>
                </div>
            </div>
        </Box>
    );
}