"use client";

import { useState, use, useEffect } from 'react'; // React 19 'use'
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconX, IconAnalyze, IconCheck } from '@tabler/icons-react';
import { FileInput, Modal, Stack, Text, Button, Group } from '@mantine/core';

// --- LIVE SYNC HOOK ---
import { useResearchSync } from '@/hooks/useResearchSync';

// --- IDE COMPONENTS ---
import ResearchLayout from '@/components/research/ide/ResearchLayout';
import Sidebar from '@/components/research/ide/Sidebar';
import Workspace from '@/components/research/ide/Workspace';

// --- TAB VIEWS ---
import LibrarianTab from '@/components/research/tabs/LibrarianTab';
import AnalysisTab from '@/components/research/tabs/AnalysisTab';
import ConsultantTab from '@/components/research/tabs/ConsultantTab';

export default function ResearchIDEPage({ params }) {
    const { id: projectId } = use(params);
    const router = useRouter();

    // --- 1. THE LIVE DATA STREAM (Replaces manual fetch logic) ---
    // This hook handles Realtime + Polling + Initial Load
    const { project, papers, loading, refreshData } = useResearchSync(projectId);

    // --- 2. TAB ENGINE STATE ---
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);

    // --- 3. ACTION STATE ---
    const [uploadModalOpened, setUploadModalOpened] = useState(false);
    const [paperToUpload, setPaperToUpload] = useState(null);
    const [manualFile, setManualFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // --- TAB HELPERS ---
    const addTab = (newTab) => {
        setTabs((prev) => {
            const exists = prev.find(t => t.id === newTab.id);
            if (exists) return prev;
            return [...prev, newTab];
        });
        setActiveTabId(newTab.id);
    };

    const removeTab = (tabId) => {
        setTabs((prev) => {
            const newTabs = prev.filter(t => t.id !== tabId);
            if (activeTabId === tabId) {
                setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
            } else if (newTabs.length === 0) {
                setActiveTabId(null);
            }
            return newTabs;
        });
    };

    const openLibrarian = () => {
        addTab({
            id: 'librarian-search',
            type: 'LIBRARIAN',
            title: 'Librarian Search'
        });
    };

    const openConsultant = () => {
        addTab({
            id: 'consultant',
            type: 'CONSULTANT',
            title: 'Research Consultant'
        });
    };

    const handleCitationClick = (paperId) => {
        const paper = papers.find(p => p.id === paperId);
        if (paper) {
            openPaperAnalysis(paper);
        } else {
            notifications.show({ title: 'Not Found', message: "The cited paper is not in this project.", color: 'orange' });
        }
    };

    const openPaperAnalysis = (paper) => {
        addTab({
            id: `analysis-${paper.id}`,
            type: 'ANALYSIS',
            title: paper.title,
            // CRITICAL: We store just the ID, so we can look up the "Live" object later
            paperId: paper.id 
        });
    };

    // --- ACTION HANDLERS ---
    const handleAnalyzePaper = async (paper) => {
        try {
            const res = await fetch('/api/research/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paper_id: paper.id, project_id: projectId })
            });
            if (!res.ok) throw new Error("Failed to queue analysis");
            
            notifications.show({ 
                title: 'Analyst Deployed', 
                message: 'Reading paper... status will update automatically.', 
                color: 'blue', 
                icon: <IconAnalyze size={16}/> 
            });
            
            // Force a refresh to show "Processing" state immediately
            refreshData(); 

        } catch (err) {
            notifications.show({ title: 'Error', message: err.message, color: 'red' });
        }
    };

    const openManualUpload = (paper) => {
        setPaperToUpload(paper);
        setManualFile(null);
        setUploadModalOpened(true);
    };

    const handleManualUpload = async () => {
        if (!manualFile || !paperToUpload) return;
        setIsUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const fileName = `${paperToUpload.id}_manual_${Date.now()}.pdf`;
            const filePath = `${session.user.id}/manual_uploads/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('study-materials')
                .upload(filePath, manualFile);
            if (uploadError) throw uploadError;

            await supabase.from('research_papers')
                .update({ pdf_path: filePath, status: 'pending', analyst_output: null })
                .eq('id', paperToUpload.id);
            
            // Re-trigger analysis after upload
            await handleAnalyzePaper(paperToUpload);
            
            setUploadModalOpened(false);
        } catch (error) {
            notifications.show({ title: 'Upload Failed', message: error.message, color: 'red' });
        } finally {
            setIsUploading(false);
        }
    };

    // --- RENDER DECISION ENGINE ---
    const renderTabContent = (tab) => {
        switch (tab.type) {
            case 'LIBRARIAN':
                return (
                    <LibrarianTab 
                        projectId={projectId} 
                        existingPapers={papers} 
                        // When a paper is added, we refresh the data hook
                        onPaperAdded={(newPaper) => refreshData()} 
                    />
                );
            case 'ANALYSIS':
                // CRITICAL: Look up the paper from the LIVE 'papers' array from the hook.
                // This ensures that when the hook updates via polling/realtime, 
                // this variable changes, and AnalysisTab re-renders.
                const livePaper = papers.find(p => p.id === tab.paperId);
                
                return livePaper ? (
                    <AnalysisTab 
                        paper={livePaper} 
                        onAnalyze={handleAnalyzePaper} 
                        onManualUpload={openManualUpload}
                    />
                ) : (
                    <Stack align="center" justify="center" h="100%" style={{ opacity: 0.5 }}>
                        <Text c="dimmed">Paper not found or deleted.</Text>
                    </Stack>
                );
            case 'CONSULTANT':
                return <ConsultantTab projectId={projectId} onCiteClick={handleCitationClick} />;
            default:
                return null;
        }
    };

    // --- BULK HANDLERS ---
    const handleBulkDelete = async (paperIds) => {
        try {
            // Optimistic update via hook would be better, but direct delete works too
            const { error } = await supabase.from('research_papers').delete().in('id', paperIds);
            if (error) throw error;
            notifications.show({ title: 'Deleted', message: `${paperIds.length} papers removed.`, color: 'red' });
            // Close any open tabs for these papers
            setTabs(prev => prev.filter(t => !paperIds.includes(t.paperId)));
        } catch (e) {
            notifications.show({ title: 'Error', message: e.message, color: 'red' });
        }
    };

    const handleBulkAnalyze = async (paperIds) => {
        // Loop through and trigger analyze for each
        paperIds.forEach(id => {
            const paper = papers.find(p => p.id === id);
            if (paper && paper.status !== 'analyzed') {
                handleAnalyzePaper(paper);
            }
        });
    };
    const handleAddTabFromMenu = (type) => {
        if (type === 'LIBRARIAN') openLibrarian();
        if (type === 'CONSULTANT') openConsultant();
    };

    return (
        <ResearchLayout
        title={project?.title}
            sidebar={
                <Sidebar 
                    projectTitle={project?.title}
                    papers={papers} // Sidebar always gets the live list
                    activeTabId={activeTabId}
                    onSelectPaper={openPaperAnalysis}
                    onAddPaper={openLibrarian}
                    onDeletePapers={handleBulkDelete}
                    onAnalyzePapers={handleBulkAnalyze}

                />
            }
        >
            <Workspace 
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={setActiveTabId}
                onTabClose={removeTab}
                onOpenLibrarian={openLibrarian}
                onAddTab={handleAddTabFromMenu} 
            >
                {/* 
                    We render ALL tabs but hide inactive ones. 
                    This preserves scroll position and state (like search results) 
                    when switching between tabs.
                */}
                {tabs.map(tab => (
                    <div 
                        key={tab.id} 
                        style={{ 
                            display: tab.id === activeTabId ? 'block' : 'none', 
                            height: '100%',     // Fill the workspace
                            overflow: 'hidden'  // Prevent leaks
                        }}
                    >
                        {renderTabContent(tab)}
                    </div>
                ))}
            </Workspace>

            {/* --- MANUAL UPLOAD MODAL --- */}
            <Modal
                opened={uploadModalOpened} 
                onClose={() => setUploadModalOpened(false)}
                title="Manual PDF Upload"
                centered
                styles={{ 
                    content: { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' },
                    header: { backgroundColor: 'transparent' },
                    title: { color: 'white', fontFamily: 'var(--font-lexend)' }
                }}
            >
                <Stack>
                    <Text size="sm" c="dimmed">
                        The publisher blocked our automated access. Please download the PDF yourself and upload it here to continue analysis.
                    </Text>
                    
                    <FileInput 
                        placeholder="Select PDF file"
                        accept="application/pdf"
                        value={manualFile}
                        onChange={setManualFile}
                        styles={{ input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', borderColor: 'rgba(255,255,255,0.1)' } }}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setUploadModalOpened(false)}>Cancel</Button>
                        <Button 
                            color="orange" 
                            loading={isUploading} 
                            disabled={!manualFile}
                            onClick={handleManualUpload}
                        >
                            Upload & Analyze
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </ResearchLayout>
    );
}