// src/app/new-plan/page.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { useLoading } from '@/context/LoadingContext';

import { Container, Title, Text, TextInput, Textarea, Button, Paper, Group, FileInput, Checkbox, Alert, Badge, Progress } from '@mantine/core';
import { IconCalendar, IconFileText, IconBooks, IconPdf, IconArrowDown } from '@tabler/icons-react';

export default function NewPlanPage() {
    const { setIsLoading } = useLoading();
    const router = useRouter();
    const strategyReportRef = useRef(null);

    // All necessary state for the component
    const [session, setSession] = useState(null);
    const [examName, setExamName] = useState('');
    const [syllabus, setSyllabus] = useState('');
    const [examDate, setExamDate] = useState('');
    const [useDocuments, setUseDocuments] = useState(true);
    
    const [studyMaterialFile, setStudyMaterialFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingState, setProcessingState] = useState({ step: 'idle', message: '' });
    const [pageImageUrls, setPageImageUrls] = useState([]);

    const [generationComplete, setGenerationComplete] = useState(false);
    const [plan, setPlan] = useState(null);
    const [strategy, setStrategy] = useState(null);
    const [generationContext, setGenerationContext] = useState(null);
    const [error, setError] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    }, []);


    useEffect(() => {
        // If the strategy object exists and the ref is attached to the element...
        if (strategy && strategyReportRef.current) {
            // ...then scroll to it smoothly.
            strategyReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [strategy]);

    const sanitizeText = (text) => {
        if (!text) return '';
        let sanitized = text.replace(/\u0000/g, '');
        sanitized = sanitized.replace(/([^\ud800-\udbff])([\udc00-\udfff])/g, '$1?');
        sanitized = sanitized.replace(/([\ud800-\udbff])([^\udc00-\udfff])/g, '$1?');
        return sanitized;
    };

    const chunkText = (text, chunkSize, chunkOverlap) => {
        const chunks = [];
        if (!text) return chunks;
        let i = 0;
        while (i < text.length) {
            chunks.push(text.substring(i, i + chunkSize));
            i += chunkSize - chunkOverlap;
        }
        return chunks;
    };
    
    const resizeImage = (blob, maxWidth = 768) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(blob);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((resizedBlob) => {
                    if (!resizedBlob) { return reject(new Error('Canvas to Blob conversion failed')); }
                    resolve(resizedBlob);
                }, 'image/jpeg', 0.8);
            };
            img.onerror = (error) => reject(error);
        });
    };

    const handlePlanGeneration = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setPlan(null);
        setStrategy(null);
        setSaveSuccess(false);
        setSaveError('');
        setStrategy(null);
        try {
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examName, syllabus, examDate, useDocuments }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong.');
            }
            const data = await response.json();
            setPlan(data.plan);
            setStrategy(data.strategy);
            setGenerationContext(data.context);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePlan = async () => {
        if (!plan || !session) return;
        setIsSaving(true);
        setSaveError('');
        setSaveSuccess(false);
        try {
            const response = await fetch('/api/save-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_name: examName,
                    exam_date: examDate,
                    plan_topics: plan,
                    generation_context: generationContext,
                    page_image_urls: pageImageUrls,
                    syllabus: syllabus 
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            setSaveSuccess(true);
        } catch (err) {
            setSaveError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

            const handleFileChange = (file) => {
            setStudyMaterialFile(file);
            // This now correctly updates our new state object
            setProcessingState({
                step: 'selected', // A new step to indicate a file is ready
                totalPages: 0,
                currentPage: 0,
                message: file ? `${file.name} selected. Ready to process.` : ''
            });
        };

   // src/app/new-plan/page.js

        // This function belongs in /src/app/new-plan/page.js

// src/app/new-plan/page.js

const handleProcessFile = async () => {
    if (!studyMaterialFile || !session) return;
    
    setIsProcessing(true);
    setError(''); // Clear any previous errors

    try {
        setProcessingState({ step: 'checking', currentPage: 0, totalPages: 0, message: `Checking for '${studyMaterialFile.name}'...` });
        
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const fileReaderPromise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(studyMaterialFile);
        });
        const buffer = await fileReaderPromise;

        const typedarray = new Uint8Array(buffer);
        const pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
        const pageCount = pdfDoc.numPages;

        // --- Step 1: Pre-flight check ---
        const checkResponse = await fetch('/api/check-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_name: studyMaterialFile.name, page_count: pageCount }),
        });
        if (!checkResponse.ok) {
            const errorData = await checkResponse.json();
            throw new Error(`Pre-check failed: ${errorData.error || 'Unknown error'}`);
        }
        const { status } = await checkResponse.json();
        
        // Detailed logging of the check status
        console.log(`Document check status: ${status}. Pages: ${pageCount}`);
        if (status === 'exists') {
            setProcessingState(prev => ({ ...prev, message: `Document '${studyMaterialFile.name}' already exists. Re-indexing text.` }));
        } else {
            setProcessingState(prev => ({ ...prev, message: `New document or version. Starting full processing.` }));
        }

        let textChunks = [];
        let imageUrls = []; // This will hold public URLs of images for ingestion API
        let fullText = '';
        
        // --- Step 2: Parse text (always done) ---
        setProcessingState(prev => ({ ...prev, step: 'parsing_text', currentPage: 0, totalPages: pageCount, message: `Parsing text from ${pageCount} pages...` }));
        for (let i = 1; i <= pageCount; i++) {
            setProcessingState(prev => ({ ...prev, currentPage: i, message: `Parsing page ${i} of ${pageCount}...` }));
            await new Promise(res => setTimeout(res, 5)); // Allow UI to update
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
        }
        textChunks = chunkText(sanitizeText(fullText), 1000, 200);
        console.log(`Parsed ${textChunks.length} text chunks.`);

        // --- Step 3: Conditionally handle image rendering & uploading ---
        if (status === 'exists') {
            // For existing documents, fetch existing image URLs
            setProcessingState(prev => ({ ...prev, step: 'fetching_urls', message: `Fetching existing image URLs...` }));
            const { data: existingImages, error: fetchUrlError } = await supabase
                .from('documents')
                .select('image_url, page_number')
                .eq('user_id', session.user.id)
                .eq('file_name', studyMaterialFile.name)
                .eq('content_type', 'image_page')
                .order('page_number');
            
            if (fetchUrlError) throw new Error(`Could not fetch existing image URLs: ${fetchUrlError.message}`);
            imageUrls = existingImages.map(img => img.image_url);
            setPageImageUrls(imageUrls); // Update frontend state
            console.log(`Fetched ${imageUrls.length} existing image URLs.`);

        } else { // status === 'new' - full processing needed
            setProcessingState(prev => ({ ...prev, step: 'parsing_images', currentPage: 0, totalPages: pageCount, message: `Rendering ${pageCount} page images...` }));
            const pageImagesBlobs = [];
            for (let i = 1; i <= pageCount; i++) {
                setProcessingState(prev => ({ ...prev, currentPage: i, message: `Rendering page ${i} of ${pageCount}...` }));
                await new Promise(res => setTimeout(res, 5));
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const highResBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
                const resizedBlob = await resizeImage(highResBlob);
                pageImagesBlobs.push(resizedBlob);
            }
            console.log(`Rendered ${pageImagesBlobs.length} page images.`);

            setProcessingState(prev => ({ ...prev, step: 'uploading_images', message: `Uploading ${pageImagesBlobs.length} images...` }));
            for (const [index, imageBlob] of pageImagesBlobs.entries()) {
                const fileName = `page_${index + 1}_${new Date().getTime()}.jpeg`;
                const filePath = `${session.user.id}/${studyMaterialFile.name}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('study-materials').upload(filePath, imageBlob, { contentType: 'image/jpeg' });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('study-materials').getPublicUrl(filePath);
                imageUrls.push(publicUrl);
                setProcessingState(prev => ({ ...prev, message: `Uploading image ${index + 1} of ${pageImagesBlobs.length}...` }));
                await new Promise(res => setTimeout(res, 5));
            }
            setPageImageUrls(imageUrls); // Update state with newly uploaded URLs
            console.log(`Uploaded ${imageUrls.length} new image URLs.`);
        }

        // --- Step 4: Call the unified ingestion API ---
        setProcessingState(prev => ({ ...prev, step: 'indexing', message: `Indexing content in database...` }));
        const ingestResponse = await fetch('/api/ingest-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text_chunks: textChunks,
                page_image_urls: imageUrls,
                file_name: studyMaterialFile.name,
            }),
        });
        if (!ingestResponse.ok) {
            const errorData = await ingestResponse.json();
            throw new Error(errorData.error || "Failed to index content on the server.");
        }
        
        const result = await ingestResponse.json();
        setProcessingState({ step: 'done', message: `✅ Success! ${result.message}` });

    } catch (err) {
        console.error("File processing pipeline error:", err);
        setProcessingState({ step: 'error', message: `Error: ${err.message}` });
        setError(`File processing failed: ${err.message}`); // Display error at top level
    } finally {
        setIsProcessing(false);
    }
};
    

    return (
        <AppLayout session={session}>
            <Container>
                <Title order={1} mb="xs">Create a New Study Plan</Title>
                <Text c="dimmed" mb="xl">Fill in the details below to generate your personalized AI study schedule.</Text>

                <GlassCard>
                    <form onSubmit={handlePlanGeneration}>
                        <TextInput leftSection={<IconBooks size={16} />} label="Exam Name" placeholder="e.g., Final Year Project, SATs" value={examName} onChange={(e) => setExamName(e.target.value)} required />
                        <Textarea label="Syllabus" placeholder="Paste your full syllabus here..." value={syllabus} onChange={(e) => setSyllabus(e.target.value)} required autosize minRows={5} mt="md" leftSection={<IconFileText size={16} />} />
                        <TextInput type="date" label="Exam Date" value={examDate} onChange={(e) => setExamDate(e.target.value)} required mt="md" leftSection={<IconCalendar size={16} />} />
                        
                        <Paper withBorder p="md" mt="xl" radius="md" style={{backgroundColor: 'rgba(0,0,0,0.2)'}}>
                             <FileInput leftSection={<IconPdf size={16} />} label="Optional: Process Study Materials" placeholder="Upload a PDF" value={studyMaterialFile} onChange={handleFileChange} accept=".pdf" />
                            <Button onClick={handleProcessFile} disabled={!studyMaterialFile || isProcessing} mt="xs" size="xs" variant="outline" color="brandGreen" loading={isProcessing}>
                                Process File
                            </Button>
                            {processingState.step !== 'idle' && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    {/* Show a progress bar during the parsing step */}
                                    {processingState.step === 'parsing' && processingState.totalPages > 0 && (
                                        <Progress 
                                            value={(processingState.currentPage / processingState.totalPages) * 100} 
                                            striped 
                                            animated 
                                            mb="xs"
                                        />
                                    )}
                                    <Text size="xs">
                                        {processingState.message}
                                    </Text>
                                </div>
                            )}
                        </Paper>

                        <Checkbox label="Use my uploaded documents to create a better, personalized plan" checked={useDocuments} onChange={(e) => setUseDocuments(e.currentTarget.checked)} mt="lg" />
                        
                        <Group justify="flex-end" mt="xl">
                            <ShimmerButton type="submit" size="md" color="brandPurple">
                                Generate My Plan
                            </ShimmerButton>
                        </Group>
                    </form>
                </GlassCard>

                {error && <Alert color="red" title="Error" mt="xl" withCloseButton onClose={() => setError('')}>{error}</Alert>}
                
                {strategy && (
                    <GlassCard mt="xl" >
                        <Title order={3}>AI Strategy Report</Title>
                        <Text mt="md" fw={500}>Overall Approach:</Text>
                        <Text c="dimmed">{strategy.overall_approach}</Text>
                         {strategy.emphasized_topics && strategy.emphasized_topics.length > 0 && (
                            <>
                                <Text mt="md" fw={500}>Key Topics to Emphasize:</Text>
                                <Text c="dimmed" size="sm">The AI has identified these topics as critical for success.</Text>
                                <Group mt="xs">
                                    {strategy.emphasized_topics.map((topic, index) => (
                                        <Badge key={index} color="brandGreen" variant="light">{topic}</Badge>
                                    ))}
                                </Group>
                            </>
                        )}
                        {strategy.skipped_topics && strategy.skipped_topics.length > 0 && (
                            <>
                                <Text mt="md" fw={500}>De-prioritized Topics:</Text>
                                <Text c="dimmed" size="sm">These topics were skipped to maximize your score in the given time.</Text>
                                <ul>
                                    {strategy.skipped_topics.map((item, index) => (
                                        <li key={index}>
                                            <Text size="sm"><Text fw={500} span>{item.topic}:</Text> <Text c="dimmed" span>{item.reason}</Text></Text>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </GlassCard>
                )}

                {plan && Array.isArray(plan) && (
                    <GlassCard mt="xl" ref={strategyReportRef}>
                        <Group justify="space-between" mb="lg">
                            <Title order={2}>Your Generated Plan</Title>
                            <Button onClick={handleSavePlan} loading={isSaving} color="brandGreen" disabled={saveSuccess}>
                                {saveSuccess ? '✓ Saved!' : 'Save This Plan'}
                            </Button>
                        </Group>
                        {saveError && <Alert color="red" title="Save Error" withCloseButton onClose={() => setSaveError('')}>{saveError}</Alert>}
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '1rem' }}>
                            {plan.map((item, index) => (
                                <Paper key={index} p="md" mb="md" withBorder radius="md">
                                    <Text fw={700}>Day {item.day} ({item.date}) - {item.topic_name}</Text>
                                    <ul style={{marginTop: '0.5rem'}}>
                                        {item.sub_topics?.map((sub, i) => <li key={i}>{sub.text}</li>)}
                                    </ul>
                                </Paper>
                            ))}
                        </div>
                    </GlassCard>
                )}
            </Container>
        </AppLayout>
    );
}