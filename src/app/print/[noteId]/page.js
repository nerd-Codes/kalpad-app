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

// --- LATEX PREPROCESSING (same fix as FullscreenNoteViewer) ---
// remarkMath only treats $$...$$ as display math when blank lines surround it.
// The LLM often omits them, collapsing equations into garbled inline text.
function preprocessMathBlocks(markdown) {
    if (!markdown) return markdown;
    const lines = markdown.split('\n');
    const out   = [];
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
        const line    = lines[i];
        const trimmed = line.trim();
        const isDelimiter = trimmed === '$$';
        const singleLine  = (
            !isDelimiter &&
            trimmed.startsWith('$$') &&
            trimmed.endsWith('$$') &&
            trimmed.length > 4
        );
        if (singleLine) {
            if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
            out.push('$$');
            out.push(trimmed.slice(2, -2).trim());
            out.push('$$');
            if (i + 1 < lines.length && lines[i + 1].trim() !== '') out.push('');
            continue;
        }
        if (isDelimiter) {
            if (!inBlock && out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
            out.push(line);
            if (inBlock && i + 1 < lines.length && lines[i + 1].trim() !== '') out.push('');
            inBlock = !inBlock;
            continue;
        }
        out.push(line);
    }
    return out.join('\n');
}

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
        // FIX: <div class="katex-display"> inside <p> is invalid HTML.
        // Browsers auto-close the <p>, breaking layout. Degrade to <div> when needed.
        p: ({ node, children, ...props }) => {
            const hasMathBlock = (nodes) => {
                if (!nodes) return false;
                const arr = Array.isArray(nodes) ? nodes : [nodes];
                return arr.some(child => {
                    if (!child || typeof child !== 'object') return false;
                    const cls = child.props?.className ?? '';
                    if (cls.includes('katex-display')) return true;
                    if (child.props?.children) return hasMathBlock(child.props.children);
                    return false;
                });
            };
            const childArr = Array.isArray(children) ? children : [children];
            if (hasMathBlock(childArr)) {
                return <div style={{ margin: '0.5em 0' }}>{children}</div>;
            }
            return <p {...props}>{children}</p>;
        },
        // FIX: Force katex-display spans to block-level with proper print margins.
        span: ({ node, children, className, ...props }) => {
            if (className?.includes('katex-display')) {
                return (
                    <div
                        className={className}
                        style={{
                            display: 'block',
                            margin: '1.4em auto',
                            textAlign: 'center',
                            overflowX: 'auto',
                            maxWidth: '100%',
                        }}
                        {...props}
                    >
                        {children}
                    </div>
                );
            }
            return <span className={className} {...props}>{children}</span>;
        },
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
                    <Title order={2} className="print-title">{note.plan_topics.topic_name}</Title>
                    <Title order={1} className="print-subtitle">{note.sub_topic_text}</Title>
                    
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                        components={customRenderers}
                    >
                        {preprocessMathBlocks(contentToRender)}
                    </ReactMarkdown>
                </div>
            </div>
        </Box>
    );
}