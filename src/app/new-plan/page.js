// src/app/new-plan/page.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { wittyFacts } from '@/lib/newplanFacts';
import { AnimatePresence, motion } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';

import { 
    Container, Title, Text, TextInput, Textarea, Button, Paper, Group, 
    FileInput, Checkbox, Alert, Badge, Progress, Loader, Stack, Grid, 
    ThemeIcon, Slider, Box, Collapse, ScrollArea
} from '@mantine/core';
import { 
    IconCalendar, IconBooks, IconPdf, IconTargetArrow, IconX, 
    IconListDetails, IconInfoCircle, IconRotateClockwise, IconBolt, 
    IconSwords, IconTools, IconBrain, IconCheck, IconFlask 
} from '@tabler/icons-react';

import { useOnboarding } from '@/context/OnboardingContext';
import { SavePlanNudge } from '@/components/SavePlanNudge';
import nudgeClasses from '@/components/SavePlanNudge.module.css'; 

// --- 0. ROBUST SAMPLE DATA ---
const SAMPLE_STRATEGY = {
    estimated_coverage: 87,
    overall_approach: "This is a simulated strategy. The AI has determined that focusing on 'Quantum Mechanics' and 'Thermodynamics' yields the highest ROI. We are condensing the 'History of Physics' module to save 12 hours.",
    emphasized_topics: [{ topic: "Quantum Wave Functions" }, { topic: "Laws of Thermodynamics" }, { topic: "Circuit Analysis" }],
    skipped_topics: [{ topic: "Introductory History" }, { topic: "Obscure Citations" }]
};

const SAMPLE_PLAN = Array.from({ length: 7 }).map((_, i) => ({
    day: i + 1,
    // Add date for realism (starting tomorrow)
    date: new Date(new Date().setDate(new Date().getDate() + (i + 1))).toISOString().split('T')[0],
    topic_name: i % 2 === 0 ? "Core Concepts: Mechanics" : "Advanced Application: Fluids",
    study_hours: 4 + (i % 3),
    importance: 8, // Added importance
    day_difficulty: i === 2 ? "Hard" : i === 5 ? "Intense" : "Medium",
    day_summary: "Today we focus on deriving the core equations and solving at least 5 practice problems from the main textbook.",
    // Added sub_topics to prevent UI crashes and ensure completeness
    sub_topics: [
        { text: "Read Chapter 4: Newton's Laws", type: "Concept", difficulty: "Easy", completed: false },
        { text: "Solve Practice Set A (Q1-10)", type: "Practice", difficulty: "Medium", completed: false },
        { text: "Review Lecture Notes on Friction", type: "Review", difficulty: "Easy", completed: false }
    ]
}));

// --- 1. MODES ---
const PLAN_MODES = [
    { value: 'default', label: 'Balanced', description: 'Smart focus.', icon: IconTargetArrow, color: 'teal' },
    { value: 'revision', label: 'Revision', description: 'Rapid review.', icon: IconRotateClockwise, color: 'blue' },
    { value: 'hardcore', label: 'Hardcore', description: '100% coverage.', icon: IconSwords, color: 'red' },
    { value: 'sprint', label: 'Sprint', description: 'Max velocity.', icon: IconBolt, color: 'yellow' },
    { value: 'skill', label: 'Skill Build', description: 'Project-based.', icon: IconTools, color: 'grape' }
];

