"use client";

import { useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { 
    Box, TextInput, Group, Select, Checkbox, ScrollArea, Stack, 
    Button, Text, Loader, Badge, ActionIcon, LoadingOverlay
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
    IconSearch, IconFilter, IconSortAscending, IconAnalyze, 
    IconPlus, IconCheck, IconExternalLink, IconQuote, IconCloudUpload 
} from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- VISUAL CONSTANTS ---
const LAB_BLUE = '#5538f8';

// --- INTERNAL COMPONENT: SEARCH CARD ---
function SearchResultCard({ paper, onAdd, isAdded, isSelected, onToggleSelect }) {
    const [expanded, setExpanded] = useState(false);
    const hasAbstract = !!paper.abstract;
    const doi = paper.externalIds?.DOI;

    return (
        <Box 
            p="md" 
            style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backgroundColor: isSelected ? 'rgba(85, 56, 248, 0.05)' : 'transparent',
                transition: 'background-color 0.2s'
            }}
        >
            <Group justify="space-between" align="start" wrap="nowrap">
                {/* Selection */}
                <Box pt={4}>
                    <Checkbox 
                        checked={isSelected} 
                        onChange={() => onToggleSelect(paper)}
                        disabled={isAdded}
                        color="indigo"
                        size="sm"
                    />
                </Box>

                {/* Content */}
                <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" align="start">
                        <Text size="sm" fw={700} c="white" lh={1.3}>{paper.title}</Text>
                        {/* Link */}
                        {(paper.openAccessPdf?.url || paper.url) && (
                            <ActionIcon component="a" href={paper.openAccessPdf?.url || paper.url} target="_blank" variant="subtle" color="cyan" size="sm">
                                <IconExternalLink size={14} />
                            </ActionIcon>
                        )}
                    </Group>

                    <Group gap={8}>
                        <Badge size="xs" variant="outline" color="gray">{paper.year || 'N/A'}</Badge>
                        <Group gap={4}>
                            <IconQuote size={10} color="gray" />
                            <Text size="xs" c="dimmed">{paper.citationCount || 0}</Text>
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={1}>{paper.venue || 'Unknown Venue'}</Text>
                        {doi && <Badge size="xs" variant="filled" color="dark" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>{doi}</Badge>}
                    </Group>

                    <Box>
                        <Text size="xs" c="dimmed" lineClamp={expanded ? 0 : 2} style={{ lineHeight: 1.5 }}>
                            {hasAbstract ? paper.abstract : "No abstract available."}
                        </Text>
                        {hasAbstract && (
                            <Text size="xs" c="indigo" span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setExpanded(!expanded)}>
                                {expanded ? "Show Less" : "Read More"}
                            </Text>
                        )}
                    </Box>
                </Stack>

                {/* Add Button */}
                <Button 
                    size="xs" 
                    variant={isAdded ? "outline" : "light"} 
                    color={isAdded ? "green" : "indigo"}
                    onClick={() => onAdd(paper)}
                    disabled={isAdded}
                    leftSection={isAdded ? <IconCheck size={14} /> : <IconPlus size={14} />}
                    style={{ minWidth: '80px' }}
                >
                    {isAdded ? "Added" : "Add"}
                </Button>
            </Group>
        </Box>
    );
}

