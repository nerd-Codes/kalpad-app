// src/app/print/[noteId]/page.js
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Box, Button, Group, Loader, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPrinter } from '@tabler/icons-react';
import 'katex/dist/katex.min.css';

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
        if (!data) throw new Error('The requested note could not be found.');
        setNote(data);
      } catch (err) {
        setError(err.message || 'Could not load note for printing.');
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
        } catch (_) {}
      } else {
        const timer = setTimeout(() => window.print(), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightsReady, loading, note, isMobile]);

  const handlePrint = () => {
    window.print();
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
        <Alert color="red" title="Could not prepare print">{error}</Alert>
      </Box>
    );
  }

  if (!note) {
    return (
      <Box p="xl" style={{ maxWidth: 600, margin: '40px auto' }}>
        <Alert color="yellow" title="Note not found">Note could not be located.</Alert>
      </Box>
    );
  }

  const topicName = note.plan_topics?.topic_name || 'Study Topic';
  const subTopicText = note.sub_topic_text || 'Notes';

  return (
    <Box>
      <div className="print-toolbar no-print">
        <Group justify="space-between" align="center" style={{ width: '100%', maxWidth: '210mm' }}>
          <Text size="sm" fw={600} c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
            {subTopicText}
          </Text>
          <Button
            leftSection={<IconPrinter size={16} />}
            onClick={handlePrint}
            color="dark"
            radius="md"
            size="sm"
            style={{ backgroundColor: '#111827', color: '#ffffff' }}
          >
            {isMobile ? 'Print / Save PDF' : 'Print Note'}
          </Button>
        </Group>
      </div>

      <div className="paper-sheet">
        <div className="printable-content">
          <Title order={2} className="print-title">{topicName}</Title>
          <Title order={1} className="print-subtitle">{subTopicText}</Title>

          <PrintableMarkdownBlock
            markdown={note.notes_markdown}
            highlights={note.highlights}
            onReady={() => setHighlightsReady(true)}
            onHighlightsRendered={() => setHighlightsReady(true)}
          />

          <hr className="print-section-divider" />
          <Text component="p" className="print-footer">
            KalPad Study Companion · Crafted for focused review
          </Text>
        </div>
      </div>
    </Box>
  );
}
