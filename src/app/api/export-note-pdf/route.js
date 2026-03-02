// src/app/api/export-note-pdf/route.js
import { PDFDocument } from 'pdf-lib';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';

const PDF_SERVICE_URL = process.env.MD_TO_PDF_SERVICE_URL;
const CHUNK_SIZE_LIMIT = 18000; // The safe payload limit for the service

// --- DEFINITIVE FIX #1: THE INTELLIGENT CHUNKING HELPER ---
function chunkMarkdown(markdown, chunkSize) {
    if (markdown.length <= chunkSize) {
        return [markdown];
    }

    const chunks = [];
    let remainingMd = markdown;

    while (remainingMd.length > 0) {
        if (remainingMd.length <= chunkSize) {
            chunks.push(remainingMd);
            break;
        }

        let chunk = remainingMd.substring(0, chunkSize);
        
        // Find the last natural breaking point (paragraph or list item) to avoid abrupt cuts.
        let lastBreak = Math.max(
            chunk.lastIndexOf('\n\n'), // Paragraph break
            chunk.lastIndexOf('\n- '),  // List item break
            chunk.lastIndexOf('\n* '),  // Another list item break
            chunk.lastIndexOf('. ')     // Sentence break (full stop)
        );

        // If no good break is found, or it's too early, we take the full chunk to avoid tiny pieces.
        if (lastBreak === -1 || lastBreak < chunkSize / 2) {
            lastBreak = chunkSize;
        }

        chunk = remainingMd.substring(0, lastBreak);
        chunks.push(chunk);
        remainingMd = remainingMd.substring(lastBreak);
    }
    return chunks;
}

export async function POST(request) {
  let authMode = 'none';
  try {
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    if (!auth.user) {
      logRouteResult('/api/export-note-pdf', authMode, 401);
      return unauthorizedResponse();
    }

    const { markdown, topicName, subTopicName, css } = await request.json();
    if (!markdown) {
      return new Response(JSON.stringify({ error: 'Markdown content is required' }), { status: 400 });
    }

    const headerMarkdown = `# ${topicName || 'Note'}\n## ${subTopicName || ''}\n***\n`;
    
    // --- DEFINITIVE ADDITION #1: DEFINE THE BRANDING FOOTER ---
    const brandingFooter = "\n\n---\n\n*Crafted with the KalPad AI Study Mentor ✨*";

    // Chunk the main body of the markdown.
    const markdownChunks = chunkMarkdown(markdown, CHUNK_SIZE_LIMIT - headerMarkdown.length);

    const pdfPromises = markdownChunks.map(async (chunk, index) => {
        const formData = new URLSearchParams();
        
        let content = '';

        // Prepend the header ONLY to the first chunk.
        if (index === 0) {
            content += headerMarkdown;
        }

        content += chunk;

        // --- DEFINITIVE ADDITION #2: APPEND THE FOOTER ONLY TO THE LAST CHUNK ---
        if (index === markdownChunks.length - 1) {
            content += brandingFooter;
        }

        formData.append('markdown', content);
        formData.append('css', css);
        formData.append('engine', 'weasyprint');
        
        const response = await fetch(PDF_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
        });
        if (!response.ok) throw new Error(`md-to-pdf service failed: ${await response.text()}`);
        return response.arrayBuffer();
    });

    const pdfBuffers = await Promise.all(pdfPromises);

    // Merging logic is unchanged and correct.
    const mergedPdf = await PDFDocument.create();
    for (const pdfBuffer of pdfBuffers) {
        try {
            const pdf = await PDFDocument.load(pdfBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        } catch (e) {
            console.warn("A PDF chunk was invalid and could not be merged.", e.message);
        }
    }

    const mergedPdfBytes = await mergedPdf.save();

    logRouteResult('/api/export-note-pdf', authMode, 200);
    return new Response(mergedPdfBytes, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="note.pdf"' },
      status: 200,
    });

  } catch (error) {
    console.error('Full error in export-note-pdf API:', error);
    logRouteResult('/api/export-note-pdf', authMode, 500);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
