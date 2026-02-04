"use client";

import { useState } from 'react';
import { Box, Stack, Text, Group, ActionIcon, ScrollArea, Badge, Loader, ThemeIcon, Tooltip, Checkbox, Button } from '@mantine/core';
import { IconPlus, IconFileText, IconSearch, IconTrash, IconAnalyze, IconEdit, IconX } from '@tabler/icons-react';

// --- VISUAL CONSTANTS ---
const LAB_BLUE = '#5538f8';
const ITEM_HEIGHT = 64;

// --- SUB-COMPONENT: PAPER ROW ITEM ---
function PaperRow({ paper, isActive, onClick, isSelectMode, isSelected, onToggleSelect }) {
    const isAnalyzed = paper.status === 'analyzed';
    const isError = paper.status === 'error' || paper.status === 'upload_needed';
    const isProcessing = paper.status === 'processing';

    return (
        <Box
            onClick={() => isSelectMode ? onToggleSelect(paper.id) : onClick(paper)}
            style={{
                height: ITEM_HEIGHT,
                width: '100%',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                borderLeft: (!isSelectMode && isActive) ? `3px solid ${LAB_BLUE}` : '3px solid transparent',
                backgroundColor: (!isSelectMode && isActive) || isSelected ? 'rgba(85, 56, 248, 0.1)' : 'transparent',
                transition: 'all 0.1s ease',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0 
            }}
            className="group"
            onMouseEnter={(e) => {
                if (!isActive && !isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={(e) => {
                if (!isActive && !isSelected) e.currentTarget.style.backgroundColor = 'transparent';
            }}
        >
            <Group gap="sm" wrap="nowrap" style={{ width: '100%' }}>
                
                {/* 1. Leading Icon / Checkbox */}
                <div style={{ position: 'relative', flexShrink: 0, width: 24, display: 'flex', justifyContent: 'center' }}>
                    {isSelectMode ? (
                        <Checkbox 
                            checked={isSelected} 
                            readOnly 
                            size="xs" 
                            color="indigo" 
                            style={{ cursor: 'pointer' }}
                        />
                    ) : (
                        <>
                            <ThemeIcon variant="transparent" size="sm" color={isError ? 'red' : isActive ? 'indigo' : 'gray'}>
                                <IconFileText size={18} />
                            </ThemeIcon>
                            {isProcessing && <div style={{ position: 'absolute', bottom: -2, right: -2 }}><Loader size={8} color="yellow" /></div>}
                            {isAnalyzed && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34d399' }} />}
                        </>
                    )}
                </div>

                {/* 2. Text Content */}
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" c={isActive || isSelected ? 'white' : 'gray.3'} fw={isActive || isSelected ? 600 : 500} truncate>
                        {paper.title}
                    </Text>
                    <Group gap={6} wrap="nowrap">
                        {paper.year && <Text size="10px" c="dimmed" ff="monospace" style={{ flexShrink: 0 }}>{paper.year}</Text>}
                        {paper.citation_count > 0 && (
                            <>
                                <Text size="10px" c="dimmed" style={{ flexShrink: 0 }}>•</Text>
                                <Text size="10px" c="dimmed" truncate>{paper.citation_count} Cites</Text>
                            </>
                        )}
                    </Group>
                </Stack>
            </Group>
        </Box>
    );
}

// --- MAIN SIDEBAR COMPONENT ---
export default function Sidebar({ papers, activeTabId, onSelectPaper, onAddPaper, onDeletePapers, onAnalyzePapers }) {
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // --- HANDLERS ---
    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedIds(new Set());
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkDelete = () => {
        if (onDeletePapers) onDeletePapers(Array.from(selectedIds));
        toggleSelectMode();
    };

    const handleBulkAnalyze = () => {
        if (onAnalyzePapers) onAnalyzePapers(Array.from(selectedIds));
        toggleSelectMode();
    };

    return (
         <Stack gap={0} h="100%" style={{ flex: 1, minHeight: 0 }}>
            
            {/* 1. Toolbar (Fixed) */}
            <Group 
                px="sm" py={12} justify="space-between" 
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, height: 48 }}
            >
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                    {isSelectMode ? `${selectedIds.size} SELECTED` : `SOURCES (${papers.length})`}
                </Text>
                
                <Group gap={4}>
                    {isSelectMode ? (
                        <Tooltip label="Cancel Selection">
                            <ActionIcon variant="subtle" color="gray" size="sm" onClick={toggleSelectMode}>
                                <IconX size={16} />
                            </ActionIcon>
                        </Tooltip>
                    ) : (
                        <>
                            <Tooltip label="Manage Sources">
                                <ActionIcon variant="subtle" color="gray" size="sm" onClick={toggleSelectMode}>
                                    <IconEdit size={16} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Add Paper">
                                <ActionIcon variant="subtle" color="cyan" size="sm" onClick={onAddPaper}>
                                    <IconPlus size={16} />
                                </ActionIcon>
                            </Tooltip>
                        </>
                    )}
                </Group>
            </Group>

            {/* 2. Scrollable List (Dynamic) */}
            <Box style={{ flex: 1, minHeight: 0 }}>
                <ScrollArea h="80vh" scrollbarSize={4} type="auto">
                    <Stack gap={0} py={4}>
                        {papers.length === 0 ? (
                            <Box p="lg" ta="center" style={{ opacity: 0.5 }}>
                                <IconSearch size={24} style={{ marginBottom: 8 }} />
                                <Text size="xs" c="dimmed">No sources indexed.</Text>
                                <Text size="xs" c="cyan" style={{ cursor: 'pointer' }} onClick={onAddPaper}>
                                    Add your first paper.
                                </Text>
                            </Box>
                        ) : (
                            papers.map((paper) => (
                                <PaperRow 
                                    key={paper.id} 
                                    paper={paper} 
                                    isActive={activeTabId === `analysis-${paper.id}`}
                                    onClick={onSelectPaper}
                                    isSelectMode={isSelectMode}
                                    isSelected={selectedIds.has(paper.id)}
                                    onToggleSelect={toggleSelection}
                                />
                            ))
                        )}
                    </Stack>
                </ScrollArea>
            </Box>

            {/* 3. Bulk Actions Footer (Conditional) */}
            {isSelectMode && selectedIds.size > 0 && (
                <Box p="xs" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, backgroundColor: 'rgba(255, 59, 48, 0.1)' }}>
                    <Group justify="space-between">
                        <Button 
                            color="red" size="xs" variant="subtle" 
                            leftSection={<IconTrash size={14} />}
                            onClick={handleBulkDelete}
                        >
                            Delete
                        </Button>
                        <Button 
                            color="indigo" size="xs" variant="filled"
                            leftSection={<IconAnalyze size={14} />}
                            onClick={handleBulkAnalyze}
                            style={{ backgroundColor: LAB_BLUE }}
                        >
                            Analyze
                        </Button>
                    </Group>
                </Box>
            )}

            {/* 4. Default Footer (Fixed) */}
            {!isSelectMode && (
                <Box p="xs" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <Group justify="center" gap="xs" style={{ opacity: 0.3 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'green' }} />
                        <Text size="10px" ff="monospace">SYSTEM ONLINE</Text>
                    </Group>
                </Box>
            )}
        </Stack>
    );
}