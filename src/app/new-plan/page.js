// src/app/new-plan/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBolt,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconCopy,
  IconFileText,
  IconFlame,
  IconRefresh,
  IconTargetArrow,
  IconTool,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import supabase from '@/lib/supabaseClient';
import { useLoading } from '@/context/LoadingContext';
import { useKalPadTheme } from '@/context/KalPadThemeContext';
import KalPadShell from '@/components/kalpad/KalPadShell';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';
import { WeekDatePickerDialog } from '@/components/dashboard/WeekDatePickerDialog';
import { useGeneration } from '@/context/GenerationContext';
import { generatePlanBYOK } from '@/lib/byok/pipelines/planGenerator';
import classes from '@/components/newplan/NewPlan.module.css';

const PLAN_MODES = [
  {
    value: 'default',
    label: 'Balanced',
    description: 'Steady progress with room to review',
    icon: IconTargetArrow,
  },
  {
    value: 'revision',
    label: 'Revision',
    description: 'Recall and practice come first',
    icon: IconRefresh,
  },
  {
    value: 'hardcore',
    label: 'In-depth',
    description: 'Build a thorough topic foundation',
    icon: IconFlame,
  },
  {
    value: 'sprint',
    label: 'Sprint',
    description: 'Make the most of a short timeline',
    icon: IconBolt,
  },
  {
    value: 'skill',
    label: 'Applied',
    description: 'Learn through practical problems',
    icon: IconTool,
  },
];

const HOUR_PRESETS = [
  { value: 2, label: 'Easy start' },
  { value: 4, label: 'Balanced' },
  { value: 6, label: 'Focused' },
  { value: 8, label: 'Deep work' },
];

function lerpHex(hexA, hexB, t) {
  const parse = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const a = parse(hexA);
  const b = parse(hexB);
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * clamped);
  const g = Math.round(a[1] + (b[1] - a[1]) * clamped);
  const bl = Math.round(a[2] + (b[2] - a[2]) * clamped);
  return `rgb(${r}, ${g}, ${bl})`;
}

function getPaceSurfaceColor(hours, isDark) {
  const progress = Math.max(0, Math.min(1, (hours - 1) / 11));
  const mint = isDark ? '#1D382A' : '#EAF5EE';
  const butter = isDark ? '#3E301C' : '#FFF7DC';
  const apricot = isDark ? '#3B2920' : '#FFEDD5';
  if (progress <= 0.5) {
    return lerpHex(mint, butter, progress * 2);
  }
  return lerpHex(butter, apricot, (progress - 0.5) * 2);
}

function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/\u0000/g, '')
    .replace(/([^\ud800-\udbff])([\udc00-\udfff])/g, '$1?')
    .replace(/([\ud800-\udbff])([^\udc00-\udfff])/g, '$1?');
}

function chunkText(text, size, overlap) {
  const chunks = [];
  if (!text) return chunks;
  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

function resizeImage(blob, maxWidth = 768) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(blob);
    img.src = objUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = img.height * (maxWidth / img.width);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objUrl);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas conversion failed'))),
        'image/jpeg',
        0.8
      );
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objUrl);
      reject(err);
    };
  });
}

