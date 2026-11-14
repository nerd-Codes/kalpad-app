// src/app/print/day/[planTopicId]/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Box, Button, Group, Loader, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPrinter } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import 'katex/dist/katex.min.css';

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
        if (!data) throw new Error('The requested study day could not be found.');
        setDayTopic(data);
      } catch (err) {
        setError(err.message || 'Could not load day notes for printing.');
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
        } catch (_) {}
      } else {
        const timer = setTimeout(() => window.print(), 400);
        return () => clearTimeout(timer);
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

  if (loading) {
    return (
      <Group justify="center" align="center" style={{ minHeight: '60vh' }}>
        <Loader color="#111827" size="md" />
      </Group>
    );
  }

  if (error) {
    return (
      <Box p="xl" style={{ maxWidth: 600, margin: '40px auto' }}>
        <Alert color="red" title="Could not prepare day notes">{error}</Alert>
      </Box>
    );
  }

  if (!dayTopic) {
    return (
      <Box p="xl" style={{ maxWidth: 600, margin: '40px auto' }}>
        <Alert color="yellow" title="Day notes not found">Topic record could not be loaded.</Alert>
      </Box>
    );
  }

  if (sections.length === 0) {
    return (
      <Box p="xl" style={{ maxWidth: 600, margin: '40px auto' }}>
        <Alert color="yellow" title="No notes yet">No notes have been generated for this day yet.</Alert>
      </Box>
    );
  }

  const dayLabel = typeof dayTopic.day === 'number' ? `Day ${dayTopic.day}` : 'Study Day';
  const formattedDate = dayTopic.date ? format(parseISO(dayTopic.date), 'MMMM do, yyyy') : null;
  const examName = dayTopic.plan?.exam_name || 'Study Plan';

  return (
    <Box>
      <div className="print-toolbar no-print">
        <Group justify="space-between" align="center" style={{ width: '100%', maxWidth: '210mm' }}>
          <Text size="sm" fw={600} c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
            {dayLabel} · {dayTopic.topic_name}
          </Text>
          <Button
            leftSection={<IconPrinter size={16} />}
            onClick={handlePrint}
            color="dark"
            radius="md"
            size="sm"
            style={{ backgroundColor: '#111827', color: '#ffffff' }}
          >
            {isMobile ? 'Print / Save PDF' : 'Print Day Notes'}
          </Button>
        </Group>
      </div>

      <div className="paper-sheet">
        <div className="printable-content">
          <Title order={2} className="print-title">{examName}</Title>
          <Title order={1} className="print-subtitle">
            {dayLabel}: {dayTopic.topic_name}
          </Title>

          {formattedDate && (
            <p className="print-day-meta">
              Target Study Date: <strong>{formattedDate}</strong>
            </p>
          )}

          {sections.map((section, idx) => (
            <div key={section.id || idx} className="print-note-section">
              <Title order={3} className="print-section-title">
                {idx + 1}. {section.title}
              </Title>
              <PrintableMarkdownBlock
                markdown={section.markdown}
                highlights={section.highlights}
                onReady={() => handleSectionReady(section.id || idx)}
                onHighlightsRendered={() => handleSectionReady(section.id || idx)}
              />
              {idx < sections.length - 1 && <hr className="print-section-divider" />}
            </div>
          ))}

          <hr className="print-section-divider" />
          <Text component="p" className="print-footer">
            KalPad Day Compilation · Crafted for deep focus
          </Text>
        </div>
      </div>
    </Box>
  );
}
