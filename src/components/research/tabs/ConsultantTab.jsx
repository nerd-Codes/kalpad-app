"use client";

import { useState } from 'react';
import { 
    Box, Stack, ScrollArea, TextInput, ActionIcon, Group, Avatar, 
    Text, Paper, Loader, Alert, Kbd, Badge
} from '@mantine/core';
import { IconSend, IconMessageChatbot } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import linkifyRegex from 'remark-linkify-regex';
import markdownStyles from '@/styles/MarkdownStyles.module.css';

// --- VISUAL CONSTANTS ---
const LAB_BLUE = '#5538f8';

// --- CITATION LINKER ---
// This plugin finds [uuid] and turns it into a clickable link
const citationPlugin = linkifyRegex(/\[([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]/g, (match) => {
    const paperId = match.replace(/\[|\]/g, '');
    return `#/cite/${paperId}`; // Use a hash-based link for client-side routing
});

// --- SUB-COMPONENT: CHAT BUBBLE ---
function ChatBubble({ message }) {
    const isUser = message.role === 'user';
    const isError = message.role === 'error';
    
    return (
        <Group 
            gap="sm" 
            align="flex-start" 
            wrap="nowrap"
            style={{ flexDirection: isUser ? 'row-reverse' : 'row' }}
        >
            <Avatar 
                color={isUser ? "indigo" : "gray"} 
                radius="xl"
                style={{ backgroundColor: isUser ? LAB_BLUE : '#374151' }}
            >
                {isUser ? 'You' : <IconMessageChatbot size={20} />}
            </Avatar>
            
            <Paper 
                p="md" 
                radius="lg" 
                style={{ 
                    backgroundColor: isUser ? LAB_BLUE : '#1f2937',
                    maxWidth: '80%',
                    color: 'white',
                }}
            >
                {isError ? (
                    <Text size="sm" c="red.4">{message.content}</Text>
                ) : (
                    <Box className={markdownStyles.markdown} style={{ fontSize: '0.95rem' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm, citationPlugin]}>
                            {message.content}
                        </ReactMarkdown>
                    </Box>
                )}
            </Paper>
        </Group>
    );
}

// --- MAIN TAB COMPONENT ---
export default function ConsultantTab({ projectId, onCiteClick }) {
    const [messages, setMessages] = useState([
        { role: 'ai', content: "I am your Research Consultant. Ask me anything about the papers in your workbench." }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isThinking) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);

        try {
            const response = await fetch('/api/research/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: input, projectId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
            
        } catch (err) {
            setMessages(prev => [...prev, { role: 'error', content: err.message }]);
        } finally {
            setIsThinking(false);
        }
    };
    
    // --- CITATION CLICK HANDLER (Dummy for now) ---
    // In page.js, you would pass a function here that opens the correct analysis tab
    const handleInternalLink = (e) => {
        if (e.target.tagName === 'A' && e.target.hash.startsWith('#/cite/')) {
            e.preventDefault();
            const paperId = e.target.hash.replace('#/cite/', '');
            if (onCiteClick) onCiteClick(paperId);
            else notifications.show({ title: 'Citation Clicked', message: `Paper ID: ${paperId}` });
        }
    };

    return (
        <Stack h="100%" gap={0}>
            {/* 1. Chat History */}
            <ScrollArea.Autosize 
                mah="calc(100vh - 200px)" // Adjust height to leave space for input
                style={{ flex: 1 }} 
                p="md"
            >
                <Stack gap="lg" onClick={handleInternalLink}>
                    {messages.map((msg, i) => <ChatBubble key={i} message={msg} />)}
                    {isThinking && (
                        <Group gap="sm" align="flex-start" wrap="nowrap">
                            <Avatar color="gray" radius="xl" style={{ backgroundColor: '#374151' }}>
                                <IconMessageChatbot size={20} />
                            </Avatar>
                            <Paper p="md" radius="lg" style={{ backgroundColor: '#1f2937' }}>
                                <Loader size="xs" type="dots" color="gray" />
                            </Paper>
                        </Group>
                    )}
                </Stack>
            </ScrollArea.Autosize>

            {/* 2. Input Area */}
            <Box p="md" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <form onSubmit={handleSendMessage}>
                    <TextInput 
                        placeholder="Ask about your research... (e.g., 'Compare the methodologies for transformer optimization')"
                        size="md"
                        radius="xl"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isThinking}
                        rightSection={
                            <ActionIcon type="submit" size="lg" radius="xl" color={LAB_BLUE} variant="filled" disabled={isThinking || !input.trim()}>
                                <IconSend size={18} />
                            </ActionIcon>
                        }
                        styles={{ 
                            input: { 
                                backgroundColor: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                color: 'white' 
                            } 
                        }}
                    />
                </form>
                <Text size="xs" c="dimmed" ta="center" mt="xs">
                    The Consultant has context of all papers in your workbench. Press <Kbd size="xs">Enter</Kbd> to send.
                </Text>
            </Box>
        </Stack>
    );
}