export default function NewPlanPage() {
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const { activePlanTask, startPlanGeneration } = useGeneration();
  const { isDark } = useKalPadTheme();

  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Core journey fields
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(4);
  const [planMode, setPlanMode] = useState('default');
  const [syllabus, setSyllabus] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [useDocuments, setUseDocuments] = useState(false);

  // Optional PDF upload & indexing (web parity)
  const [showMaterialPanel, setShowMaterialPanel] = useState(false);
  const [studyMaterialFile, setStudyMaterialFile] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingState, setProcessingState] = useState({ step: 'idle', message: '' });
  const [pageImageUrls, setPageImageUrls] = useState([]);
  const fileInputRef = useRef(null);

  // Date picker modal
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Generation & save state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [generationContext, setGenerationContext] = useState(null);
  const [error, setError] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null);
    });
  }, []);

  // Synchronize with persistent background plan generator
  useEffect(() => {
    if (
      activePlanTask &&
      (activePlanTask.status === 'generating' ||
        activePlanTask.status === 'saving' ||
        activePlanTask.status === 'completed')
    ) {
      setCurrentStep(3);
      if (activePlanTask.examName && !examName) setExamName(activePlanTask.examName);
      if (activePlanTask.strategy) {
        setStrategy(activePlanTask.strategy);
        setGenerationContext(JSON.stringify(activePlanTask.strategy));
      }
      if (activePlanTask.generatedTopics?.length > 0) {
        setGeneratedTopics(activePlanTask.generatedTopics);
      }
      setIsGenerating(activePlanTask.status === 'generating' || activePlanTask.status === 'saving');
      if (activePlanTask.status === 'completed') {
        setSaveSuccess(true);
      }
    }
  }, [activePlanTask, examName]);

  const parsedExamDate = useMemo(() => {
    if (!examDate) return null;
    const d = parseISO(examDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [examDate]);

  const daysLeft = useMemo(() => {
    if (!parsedExamDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return differenceInCalendarDays(parsedExamDate, today);
  }, [parsedExamDate]);

  const topicLineCount = useMemo(
    () => syllabus.split(/\r?\n/).filter((l) => l.trim().length > 0).length,
    [syllabus]
  );

  const canContinue = useMemo(() => {
    if (isGenerating) return false;
    if (currentStep === 0) return examName.trim().length > 0 && Boolean(examDate);
    if (currentStep === 2) return syllabus.trim().length > 0;
    return true;
  }, [currentStep, examName, examDate, syllabus, isGenerating]);

  const goToStep = (nextStep) => {
    setDirection(nextStep >= currentStep ? 1 : -1);
    setCurrentStep(nextStep);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSyllabus(text);
    } catch {
      setError('Clipboard access was denied. Please paste manually into the text field.');
    }
  };

  const handleProcessFile = async () => {
    if (!studyMaterialFile) return;
    if (!session) {
      setError('Sign in to upload and index PDF study materials.');
      return;
    }

    setIsProcessingFile(true);
    setError('');
    try {
      setProcessingState({
        step: 'checking',
        message: `Checking '${studyMaterialFile.name}'...`,
      });
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const buffer = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = (e) => res(e.target.result);
        reader.onerror = rej;
        reader.readAsArrayBuffer(studyMaterialFile);
      });

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const pageCount = pdfDoc.numPages;

      const checkRes = await fetch('/api/check-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: studyMaterialFile.name, page_count: pageCount }),
      });
      if (!checkRes.ok) {
        const errPayload = await checkRes.json().catch(() => ({}));
        throw new Error(errPayload.error || 'Pre-check failed');
      }

      const { status } = await checkRes.json();
      let fullText = '';
      setProcessingState({ step: 'parsing_text', message: `Parsing ${pageCount} pages...` });
      for (let i = 1; i <= pageCount; i += 1) {
        setProcessingState({ step: 'parsing_text', message: `Parsing page ${i}/${pageCount}...` });
        await new Promise((r) => setTimeout(r, 5));
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        fullText += `${content.items.map((x) => x.str).join(' ')}\n\n`;
      }

      const textChunks = chunkText(sanitizeText(fullText), 1000, 200);
      let imageUrls = [];

      if (status === 'exists') {
        setProcessingState({ step: 'fetching_urls', message: 'Fetching existing pages...' });
        const { data: imgs, error: fetchErr } = await supabase
          .from('documents')
          .select('image_url, page_number')
          .eq('user_id', session.user.id)
          .eq('file_name', studyMaterialFile.name)
          .eq('content_type', 'image_page')
          .order('page_number');
        if (fetchErr) throw new Error(fetchErr.message);
        imageUrls = (imgs || []).map((img) => img.image_url);
        setPageImageUrls(imageUrls);
      } else {
        setProcessingState({ step: 'parsing_images', message: 'Rendering pages...' });
        const blobs = [];
        for (let i = 1; i <= pageCount; i += 1) {
          setProcessingState({
            step: 'parsing_images',
            message: `Rendering page ${i}/${pageCount}...`,
          });
          await new Promise((r) => setTimeout(r, 5));
          const page = await pdfDoc.getPage(i);
          const vp = page.getViewport({ scale: 1.5 });
          const cv = document.createElement('canvas');
          cv.height = vp.height;
          cv.width = vp.width;
          await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
          const rawBlob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.9));
          blobs.push(await resizeImage(rawBlob));
        }

        setProcessingState({ step: 'uploading_images', message: 'Uploading study pages...' });
        for (const [idx, blob] of blobs.entries()) {
          const storagePath = `${session.user.id}/${studyMaterialFile.name}/page_${idx + 1}_${Date.now()}.jpeg`;
          const { error: upErr } = await supabase.storage
            .from('study-materials')
            .upload(storagePath, blob, { contentType: 'image/jpeg' });
          if (upErr) throw upErr;
          imageUrls.push(
            supabase.storage.from('study-materials').getPublicUrl(storagePath).data.publicUrl
          );
          setProcessingState({
            step: 'uploading_images',
            message: `Uploading ${idx + 1}/${blobs.length}...`,
          });
        }
        setPageImageUrls(imageUrls);
      }

      setProcessingState({ step: 'indexing', message: 'Indexing content...' });
      const ingestRes = await fetch('/api/ingest-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_chunks: textChunks,
          page_image_urls: imageUrls,
          file_name: studyMaterialFile.name,
        }),
      });
      if (!ingestRes.ok) {
        const errPayload = await ingestRes.json().catch(() => ({}));
        throw new Error(errPayload.error || 'Document indexing failed');
      }
      const result = await ingestRes.json();
      setUseDocuments(true);
      setProcessingState({ step: 'done', message: result.message || 'Material indexed.' });
    } catch (err) {
      setProcessingState({ step: 'error', message: err.message });
      setError(`File processing failed: ${err.message}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!examName.trim() || !examDate || !syllabus.trim()) return;
    window.dispatchEvent(new CustomEvent('kalpad-onboarding-advance'));

    const fullSyllabus = specialInstructions.trim()
      ? `${syllabus}\n\n--- SPECIAL INSTRUCTIONS ---\n${specialInstructions}`
      : syllabus;

    setDirection(1);
    setCurrentStep(3);
    setError('');
    setSaveSuccess(false);
    setGeneratedTopics([]);
    setStrategy(null);
    setGenerationContext(null);
    setIsGenerating(true);

    try {
      await startPlanGeneration({
        examName: examName.trim(),
        syllabus: fullSyllabus,
        examDate,
        studyHoursPerDay,
        planMode,
        isGuest: !session,
        session,
        onPlanSaved: (savedId) => {
          if (savedId && savedId !== 'guest') {
            setSaveSuccess(true);
          }
        },
      });
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
        setError('Connect your ChatGPT account in the opened panel to build your study plan with BYOK.');
      } else {
        setError(err?.message || 'Something went wrong while building your plan.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (generatedTopics.length === 0) return;
    if (!session) {
      setError('Sign in to save your study plan.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const response = await fetch('/api/save-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_name: examName.trim(),
          exam_date: examDate,
          plan_topics: generatedTopics.filter(Boolean),
          generation_context: generationContext,
          page_image_urls: pageImageUrls,
          syllabus,
        }),
      });
      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || 'Could not save plan.');
      }
      setSaveSuccess(true);
      setIsLoading(true);
      router.push('/plans');
    } catch (err) {
      setError(err?.message || 'Failed to save your study plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const ready = !isGenerating && generatedTopics.length > 0;
  const headerTitles = [
    'What are you preparing for?',
    'Choose a pace that can last.',
    'Bring your syllabus into focus.',
    ready
      ? 'Your roadmap is ready.'
      : isGenerating
        ? 'Let’s shape your roadmap.'
        : 'Preparing your roadmap.',
  ];
  const headerSupport = [
    'Start with the exam or subject on your mind.',
    'We’ll shape the plan around your time and style.',
    'Add topics in any format. One topic per line works well.',
    ready
      ? 'Review the path before saving it.'
      : 'Turning your syllabus into a steady path.',
  ];

  const paceBg = getPaceSurfaceColor(studyHoursPerDay, isDark);
  const sliderPct = ((studyHoursPerDay - 1) / 11) * 100;

  return (
    <KalPadShell session={session} maxWidth="1180px">
      <div className={classes.pageWrap}>
        {/* Journey Header */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-mono)',
              fontSize: currentStep === 0 ? '27px' : '24px',
              lineHeight: currentStep === 0 ? '34px' : '31px',
              letterSpacing: '-0.6px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
            }}
          >
            {headerTitles[Math.min(currentStep, 3)]}
          </h1>

          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '14px',
              lineHeight: '21px',
              color: 'var(--kp-secondary)',
            }}
          >
            {headerSupport[Math.min(currentStep, 3)]}
          </p>

          {currentStep < 3 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {['Goal', 'Pace', 'Syllabus'].map((label, idx) => (
                  <span
                    key={label}
                    style={{
                      fontFamily: idx === currentStep ? 'var(--font-kp-mono)' : 'var(--font-kp-sans)',
                      fontSize: '11px',
                      fontWeight: idx === currentStep ? 700 : 500,
                      color: idx <= currentStep ? 'var(--kp-ink)' : 'var(--kp-secondary)',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <KalPadProgress progress={(currentStep + 1) / 3} height={5} />
            </div>
          ) : (
            ready && (
              <div
                style={{
                  borderRadius: '20px',
                  backgroundColor: 'var(--kp-mint)',
                  border: '1px solid var(--kp-border)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <IconCheck size={16} stroke={2} color="var(--kp-ink)" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-ink)' }}>
                  Built from your details
                </span>
              </div>
            )
          )}
        </header>

        <div className={currentStep < 3 ? classes.wizardBody : classes.wizardMainCol}>
          <div className={classes.wizardMainCol}>
            {/* Animated Journey Step */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 16 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
            {/* STEP 0: GOAL & EXAM DATE */}
            {currentStep === 0 && (
              <section
                className={classes.journeyCard}
                style={{ backgroundColor: 'var(--kp-surface)' }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '17px',
                      fontWeight: 700,
                      color: 'var(--kp-ink)',
                    }}
                  >
                    Give this plan a name
                  </h2>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      lineHeight: '18px',
                      color: 'var(--kp-secondary)',
                    }}
                  >
                    This is what you’ll see on your study desk.
                  </p>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
                    Exam or subject
                  </span>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="e.g. NEET 2027 or Cell biology"
                    className={classes.textField}
                  />
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--kp-ink)' }}>
                    When is the exam?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    aria-label="Choose exam date"
                    className="kp-tactile"
                    style={{
                      width: '100%',
                      minHeight: '56px',
                      borderRadius: '20px',
                      backgroundColor: 'var(--kp-butter)',
                      border: '1px solid var(--kp-border)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '11px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <IconCalendar size={19} stroke={1.8} color="var(--kp-primary)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                        {parsedExamDate
                          ? format(parsedExamDate, 'EEE, d MMM yyyy')
                          : 'Choose a date'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                        {daysLeft === null
                          ? 'Choose your target date'
                          : daysLeft < 0
                            ? 'This date has passed'
                            : daysLeft === 0
                              ? 'Your exam is today'
                              : `${daysLeft} days to prepare`}
                      </div>
                    </div>
                    <IconArrowRight size={17} stroke={1.8} color="var(--kp-secondary)" />
                  </button>
                </div>
              </section>
            )}

            {/* STEP 1: PACE & MODE */}
            {currentStep === 1 && (
              <section className={classes.journeyCard} style={{ backgroundColor: paceBg }}>
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '17px',
                      fontWeight: 700,
                      color: 'var(--kp-ink)',
                    }}
                  >
                    How much time feels realistic?
                  </h2>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      lineHeight: '18px',
                      color: 'var(--kp-secondary)',
                    }}
                  >
                    A steady plan is more useful than a perfect one.
                  </p>
                </div>

                <div className={classes.presetsGrid} role="radiogroup" aria-label="Daily hours presets">
                  {HOUR_PRESETS.map((preset) => {
                    const selected =
                      preset.value === 8 ? studyHoursPerDay >= 8 : studyHoursPerDay === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setStudyHoursPerDay(preset.value)}
                        className="kp-tactile"
                        style={{
                          minHeight: '68px',
                          borderRadius: '20px',
                          backgroundColor: selected ? 'var(--kp-primary)' : 'var(--kp-surface)',
                          border: selected
                            ? '2px solid var(--kp-orange)'
                            : '1px solid var(--kp-border)',
                          padding: '10px 6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '15px',
                            fontWeight: 700,
                            color: selected ? 'var(--kp-on-primary)' : 'var(--kp-ink)',
                          }}
                        >
                          {preset.value}
                          {preset.value === 8 ? '+' : ''}h
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 500,
                            color: selected ? 'var(--kp-on-primary)' : 'var(--kp-secondary)',
                            opacity: selected ? 0.85 : 1,
                          }}
                        >
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Slider Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--kp-ink)' }}>
                      Fine tune your daily time
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                      Move in one-hour steps
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-kp-mono)',
                        fontSize: '23px',
                        fontWeight: 700,
                        lineHeight: 1.08,
                        color: 'var(--kp-ink)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {studyHoursPerDay}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--kp-secondary)',
                      }}
                    >
                      h / day
                    </span>
                  </div>
                </div>

                {/* Tactile Range Slider */}
                <div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={studyHoursPerDay}
                    aria-label="Daily study hours"
                    onChange={(e) => setStudyHoursPerDay(Number(e.target.value))}
                    className={classes.kpSlider}
                    style={{
                      background: `linear-gradient(to right, var(--kp-orange) 0%, var(--kp-orange) ${sliderPct}%, var(--kp-raised) ${sliderPct}%, var(--kp-raised) 100%)`,
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '6px',
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '10px',
                      color: 'var(--kp-secondary)',
                    }}
                  >
                    <span>1 hour</span>
                    <span>12 hours</span>
                  </div>
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: 'var(--kp-secondary)',
                    }}
                  >
                    About {studyHoursPerDay * 7} hours across a full week
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--kp-border)' }} />

                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--kp-ink)' }}>
                  What kind of support would help?
                </div>

                <div className={classes.modesGrid} role="radiogroup" aria-label="Study mode">
                  {PLAN_MODES.map((mode) => {
                    const ModeIcon = mode.icon;
                    const selected = planMode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPlanMode(mode.value)}
                        className="kp-tactile"
                        style={{
                          minHeight: '82px',
                          borderRadius: '20px',
                          backgroundColor: selected ? 'var(--kp-primary)' : 'var(--kp-surface)',
                          border: selected
                            ? '2px solid var(--kp-orange)'
                            : '1px solid var(--kp-border)',
                          padding: '11px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <ModeIcon
                          size={17}
                          stroke={1.8}
                          color={selected ? 'var(--kp-orange)' : 'var(--kp-secondary)'}
                          style={{ marginTop: '2px', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: selected ? 'var(--kp-on-primary)' : 'var(--kp-ink)',
                            }}
                          >
                            {mode.label}
                          </div>
                          <div
                            style={{
                              marginTop: '3px',
                              fontSize: '11px',
                              lineHeight: '14px',
                              color: selected ? 'var(--kp-on-primary)' : 'var(--kp-secondary)',
                              opacity: selected ? 0.85 : 1,
                            }}
                          >
                            {mode.description}
                          </div>
                        </div>
                        {selected && (
                          <IconCheck
                            size={14}
                            stroke={2.2}
                            color="var(--kp-orange)"
                            style={{ flexShrink: 0, marginTop: '2px' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* STEP 2: SYLLABUS & OPTIONAL MATERIAL */}
            {currentStep === 2 && (
              <section
                className={classes.journeyCard}
                style={{ backgroundColor: 'var(--kp-surface)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '17px',
                        fontWeight: 700,
                        color: 'var(--kp-ink)',
                      }}
                    >
                      Your syllabus
                    </h2>
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '12px',
                        lineHeight: '18px',
                        color: 'var(--kp-secondary)',
                      }}
                    >
                      Paste a list or add topics in your own words.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    style={{
                      border: '1px solid var(--kp-border)',
                      borderRadius: '12px',
                      backgroundColor: 'var(--kp-raised)',
                      color: 'var(--kp-ink)',
                      padding: '8px 12px',
                      minHeight: '38px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <IconCopy size={15} stroke={1.8} />
                    <span>Paste</span>
                  </button>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
                    Topics, chapters, or key ideas
                  </span>
                  <textarea
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    placeholder={'Cell structure\nGenetics\nEvolution and natural selection'}
                    className={classes.textArea}
                  />
                </label>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--kp-secondary)' }}>
                    One topic per line works well.
                  </span>
                  <span
                    style={{
                      borderRadius: '20px',
                      backgroundColor: topicLineCount > 0 ? 'var(--kp-mint)' : 'var(--kp-raised)',
                      border: '1px solid var(--kp-border)',
                      padding: '6px 10px',
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--kp-ink)',
                    }}
                  >
                    {topicLineCount === 1 ? '1 topic' : `${topicLineCount} topics`}
                  </span>
                </div>

                {/* Collapsible optional web study aids (PDF + special instructions) */}
                <div style={{ borderTop: '1px solid var(--kp-border)', paddingTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowMaterialPanel((v) => !v)}
                    aria-expanded={showMaterialPanel}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: 'var(--kp-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>Optional: attach reference PDF or special instructions</span>
                    <IconChevronDown
                      size={16}
                      stroke={1.8}
                      style={{
                        transform: showMaterialPanel ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 160ms var(--kp-ease-enter)',
                      }}
                    />
                  </button>

                  {showMaterialPanel && (
                    <div
                      style={{
                        marginTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span
                          style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}
                        >
                          Additional pacing or focus notes
                        </span>
                        <input
                          type="text"
                          value={specialInstructions}
                          onChange={(e) => setSpecialInstructions(e.target.value)}
                          placeholder="e.g. Keep Sundays light for mock review"
                          className={classes.textField}
                        />
                      </label>

                      <div
                        style={{
                          padding: '12px',
                          borderRadius: '16px',
                          backgroundColor: 'var(--kp-raised)',
                          border: '1px solid var(--kp-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--kp-ink)',
                            }}
                          >
                            <IconFileText size={16} stroke={1.8} />
                            {studyMaterialFile ? studyMaterialFile.name : 'Upload reference PDF'}
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="application/pdf"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setStudyMaterialFile(f);
                                setProcessingState({
                                  step: f ? 'selected' : 'idle',
                                  message: f ? `${f.name} ready to index.` : '',
                                });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              style={{
                                border: '1px solid var(--kp-border)',
                                borderRadius: '12px',
                                backgroundColor: 'var(--kp-surface)',
                                color: 'var(--kp-ink)',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Choose PDF
                            </button>
                            {studyMaterialFile && (
                              <button
                                type="button"
                                disabled={isProcessingFile}
                                onClick={handleProcessFile}
                                style={{
                                  border: 'none',
                                  borderRadius: '12px',
                                  backgroundColor: 'var(--kp-primary)',
                                  color: 'var(--kp-on-primary)',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: isProcessingFile ? 'wait' : 'pointer',
                                }}
                              >
                                <IconUpload size={14} stroke={1.8} />
                                {isProcessingFile ? 'Indexing…' : 'Index PDF'}
                              </button>
                            )}
                          </div>
                        </div>

                        {processingState.message && (
                          <div
                            style={{
                              fontSize: '11px',
                              color:
                                processingState.step === 'error'
                                  ? 'var(--kp-error-ink)'
                                  : 'var(--kp-secondary)',
                            }}
                          >
                            {processingState.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

                {currentStep >= 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {isGenerating && (
                  <div
                    style={{
                      borderRadius: '20px',
                      backgroundColor: 'var(--kp-butter)',
                      border: '1px solid var(--kp-border)',
                      padding: '17px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '999px',
                          border: '2px solid var(--kp-border-strong)',
                          borderTopColor: 'var(--kp-ink)',
                          animation: 'spin 0.8s linear infinite',
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                          Building your plan
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                          {strategy
                            ? 'Sequencing daily sessions and review checkpoints…'
                            : 'Finding a steady rhythm for your topics…'}
                        </div>
                      </div>
                    </div>
                    {generatedTopics.length > 0 && (
                      <div
                        style={{
                          fontFamily: 'var(--font-kp-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--kp-ink)',
                        }}
                      >
                        {generatedTopics.length === 1
                          ? '1 study day taking shape'
                          : `${generatedTopics.length} study days taking shape`}
                      </div>
                    )}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    style={{
                      borderRadius: '20px',
                      backgroundColor: 'var(--kp-apricot)',
                      border: '1px solid var(--kp-border)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                    }}
                  >
                    <IconAlertTriangle size={18} stroke={1.8} color="var(--kp-warning-ink)" />
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--kp-ink)' }}>
                      {error}
                    </span>
                    <button
                      type="button"
                      onClick={() => setError('')}
                      aria-label="Dismiss error"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--kp-ink)',
                      }}
                    >
                      <IconX size={16} stroke={1.8} />
                    </button>
                  </div>
                )}

                <div className={classes.resultColumns}>
                  {strategy && (
                    <section
                      className={classes.journeyCard}
                      style={{ backgroundColor: 'var(--kp-surface)' }}
                    >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: '17px',
                          fontWeight: 700,
                          color: 'var(--kp-ink)',
                        }}
                      >
                        The approach
                      </h2>
                      <span
                        style={{
                          borderRadius: '20px',
                          backgroundColor: 'var(--kp-mint)',
                          border: '1px solid var(--kp-border)',
                          padding: '6px 10px',
                          fontFamily: 'var(--font-kp-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--kp-ink)',
                        }}
                      >
                        {strategy.estimated_coverage ?? 0}% coverage
                      </span>
                    </div>

                    {strategy.overall_approach && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          lineHeight: '20px',
                          color: 'var(--kp-secondary)',
                        }}
                      >
                        {strategy.overall_approach}
                      </p>
                    )}

                    {Array.isArray(strategy.emphasized_topics) &&
                      strategy.emphasized_topics.length > 0 && (
                        <>
                          <div style={{ height: '1px', backgroundColor: 'var(--kp-border)' }} />
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                            Extra attention
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {strategy.emphasized_topics.slice(0, 4).map((item, idx) => {
                              const label = typeof item === 'string' ? item : item?.topic;
                              if (!label) return null;
                              return (
                                <div
                                  key={idx}
                                  style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                                >
                                  <IconCheck
                                    size={14}
                                    stroke={2}
                                    color="var(--kp-success-ink)"
                                    style={{ marginTop: '2px', flexShrink: 0 }}
                                  />
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      lineHeight: '17px',
                                      color: 'var(--kp-secondary)',
                                    }}
                                  >
                                    {label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                  </section>
                )}

                {generatedTopics.length > 0 && (
                  <section
                    className={classes.journeyCard}
                    style={{ backgroundColor: 'var(--kp-surface)' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: '17px',
                            fontWeight: 700,
                            color: 'var(--kp-ink)',
                          }}
                        >
                          Your study days
                        </h2>
                        <div style={{ fontSize: '11px', color: 'var(--kp-secondary)', marginTop: '3px' }}>
                          Plan pace · {studyHoursPerDay} h/day
                        </div>
                      </div>
                      <span
                        style={{
                          borderRadius: '20px',
                          backgroundColor: 'var(--kp-raised)',
                          padding: '7px 10px',
                          fontFamily: 'var(--font-kp-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--kp-ink)',
                        }}
                      >
                        {generatedTopics.length}{' '}
                        {generatedTopics.length === 1 ? 'day' : 'days'}
                      </span>
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'var(--kp-border)' }} />

                    <div>
                      {generatedTopics.map((topic, idx) => (
                        <div key={`${topic.day}-${idx}`}>
                          {idx > 0 && (
                            <div
                              style={{
                                height: '1px',
                                backgroundColor: 'var(--kp-border)',
                                opacity: 0.7,
                              }}
                            />
                          )}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '11px',
                              padding: '10px 0',
                            }}
                          >
                            <span
                              style={{
                                minWidth: '40px',
                                textAlign: 'center',
                                borderRadius: '20px',
                                backgroundColor: 'var(--kp-raised)',
                                padding: '7px 8px',
                                fontFamily: 'var(--font-kp-mono)',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--kp-ink)',
                              }}
                            >
                              {topic.day ?? idx + 1}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  lineHeight: '18px',
                                  fontWeight: 600,
                                  color: 'var(--kp-ink)',
                                }}
                              >
                                {topic.topic_name || topic.topic || topic.title || `Study focus ${idx + 1}`}
                              </div>
                              {topic.day_summary && (
                                <div
                                  style={{
                                    marginTop: '3px',
                                    fontSize: '11px',
                                    lineHeight: '16px',
                                    color: 'var(--kp-secondary)',
                                  }}
                                >
                                  {topic.day_summary}
                                </div>
                              )}
                            </div>
                            <span
                              style={{
                                fontFamily: 'var(--font-kp-mono)',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--kp-secondary)',
                              }}
                            >
                              {topic.study_hours ?? studyHoursPerDay}h
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  )}
                </div>

                {ready && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => goToStep(0)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        minHeight: '52px',
                        padding: '0 14px',
                        color: 'var(--kp-ink)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit details
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || saveSuccess}
                      onClick={handleSavePlan}
                      className="kp-tactile"
                      style={{
                        flex: 1,
                        minHeight: '54px',
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: 'var(--kp-primary)',
                        color: 'var(--kp-on-primary)',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: isSaving ? 'wait' : 'pointer',
                      }}
                    >
                      <IconCheck size={17} stroke={2} />
                      <span>
                        {saveSuccess ? 'Saved' : isSaving ? 'Saving…' : 'Save this plan'}
                      </span>
                    </button>
                  </div>
                )}

                {!isGenerating && !ready && error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => goToStep(0)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        minHeight: '52px',
                        padding: '0 14px',
                        color: 'var(--kp-ink)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit details
                    </button>
                    <button
                      type="button"
                      onClick={handleGeneratePlan}
                      className="kp-tactile"
                      style={{
                        flex: 1,
                        minHeight: '54px',
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: 'var(--kp-primary)',
                        color: 'var(--kp-on-primary)',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <span>Try again</span>
                      <IconRefresh size={17} stroke={1.8} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Journey Controls (Steps 0..2) */}
        {currentStep < 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(currentStep - 1)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    minHeight: '52px',
                    padding: '0 14px',
                    borderRadius: '20px',
                    color: 'var(--kp-ink)',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <IconChevronLeft size={17} stroke={1.8} />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                disabled={!canContinue}
                onClick={() => {
                  if (currentStep < 2) goToStep(currentStep + 1);
                  else handleGeneratePlan();
                }}
                className="kp-tactile"
                style={{
                  flex: 1,
                  minHeight: '54px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: canContinue ? 'var(--kp-primary)' : 'var(--kp-raised)',
                  color: canContinue ? 'var(--kp-on-primary)' : 'var(--kp-secondary)',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '9px',
                  cursor: canContinue ? 'pointer' : 'not-allowed',
                }}
              >
                <span>{currentStep === 2 ? 'Build my study plan' : 'Continue'}</span>
                <IconArrowRight size={17} stroke={1.8} />
              </button>
            </div>

            {!canContinue && (
              <div style={{ fontSize: '11px', color: 'var(--kp-secondary)' }}>
                {currentStep === 0
                  ? 'Add an exam name and target date to continue.'
                  : 'Add a few syllabus topics to build your plan.'}
              </div>
            )}
          </div>
        )}
          </div>

          {currentStep < 3 && (
            <aside className={classes.desktopPreviewPanel} aria-label="Study plan preview">
              <section
                style={{
                  borderRadius: '20px',
                  backgroundColor: 'var(--kp-mint)',
                  border: '1px solid var(--kp-border)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--kp-success-ink)',
                    }}
                  >
                    Live blueprint
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--kp-ink)',
                    }}
                  >
                    Step {currentStep + 1} / 3
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '18px',
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color: examName.trim() ? 'var(--kp-ink)' : 'var(--kp-secondary)',
                    }}
                  >
                    {examName.trim() || 'Untitled study plan'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--kp-secondary)', marginTop: '4px' }}>
                    {parsedExamDate
                      ? `${format(parsedExamDate, 'd MMM yyyy')}${
                          daysLeft !== null && daysLeft > 0 ? ` · ${daysLeft} days left` : ''
                        }`
                      : 'Choose an exam date to set timeline'}
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--kp-border)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {[
                    {
                      step: 0,
                      label: 'Target',
                      value: examName.trim() ? 'Configured' : 'Pending',
                      readyItem: examName.trim().length > 0 && Boolean(examDate),
                    },
                    {
                      step: 1,
                      label: 'Daily rhythm',
                      value: `${studyHoursPerDay}h/day · ${
                        PLAN_MODES.find((m) => m.value === planMode)?.label || 'Balanced'
                      }`,
                      readyItem: currentStep >= 1,
                    },
                    {
                      step: 2,
                      label: 'Syllabus',
                      value:
                        topicLineCount > 0
                          ? `${topicLineCount} ${topicLineCount === 1 ? 'topic' : 'topics'}`
                          : 'Waiting for topics',
                      readyItem: topicLineCount > 0,
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => goToStep(item.step)}
                      className="kp-tactile"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        border:
                          currentStep === item.step
                            ? '1.5px solid var(--kp-orange)'
                            : '1px solid var(--kp-border)',
                        backgroundColor: 'var(--kp-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--kp-secondary)' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--kp-ink)', marginTop: '2px' }}>
                          {item.value}
                        </div>
                      </div>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '999px',
                          backgroundColor: item.readyItem ? 'var(--kp-mint)' : 'var(--kp-raised)',
                          border: `1px solid ${
                            item.readyItem ? 'var(--kp-success-ink)' : 'var(--kp-border)'
                          }`,
                          color: item.readyItem ? 'var(--kp-success-ink)' : 'var(--kp-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {item.readyItem ? <IconCheck size={13} stroke={2.4} /> : item.step + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          )}
        </div>
      </div>

      {/* Shared Light-Surface DatePicker Dialog */}
      <WeekDatePickerDialog
        opened={showDatePicker}
        initialDate={parsedExamDate || addDays(new Date(), 30)}
        title="Choose an exam date"
        confirmLabel="Use date"
        onDismiss={() => setShowDatePicker(false)}
        onConfirm={(selected) => {
          setExamDate(format(selected, 'yyyy-MM-dd'));
          setShowDatePicker(false);
        }}
      />
    </KalPadShell>
  );
}
