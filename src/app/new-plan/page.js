// src/app/new-plan/page.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { wittyFacts } from '@/lib/newplanFacts';
import { AnimatePresence, motion } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';

import { Skeleton, Container, Title, Text, TextInput, Textarea, Button, Paper, Group, FileInput, Checkbox, Alert, Badge, Progress, Loader, Stack, Grid, GridCol, NumberInput, Collapse, List, ThemeIcon } from '@mantine/core';
import { IconCalendar, IconFileText, IconBooks, IconPdf, IconClock, IconTargetArrow, IconX, IconListDetails, IconInfoCircle } from '@tabler/icons-react';

const useTypingEffect = (text = '', speed = 1) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        if (!text) {
            setDisplayedText('');
            return;
        }

        let i = 0;
        setDisplayedText(''); // Ensure it's blank before starting

        const intervalId = setInterval(() => {
            // Use slice for a deterministic and bug-free update.
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) {
                clearInterval(intervalId);
            }
        }, speed);

        return () => clearInterval(intervalId);
    }, [text, speed]);

    return displayedText;
};

const getDayDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
        case 'easy': return 'green';
        case 'medium': return 'yellow';
        case 'hard': return 'orange';
        case 'intense': return 'red';
        default: return 'gray';
    }
};

const getSubTopicTypeColor = (type) => {
    switch (type?.toLowerCase()) {
        case 'concept': return 'blue';
        case 'problem-solving': return 'grape';
        case 'derivation': return 'cyan';
        case 'review': return 'teal';
        default: return 'gray';
    }
};


