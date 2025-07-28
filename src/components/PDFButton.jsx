// src/components/PDFButton.jsx
"use client";

import { useEffect, useState } from 'react';
import { Button } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';

// We will only import the heavy PDF libraries *inside* this component
let PDFDownloadLink;
let NotesPDF;

export function PDFButton({ dayTopic }) {
  const [isClient, setIsClient] = useState(false);

  // This is a standard trick to ensure PDF libraries only run in the browser
  useEffect(() => {
    import('@react-pdf/renderer').then(module => {
      PDFDownloadLink = module.PDFDownloadLink;
      setIsClient(true);
    });
    import('@/components/NotesPDF').then(module => {
      NotesPDF = module.NotesPDF;
    });
  }, []);

  // Don't render anything on the server or before the libraries are loaded
  if (!isClient || !PDFDownloadLink || !NotesPDF) {
    return <Button variant="default" size="xs" disabled>Loading PDF Exporter...</Button>;
  }

  return (
    <PDFDownloadLink
      document={<NotesPDF dayTopic={dayTopic} />}
      fileName={`${dayTopic.topic_name}_notes.pdf`}
    >
      {({ loading }) => 
        loading ? (
          <Button variant="default" size="xs" disabled>Preparing PDF...</Button>
        ) : (
          <Button variant="default" size="xs" leftSection={<IconPrinter size={14} />}>
            Export PDF
          </Button>
        )
      }
    </PDFDownloadLink>
  );
}