"use client";

import { useState, useEffect } from 'react';
import { 
    Box, Text, Title, Badge, Group, Stack, ScrollArea, Button, 
    ThemeIcon, Loader, ActionIcon, Alert
} from '@mantine/core';
import { 
    IconAnalyze, IconAlertTriangle, IconCheck, IconBook, 
    IconBulb, IconTarget, IconExternalLink, IconUpload, IconFileText
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import supabase from '@/lib/supabaseClient';
import { Interactive } from '@/components/Interactive';

// --- VISUAL CONSTANTS ---
import { GlassCard } from '@/components/GlassCard'; // Using your premium card component
const LAB_BLUE = '#5538f8';
const SUCCESS_GREEN = '#34d399';

// --- HELPER: SECTION RENDERER (Glass Card Style) ---
function AnalysisSection({ icon: Icon, title, content, color = 'indigo', delay = 0 }) {
    if (!content) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: "easeOut" }}
        >
            <GlassCard 
                p="xl" 
                style={{ 
                    borderLeft: `4px solid ${color === 'green' ? SUCCESS_GREEN : LAB_BLUE}`,
                    // Override default glass slightly for section distinction
                    backgroundColor: 'rgba(30, 30, 35, 0.4)' 
                }}
            >
                <Group gap="sm" mb="md">
                    <ThemeIcon size="lg" radius="md" variant="light" color={color === 'green' ? 'teal' : 'indigo'}>
                        <Icon size={20} />
                    </ThemeIcon>
                    <Text 
                        size="sm" fw={700} c="dimmed" tt="uppercase" 
                        style={{ letterSpacing: '0.1em', fontFamily: 'var(--font-lexend)' }}
                    >
                        {title}
                    </Text>
                </Group>
                
                <Text 
                    c="gray.3" size="md" lh={1.8} 
                    style={{ fontFamily: 'var(--font-inter)', whiteSpace: 'pre-line' }}
                >
                    {Array.isArray(content) ? content.map(i => `• ${i}`).join('\n') : content}
                </Text>
            </GlassCard>
        </motion.div>
    );
}

