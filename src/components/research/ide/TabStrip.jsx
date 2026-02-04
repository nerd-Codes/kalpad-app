"use client";

import { Box, Group, Text, ActionIcon, ScrollArea, Menu } from '@mantine/core';
import { 
    IconX, IconFlask, IconFileText, IconSearch, IconMessageChatbot, IconPlus 
} from '@tabler/icons-react';

const LAB_BLUE = '#5538f8';

const getTabIcon = (type) => {
    switch (type) {
        case 'LIBRARIAN': return <IconSearch size={14} />;
        case 'ANALYSIS': return <IconFileText size={14} />;
        case 'CONSULTANT': return <IconMessageChatbot size={14} />;
        default: return <IconFlask size={14} />;
    }
};

// Updated Prop: onAddTab (function to trigger new tab creation)
export default function TabStrip({ tabs, activeTabId, onTabClick, onTabClose, onAddTab }) {
    return (
        <Box 
            h={40} 
            style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(2, 6, 23, 0.6)',
                display: 'flex',
                alignItems: 'flex-end',
                overflow: 'hidden'
            }}
        >
            <ScrollArea style={{ width: '100%' }} scrollbarSize={2} offsetScrollbars={false}>
                <Group gap={0} wrap="nowrap" align="stretch" style={{ height: 39 }}>
                    
                    {/* 1. THE TABS */}
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        return (
                            <Box
                                key={tab.id}
                                onClick={() => onTabClick(tab.id)}
                                style={{
                                    height: '100%',
                                    minWidth: 120,
                                    maxWidth: 220,
                                    padding: '0 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: isActive ? 'rgba(85, 56, 248, 0.1)' : 'transparent',
                                    borderTop: isActive ? `2px solid ${LAB_BLUE}` : '2px solid transparent',
                                    borderRight: '1px solid rgba(255,255,255,0.05)',
                                    color: isActive ? 'white' : 'gray',
                                    userSelect: 'none',
                                    transition: 'background-color 0.1s',
                                    whiteSpace: 'nowrap', 
                                    overflow: 'hidden'
                                }}
                                className="group"
                            >
                                <Group gap={8} wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
                                    <span style={{ color: isActive ? LAB_BLUE : 'inherit', opacity: 0.8, flexShrink: 0, display: 'flex' }}>
                                        {getTabIcon(tab.type)}
                                    </span>
                                    <Text size="xs" truncate="end" fw={isActive ? 600 : 400} style={{ flex: 1 }}>
                                        {tab.title}
                                    </Text>
                                </Group>
                                
                                <ActionIcon 
                                    size="xs" variant="transparent" color="gray"
                                    onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
                                    style={{ opacity: isActive ? 1 : 0.5, flexShrink: 0, marginLeft: 4 }}
                                >
                                    <IconX size={12} />
                                </ActionIcon>
                            </Box>
                        );
                    })}

                    {/* 2. THE ADD BUTTON (Sticky End) */}
                    <Menu shadow="md" width={200} position="bottom-start" withArrow>
                        <Menu.Target>
                            <Box
                                style={{
                                    height: '100%',
                                    width: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    borderRight: '1px solid rgba(255,255,255,0.05)',
                                    color: 'gray',
                                    transition: 'background-color 0.2s'
                                }}
                                className="hover:bg-white/5"
                            >
                                <IconPlus size={16} />
                            </Box>
                        </Menu.Target>

                        <Menu.Dropdown style={{ backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }}>
                            <Menu.Label>New Tool</Menu.Label>
                            <Menu.Item 
                                leftSection={<IconSearch size={14} />} 
                                onClick={() => onAddTab('LIBRARIAN')}
                            >
                                Librarian Search
                            </Menu.Item>
                            <Menu.Item 
                                leftSection={<IconMessageChatbot size={14} />} 
                                onClick={() => onAddTab('CONSULTANT')}
                            >
                                Research Chat
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>

                </Group>
            </ScrollArea>
        </Box>
    );
}