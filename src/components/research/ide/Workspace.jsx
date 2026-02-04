"use client";

import { Box, Stack, Text, Title, Group, ThemeIcon, SimpleGrid } from '@mantine/core';
import { IconFlask, IconSearch, IconMessageChatbot, IconPlus, IconFileText } from '@tabler/icons-react';
import TabStrip from './TabStrip';
import { GlassCard } from '@/components/GlassCard'; // Reuse your glass card
import { Interactive } from '@/components/Interactive';

// --- VISUAL CONSTANTS ---
const LAB_BLUE = '#5538f8';

// --- SUB-COMPONENT: ACTION CARD ---
function ActionCard({ icon: Icon, title, description, onClick, color }) {
    return (
        <Interactive onClick={onClick}>
            <GlassCard p="lg" style={{ 
                height: '100%', cursor: 'pointer', 
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <Stack gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md" color={color}>
                        <Icon size={20} />
                    </ThemeIcon>
                    <Text size="sm" fw={700} c="white">{title}</Text>
                    <Text size="xs" c="dimmed" lh={1.5}>{description}</Text>
                </Stack>
            </GlassCard>
        </Interactive>
    );
}

// --- SUB-COMPONENT: WELCOME STATE (COMMAND CENTER) ---
function WelcomeState({ onOpenLibrarian }) {
    return (
        <Box 
            style={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '40px'
            }}
        >
            <Stack align="center" gap="xl" maw={800} w="100%">
                
                {/* Hero Icon */}
                <ThemeIcon size={80} radius="100%" color="dark" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <IconFlask size={40} color={"white"} />
                </ThemeIcon>
                
                <Box ta="center">
                    <Title order={3} c="white" style={{ fontFamily: 'var(--font-lexend)' }}>Research Workbench</Title>
                    <Text size="sm" c="dimmed" mt={4}>Select a tool to begin your investigation.</Text>
                </Box>
                
                {/* Action Grid */}
                <SimpleGrid cols={3} spacing="lg" w="100%">
                    <ActionCard 
                        icon={IconSearch} 
                        title="The Librarian" 
                        description="Search 200M+ papers via Semantic Scholar. Import citations and PDFs."
                        color="cyan"
                        onClick={onOpenLibrarian}
                    />
                    <ActionCard 
                        icon={IconFileText} 
                        title="Paper Analysis" 
                        description="Select a paper from the sidebar to extract hypothesis, gaps, and methodology."
                        color="indigo"
                        onClick={() => {}} // No-op: The sidebar handles this
                    />
                    <ActionCard 
                        icon={IconMessageChatbot} 
                        title="The Consultant" 
                        description="Chat with your entire project knowledge base. (Coming Soon)"
                        color="violet"
                        onClick={() => {}}
                    />
                </SimpleGrid>

            </Stack>
        </Box>
    );
}

// --- MAIN WORKSPACE COMPONENT ---
export default function Workspace({ tabs, activeTabId, onTabClick, onTabClose, onOpenLibrarian, onAddTab, children}) {
    
    // Find the active tab object
    const activeTab = tabs.find(t => t.id === activeTabId);

    // Render the correct view based on type
    const renderContent = () => {
        if (!activeTab) return <WelcomeState onOpenLibrarian={onOpenLibrarian} />;

        switch (activeTab.type) {
            case 'LIBRARIAN':
                return <LibrarianView />;
            case 'ANALYSIS':
                return <AnalysisView data={activeTab.data} />;
            case 'CONSULTANT':
                return <ConsultantView />;
            default:
                return <Text p="xl">Unknown Tab Type</Text>;
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(2, 6, 23, 0.4)' }}>
            <TabStrip tabs={tabs} activeTabId={activeTabId} onTabClick={onTabClick} onTabClose={onTabClose} onAddTab={onAddTab}  />
            <Box style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {tabs.length === 0 ? <WelcomeState onOpenLibrarian={onOpenLibrarian} /> : children}
            </Box>
        </div>
    );

}