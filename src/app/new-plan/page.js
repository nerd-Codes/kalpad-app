// src/app/new-plan/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { useLoading } from '@/context/LoadingContext';

import { Container, Title, Text, TextInput, Textarea, Button, Paper, Group, FileInput, Checkbox, Alert, Badge } from '@mantine/core';
import { IconCalendar, IconFileText, IconBooks, IconPdf } from '@tabler/icons-react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function NewPlanPage() {
    const { setIsLoading } = useLoading();
    const router = useRouter();

    const [session, setSession] = useState(null);
    const [examName, setExamName] = useState('');
    const [syllabus, setSyllabus] = useState('');
    const [examDate, setExamDate] = useState('');
    const [plan, setPlan] = useState(null);
    const [error, setError] = useState('');
    const [useDocuments, setUseDocuments] = useState(true);
    const [generationContext, setGenerationContext] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [studyMaterialFile, setStudyMaterialFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processMessage, setProcessMessage] = useState('');
    const [strategy, setStrategy] = useState(null);
    const [pageImageUrls, setPageImageUrls] = useState([]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, []);

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
        setProcessMessage(file ? `${file.name} selected. Ready to process.` : '');
    };

    const handleProcessFile = async () => {
        if (!studyMaterialFile || !session) return;
        setIsProcessing(true);
        setProcessMessage('Step 1/3: Parsing PDF...');
        setError('');
        try {
            const { textChunks, pageImages } = await new Promise((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.onload = async (event) => {
                    try {
                        const typedarray = new Uint8Array(event.target.result);
                        const pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
                        let fullText = '';
                        const images = [];
                        for (let i = 1; i <= pdfDoc.numPages; i++) {
                            const page = await pdfDoc.getPage(i);
                            const textContent = await page.getTextContent();
                            fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
                            const viewport = page.getViewport({ scale: 1.5 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            await page.render({ canvasContext: context, viewport: viewport }).promise;
                            const highResBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
                            const resizedBlob = await resizeImage(highResBlob);
                            images.push(resizedBlob);
                        }
                        const sanitizedText = sanitizeText(fullText);
                        const chunks = chunkText(sanitizedText, 1000, 200);
                        resolve({ textChunks: chunks, pageImages: images });
                    } catch (error) { reject(error); }
                };
                fileReader.onerror = (error) => reject(error);
                fileReader.readAsArrayBuffer(studyMaterialFile);
            });
            
            setProcessMessage(`Step 2/3: Uploading ${pageImages.length} page images...`);
            const uploadedUrls = [];
            for (const [index, imageBlob] of pageImages.entries()) {
                const fileName = `page_${index + 1}_${new Date().getTime()}.jpeg`;
                const filePath = `${session.user.id}/${studyMaterialFile.name}/${fileName}`;
                const { data, error: uploadError } = await supabase.storage.from('study-materials').upload(filePath, imageBlob, { contentType: 'image/jpeg' });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('study-materials').getPublicUrl(filePath);
                uploadedUrls.push(publicUrl);
            }
            setPageImageUrls(uploadedUrls);

            setProcessMessage(`Step 3/3: Indexing ${textChunks.length} text chunks...`);
            const response = await fetch('/api/vectorize-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunks: textChunks, file_name: studyMaterialFile.name }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            
            const result = await response.json();
            setProcessMessage(`✅ Success! ${result.message} and ${uploadedUrls.length} pages are ready.`);
        } catch (err) {
            console.error("File processing pipeline error:", err);
            setProcessMessage(`Error: ${err.message}`);
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
                            {processMessage && <Text size="xs" mt="xs">{processMessage}</Text>}
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
                    <GlassCard mt="xl">
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
                    <GlassCard mt="xl">
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