// src/lib/PDFRenderer.js
import html2pdf from 'html2pdf.js';
import { marked } from 'marked';

export const exportNotesToPDF = (dayTopic) => {
    if (!dayTopic.generated_notes) {
        console.error("No notes to export.");
        return;
    }

    // 1. Convert the Markdown notes to an HTML string.
    const notesHTML = marked.parse(dayTopic.generated_notes);

    // 2. Create a hidden container element that will be used for the PDF.
    const printContainer = document.createElement('div');
    printContainer.id = 'pdf-print-container';
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px'; // Move it far off-screen
    printContainer.style.width = '210mm'; // Standard A4 width

    // 3. Define the print-friendly styles.
    const styles = `
        <style>
            body { 
                font-family: Helvetica, Arial, sans-serif; 
                font-size: 11pt; 
                color: #000000; /* Black text */
            }
            h1, h2, h3, h4 { 
                font-family: Helvetica, Arial, sans-serif; 
                color: #000000;
                margin-bottom: 8px;
            }
            h1 { font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 12mm; }
            h2 { font-size: 16pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-top: 10mm;}
            h3 { font-size: 13pt; font-weight: bold; }
            p { line-height: 1.6; margin-bottom: 4mm; }
            ul, ol { padding-left: 5mm; }
            li { margin-bottom: 2mm; }
            strong { font-weight: bold; }
            em { font-style: italic; }
            code { 
                background-color: #f0f0f0; 
                padding: 1px 3px; 
                border-radius: 3px; 
                font-family: 'Courier New', monospace;
            }
            /* LaTeX placeholders */
            .latex-eq { font-style: italic; color: #555; }
        </style>
    `;

    // 4. Gracefully handle LaTeX with placeholder styles.
    let finalHTML = notesHTML.replace(/\$\$(.*?)\$\$/g, '<p class="latex-eq">[Equation: $1]</p>');
    finalHTML = finalHTML.replace(/\$(.*?)\$/g, '<span class="latex-eq">[Formula: $1]</span>');
    
    // 5. Assemble the final HTML for printing.
    printContainer.innerHTML = `
        ${styles}
        <h1>${dayTopic.topic_name}</h1>
        ${finalHTML}
    `;

    // 6. Append the hidden container to the body so the library can find it.
    document.body.appendChild(printContainer);

    // 7. Configure and run the PDF generation.
    const opt = {
        margin:       15, // in mm
        filename:     `${dayTopic.topic_name}_notes.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf().from(printContainer).set(opt).save().then(() => {
        // 8. IMPORTANT: Clean up by removing the hidden container from the page.
        document.body.removeChild(printContainer);
    });
};