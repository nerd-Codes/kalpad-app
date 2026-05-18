"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Box, Button, Group, Loader, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPrinter } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';

import supabase from '@/lib/supabaseClient';
import { PrintableMarkdownBlock } from '@/components/print/PrintableMarkdownBlock';
import { getDayNoteSections } from '@/lib/dayNotes';

import '../../[noteId]/print.css';

export default function PrintDayNotesPage() {
    const params = useParams();
    const { planTopicId } = params;
    const [dayTopic, setDayTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [highlightsReady, setHighlightsReady] = useState(false);
    const readySectionIdsRef = useRef(new Set());

    const isMobile = useMediaQuery('(max-width: 768px)');

    useEffect(() => {
        if (!planTopicId) return;

        const fetchDayNotes = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('plan_topics')
                    .select(`
                        id,
                        day,
                        date,
                        topic_name,
                        sub_topics,
                        generated_notes,
                        plan:study_plans(exam_name),
                        new_notes:generated_notes ( id, notes_markdown, highlights, sub_topic_text )
                    `)
                    .eq('id', planTopicId)
                    .single();

                if (fetchError) throw fetchError;
                if (!data) throw new Error("The requested day could not be found.");
                setDayTopic(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDayNotes();
    }, [planTopicId]);

    const sections = useMemo(() => getDayNoteSections(dayTopic), [dayTopic]);

    useEffect(() => {
        readySectionIdsRef.current = new Set();
        setHighlightsReady(false);
    }, [dayTopic?.id, sections.length]);

    useEffect(() => {
        if (!loading && dayTopic && sections.length > 0 && highlightsReady && !isMobile) {
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
    }, [dayTopic, highlightsReady, isMobile, loading, sections.length]);

    const handlePrint = () => {
        window.print();
    };

    const handleSectionReady = (sectionId) => {
        if (readySectionIdsRef.current.has(sectionId)) return;

        readySectionIdsRef.current.add(sectionId);
        if (readySectionIdsRef.current.size >= sections.length) {
            setHighlightsReady(true);
        }
    };

    if (loading) return <Group justify="center" p="xl"><Loader color="black" /></Group>;
    if (error) return <Box p="xl"><Alert color="red" title="Error">{error}</Alert></Box>;
    if (!dayTopic) return <Box p="xl"><Alert color="yellow">Day notes not found.</Alert></Box>;
    if (sections.length === 0) return <Box p="xl"><Alert color="yellow">No notes have been created for this day yet.</Alert></Box>;

    const dayLabel = typeof dayTopic.day === 'number' ? `Day ${dayTopic.day}` : 'Study Day';
    const formattedDate = dayTopic.date ? format(parseISO(dayTopic.date), 'MMMM do, yyyy') : null;

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
                        {isMobile ? "Generate PDF" : "Print Day Notes"}
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
                    <Title order={2} className="print-title">{dayTopic.plan.exam_name}</Title>
                    <Title order={1} className="print-subtitle">
                        {dayLabel}: {dayTopic.topic_name}
                    </Title>
                    {formattedDate && (
                        <Text className="print-day-meta" component="p">
                            {formattedDate}
                        </Text>
                    )}

                    {sections.map((section, index) => (
                        <section key={section.id} className="print-note-section">
                            <Title order={2} className="print-section-title">
                                {section.title}
                            </Title>
                            <PrintableMarkdownBlock
                                markdown={section.markdown}
                                highlights={section.highlights}
                                onReady={() => handleSectionReady(section.id)}
                            />
                            {index < sections.length - 1 && <hr className="print-section-divider" />}
                        </section>
                    ))}

                    <hr />
                    <Text component="p" className="print-footer">
                        Crafted with the KalPad AI Study Mentor
                    </Text>
                </div>
            </div>
        </Box>
    );
}
