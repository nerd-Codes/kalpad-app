// src/app/print-cram-sheet/[cramSheetId]/page.js
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Box, Button, Group, Loader, Alert, Title, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPrinter } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import supabase from '@/lib/supabaseClient';
import './print.css';

export default function PrintCramSheetPage() {
  const params = useParams();
  const { cramSheetId } = params;
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (!cramSheetId) return;

    const fetchCramSheet = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('generated_cram_sheets')
          .select('markdown_content, plan:study_plans ( exam_name )')
          .eq('id', cramSheetId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('The requested Cram Sheet could not be found.');
        setSheet(data);
      } catch (err) {
        setError(err.message || 'Could not load cram sheet for printing.');
      } finally {
        setLoading(false);
      }
    };

    fetchCramSheet();
  }, [cramSheetId]);

  useEffect(() => {
    if (!loading && sheet && !isMobile) {
      if (window.opener) {
        try {
          window.opener.postMessage('KALPAD_PRINT_READY', '*');
        } catch (_) {}
      } else {
        const timer = setTimeout(() => window.print(), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, sheet, isMobile]);

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
        <Alert color="red" title="Could not prepare cram sheet">{error}</Alert>
      </Box>
    );
  }

  if (!sheet) {
    return (
      <Box p="xl" style={{ maxWidth: 600, margin: '40px auto' }}>
        <Alert color="yellow" title="Cram Sheet not found">Cram sheet record could not be loaded.</Alert>
      </Box>
    );
  }

  const examName = sheet.plan?.exam_name || 'Study Course';

  const customRenderers = {
    img: ({ node, ...props }) => {
      const isSvg = props.src && props.src.endsWith('.svg');
      const finalStyle = {
        maxWidth: '100%',
        maxHeight: '1000px',
        backgroundColor: '#FFFFFF',
        padding: isSvg ? '0.5rem' : '0',
        margin: '1.2rem auto',
        display: 'block',
      };
      return <img {...props} style={finalStyle} alt={props.alt || 'illustration'} />;
    },
  };

  return (
    <Box>
      <div className="print-toolbar no-print">
        <Group justify="space-between" align="center" style={{ width: '100%', maxWidth: '210mm' }}>
          <Text size="sm" fw={600} c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
            Cram Sheet · {examName}
          </Text>
          <Button
            leftSection={<IconPrinter size={16} />}
            onClick={handlePrint}
            color="dark"
            radius="md"
            size="sm"
            style={{ backgroundColor: '#111827', color: '#ffffff' }}
          >
            {isMobile ? 'Print / Save PDF' : 'Print Cram Sheet'}
          </Button>
        </Group>
      </div>

      <div className="paper-sheet">
        <div className="printable-content">
          <Title order={2} className="print-title">Cram Sheet</Title>
          <Title order={1} className="print-subtitle">{examName}</Title>

          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={customRenderers}
          >
            {sheet.markdown_content}
          </ReactMarkdown>

          <hr className="print-section-divider" />
          <Text component="p" className="print-footer">
            KalPad High-Yield Cram Summary · Designed for rapid pre-exam recall
          </Text>
        </div>
      </div>
    </Box>
  );
}