export default function NewPlanPage() {
    const router = useRouter();
    const strategyReportRef = useRef(null);
    const planContainerRef = useRef(null);
    const [opened, { toggle }] = useDisclosure(false);

    // --- MODIFICATION: States updated for streaming UI ---
    const [session, setSession] = useState(null);
    const [examName, setExamName] = useState('');
    const [syllabus, setSyllabus] = useState('');
    const [examDate, setExamDate] = useState('');
    const [studyHoursPerDay, setStudyHoursPerDay] = useState(4);
    const [useDocuments, setUseDocuments] = useState(true);
    
    const [studyMaterialFile, setStudyMaterialFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingState, setProcessingState] = useState({ step: 'idle', message: '' });

    // New state for local loading, replacing the global loader for this action
    const [isGenerating, setIsGenerating] = useState(false); 
    const [plan, setPlan] = useState([]); // Initialize as empty array
    const [strategy, setStrategy] = useState(null);
    const [generationContext, setGenerationContext] = useState(null);
    const [error, setError] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [pageImageUrls, setPageImageUrls] = useState([]);

    const [currentFact, setCurrentFact] = useState(wittyFacts[0]);
    const typedApproach = useTypingEffect(strategy?.overall_approach);

    useEffect(() => {
        let factInterval = null;
        if (isGenerating) {
            factInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * wittyFacts.length);
                setCurrentFact(wittyFacts[randomIndex]);
            }, 4000);
        } else {
            if (factInterval) { clearInterval(factInterval); }
        }
        return () => { if (factInterval) { clearInterval(factInterval); } };
    }, [isGenerating]);

            useEffect(() => {
            // Stage 1: Scroll to "Thinking..." card when generation starts.
            if (isGenerating && !strategy && strategyReportRef.current) {
                setTimeout(() => {
                    strategyReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
            // Stage 2: Scroll to "Building..." card when the plan starts populating.
            // This condition is specific to the moment the plan array goes from empty to having one item.
            if (strategy && plan.length === 1 && planContainerRef.current) {
                setTimeout(() => {
                    planContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }, [isGenerating, strategy, plan.length]); 

        // Effect for STAGE 1 Autoscroll: Scroll to strategy once it's available
        useEffect(() => {
            if (strategy && strategyReportRef.current) {
                // A small timeout ensures the element has fully rendered before scrolling.
                setTimeout(() => {
                    strategyReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }, [strategy]);

        // Effect for STAGE 2 Autoscroll: Scroll to plan container when it starts populating
        useEffect(() => {
            // Only scroll when the VERY FIRST plan item is added.
            if (plan.length === 1 && planContainerRef.current) {
                setTimeout(() => {
                    planContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }, [plan.length]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
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
    setError(''); setPlan([]); setStrategy(null); setGenerationContext(null); setIsGenerating(true);

    try {
        const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examName, syllabus, examDate, useDocuments, studyHoursPerDay }),
            });

        if (!response.body) { throw new Error("Streaming response not available."); }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n---\n');
            buffer = parts.pop() || ''; 
            
            for (const part of parts) {
                if (part.trim() === '') continue;
                
                try {
                    const message = JSON.parse(part);
                    if (message.type === 'strategy') { setStrategy(message.data); setGenerationContext(JSON.stringify(message.data)); } 
                    else if (message.type === 'plan_topic') {
                        // This forces a UI update for each day
                        setPlan(p => [...p, message.data]);
                        await new Promise(res => setTimeout(res, 50)); 
                    }
                    else if (message.type === 'error') { throw new Error(message.data.message); }
                } catch (e) { console.error("Stream parse error:", part, e); setError("A streaming error occurred."); }
            }
        }
    } catch (err) { setError(err.message); } finally { setIsGenerating(false); }
};

            const handleSavePlan = async () => {
            // A simplified guard clause. We only need to check the plan here.
            if (!plan || plan.length === 0) return;

            setIsSaving(true);
            setSaveError('');
            setSaveSuccess(false);

            try {
                // --- DEFINITIVE FIX: Get the session directly inside the handler ---
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session) {
                    throw new Error('Authentication error. Could not save plan.');
                }

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
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save the plan.');
                }

                const data = await response.json();
                setSaveSuccess(true);
                router.push(`/plans`);

            } catch (err) {
                setSaveError(err.message);
                // Also log to console for debugging
                console.error("Save Plan Failed:", err.message);
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
    

    // --- Start of Replacement ---
// --- Start of Replacement (Return Statement) ---
return (
    <AppLayout session={session}>
        <Container>
            <Title order={1} mb="xs">Create a New Study Plan</Title>
            <Text c="dimmed" mb="xl">Fill in the details below to generate your AI schedule.</Text>

            <GlassCard>
                <form onSubmit={handlePlanGeneration}>
    <Stack gap="xl">
        {/* --- SECTION 1: CORE DETAILS (RE-ARCHITECTED FOR NARRATIVE FLOW) --- */}
        <Stack gap="lg">
            <Title order={3} ff="Lexend, sans-serif" fw={600}>
                Plan Details
            </Title>
            
            {/* The Goal */}
            <TextInput
                leftSection={<IconBooks size={18} />}
                label="Exam or Project Name"
                placeholder="e.g., Final Year Project, SATs, Hackathon Build"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                required
                disabled={isGenerating}
                size="md"
            />
            
            {/* The Constraints (Grouped) */}
            <Grid gutter="lg">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                     <TextInput
                        leftSection={<IconCalendar size={18} />}
                        type="date"
                        label="Final Deadline"
                        placeholder="dd-mm-yyyy"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        required
                        disabled={isGenerating}
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                    <NumberInput
                        leftSection={<IconClock size={18} />}
                        label="Daily Study Hours"
                        placeholder="Your realistic daily goal"
                        value={studyHoursPerDay}
                        onChange={setStudyHoursPerDay}
                        min={1}
                        max={12}
                        required
                        disabled={isGenerating}
                        size="md"
                    />
                </Grid.Col>
            </Grid>

            {/* The Material */}
            <Textarea
                label="Syllabus or Topics"
                description="Paste everything here. Topics, chapters, job descriptions—don't worry if it's messy, the AI will make sense of it."
                placeholder="Chapter 1: Introduction to AI..."
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                required
                autosize
                minRows={6}
                disabled={isGenerating}
                size="md"
            />
        </Stack>

        {/* --- SECTION 2: OPTIONAL MATERIALS (REFINED) --- */}
        <Stack gap="lg">
            <Title order={4} ff="Lexend, sans-serif" fw={500}>
                Optional: Add Your Materials
            </Title>
            <Paper withBorder p="lg" radius="md" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <Stack>
                    <FileInput
                        leftSection={<IconPdf size={18} />}
                        label="Personal Notes or Textbook (PDF)"
                        description="Upload your own materials for a plan that is hyper-personalized to your exact course."
                        placeholder="Upload a PDF"
                        value={studyMaterialFile}
                        onChange={handleFileChange}
                        accept=".pdf"
                        disabled={isGenerating || isProcessing}
                        size="md"
                    />
                    <Group>
                        <Button
                            onClick={handleProcessFile}
                            disabled={!studyMaterialFile || isProcessing || isGenerating}
                            variant="outline"
                            color="brandGreen"
                            loading={isProcessing}
                        >
                            {processingState.step === 'done' ? '✓ Processed' : 'Process File'}
                        </Button>
                        <Checkbox
                            label="Use my documents for this plan"
                            checked={useDocuments}
                            onChange={(e) => setUseDocuments(e.currentTarget.checked)}
                            disabled={isGenerating || !studyMaterialFile}
                        />
                    </Group>
                    {processingState.step !== 'idle' && (
                        <Text size="xs" c="dimmed" mt="xs">{processingState.message}</Text>
                    )}
                </Stack>
            </Paper>
        </Stack>

        {/* --- SECTION 3: CALL TO ACTION --- */}
        <Group justify="flex-end" mt="md">
            <ShimmerButton
                type="submit"
                size="lg"
                loading={isGenerating}
                disabled={isProcessing}
            >
                Generate My Plan
            </ShimmerButton>
        </Group>
    </Stack>
</form>
            </GlassCard>

            {error && <Alert color="red" title="Error" mt="xl">{error}</Alert>}
            
            {/* --- THE UPGRADED "DEEP DIVE" STRATEGY REPORT --- */}
            {(isGenerating || strategy) && (
                <GlassCard mt="xl" ref={strategyReportRef}>
                    <Title order={3}>{strategy ? "AI Strategy Report" : "Thinking..."}</Title>
                    {strategy ? (
                        <Stack gap="md" mt="md">
                            {strategy.estimated_coverage && (
                                <Paper withBorder p="sm" radius="md" style={{backgroundColor: 'rgba(0,0,0,0.2)'}}>
                                    <Group>
                                        <Progress.Root size="xl" style={{ flex: 1 }}>
                                            <Progress.Section value={strategy.estimated_coverage} color="teal">
                                                <Progress.Label>{strategy.estimated_coverage}% Coverage</Progress.Label>
                                            </Progress.Section>
                                        </Progress.Root>
                                    </Group>
                                </Paper>
                            )}
                            <div>
                                <Text fw={500}>Overall Approach:</Text>
                                <Text c="dimmed">{typedApproach}</Text>
                            </div>
                            <div>
                                <Text mt="sm" fw={500}>Key Topics to Emphasize:</Text>
                                <Group mt="xs" gap="xs">{strategy.emphasized_topics?.map((item, index) => (<Badge key={index} color="brandGreen" variant="light">{item.topic}</Badge>))}</Group>
                            </div>

                             {/* --- ADD THIS NEW BLOCK FOR DE-PRIORITIZED TOPICS --- */}
                                    {strategy.deprioritized_topics && strategy.deprioritized_topics.length > 0 && (
                                        <div>
                                        <Text mt="sm" fw={500}>Deprioritized Topics:</Text>
                                        <List spacing="xs" size="sm" center icon={<ThemeIcon color="blue" size={16} radius="xl"><IconInfoCircle size={12} /></ThemeIcon>}>
                                        {strategy.deprioritized_topics.map((item, index) => (
                                            <List.Item key={index}><Text><strong>{item.topic}:</strong> {item.justification}</Text></List.Item>
                                        ))}
                                        </List>
                                        </div>
                                    )}

                            {strategy.skipped_topics && strategy.skipped_topics.length > 0 && (
                                 <div>
                                    <Text mt="sm" fw={500}>Topics We'll Strategically Skip:</Text>
                                    <Group mt="xs" gap="xs">{strategy.skipped_topics.map((item, index) => (<Badge key={index} color="yellow" variant="light">{item.topic}</Badge>))}</Group>
                                </div>
                            )}
                            <Button leftSection={<IconListDetails size={16}/>} variant="subtle" size="xs" onClick={toggle} mt="xs">
                                {opened ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}
                            </Button>
                            <Collapse in={opened}>
                                <Stack gap="sm" mt="sm">
                                    <List spacing="xs" size="sm" center icon={<ThemeIcon color="green" size={16} radius="xl"><IconTargetArrow size={12} /></ThemeIcon>}>
                                        {strategy.emphasized_topics?.map((item, index) => (
                                            <List.Item key={index}><Text><strong>{item.topic}:</strong> {item.justification}</Text></List.Item>
                                        ))}
                                    </List>
                                    {strategy.skipped_topics && strategy.skipped_topics.length > 0 && (
                                        <List spacing="xs" size="sm" center icon={<ThemeIcon color="yellow" size={16} radius="xl"><IconX size={12} /></ThemeIcon>}>
                                        {strategy.skipped_topics.map((item, index) => (
                                            <List.Item key={index}><Text><strong>{item.topic}:</strong> {item.justification}</Text></List.Item>
                                        ))}
                                        </List>
                                    )}
                                </Stack>
                            </Collapse>
                        </Stack>
                    ) : (
                        <Paper p="md" mt="md" withBorder style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                           <Group>
                                <Loader size="sm" color="white" />
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentFact}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
                                        exit={{ opacity: 0, y: -10, transition: { duration: 0.4, ease: 'easeIn' } }}
                                    >
                                        <Text size="sm" c="dimmed">{currentFact}</Text>
                                    </motion.div>
                                </AnimatePresence>
                            </Group>
                        </Paper>
                    )}
                </GlassCard>
            )}

            {/* --- THE UPGRADED "MISSION BRIEFING" PLAN DISPLAY --- */}
            {strategy && (isGenerating || plan.length > 0) && (
                <GlassCard mt="xl" ref={planContainerRef}>
                    <Group justify="space-between" mb="lg">
                        <Title order={2}>{isGenerating && plan.length === 0 ? "Building Your Quest..." : "Your Generated Plan"}</Title>
                        {!isGenerating && plan.length > 0 && (<Button onClick={handleSavePlan} loading={isSaving} disabled={saveSuccess} color="brandGreen"> {saveSuccess ? 'Saved!' : 'Save & View Plan'} </Button>)}
                    </Group>
                    
                    {plan.length > 0 ? (
                        <div style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: '1rem' }}>
                            {plan.map((item, index) => (
                                <Paper key={index} p="lg" mb="md" withBorder radius="md" style={{ borderLeft: `5px solid ${getDayDifficultyColor(item.day_difficulty)}`}}>
                                    <Group justify="space-between">
                                        <Title order={4}>{`Day ${item.day} (${item.date})`}</Title>
                                        <Group gap="xs">
                                            <Badge
                                                color="gray"
                                                variant="light"
                                                leftSection={<IconClock size={14} style={{ marginRight: '-0.2rem' }} />}
                                            >
                                                {item.study_hours} hrs
                                            </Badge>
                                            <Badge color={getDayDifficultyColor(item.day_difficulty)} variant="light">{item.day_difficulty}</Badge>
                                        </Group>
                                    </Group>
                                    <Title order={5} fw={500} mt={2}>{item.topic_name}</Title>
                                    <Text c="dimmed" size="sm" mt={4}>{item.day_summary}</Text>
                                    <List spacing="sm" size="sm" mt="md">
                                        {item.sub_topics?.map((sub, i) => (
                                            <List.Item key={i}>
                                                {sub.text}
                                                <Group gap="xs" mt={4}>
                                                    <Badge size="xs" variant="light" color={getSubTopicTypeColor(sub.type)}>{sub.type}</Badge>
                                                    <Badge size="xs" variant="light" color={getDayDifficultyColor(sub.difficulty)}>{sub.difficulty}</Badge>
                                                </Group>
                                            </List.Item>
                                        ))}
                                    </List>
                                </Paper>
                            ))}
                            {isGenerating && (
                                <Paper p="md" mb="md" withBorder radius="md" style={{opacity: 0.6}}>
                                    <Skeleton height={20} width="70%" mb="md" />
                                    <Skeleton height={15} mt="sm" />
                                    <Skeleton height={15} mt="sm" />
                                    <Skeleton height={15} mt="sm" />
                                </Paper>
                            )}
                        </div>
                    ) : (
                        <Paper p="md" withBorder style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                            <Group>
                                <Loader size="sm" color="white" />
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentFact}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
                                        exit={{ opacity: 0, y: -10, transition: { duration: 0.4, ease: 'easeIn' } }}
                                    >
                                        <Text size="sm" c="dimmed">{currentFact}</Text>
                                    </motion.div>
                                </AnimatePresence>
                            </Group>
                        </Paper>
                    )}
                </GlassCard>
            )}
        </Container>
    </AppLayout>
);
}