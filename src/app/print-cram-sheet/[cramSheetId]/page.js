// /src/app/print-cram-sheet/[cramSheetId]/page.js
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

// Import the definitive print stylesheet
import './print.css'; // Adjust path if necessary based on your folder structure

export default function PrintCramSheetPage() {
    const params = useParams();
    // --- FIX 1: Use the correct parameter name ---
    const { cramSheetId } = params;
    const [sheet, setSheet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!cramSheetId) return;
        
        const fetchCramSheet = async () => {
            try {
               // --- FIX 2: Query the correct table with the correct fields ---
               const { data, error: fetchError } = await supabase
                .from('generated_cram_sheets')
                .select('markdown_content, plan:study_plans ( exam_name )')
                .eq('id', cramSheetId)
                .single();
                            
                if (fetchError) throw fetchError;
                if (!data) throw new Error("The requested Cram Sheet could not be found.");
                setSheet(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCramSheet();
    // --- FIX 3: Use the correct dependency ---
    }, [cramSheetId]);

    useEffect(() => {
        if (!loading && sheet) {
            if (window.opener) {
                window.opener.postMessage('KALPAD_PRINT_READY', '*');
            }
        }
    }, [loading, sheet]);

    const handlePrint = () => { window.print(); };

    if (loading) return <Group justify="center" p="xl"><Loader /></Group>;
    if (error) return <Container py="xl"><Alert color="red" title="Error">{error}</Alert></Container>;
    if (!sheet) return <Container py="xl"><Alert color="yellow">Cram Sheet not found.</Alert></Container>;

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
   // --- FIX 4: Use the correct data fields ---
    const brandingFooter = "\n\n---\n\n*Crafted with the KalPad AI Study Mentor ✨*";
    const contentToRender = sheet.markdown_content + brandingFooter;

    return (
        <>
            <Container size="md" py="xl">
                <Group justify="flex-end" className="no-print" mb="xl">
                    <Button leftSection={<IconPrinter size={16} />} onClick={handlePrint}>
                        Print or Save as PDF
                    </Button>
                </Group>
                
                <div className="printable-content">
                    {/* --- FIX 5: Use the correct data fields for titles --- */}
                    <Title order={1}>Cram Sheet</Title>
                    <Title order={2} fw={500} mb="xl">{sheet.plan.exam_name}</Title>
                    
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        components={customRenderers}
                    >
                        {contentToRender}
                    </ReactMarkdown>
                </div>
            </Container>
        </>
    );
}