// --- 2. HELPERS ---
const useTypingEffect = (text = '', speed = 1) => {
    const [displayedText, setDisplayedText] = useState('');
    useEffect(() => {
        if (!text) { setDisplayedText(''); return; }
        let i = 0; setDisplayedText('');
        const intervalId = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1)); i++;
            if (i >= text.length) clearInterval(intervalId);
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

// --- 3. MAIN COMPONENT ---
export default function NewPlanPage() {
    const router = useRouter();
    const strategyReportRef = useRef(null);
    const planContainerRef = useRef(null);
    const planScrollDivRef = useRef(null);
    const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(false);

    // --- FORM STATE ---
    const [session, setSession] = useState(null);
    const [examName, setExamName] = useState('');
    const [syllabus, setSyllabus] = useState('');
    const [examDate, setExamDate] = useState('');
    const [studyHoursPerDay, setStudyHoursPerDay] = useState(4);
    const [planMode, setPlanMode] = useState('default');
    const [useDocuments, setUseDocuments] = useState(true);
    
    // --- FILE STATE ---
    const [studyMaterialFile, setStudyMaterialFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingState, setProcessingState] = useState({ step: 'idle', message: '' });
    const [pageImageUrls, setPageImageUrls] = useState([]);

    // --- GENERATION STATE ---
    const [isGenerating, setIsGenerating] = useState(false); 
    const [plan, setPlan] = useState([]);
    const [strategy, setStrategy] = useState(null);
    const [generationContext, setGenerationContext] = useState(null);
    const [error, setError] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    // --- UI STATE ---
    const [currentFact, setCurrentFact] = useState(wittyFacts[0]);
    const typedApproach = useTypingEffect(strategy?.overall_approach);
    const { profile, isPaused, resumeTour, endTour } = useOnboarding();
    const [showSaveNudge, setShowSaveNudge] = useState(false);
    const [highlightSave, setHighlightSave] = useState(false);

    // --- EFFECTS ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    }, []);

    useEffect(() => {
        if (!isGenerating && plan.length > 0 && profile && !profile.has_completed_onboarding) {
            setShowSaveNudge(true);
        }
    }, [isGenerating, plan, profile]);

    // Cycling Facts
    useEffect(() => {
        let factInterval = null;
        if (isGenerating) {
            factInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * wittyFacts.length);
                setCurrentFact(wittyFacts[randomIndex]);
            }, 4000);
        } else { if (factInterval) clearInterval(factInterval); }
        return () => { if (factInterval) clearInterval(factInterval); };
    }, [isGenerating]);

    // Auto-scroll
    useEffect(() => {
        if ((isGenerating || strategy) && strategyReportRef.current) {
            setTimeout(() => {
                strategyReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        }
    }, [isGenerating, strategy]);

    useEffect(() => {
        if (isGenerating && planScrollDivRef.current) {
            const scrollDiv = planScrollDivRef.current;
            scrollDiv.scrollTop = scrollDiv.scrollHeight;
        }
    }, [plan.length, isGenerating]);

    // --- HANDLERS ---
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

    const handlePlanGeneration = async (e) => {
        e.preventDefault();
        setError(''); setPlan([]); setStrategy(null); setGenerationContext(null); setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-plan', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examName, syllabus, examDate, useDocuments, studyHoursPerDay, planMode }),
            });
            if (!response.body) throw new Error("Stream failed");
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
                    if (!part.trim()) continue;
                    try {
                        const message = JSON.parse(part);
                        if (message.type === 'strategy') { setStrategy(message.data); setGenerationContext(JSON.stringify(message.data)); } 
                        else if (message.type === 'plan_topic') { setPlan(p => [...p, message.data]); await new Promise(res => setTimeout(res, 50)); }
                        else if (message.type === 'error') throw new Error(message.data.message);
                    } catch (e) { console.error(e); }
                }
            }
        } catch (err) { setError(err.message); }  
        finally { 
            setIsGenerating(false); 
            if (isPaused) resumeTour();
            if (plan.length > 0) setHighlightSave(true);
        }
    };

    const handleSimulation = () => {
        setIsGenerating(true);
        setStrategy(null);
        setPlan([]);
        
        // Populate form data so validation passes
        setExamName("Simulation: Quantum Mechanics");
        const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
        setExamDate(nextWeek.toISOString().split('T')[0]);
        setSyllabus("1. Wave Functions\n2. Schrodinger Equation\n3. Thermodynamics Laws");
        
        setTimeout(() => {
            setStrategy(SAMPLE_STRATEGY);
            setGenerationContext(JSON.stringify(SAMPLE_STRATEGY));
            
            let dayCount = 0;
            const interval = setInterval(() => {
                if (dayCount >= SAMPLE_PLAN.length) {
                    clearInterval(interval);
                    setIsGenerating(false);
                    setHighlightSave(true);
                } else {
                    setPlan(prev => [...prev, SAMPLE_PLAN[dayCount]]);
                    dayCount++;
                }
            }, 400); 
        }, 1000);
    };

    const handleSavePlan = async () => {
        endTour();
        if (!plan || plan.length === 0) return;
        if (!examName || !examDate) {
            setSaveError("Please ensure Exam Name and Date are set.");
            return;
        }

        setIsSaving(true); setSaveError(''); setSaveSuccess(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Auth error');
            
            // --- FIX: Filter out nulls/undefined from the plan array ---
            const cleanPlan = plan.filter(Boolean);

            const response = await fetch('/api/save-plan', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    exam_name: examName, 
                    exam_date: examDate, 
                    plan_topics: cleanPlan, // Send the clean plan
                    generation_context: generationContext, 
                    page_image_urls: pageImageUrls, 
                    syllabus: syllabus 
                }),
            });
            
            if (!response.ok) throw new Error((await response.json()).error);
            setSaveSuccess(true); 
            router.push(`/plans`);
        } catch (err) { setSaveError(err.message); } finally { setIsSaving(false); }
    };

    return (
        <AppLayout session={session}>
            {/* 1. Global Style Injection for Hiding Scrollbars */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            <Container size="xl" pt="md" px="md" style={{ overflowX: 'hidden', maxWidth: '100vw' } } className="no-scrollbar">
                <Box mb="xl">
                    <Title order={1} className="apple-text-gradient" style={{ fontSize: '3rem', letterSpacing: '-0.03em' }}>
                        Create New Plan
                    </Title>
                    <Text c="dimmed" size="lg" mt={4}>Architect your path to victory.</Text>
                </Box>

                {/* --- LAYOUT ENGINE --- */}
                {/* Mobile: 0 gutter (Linear Stack). Desktop: 40px gutter (Split View). */}
                <Grid gutter={{ base: 0, lg: 40 }}>
                    
                    {/* --- LEFT COLUMN: THE FORM --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }} mb={{ base: 40, lg: 0 }}>
                        <form onSubmit={(e) => { window.dispatchEvent(new CustomEvent('kalpad-onboarding-advance')); handlePlanGeneration(e); }}>
                            <Stack gap="xl">
                                
                                {/* MODULE 1: OBJECTIVE */}
                                <Stack gap="md">
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>01. The Objective</Text>
                                    <GlassCard p="lg">
                                        <Stack gap="lg">
                                            <TextInput 
                                                label="Mission Name" placeholder="e.g. End Semester Exams" 
                                                size="md" radius="md" required 
                                                value={examName} onChange={(e) => setExamName(e.target.value)}
                                                leftSection={<IconTargetArrow size={18} />}
                                                styles={{ input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                            />
                                            <TextInput 
                                                type="date" label="Deadline" 
                                                size="md" radius="md" required 
                                                value={examDate} onChange={(e) => setExamDate(e.target.value)}
                                                leftSection={<IconCalendar size={18} />}
                                                styles={{ input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                            />
                                        </Stack>
                                    </GlassCard>
                                </Stack>

                                {/* MODULE 2: PARAMETERS */}
                                <Stack gap="md">
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>02. Strategy</Text>
                                    <GlassCard p="lg">
                                        <Stack gap="xl">
                                            <Box>
                                                <Group justify="space-between" mb="xs">
                                                    <Text size="sm" fw={500}>Intensity Level</Text>
                                                    <Badge variant="filled" color="violet">{studyHoursPerDay} Hours / Day</Badge>
                                                </Group>
                                                <Slider 
                                                    value={studyHoursPerDay} onChange={setStudyHoursPerDay}
                                                    min={1} max={12} step={1}
                                                    color="violet" size="lg" thumbSize={24}
                                                    marks={[{ value: 2, label: 'Casual' }, { value: 6, label: 'Focused' }, { value: 10, label: 'Monk' }]}
                                                    styles={{ markLabel: { fontSize: '0.7rem', color: 'gray' } }}
                                                />
                                            </Box>
                                            
                                            <Textarea 
                                                label="Intel (Syllabus)" 
                                                placeholder="Paste your syllabus, topic list, or rough notes here..." 
                                                minRows={6} autosize required 
                                                value={syllabus} onChange={(e) => setSyllabus(e.target.value)}
                                                styles={{ input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                            />
                                        </Stack>
                                    </GlassCard>
                                </Stack>

                                {/* MODULE 3: TACTICS (Scrollable) */}
                                <Stack gap="md">
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>03. Tactics</Text>
                                    {/* py="md" adds padding so hover effects don't clip */}
                                    <Box style={{ width: '100%', overflow: 'hidden' }}>
                                        <ScrollArea type="never">
                                            {/* p="xs" adds a safety buffer inside the scroll area */}
                                            <Group wrap="nowrap" gap="md" p="xl"> 
                                                {PLAN_MODES.map((mode) => {
                                                    const isActive = planMode === mode.value;
                                                    return (
                                                        <Interactive key={mode.value} onClick={() => setPlanMode(mode.value)}>
                                                            <GlassCard p="md" style={{ 
                                                                    minWidth: '160px', height: '140px',
                                                                    backgroundColor: isActive ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                    border: isActive ? `1px solid ${mode.color}` : '1px solid rgba(255,255,255,0.05)',
                                                                    cursor: 'pointer'
                                                                }}>
                                                                <Stack h="100%" justify="space-between">
                                                                    <ThemeIcon variant="light" size="lg" radius="md" color={mode.color}><mode.icon size={20} /></ThemeIcon>
                                                                    <Box>
                                                                        <Text size="sm" fw={700} c={isActive ? 'white' : 'dimmed'}>{mode.label}</Text>
                                                                        <Text size="xs" c="dimmed" lineClamp={2} mt={2}>{mode.description}</Text>
                                                                    </Box>
                                                                </Stack>
                                                            </GlassCard>
                                                        </Interactive>
                                                    );
                                                })}
                                            </Group>
                                        </ScrollArea>
                                    </Box>
                                </Stack>

                                {/* MODULE 4: RESOURCES */}
                                <Stack gap="md">
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>04. Resources</Text>
                                    <GlassCard p="lg" style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        <Group align="flex-end">
                                            <FileInput 
                                                placeholder="Upload PDF Material" leftSection={<IconPdf size={18} />} 
                                                value={studyMaterialFile} onChange={handleFileChange} accept=".pdf" style={{ flex: 1 }}
                                                styles={{ input: { backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                            />
                                            <Button variant="light" color="brandGreen" onClick={handleProcessFile} loading={isProcessing} disabled={!studyMaterialFile || processingState.step === 'done'}>
                                                {processingState.step === 'done' ? <IconCheck size={18} /> : 'Process'}
                                            </Button>
                                        </Group>
                                        {processingState.message && <Text size="xs" c="dimmed" mt="xs">{processingState.message}</Text>}
                                        <Checkbox label="Use this document for RAG context" mt="md" checked={useDocuments} onChange={(e) => setUseDocuments(e.currentTarget.checked)} disabled={!studyMaterialFile} />
                                    </GlassCard>
                                </Stack>

                                {/* ACTION BUTTONS */}
                                <Group justify="flex-end" mt="xl">
                                    {/* Simulation Button Removed */}
                                    
                                    <Interactive style={{ width: '100%' }}>
                                        <Button 
                                            id="generate-plan-button"
                                            type="submit" 
                                            size="xl" 
                                            py = "md"
                                            loading={isGenerating} 
                                            disabled={isProcessing}
                                            radius="xl" // Pill Shape
                                            style={{ 
                                                width: '100%',
                                                background: 'linear-gradient(135deg, #3300ebff 0%, #5c5ce6ff 100%)', // Apple-style Gradient
                                                boxShadow: '0 10px 25px -5px rgba(191, 90, 242, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)', // Deep Glow + Top highlight
                                                border: 'none',
                                                color: 'white',
                                                fontSize: '1.1rem',
                                                fontWeight: 600,
                                                letterSpacing: '0.02em'
                                            }}
                                            rightSection={!isGenerating && <IconTargetArrow size={22} />}
                                        >
                                            Initialize Sequence
                                        </Button>
                                    </Interactive>
                                </Group>
                            </Stack>
                        </form>
                    </Grid.Col>

                    {/* --- RIGHT COLUMN: THE LIVE BLUEPRINT --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        {/* Sticky container for desktop, standard stack for mobile */}
                        <Stack gap="md" style={{ position: 'sticky', top: 20 }}>
                            <div ref={strategyReportRef} /> {/* Mobile Scroll Anchor */}
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>System Output</Text>
                            
                            {!strategy ? (
                                <GlassCard p="xl" style={{ height: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderStyle: 'dashed' }}>
                                    {isGenerating ? (
                                        <Stack align="center" gap="lg">
                                            <Loader size="lg" color="violet" type="dots" />
                                            <AnimatePresence mode="wait">
                                                <motion.div key={currentFact} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                    <Text c="dimmed" ta="center" maw={300}>{currentFact}</Text>
                                                </motion.div>
                                            </AnimatePresence>
                                        </Stack>
                                    ) : (
                                        <Stack align="center" gap="xs">
                                            <IconBrain size={48} color="rgba(101, 101, 101, 1)" />
                                            <Text c="dimmed" fw={500}>Ready to Architect</Text>
                                            <Text c="dimmed" size="sm">Fill the modules to begin generation.</Text>
                                        </Stack>
                                    )}
                                </GlassCard>
                            ) : (
                                <>
                                    {/* STRATEGY CARD */}
                                    <GlassCard p="lg" style={{ borderLeft: '4px solid #BF5AF2' }}>
                                        <Stack gap="md">
                                            <Group justify="space-between">
                                                <Title order={3}>Strategic Analysis</Title>
                                                <Badge size="lg" variant="dot" color="teal">{strategy.estimated_coverage}% Coverage</Badge>
                                            </Group>
                                            <Text style={{ lineHeight: 1.6 }}>{typedApproach}</Text>
                                            <Button variant="subtle" size="xs" color="gray" leftSection={<IconListDetails size={16}/>} onClick={toggleDetails}>{detailsOpened ? 'Hide Analysis' : 'View Breakdown'}</Button>
                                            <Collapse in={detailsOpened}>
                                                <Stack gap="xs">
                                                    <Text size="xs" fw={700} c="brandGreen">PRIORITY TARGETS</Text>
                                                    {strategy.emphasized_topics?.map((t, i) => <Text key={i} size="sm">• {t.topic}</Text>)}
                                                    {strategy.skipped_topics?.length > 0 && (
                                                        <>
                                                            <Text size="xs" fw={700} c="orange" mt="xs">OMITTED (LOW ROI)</Text>
                                                            {strategy.skipped_topics.map((t, i) => <Text key={i} size="sm" c="dimmed">• {t.topic}</Text>)}
                                                        </>
                                                    )}
                                                </Stack>
                                            </Collapse>
                                        </Stack>
                                    </GlassCard>

                                    {/* PLAN LIST (Hidden Scrollbar) */}
                                    <GlassCard p={0} ref={planContainerRef} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
                                        <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                            <Group justify="space-between">
                                                <Title order={4}>Blueprint</Title>
                                                {!isGenerating && (
                                                    <Group className={`${showSaveNudge ? nudgeClasses.glowEffect : ''} ${highlightSave ? nudgeClasses.pulseEffect : ''}`}>
                                                        {showSaveNudge && <SavePlanNudge />}
                                                        <Button id="save-plan-button" onClick={handleSavePlan} loading={isSaving} disabled={saveSuccess} color="brandGreen" size="xs">
                                                            {saveSuccess ? 'Saved' : 'Confirm & Save'}
                                                        </Button>
                                                    </Group>
                                                )}
                                            </Group>
                                        </Box>
                                        {/* CSS class 'no-scrollbar' hides the scrollbar visually */}
                                        <Box ref={planScrollDivRef} className="no-scrollbar" p="md" style={{ overflowY: 'auto', flex: 1 }}>
                                            <Stack gap="sm">
                                                {plan.filter(Boolean).map((day, i) => (
                                                    <Paper key={i} p="sm" radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${getDayDifficultyColor(day.day_difficulty)}` }}>
                                                        <Group justify="space-between" mb={4}>
                                                            <Text size="sm" fw={700}>Day {day.day}</Text>
                                                            <Badge size="xs" variant="outline" color="gray">{day.study_hours}h</Badge>
                                                        </Group>
                                                        <Text size="sm">{day.topic_name}</Text>
                                                        <Text size="xs" c="dimmed" lineClamp={1}>{day.day_summary}</Text>
                                                    </Paper>
                                                ))}
                                                {isGenerating && <Group justify="center" p="xl"><Loader size="sm" color="gray" /></Group>}
                                            </Stack>
                                        </Box>
                                    </GlassCard>
                                </>
                            )}
                        </Stack>
                    </Grid.Col>
                </Grid>

                {error && <Alert color="red" title="Error" mt="xl" icon={<IconX size={16}/>}>{error}</Alert>}
                {saveError && <Alert color="red" title="Save Error" mt="xl" icon={<IconX size={16}/>}>{saveError}</Alert>}
            </Container>
        </AppLayout>
    );
}