// --- MAIN COMPONENT ---
export default function AnalysisTab({ paper, onAnalyze, onManualUpload }) {
    const [pdfUrl, setPdfUrl] = useState(null);

    // --- EFFECT: Resolve Internal PDF Link ---
    useEffect(() => {
        const resolveUrl = async () => {
            if (!paper) return;
            if (paper.pdf_path) {
                const { data } = await supabase.storage.from('study-materials').createSignedUrl(paper.pdf_path, 3600);
                if (data?.signedUrl) setPdfUrl(data.signedUrl);
            } else {
                setPdfUrl(paper.source_url);
            }
        };
        resolveUrl();
    }, [paper]);

    if (!paper) {
        return (
            <Box h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <Text c="dimmed" style={{ fontFamily: 'var(--font-lexend)' }}>Select a paper from the sidebar.</Text>
            </Box>
        );
    }

    const { status, analyst_output, title, authors, year, venue, citation_count, abstract } = paper;
    
    // Logic Flags
    const isAnalyzed = status === 'analyzed';
    const isProcessing = status === 'processing';
    const isUploadNeeded = status === 'upload_needed';
    const isError = status === 'error';

    // --- RENDER ACTION BUTTON ---
    const renderHeaderAction = () => {
        if (isAnalyzed) return <Badge size="lg" variant="gradient" gradient={{ from: 'teal', to: 'green' }}>INSIGHTS READY</Badge>;
        if (isProcessing) {
            return (
                <Button 
                    size="xs" variant="outline" color="yellow" radius="xl"
                    leftSection={<Loader size={12} color="yellow" />}
                    style={{ borderColor: 'rgba(250, 204, 21, 0.3)', color: '#facc15' }}
                >
                    Processing...
                </Button>
            );
        }
        if (isUploadNeeded) {
            return (
                <Button 
                    size="xs" color="orange" radius="xl"
                    leftSection={<IconUpload size={16} />}
                    onClick={() => onManualUpload(paper)}
                >
                    Manual Upload
                </Button>
            );
        }
        return (
            <Button 
                size="sm" radius="xl"
                leftSection={<IconAnalyze size={16} />}
                onClick={() => onAnalyze(paper)}
                style={{ 
                    background: `linear-gradient(135deg, ${LAB_BLUE} 0%, #7c3aed 100%)`,
                    boxShadow: `0 4px 15px ${LAB_BLUE}60`
                }}
            >
                Generate Analysis
            </Button>
        );
    };

    return (
        <Box h="100%" display="flex" style={{ flexDirection: 'column' }}>

            <ScrollArea.Autosize type="auto" style={{ height: '88vh' }} scrollbarSize={4}>
            
            {/* 1. Header (Floating Glass Style) */}
            <Box p="lg" pb="xs" style={{ flexShrink: 0 }}>
                <Group justify="space-between" align="center" mb="md">
                    <Badge variant="outline" color="gray" size="sm" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                        {isAnalyzed ? 'DEEP DIVE' : 'READING MODE'}
                    </Badge>
                    {renderHeaderAction()}
                    
                </Group>
                
                {/* Title Block - Always Visible */}
                <Title 
                    order={2} 
                    className="apple-text-gradient"
                    style={{ 
                        fontFamily: 'var(--font-lexend)', 
                        fontSize: '2rem', 
                        lineHeight: 1.2,
                        letterSpacing: '-0.03em',
                        marginBottom: '8px'
                    }}
                >
                    {title}
                </Title>
                
                <Group gap="xs" style={{ opacity: 0.7 }}>
                    {authors?.slice(0, 3).map((a, i) => (
                        <Badge key={i} size="sm" variant="outline" color="gray" style={{ fontWeight: 500 }}>{a}</Badge>
                    ))}
                    <Text size="xs" c="dimmed">•</Text>
                    <Text size="xs" c="dimmed" ff="monospace">{year}</Text>
                    <Text size="xs" c="dimmed">•</Text>
                    <Text size="xs" c="dimmed">{venue || 'Unknown Venue'}</Text>
                    {pdfUrl && (
                            <ActionIcon 
                                component="a" href={pdfUrl} target="_blank" 
                                size="lg" variant="light" color="cyan" radius="md"
                                title="Open Full PDF"
                            >
                                <IconFileText size={20} />
                            </ActionIcon>
                        )}
                </Group>
            </Box>

            {/* 2. Scrollable Content Area */}
            <Box style={{ flex: 1, minHeight: 0 }}>
                
                    <Stack gap="xl" p="lg" pb={100} maw={900} w="100%" 
                        align="stretch" // Forces children to fill width
                        style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        
                        {/* B. DYNAMIC CONTENT */}
                        {isAnalyzed ? (
                            // --- SHOW ANALYSIS (Animated Cards) ---
                            <>
                                <AnalysisSection icon={IconBulb} title="Core Hypothesis" content={analyst_output?.core_hypothesis} delay={0.1} />
                                <AnalysisSection icon={IconCheck} title="Key Findings" content={analyst_output?.key_findings} delay={0.2} />
                                <AnalysisSection icon={IconTarget} title="Research Gaps & Opportunities" content={analyst_output?.research_gaps} color="green" delay={0.3} />
                                <AnalysisSection icon={IconBook} title="Methodology" content={analyst_output?.methodology} delay={0.4} />
                                <AnalysisSection icon={IconAlertTriangle} title="Limitations" content={analyst_output?.limitations} delay={0.5} />
                            </>
                        ) : (
                            // --- SHOW READING MODE (Abstract & PDF) ---
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                                {/* Error Message */}
                                {isError && (
                                    <Alert 
                                        color="red" variant="light" title="Analysis Error" icon={<IconAlertTriangle size={16}/>} mb="lg"
                                        style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)' }}
                                    >
                                        {analyst_output?.error || "Processing failed. Please try manual upload."}
                                    </Alert>
                                )}

                                {/* Abstract Card */}
                                <GlassCard p="xl" mb="xl">
                                    <Text size="xs" fw={700} c="dimmed" mb="md" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Abstract</Text>
                                    <Text size="md" c="gray.3" lh={1.8} style={{ fontFamily: 'var(--font-inter)' }}>
                                        {abstract || "No abstract available for this paper."}
                                    </Text>
                                </GlassCard>

                                {/* PDF Button */}
                                {pdfUrl && (
                                    <Group justify="center">
                                        <Interactive>
                                            <Button 
                                                component="a" href={pdfUrl} target="_blank"
                                                size="lg" radius="xl"
                                                variant="outline" color="gray"
                                                leftSection={<IconFileText size={22} />}
                                                style={{ 
                                                    borderColor: 'rgba(255,255,255,0.2)', 
                                                    color: 'white',
                                                    height: '56px',
                                                    paddingLeft: '32px', paddingRight: '32px'
                                                }}
                                            >
                                                Read Full PDF
                                            </Button>
                                        </Interactive>
                                    </Group>
                                )}
                            </motion.div>
                        )}

                    </Stack>
               
            </Box>
             </ScrollArea.Autosize>
        </Box>
    );
}