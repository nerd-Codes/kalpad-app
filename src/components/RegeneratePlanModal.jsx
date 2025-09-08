// src/components/RegeneratePlanModal.jsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Textarea, Group, Button, Alert, Title, Text, Paper, Badge, Stack, Loader, Collapse, List, ThemeIcon, Progress, ScrollArea, Skeleton } from '@mantine/core';
import { IconTargetArrow, IconX, IconListDetails, IconInfoCircle, IconPoint } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { GlassCard } from './GlassCard';
import { ShimmerButton } from './landing/ShimmerButton';
import { wittyFacts } from '@/lib/newplanFacts';
import { AnimatePresence, motion } from 'framer-motion';
import { useLoading } from '@/context/LoadingContext';


const useTypingEffect = (text = '', speed = 2) => {
    const [displayedText, setDisplayedText] = useState('');
    useEffect(() => {
        if (!text) { setDisplayedText(''); return; }
        let i = 0;
        setDisplayedText('');
        const intervalId = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
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


// --- ADDED HELPER: This was missing, needed for sub-topic badges ---

const getSubTopicTypeColor = (type) => {
    switch (type?.toLowerCase()) {
        case 'concept': return 'blue';
        case 'problem-solving': return 'grape';
        case 'derivation': return 'cyan';
        case 'review': return 'teal';
        default: return 'gray';
    }

};

const DayCardSkeleton = () => (
    <Paper p="lg" mb="md" withBorder radius="md" style={{ opacity: 0.5 }}>
        <Group justify="space-between">
            <Skeleton height={20} width="60%" />
            <Skeleton height={20} width="30%" />
        </Group>
        <Skeleton height={15} mt="md" width="80%" />
        <Skeleton height={12} mt="lg" />
        <Skeleton height={12} mt="xs" />
        <Skeleton height={12} mt="xs" />
    </Paper>
);

// --- PERFORMANCE OPTIMIZATION 2: MEMOIZED DAY CARD COMPONENT ---
const DayCard = ({ item }) => (
     <Paper 
        p="lg" 
        mb="md" 
        withBorder 
        radius="md" 
        style={{ borderLeft: `5px solid ${getDayDifficultyColor(item.day_difficulty)}`}}
    >
        <Group justify="space-between">
            <Title order={4} ff="Lexend, sans-serif">{`Day ${item.day} - ${item.topic_name}`}</Title>
            <Group gap="xs">
                <Badge variant="light" color="gray">{item.study_hours} hrs</Badge>
                <Badge variant="light" color={getDayDifficultyColor(item.day_difficulty)}>{item.day_difficulty}</Badge>
            </Group>
        </Group>
        <Text c="dimmed" size="sm" mt={4}>{item.day_summary}</Text>
        
        <List spacing="sm" size="sm" mt="md" icon={<ThemeIcon color="gray" size={16} radius="xl"><IconPoint size={12} /></ThemeIcon>}>
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
);
const MemoizedDayCard = React.memo(DayCard);

export function RegeneratePlanModal({ opened, onClose, plan }) {
    const router = useRouter();
    const { setIsLoading } = useLoading();

    // --- ARCHITECTURAL REFACTOR: State is now cleaner and more explicit ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGenerationComplete, setIsGenerationComplete] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    
    const [error, setError] = useState('');
    const [userFeedback, setUserFeedback] = useState('');
    
    const [strategy, setStrategy] = useState(null);
    const [regeneratedPlan, setRegeneratedPlan] = useState([]);
    
    const [currentFact, setCurrentFact] = useState(wittyFacts[0]);
    const [openedDetails, { toggle: toggleDetails }] = useDisclosure(false);
    const typedApproach = useTypingEffect(strategy?.overall_approach);
    const planContainerRef = useRef(null);

    // Effect for witty fact cycling
    useEffect(() => {
        let factInterval = null;
        if (isGenerating && !strategy) {
            factInterval = setInterval(() => {
                setCurrentFact(wittyFacts[Math.floor(Math.random() * wittyFacts.length)]);
            }, 4000);
        }
        return () => clearInterval(factInterval);
    }, [isGenerating, strategy]);

    // This effect resets the component's state whenever the modal is closed.
    useEffect(() => {
        if (!opened) {
            setTimeout(() => {
                setIsGenerating(false);
                setIsGenerationComplete(false);
                setIsAccepting(false);
                setError('');
                setUserFeedback('');
                setStrategy(null);
                setRegeneratedPlan([]);
            }, 300); // Delay reset to allow for closing animation
        }
    }, [opened]);
    
    // Autoscroll effect
    useEffect(() => {
        if (planContainerRef.current) {
            // Use a short timeout to ensure the DOM has updated before scrolling
            setTimeout(() => {
                planContainerRef.current.scrollTo({ top: planContainerRef.current.scrollHeight, behavior: 'smooth' });
            }, 50);
        }
    }, [regeneratedPlan.length, isGenerating]);

    // --- PHASE 1: GENERATION (DECOUPLED HANDLER) ---
    const handleRegenerate = async () => {
        if (!plan?.id) return;
        setIsGenerating(true);
        setIsGenerationComplete(false);
        setError('');
        setStrategy(null);
        setRegeneratedPlan([]);

        try {
            const response = await fetch('/api/regenerate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    plan_id: plan.id, 
                    user_feedback: userFeedback,
                    user_declared_hours: plan.user_declared_hours || 4 
                }),
            });
            
            if (!response.ok || !response.body) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || "The AI failed to regenerate the plan.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break; // This is the definitive end signal
                
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n---\n');
                buffer = parts.pop() || ''; 
                for (const part of parts) {
                    if (part.trim() === '') continue;
                    const message = JSON.parse(part);
                    if (message.type === 'strategy') {
                        setStrategy(message.data);
                    } else if (message.type === 'plan_topic') {
                        setRegeneratedPlan(p => [...p, message.data]);
                    } else if (message.type === 'error') {
                        throw new Error(message.data.message);
                    }
                }
            }
            // Once the stream is finished, we update the state to complete generation
            setIsGenerationComplete(true);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- PHASE 2: ACCEPTANCE & PERSISTENCE (DECOUPLED HANDLER) ---
    const handleAcceptAndSave = async () => {
        setIsAccepting(true);
        setError('');
        
        try {
            const response = await fetch('/api/save-regenerated-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    old_plan_id: plan.id,
                    new_plan_topics: regeneratedPlan,
                    new_strategy: strategy,
                    exam_name: plan.exam_name,
                    exam_date: plan.exam_date,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to save the new plan.");
            }

            const { new_plan_id } = await response.json();

            notifications.show({
                title: 'Plan Regenerated!',
                message: 'Your new, optimized plan is ready.',
                color: 'green',
            });

            // Redirect to the new plan using the global loader for a smooth transition
            setIsLoading(true);
            router.replace(`/plan/${new_plan_id}`);
            onClose(); // Close the modal upon successful redirection

        } catch (err) {
            setError(err.message);
        } finally {
            setIsAccepting(false);
        }
    };

    const isActionInProgress = isGenerating || isAccepting;

    return (
    <Modal 
        opened={opened} 
        onClose={onClose} 
        title={<Title order={3} ff="Lexend, sans-serif">AI Performance Coach</Title>}
        centered 
        withCloseButton={!isActionInProgress} 
        closeOnClickOutside={!isActionInProgress}
        closeOnEscape={!isActionInProgress}
        radius="lg" 
        size="xl"
    >
        <GlassCard>
            {/* STATE 1: Initial Input Form */}
            {!isGenerating && !strategy && (
                <Stack gap="lg">
                    <Title order={4} ff="Lexend, sans-serif">Give your AI Coach some feedback</Title>
                    <Text c="dimmed" size="sm" mt={-10} mb="xs">Fallen behind? Struggling with a topic? Tell the AI what's on your mind.</Text>
                    <Textarea
                        placeholder="e.g., 'I really struggled with Quantum Tunneling, can we spend more time on that?'"
                        value={userFeedback}
                        onChange={(e) => setUserFeedback(e.target.value)}
                        autosize
                        minRows={4}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose}>Cancel</Button>
                         <ShimmerButton onClick={handleRegenerate}>
                            Regenerate & Optimize
                        </ShimmerButton>
                    </Group>
                </Stack>
            )}

            {/* STATE 2: Generating UI or Displaying Final Result */}
            {(isGenerating || strategy) && (
                <Stack gap="xl">
                    <GlassCard>
                         <Title order={3} ff="Lexend, sans-serif">{strategy ? "New Strategy Report" : "Analyzing Performance..."}</Title>
                        {strategy ? (
                             <Stack gap="md" mt="md">
                                {strategy.estimated_coverage && <Progress value={strategy.estimated_coverage} size="lg" radius="xl" striped animated label={`${strategy.estimated_coverage}% Coverage`} color="teal" />}
                                <div>
                                    <Text fw={500}>The New Approach:</Text>
                                    <Text c="dimmed">{typedApproach}</Text>
                                </div>
                                {strategy.emphasized_topics?.length > 0 && 
                                    <div>
                                        <Text mt="sm" fw={500}>Key Topics to Emphasize:</Text>
                                        <Group mt="xs" gap="xs">{strategy.emphasized_topics.map((item, index) => (<Badge key={index} color="brandGreen" variant="light">{item.topic}</Badge>))}</Group>
                                    </div>
                                }
                                <Button leftSection={<IconListDetails size={16}/>} variant="subtle" size="xs" onClick={toggleDetails} mt="xs">
                                    {openedDetails ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}
                                </Button>
                                <Collapse in={openedDetails}>
                                    <Stack gap="sm">
                                        {strategy.emphasized_topics?.length > 0 && <List spacing="xs" size="sm" center icon={<ThemeIcon color="green" size={16} radius="xl"><IconTargetArrow size={12} /></ThemeIcon>}>
                                            {strategy.emphasized_topics.map((item, index) => (<List.Item key={index}><Text><strong>{item.topic}:</strong> {item.justification}</Text></List.Item>))}
                                        </List>}
                                        {strategy.deprioritized_topics?.length > 0 && <List spacing="xs" size="sm" center icon={<ThemeIcon color="blue" size={16} radius="xl"><IconInfoCircle size={12} /></ThemeIcon>}>
                                            {strategy.deprioritized_topics.map((item, index) => (<List.Item key={index}><Text><strong>{item.topic}:</strong> {item.justification}</Text></List.Item>))}
                                        </List>}
                                        {strategy.skipped_topics?.length > 0 && <List spacing="xs" size="sm" center icon={<ThemeIcon color="yellow" size={16} radius="xl"><IconX size={12} /></ThemeIcon>}>
                                            {strategy.skipped_topics.map((item, index) => (<List.Item key={index}><Text><strong>{item.topic}:</strong> {item.justification}</Text></List.Item>))}
                                        </List>}
                                    </Stack>
                                </Collapse>
                            </Stack>
                        ) : (
                             <Paper p="md" withBorder style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                               <Group>
                                    <Loader color="white" size="sm" />
                                    <AnimatePresence mode="wait">
                                        <motion.div key={currentFact} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                            <Text size="sm" c="dimmed">{currentFact}</Text>
                                        </motion.div>
                                    </AnimatePresence>
                                </Group>
                            </Paper>
                        )}
                    </GlassCard>

                    {strategy && (
                        <GlassCard>
                             <Title order={3} ff="Lexend, sans-serif">Building Your New Quest...</Title>
                             <ScrollArea h={350} mt="md" viewportRef={planContainerRef}>
                                {/* --- PERFORMANCE OPTIMIZATION 3: Using the memoized component --- */}
                                {regeneratedPlan.map((item, index) => (
                                    <MemoizedDayCard key={index} item={item} />
                                ))}
                                {/* --- UX REFINEMENT: Adding the skeleton loader --- */}
                                {isGenerating && <DayCardSkeleton />}
                             </ScrollArea>
                        </GlassCard>
                    )}

                    {/* This is the new, decoupled action group */}
                    <Group justify="flex-end" mt="md">
                        {!isGenerationComplete ? (
                            <Button variant="default" disabled>Cancel</Button>
                        ) : (
                            <Button variant="default" onClick={onClose} disabled={isAccepting}>
                                Reject Plan
                            </Button>
                        )}
                        
                        <ShimmerButton 
                            color="brandGreen" 
                            onClick={handleAcceptAndSave} 
                            disabled={!isGenerationComplete || isAccepting}
                            loading={isAccepting}
                        >
                            Accept & Save New Plan
                        </ShimmerButton>
                    </Group>

                </Stack>
            )}

            {error && <Alert color="red" mt="md" title="Error">{error}</Alert>}
        </GlassCard>
    </Modal>
);
}