// --- MAIN TAB COMPONENT ---
export default function LibrarianTab({ projectId, existingPapers = [], onPaperAdded }) {
    // Search State
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Filter State
    const [limit, setLimit] = useState('10');
    const [sort, setSort] = useState('relevance');

    // Selection State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedObjects, setSelectedObjects] = useState([]);
    const [isAdding, setIsAdding] = useState(false);

    // --- LOGIC: SEARCH ---
    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!query.trim()) return;
        
        setIsSearching(true);
        setSelectedIds(new Set()); // Reset selection
        setSelectedObjects([]);

        try {
            const res = await fetch('/api/research/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit: parseInt(limit), sort })
            });
            const data = await res.json();
            setResults(data.data || []);
        } catch (err) {
            notifications.show({ title: 'Error', message: 'Librarian search failed.', color: 'red' });
        } finally {
            setIsSearching(false);
        }
    };

    // --- LOGIC: SELECTION ---
    const toggleSelection = (paper) => {
        const newIds = new Set(selectedIds);
        const newObjs = [...selectedObjects];

        if (newIds.has(paper.paperId)) {
            newIds.delete(paper.paperId);
            const idx = newObjs.findIndex(p => p.paperId === paper.paperId);
            if (idx > -1) newObjs.splice(idx, 1);
        } else {
            newIds.add(paper.paperId);
            newObjs.push(paper);
        }
        setSelectedIds(newIds);
        setSelectedObjects(newObjs);
    };

    const toggleSelectAll = (checked) => {
        if (checked) {
            // Select only those NOT already in project
            const available = results.filter(p => !existingPapers.some(ep => ep.s2_paper_id === p.paperId));
            const newIds = new Set(available.map(p => p.paperId));
            setSelectedIds(newIds);
            setSelectedObjects(available);
        } else {
            setSelectedIds(new Set());
            setSelectedObjects([]);
        }
    };

    // --- LOGIC: ADDING PAPERS (DB) ---
    const addPapersToDB = async (papersToAdd) => {
        setIsAdding(true);
        let successCount = 0;

        for (const paper of papersToAdd) {
            try {
                const { error } = await supabase.from('research_papers').insert({
                    project_id: projectId,
                    title: paper.title,
                    s2_paper_id: paper.paperId,
                    authors: paper.authors?.map(a => a.name) || [],
                    year: paper.year,
                    venue: paper.venue,
                    citation_count: paper.citationCount,
                    abstract: paper.abstract,
                    source_url: paper.openAccessPdf?.url || paper.url || null,
                    doi: paper.externalIds?.DOI || null,
                    status: 'pending'
                });

                if (!error) {
                    successCount++;
                    // Notify parent to trigger the Analyst Agent if needed
                    // For now, we rely on the parent seeing the new paper via Realtime or callback
                    if (onPaperAdded) onPaperAdded(paper);
                }
            } catch (e) { console.error(e); }
        }

        notifications.show({ title: 'Library Updated', message: `Added ${successCount} papers.`, color: 'green' });
        setIsAdding(false);
        
        // Clear selection
        setSelectedIds(new Set());
        setSelectedObjects([]);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <LoadingOverlay visible={isAdding} overlayProps={{ blur: 2 }} loaderProps={{ color: LAB_BLUE }} />

            {/* 1. CONTROL BAR */}
            <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(2, 6, 23, 0.4)' }}>
                <form onSubmit={handleSearch}>
                    <TextInput 
                        placeholder="Search the global graph (e.g. 'Transformers', 'CRISPR')"
                        size="md"
                        leftSection={<IconSearch size={16} />}
                        rightSection={isSearching && <Loader size="xs" color="indigo" />}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        styles={{ input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                    />
                </form>
                
                <Group mt="sm" justify="space-between">
                    <Group gap="xs">
                        <Select 
                            value={sort} onChange={setSort}
                            data={[ { value: 'relevance', label: 'Relevance' }, { value: 'citationCount:desc', label: 'Most Cited' }, { value: 'publicationDate:desc', label: 'Newest' } ]}
                            size="xs" leftSection={<IconSortAscending size={14} />}
                            styles={{ input: { backgroundColor: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.1)', width: 130 } }}
                        />
                        <Select 
                            value={limit} onChange={setLimit}
                            data={['10', '20', '50']}
                            size="xs" leftSection={<IconFilter size={14} />}
                            styles={{ input: { backgroundColor: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.1)', width: 80 } }}
                        />
                    </Group>
                    
                    {results.length > 0 && (
                        <Checkbox 
                            label="Select All" size="xs" color="indigo"
                            styles={{ label: { color: 'white' } }}
                            checked={selectedIds.size > 0 && selectedIds.size === results.filter(p => !existingPapers.some(ep => ep.s2_paper_id === p.paperId)).length}
                            onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
                        />
                    )}
                </Group>
            </Box>

            {/* 2. RESULTS LIST */}
            <Box style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <ScrollArea style={{ height: '72vh' }} scrollbarSize={4}>
                    {results.length === 0 && !isSearching ? (
                        <Stack align="center" justify="center" h={400} style={{ opacity: 0.5 }}>
                            <IconAnalyze size={48} />
                            <Text c="dimmed">The Librarian is ready.</Text>
                        </Stack>
                    ) : (
                        <Stack gap={0}>
                            {results.map((paper) => (
                                <SearchResultCard 
                                    key={paper.paperId}
                                    paper={paper}
                                    isAdded={existingPapers.some(ep => ep.s2_paper_id === paper.paperId)}
                                    isSelected={selectedIds.has(paper.paperId)}
                                    onToggleSelect={toggleSelection}
                                    onAdd={() => addPapersToDB([paper])}
                                />
                            ))}
                        </Stack>
                    )}
                </ScrollArea>
            </Box>

            {/* 3. BULK ACTION FOOTER */}
            {selectedIds.size > 0 && (
                <Box p="sm" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(85, 56, 248, 0.1)' }}>
                    <Group justify="space-between">
                        <Text size="xs" fw={700} c="indigo.2">{selectedIds.size} PAPERS SELECTED</Text>
                        <Button 
                            size="xs" color="indigo" leftSection={<IconCloudUpload size={14} />}
                            onClick={() => addPapersToDB(selectedObjects)}
                        >
                            Add to Workbench
                        </Button>
                    </Group>
                </Box>
            )}
        </div>
    );
}