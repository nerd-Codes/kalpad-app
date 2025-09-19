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
import { Container, Button, Group, Title, Loader, Alert } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';

import Head from 'next/head';

// Import the definitive print stylesheet
import './print.css';

export default function PrintNotePage() {
    const params = useParams();
    const { noteId } = params;
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    // --- DEFINITIVE ADDITION: THE "READY" SIGNAL ---
    useEffect(() => {
        // This effect runs ONLY when loading is finished AND we have valid note data.
        if (!loading && note) {
            // We send a message to the window that opened this popup (the 'opener').
            if (window.opener) {
                window.opener.postMessage('KALPAD_PRINT_READY', '*');
            }
        }
    }, [loading, note]); // Dependencies ensure this runs at the exact right moment.

const handlePrint = () => { window.print(); };

    if (loading) return <Group justify="center" p="xl"><Loader /></Group>;
    if (error) return <Container py="xl"><Alert color="red" title="Error">{error}</Alert></Container>;
    if (!note) return <Container py="xl"><Alert color="yellow">Note not found.</Alert></Container>;

    const customRenderers = {
        img: ({ node, ...props }) => {
            const isSvg = props.src && props.src.endsWith('.svg');
            const finalStyle = {
                maxWidth: '100%',
                maxHeight: '1500px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                padding: isSvg ? '0.5rem' : '0',
            };
            return (
                <span style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                    <img {...props} style={finalStyle} alt={props.alt || 'illustration'} />
                </span>
            );
        },
    };

    // --- THE DEFINITIVE "MEGAMIND" FIX ---
    // 1. Define the branding signature as a simple Markdown string.
    const brandingFooter = "\n\n---\n\n*Crafted with the KalPad AI Study Mentor ✨*";
    
    // 2. Concatenate it directly to the note's content.
    const contentToRender = note.notes_markdown + brandingFooter;

    return (
        <>

        <Container size="md" py="xl">
            <Group justify="flex-end" className="no-print" mb="xl">
                <Button leftSection={<IconPrinter size={16} />} onClick={handlePrint}>
                    Print or Save as PDF
                </Button>
            </Group>
            
            <div className="printable-content">
                <Title order={1}>{note.plan_topics.topic_name}</Title>
                <Title order={2} fw={500} mb="xl">{note.sub_topic_text}</Title>
                
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    components={customRenderers}
                >
                    {contentToRender}
                </ReactMarkdown>
            </div>

            <div className="print-footer no-print">
                Crafted with the KalPad AI Study Mentor ✨
            </div>
        </Container>

        </>
    );
}